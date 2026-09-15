/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Notification service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Uses expo-notifications to schedule LOCAL notifications — no server needed.
 * Local notifications fire at a scheduled time whether the app is:
 *   • Foreground
 *   • Background
 *   • Screen locked
 *
 * They do NOT fire if the phone is powered off (by design — local only).
 *
 * Architecture:
 *   - All scheduling goes through this file. No screen calls Notifications.* directly.
 *   - Each notification type has a stable identifier so it can be cancelled/replaced.
 *   - The store's `addInAppNotification` is called alongside device notifications
 *     so the in-app notification center always reflects what was scheduled.
 *
 * Setup required before scheduling:
 *   1. Call `requestPermissions()` — returns true if granted.
 *   2. Call `setupAndroidChannel()` on app start (Android only, no-op on iOS).
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { translate, type TranslationKey } from './i18n';

// ─── Android channel ──────────────────────────────────────────────────────────

const CHANNEL_ID = 'dairy-manager';

/**
 * Creates the default notification channel for Android 8+.
 * Must be called before any notification is scheduled.
 * Safe to call on every app launch — silently no-ops on iOS and if
 * the channel already exists.
 */
export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Dairy Manager',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00A350',
    sound: 'default',
    showBadge: true,
  });
}

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Requests notification permission from the OS.
 * Returns `true` if permission is granted or was already granted.
 *
 * Call this before scheduling any notification. On Android 13+ this triggers
 * the system dialog the first time. On iOS it triggers the native dialog.
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false; // permanently denied — user must go to Settings

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Returns whether the app currently has notification permission without
 * prompting the user.
 */
export async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ─── Notification handler ────────────────────────────────────────────────────

/**
 * Controls how notifications behave when the app is in the FOREGROUND.
 * Without this, foreground notifications are silently dropped on iOS.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Stable identifier helpers ───────────────────────────────────────────────

/** Identifier for the daily morning delivery reminder. */
const morningReminderId = () => 'dairy-morning-delivery';

/** Identifier for the daily evening delivery reminder. */
const eveningReminderId = () => 'dairy-evening-delivery';

/** Identifier for a calving reminder at a specific interval. */
const calvingReminderId = (inseminationId: string, interval: string) =>
  `dairy-calving-${inseminationId}-${interval}`;

/** Identifier for a monthly feed payment reminder. */
const feedPaymentReminderId = (feedEntryId: string) =>
  `dairy-feed-payment-${feedEntryId}`;

/** Identifier for the monthly billing reminder. */
const billingReminderId = () => 'dairy-billing-monthly';

// ─── Delivery reminders ───────────────────────────────────────────────────────

/**
 * Schedules a daily delivery reminder at the given local time.
 * Replaces any previously scheduled reminder for that slot, so calling this
 * with a new time when the user changes Settings is safe.
 *
 * @param slot      'morning' | 'evening'
 * @param timeStr   '08:00' (24-hour HH:MM)
 * @param lang      User's current language for the notification text
 */
export async function scheduleDeliveryReminder(
  slot: 'morning' | 'evening',
  timeStr: string,
  lang: 'en' | 'hi' = 'en',
): Promise<void> {
  const id = slot === 'morning' ? morningReminderId() : eveningReminderId();

  // Cancel the existing one first so we don't double-schedule.
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr ?? '8', 10);
  const minute = parseInt(minuteStr ?? '0', 10);

  const titleKey: TranslationKey = slot === 'morning' ? 'notif.morningDelivery' : 'notif.eveningDelivery';
  const bodyKey: TranslationKey = slot === 'morning' ? 'notif.morningBody' : 'notif.eveningBody';

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: translate(titleKey, lang),
      body: translate(bodyKey, lang),
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      data: { type: 'delivery', slot },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Cancels delivery reminders for one or both slots.
 */
export async function cancelDeliveryReminders(slots: ('morning' | 'evening')[] = ['morning', 'evening']): Promise<void> {
  await Promise.all(
    slots.map((slot) => {
      const id = slot === 'morning' ? morningReminderId() : eveningReminderId();
      return Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }),
  );
}

// ─── Calving reminders ────────────────────────────────────────────────────────

/**
 * Schedules a reminder for an upcoming calving.
 *
 * @param inseminationId  The insemination record ID.
 * @param cowName         Display name for the cow.
 * @param expectedDate    Expected calving date (yyyy-mm-dd).
 * @param daysBeforeList  Array of how many days before calving to remind (e.g. [30, 7, 3, 1]).
 * @param alreadySent     Intervals already sent (from insemination.remindersSent).
 * @param lang            User language.
 */
