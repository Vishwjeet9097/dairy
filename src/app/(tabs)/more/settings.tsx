/**
 * Settings.
 *
 * Two fixes beyond the navigation work:
 *
 * 1. `saveSettings` was dropping `autoDeliveryDefault`, `billingCycleDay` and
 *    `notificationsEnabled` from the payload, so saving the dairy name silently
 *    reset the automation config. (This was a live type error.)
 *
 * 2. Adds the language switcher. The store has carried a `lang` field since the
 *    beginning with no way to change it, so Hindi was unreachable.
 */

import { Check, IndianRupee, Languages, Palette, Store, Trash2, User } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale, useFeedback } from '@/components/motion';
import {
  AppBar,
  Button,
  Card,
  Dialog,
  Field,
  Screen,
  SectionLabel,
  Segmented,
  ToggleRow,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { ACCENT_COLORS, useAppTheme } from '@/context/theme-context';
import { useDairyStore, type Lang } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

export default function SettingsScreen() {
  const nav = useNavGuard();
  const t = useT();
  const feedback = useFeedback();
  const { accent, setAccentId } = useAppTheme();

  const settings = useDairyStore((s) => s.settings);
  const lang = useDairyStore((s) => s.lang) ?? 'en';
  const saveSettings = useDairyStore((s) => s.saveSettings);
  const setLang = useDairyStore((s) => s.setLang);
  const resetAll = useDairyStore((s) => s.resetAll);

  const paddingBottom = useScreenPadding();

  const [dairyName, setDairyName] = useState(settings.dairyName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [defaultRate, setDefaultRate] = useState(String(settings.defaultRate));
  const [deliveryCharge, setDeliveryCharge] = useState(String(settings.deliveryCharge));
  const [autoDelivery, setAutoDelivery] = useState(settings.autoDeliveryDefault);
  const [notifications, setNotifications] = useState(settings.notificationsEnabled);
  const [resetVisible, setResetVisible] = useState(false);

  const handleSave = () => {
    saveSettings({
      // Spread first so fields not exposed by this form survive the save.
      ...settings,
      dairyName: dairyName.trim() || settings.dairyName,
      ownerName: ownerName.trim() || settings.ownerName,
      defaultRate: parseFloat(defaultRate) || settings.defaultRate,
      deliveryCharge: parseFloat(deliveryCharge) || settings.deliveryCharge,
      autoDeliveryDefault: autoDelivery,
      notificationsEnabled: notifications,
    });
    feedback.success(t('success.settingsSaved'));
  };

  const handleReset = () => {
    setResetVisible(false);
    resetAll();
    // `replace`, not `push` — the wiped app should not have the settings screen
    // sitting behind it in history.
    nav.replace('/');
    feedback.success(t('success.dataReset'));
  };

  return (
    <Screen>
      <AppBar title={t('title.settings')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* ── Language ── */}
        <SectionLabel>{t('settings.language')}</SectionLabel>
        <Card padding={18} style={styles.card}>
          <View style={styles.langRow}>
            <View style={[styles.langIcon, { backgroundColor: accent.soft }]}>
              <Languages size={19} color={accent.color} />
            </View>
            <Text style={styles.langCaption}>
              Applies to navigation and shared labels
            </Text>
          </View>
          <Segmented
            options={[
              { value: 'en' as Lang, label: t('settings.languageEnglish') },
              { value: 'hi' as Lang, label: t('settings.languageHindi') },
            ]}
            value={lang}
            onChange={setLang}
            style={styles.langSegmented}
          />
        </Card>

        {/* ── Theme ── */}
        <SectionLabel>{t('section.themeColour')}</SectionLabel>
        <Card padding={20} style={styles.card}>
          <View style={styles.swatches}>
            {ACCENT_COLORS.map((color) => {
              const selected = accent.id === color.id;
              /**
               * Read the hex through `.hex`, never `.value`.
               *
               * Reanimated's babel plugin rewrites any style object containing a
               * `.value` access so it can warn about shared values being used as
               * plain styles. `AccentColor.value` is just a hex string, but the
               * plugin cannot tell, so it injects that check and the screen logs a
               * false-positive warning. This is exactly why the palette carries a
               * `color`/`hex` alias — see the comment on `AccentColor` in
               * `context/theme-context.tsx`.
               */
              const swatch = color.hex;
              return (
                <PressableScale
                  key={color.id}
                  onPress={() => setAccentId(color.id)}
                  scale={0.92}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={color.label}
                  style={styles.swatch}
                >
                  <View
                    style={[
                      styles.swatchRing,
                      {
                        borderColor: selected ? swatch : 'rgba(0,0,0,0.08)',
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.swatchFill, { backgroundColor: swatch }]}>
                      {selected ? <Check size={18} color="white" strokeWidth={3} /> : null}
                    </View>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.swatchLabel,
                      { color: selected ? swatch : Colors.mutedForeground },
                    ]}
                  >
                    {color.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Card>

        {/* ── Dairy info ── */}
        <SectionLabel>{t('section.dairyInfo')}</SectionLabel>
        <Card padding={20} style={styles.card}>
          <Field
            label={t('label.dairyName')}
            icon={Store}
            value={dairyName}
            onChangeText={setDairyName}
            placeholder="e.g. Vishal Dairy"
            containerStyle={styles.field}
          />
          <Field
            label={t('label.ownerName')}
            icon={User}
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="e.g. Vishal"
            containerStyle={styles.field}
          />
          <View style={styles.fieldRow}>
            <Field
              label={t('label.rate')}
              icon={IndianRupee}
              value={defaultRate}
              onChangeText={setDefaultRate}
              keyboardType="decimal-pad"
              placeholder="60"
              containerStyle={styles.fieldHalf}
            />
            <Field
              label={t('label.deliveryCharge')}
              icon={IndianRupee}
              value={deliveryCharge}
              onChangeText={setDeliveryCharge}
              keyboardType="decimal-pad"
              placeholder="100"
              containerStyle={styles.fieldHalf}
            />
          </View>

          <Button
            label={t('action.save')}
            onPress={handleSave}
            size="lg"
            full
            style={styles.saveButton}
          />
        </Card>

        {/* ── Automation ── */}
        <SectionLabel>{t('section.automation')}</SectionLabel>
        <Card padding={20} style={styles.card}>
          <ToggleRow
            label={t('label.autoDelivery')}
            description="New customers default to auto delivery"
            value={autoDelivery}
            onValueChange={setAutoDelivery}
          />
          <View style={styles.toggleGap} />
          <ToggleRow
            label={t('label.notifications')}
            description="Daily delivery and billing reminders"
            value={notifications}
            onValueChange={setNotifications}
          />
          <Text style={styles.hint}>
            Remember to save after changing these.
          </Text>
        </Card>

        {/* ── Danger zone ── */}
        <SectionLabel>{t('section.dangerZone')}</SectionLabel>
        <Card padding={18}>
          <Button
            label={t('action.resetData')}
            onPress={() => setResetVisible(true)}
            variant="danger"
            icon={Trash2}
            size="lg"
            full
          />
        </Card>
      </ScrollView>

      {/*
        A themed dialog rather than `Alert.alert`, so a destructive confirm looks
        like part of the app instead of a system error.
      */}
      <Dialog
        visible={resetVisible}
        icon={Trash2}
        iconTone="danger"
        title="Reset all data?"
        message="This deletes every customer, delivery, payment and bill. It cannot be undone."
        confirmLabel="Reset"
        cancelLabel={t('action.cancel')}
        onConfirm={handleReset}
        onCancel={() => setResetVisible(false)}
        destructive
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Layout.gutter,
  },
  card: {
    marginBottom: 22,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  langIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langCaption: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    flex: 1,
  },
  langSegmented: {
    borderWidth: 0,
    backgroundColor: Colors.surface,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatch: {
    width: 64,
    alignItems: 'center',
    gap: 8,
  },
  swatchRing: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  swatchFill: {
    flex: 1,
    width: '100%',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    ...Type.micro,
    textAlign: 'center',
  },
  field: {
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  saveButton: {
    marginTop: 18,
  },
  toggleGap: {
    height: 18,
  },
  hint: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    marginTop: 16,
  },
});
