/**
 * Delivery — the daily round.
 *
 * Promoted to a primary tab: this is the screen a milkman opens twice a day, and
 * it was previously reachable only via a CTA on Home.
 *
 * Status changes are the core interaction, so they get the app's most deliberate
 * micro-interaction (`StatusToggle`) and the counts above update through
 * `AnimatedValueText` — tapping a row visibly moves the progress number, which
 * is the confirmation that the tap landed.
 */

import { useScrollToTop } from 'expo-router';
import { Calendar, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AnimatedValueText,
  ListItem,
  StatusToggle,
  useFeedback,
} from '@/components/motion';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  IconButton,
  Screen,
  ScreenHeader,
  SearchField,
  Segmented,
} from '@/components/ui';
import { Colors, Layout, Radius, Type, softShadow } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import {
  addDaysISO,
  todayISO,
  useDairyStore,
  type DeliveryStatus,
  type Slot,
} from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

/** pending → delivered → skipped → pending */
const NEXT_STATUS: Record<DeliveryStatus, DeliveryStatus> = {
  pending: 'delivered',
  delivered: 'not_delivered',
  not_delivered: 'pending',
};

/** Height of the pinned action bar, so scroll content can clear it. */
const ACTION_BAR_HEIGHT = 84;

export default function DeliveryScreen() {
  const { accent } = useAppTheme();
  const t = useT();
  const feedback = useFeedback();

  // Subscribed individually rather than destructuring the whole store, so this
  // screen re-renders on delivery/customer changes but not on, say, a theme
  // change three tabs away.
  const customers = useDairyStore((s) => s.customers);
  const deliveries = useDairyStore((s) => s.deliveries);
  const setStatus = useDairyStore((s) => s.setStatus);
  const markAll = useDairyStore((s) => s.markAll);

  const [date, setDate] = useState(todayISO);
  const [slot, setSlot] = useState<Slot>('morning');
  const [query, setQuery] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  // Tapping the Delivery tab while already on it scrolls back to the top.
  useScrollToTop(scrollRef);

  const paddingBottom = useScreenPadding() + ACTION_BAR_HEIGHT;

  /**
   * One pass over deliveries into a map, instead of a `.find()` per customer
   * per render. With 5 customers it was harmless; with a real book of 200 it was
   * 200 × 8,400 comparisons on every keystroke in the search field.
   */
  const statusByCustomer = useMemo(() => {
    const map = new Map<string, DeliveryStatus>();
    for (const record of deliveries) {
      if (record.date === date && record.slot === slot) {
        map.set(record.customerId, record.status);
      }
    }
    return map;
  }, [deliveries, date, slot]);

  const eligible = useMemo(
    () =>
      customers.filter(
        (c) => !c.paused && (slot === 'morning' ? c.morningQty : c.eveningQty) > 0,
      ),
    [customers, slot],
  );

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return eligible;
    return eligible.filter((c) => c.name.toLowerCase().includes(needle));
  }, [eligible, query]);

  const deliveredCount = eligible.filter(
    (c) => (statusByCustomer.get(c.id) ?? 'pending') === 'delivered',
  ).length;

  const progressPct = eligible.length
    ? Math.round((deliveredCount / eligible.length) * 100)
    : 0;

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isToday = date === todayISO();

  const handleMarkAll = () => {
    markAll(date, slot, 'delivered', customers);
    feedback.success(`${eligible.length} deliveries marked for ${slot}`);
  };

  return (
    <Screen statusBar="light">
      <ScreenHeader
        title={t('title.delivery')}
        subtitle={isToday ? `Today · ${displayDate}` : displayDate}
        bottomInset={40}
        action={
          <IconButton
            icon={Calendar}
            onPress={() => setDate(todayISO())}
            accessibilityLabel="Jump to today"
            size={46}
            iconSize={21}
            background="rgba(255,255,255,0.18)"
            color="#FFFFFF"
            style={styles.headerButton}
          />
        }
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        // Dismisses the keyboard as soon as the user starts scrolling the list.
        keyboardDismissMode="on-drag"
      >
        <View style={styles.overlap}>
          {/* Date stepper */}
          <Card radius="xl" padding={12} style={styles.dateCard}>
            <View style={styles.dateRow}>
              <IconButton
                icon={ChevronLeft}
                onPress={() => setDate(addDaysISO(date, -1))}
                accessibilityLabel="Previous day"
              />
              <Text style={styles.dateText} numberOfLines={1}>
                {displayDate}
              </Text>
              <IconButton
                icon={ChevronRight}
                onPress={() => setDate(addDaysISO(date, 1))}
                accessibilityLabel="Next day"
              />
            </View>
          </Card>

          <Segmented
            options={[
              { value: 'morning', label: t('label.morning') },
              { value: 'evening', label: t('label.evening') },
            ]}
            value={slot}
            onChange={setSlot}
            style={styles.segmented}
          />

          {/* Progress. The numbers animate so a status tap is visibly reflected. */}
          <View style={[styles.progress, { backgroundColor: accent.soft }]}>
            <AnimatedValueText
              value={deliveredCount}
              format={(n) => `${n} / ${eligible.length}`}
              style={[styles.progressLabel, { color: accent.color }]}
            />
            <View style={[styles.track, { backgroundColor: `${accent.color}2E` }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: accent.color, width: `${progressPct}%` },
                ]}
              />
            </View>
            <AnimatedValueText
              value={progressPct}
              format={(n) => `${n}%`}
              style={[styles.progressLabel, { color: accent.color }]}
            />
          </View>

          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('placeholder.searchCustomer')}
            style={styles.search}
          />

          {list.map((customer, index) => {
            const qty = slot === 'morning' ? customer.morningQty : customer.eveningQty;
            const status = statusByCustomer.get(customer.id) ?? 'pending';

            return (
              <ListItem key={customer.id} index={index} style={styles.rowWrap}>
                <Card radius="xl" padding={14}>
                  <View style={styles.row}>
                    <Avatar name={customer.name} size={50} />

                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {customer.name}
                      </Text>
                      <Text style={[styles.rowQty, { color: accent.color }]}>
                        {qty.toFixed(1)} L
                        <Text style={styles.rowValue}>
                          {'  ·  ₹'}
                          {Math.round(qty * customer.rate)}
                        </Text>
                      </Text>
                    </View>

                    <StatusToggle
                      status={status}
                      accessibilityLabel={customer.name}
                      onPress={() =>
                        setStatus(
                          customer.id,
                          date,
                          slot,
                          NEXT_STATUS[status],
                          qty,
                          customer.rate,
                        )
                      }
                    />
                  </View>
                </Card>
              </ListItem>
            );
          })}

          {list.length === 0 ? (
            <EmptyState
              title={query ? t('state.noMatches') : t('state.nothingScheduled')}
              description={
                query
                  ? 'No customer on this round matches your search.'
                  : `No active customer has a ${slot} quantity set.`
              }
            />
          ) : null}
        </View>
      </ScrollView>

      {/*
        Pinned above the tab bar rather than at the screen bottom, so the two
        pieces of chrome stack instead of overlapping.
      */}
      <ActionBar>
        <Button
          label={t('action.markAllDelivered')}
          onPress={handleMarkAll}
          icon={Check}
          size="lg"
          variant="primary"
          pill
          full
          disabled={eligible.length === 0}
        />
      </ActionBar>
    </Screen>
  );
}