export async function scheduleCalvingReminders(
  inseminationId: string,
  cowName: string,
  expectedDate: string,
  daysBeforeList: number[] = [90, 45, 30, 15, 7, 3, 2, 1],
  alreadySent: string[] = [],
  lang: 'en' | 'hi' = 'en',
): Promise<void> {
  const today = new Date();
  const target = new Date(`${expectedDate}T00:00:00`);

  for (const daysBefore of daysBeforeList) {
    const interval = `${daysBefore}d`;
    if (alreadySent.includes(interval)) continue;

    const fireDate = new Date(target);
    fireDate.setDate(fireDate.getDate() - daysBefore);
    fireDate.setHours(9, 0, 0, 0); // 9:00 AM local time

    // Skip if the fire date has already passed.
    if (fireDate <= today) continue;

    const id = calvingReminderId(inseminationId, interval);
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

    const title = translate('notif.calvingTitle', lang);
    const body =
      lang === 'hi'
        ? `${cowName} का प्रसव ${daysBefore} दिनों में होने की उम्मीद है।`
        : `${cowName} is expected to calve in ${daysBefore} day${daysBefore === 1 ? '' : 's'}.`;

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        data: { type: 'calving', inseminationId, cowName, daysBefore },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  }
}

/**
 * Cancels all calving reminders for a specific insemination.
 */
export async function cancelCalvingReminders(
  inseminationId: string,
  intervals: string[] = ['90d', '45d', '30d', '15d', '7d', '3d', '2d', '1d'],
): Promise<void> {
  await Promise.all(
    intervals.map((interval) =>
      Notifications.cancelScheduledNotificationAsync(calvingReminderId(inseminationId, interval)).catch(() => {}),
    ),
  );
}

// ─── Feed payment reminders ───────────────────────────────────────────────────

/**
 * Schedules a one-time reminder for a feed payment that is due.
 *
 * @param feedEntryId   The feed entry ID (used to make the identifier stable).
 * @param feedName      Display name of the feed.
 * @param remainingAmt  Amount still owed.
 * @param dueDate       Due date string (yyyy-mm-dd), or null for end of month.
 * @param lang          User language.
 */
export async function scheduleFeedPaymentReminder(
  feedEntryId: string,
  feedName: string,
  remainingAmt: number,
  dueDate: string | null | undefined,
  lang: 'en' | 'hi' = 'en',
): Promise<void> {
  const id = feedPaymentReminderId(feedEntryId);
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  if (remainingAmt <= 0) return; // already paid — no reminder needed

  // Fire at 10 AM on the due date, or 5 days before month end if no due date.
  let fireDate: Date;
  if (dueDate) {
    fireDate = new Date(`${dueDate}T10:00:00`);
  } else {
    const now = new Date();
    // Last day of current month minus 5 days.
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDay.setDate(lastDay.getDate() - 5);
    lastDay.setHours(10, 0, 0, 0);
    fireDate = lastDay;
  }

  if (fireDate <= new Date()) return; // date already passed

  const title = translate('notif.feedPaymentTitle', lang);
  const body =
    lang === 'hi'
      ? `${feedName}: ₹${Math.round(remainingAmt).toLocaleString('en-IN')} बाकी है।`
      : `${feedName}: ₹${Math.round(remainingAmt).toLocaleString('en-IN')} remaining.`;

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      data: { type: 'feed', feedEntryId, feedName, remainingAmt },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    },
  });
}

/**
 * Cancels a feed payment reminder (e.g. when the payment is fully settled).
 */
export async function cancelFeedPaymentReminder(feedEntryId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(feedPaymentReminderId(feedEntryId)).catch(() => {});
}

// ─── Billing reminders ────────────────────────────────────────────────────────

/**
 * Schedules a recurring monthly billing reminder on the given day of the month.
 *
 * @param dayOfMonth  1–28 (safe across all months)
 * @param lang        User language.
 */
export async function scheduleBillingReminder(dayOfMonth: number, lang: 'en' | 'hi' = 'en'): Promise<void> {
  const id = billingReminderId();
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  const title = translate('notif.billingTitle', lang);
  const body = lang === 'hi'
    ? 'इस महीने के बिल तैयार करें और बकाया राशि देखें।'
    : 'Generate this month\'s bills and review outstanding dues.';

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      data: { type: 'billing' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: Math.min(Math.max(dayOfMonth, 1), 28),
      hour: 10,
      minute: 0,
    },
  });
}

// ─── Cancel all ───────────────────────────────────────────────────────────────

/**
 * Cancels every scheduled notification. Used when notifications are disabled
 * in Settings or when the user resets all data.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Re-schedule helper ───────────────────────────────────────────────────────

/**
 * Re-schedules delivery reminders from Settings values.
 * Call this whenever the user saves new delivery times or enables notifications.
 */
export async function rescheduleDeliveryReminders(
  morningTime: string,
  eveningTime: string,
  lang: 'en' | 'hi' = 'en',
): Promise<void> {
  await Promise.all([
    scheduleDeliveryReminder('morning', morningTime, lang),
    scheduleDeliveryReminder('evening', eveningTime, lang),
  ]);
}