/** Floating action bar that sits directly on top of the bottom navigation. */
function ActionBar({ children }: { children: React.ReactNode }) {
  const offset = useScreenPadding();

  return (
    <View
      style={[
        styles.actionBar,
        // `useScreenPadding` already includes the safe-area inset, so the bar
        // clears the home indicator without any hardcoded padding.
        { bottom: offset - 16 },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
  },
  overlap: {
    paddingHorizontal: Layout.gutter,
  },
  headerButton: {
    borderWidth: 0,
  },
  dateCard: {
    marginBottom: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    ...Type.body,
    fontWeight: '800',
    color: Colors.foreground,
    flex: 1,
    textAlign: 'center',
  },
  segmented: {
    marginBottom: 14,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 14,
  },
  progressLabel: {
    ...Type.caption,
    fontWeight: '800',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: Radius.full,
  },
  search: {
    marginBottom: 16,
  },
  rowWrap: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    ...Type.bodyStrong,
    color: Colors.foreground,
    marginBottom: 2,
  },
  rowQty: {
    ...Type.callout,
    fontWeight: '800',
  },
  rowValue: {
    ...Type.footnote,
    color: Colors.mutedForeground,
  },
  actionBar: {
    position: 'absolute',
    left: Layout.gutter,
    right: Layout.gutter,
    // Below the tab bar's z-index so the bar always wins if they ever meet.
    zIndex: 40,
    ...softShadow,
  },
});
