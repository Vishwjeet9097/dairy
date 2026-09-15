/**
 * Home — the dashboard.
 *
 * Rebuilt on the shared design system. This screen was the app's main
 * consistency outlier: ~900 lines of inline styles with its own hardcoded
 * palette (`#EDE7F6`, `#6A1B9A`, `#FFF3E0`, `#E65100`), its own search bar, its
 * own stat strip and its own activity rows — none of which matched the
 * primitives every other screen uses. It now draws entirely from `Card`,
 * `SearchField`, `SectionHeading`, `Type`, `Radius`, `Layout` and the accent
 * palette, so a theme change or a token change reaches it like everywhere else.
 *
 * The search field is now wired. It was previously rendered but connected to
 * nothing, which is worse than absent: it invites a tap and then does nothing.
 * Typing filters customers inline and the results navigate to the customer.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useScrollToTop } from 'expo-router';
import { AlertCircle, Bell, ChevronRight, FileText, IndianRupee, Milk, Truck, UserPlus, Users, Wallet } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnimatedValueText,
  DeliveryStatusBadge,
  ListItem,
  PressableScale,
} from '@/components/motion';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PressableCard,
  Screen,
  SearchField,
  SectionHeading,
  Sparkline,
} from '@/components/ui';
import { AppGlassMaterial } from '@/components/ui/glass';
import {
  cardBorder,
  cardShadow,
  Colors,
  Layout,
  Radius,
  softShadow,
  Type,
} from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import {
  addDaysISO,
  collectionOn,
  customerBilled,
  customerPaid,
  milkOn,
  money0,
  outstanding,
  statusFor,
  todayISO,
  totalOutstanding,
  useDairyStore,
} from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

export default function HomeScreen() {
  const nav = useNavGuard();
  const navigation = useNavigation();
  const t = useT();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();

  /**
   * Subscribed slices, not a `getState()` snapshot. The original read the store
   * once per render and fed that snapshot to every derived helper, so React was
   * never told those values were inputs and the dashboard could paint figures
   * from before the last mutation.
   */
  const customers = useDairyStore((s) => s.customers);
  const deliveries = useDairyStore((s) => s.deliveries);
  const payments = useDairyStore((s) => s.payments);
  const settings = useDairyStore((s) => s.settings);

  const [query, setQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const paddingBottom = useScreenPadding();
  const today = todayISO();

  /**
   * Every dashboard figure in one memo.
   *
   * The original ran roughly 30 full scans of `deliveries`/`payments` per render
   * — two per customer for month totals, one per customer for the outstanding
   * filter, 14 for the sparklines — and recomputed all of it on every keystroke
   * in the search field.
   */
  const stats = useMemo(() => {
    const state = { customers, deliveries, payments, settings } as Parameters<
      typeof totalOutstanding
    >[0];

    const active = customers.filter((c) => !c.paused);

    let pending = 0;
    let delivered = 0;
    let skipped = 0;

    for (const customer of active) {
      for (const slot of ['morning', 'evening'] as const) {
        const qty = slot === 'morning' ? customer.morningQty : customer.eveningQty;
        if (!qty) continue;
        const status = statusFor(state, customer.id, today, slot);
        if (status === 'pending') pending += 1;
        else if (status === 'delivered') delivered += 1;
        else skipped += 1;
      }
    }

    const totalSlots = pending + delivered + skipped;
    const monthStart = `${today.slice(0, 7)}-01`;

    let monthBilled = 0;
    let monthPaid = 0;
    let highBalance = 0;

    for (const customer of customers) {
      monthBilled += customerBilled(state, customer.id, monthStart, today);
      monthPaid += customerPaid(state, customer.id, monthStart, today);
      if (outstanding(state, customer.id) > 500) highBalance += 1;
    }

    const milkTrend: number[] = [];
    const collectionTrend: number[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = addDaysISO(today, -offset);
      milkTrend.push(milkOn(state, date));
      collectionTrend.push(collectionOn(state, date));
    }

    return {
      activeCount: active.length,
      pending,
      delivered,
      totalSlots,
      progress: totalSlots > 0 ? delivered / totalSlots : 0,
      milkToday: milkOn(state, today),
      collectedToday: collectionOn(state, today),
      monthDue: Math.max(0, monthBilled - monthPaid),
      totalDue: totalOutstanding(state),
      highBalance,
      milkTrend,
      collectionTrend,
      recent: deliveries.filter((d) => d.date === today).slice(-5).reverse(),
    };
  }, [customers, deliveries, payments, settings, today]);

  /** Search results. Only computed while the field has content. */
  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    const state = { customers, deliveries, payments } as Parameters<typeof outstanding>[0];
    return customers
      .filter(
        (c) => c.name.toLowerCase().includes(needle) || c.phone.includes(needle),
      )
      .map((c) => ({ customer: c, balance: outstanding(state, c.id) }));
  }, [query, customers, deliveries, payments]);

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  /**
   * Quick access tiles. Tinted from the accent palette and the shared status
   * colours rather than four hardcoded hex pairs, so they follow the theme.
   *
   * Reports moved under the More tab in the navigation restructure.
   */
  const shortcuts = [
    { label: t('nav.delivery'), icon: Truck, href: '/delivery', tint: accent.color, wash: accent.soft },
    { label: t('nav.customers'), icon: Users, href: '/customers', tint: Colors.info, wash: Colors.infoSoft },
    { label: t('nav.billing'), icon: Wallet, href: '/billing', tint: Colors.success, wash: Colors.successSoft },
    { label: t('title.reports'), icon: FileText, href: '/reports', tint: Colors.warning, wash: Colors.warningSoft },
  ] as const;

  const progressPct = Math.round(stats.progress * 100);

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* ── Greeting bar ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.identity}>
            <PressableScale onPress={() => (navigation as any).toggleDrawer()}>
              <Avatar name={settings.ownerName} size={44} />
            </PressableScale>
            <View style={styles.identityText}>
              <Text style={styles.dateDisplay} numberOfLines={1}>
                {dateLabel}
              </Text>
            </View>
          </View>

          <PressableScale
            onPress={() => nav.navigate('/delivery')}
            scale={0.9}
            accessibilityRole="button"
            accessibilityLabel={
              stats.pending > 0
                ? `${stats.pending} deliveries pending`
                : 'All deliveries done'
            }
          >
            <AppGlassMaterial level="standard" style={styles.bell}>
              <Bell size={20} color={Colors.foreground} />
              {stats.pending > 0 ? (
                <View style={styles.bellDot}>
                  <Text style={styles.bellCount} allowFontScaling={false}>
                    {stats.pending > 9 ? '9+' : stats.pending}
                  </Text>
                </View>
              ) : null}
            </AppGlassMaterial>
          </PressableScale>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchWrap}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('placeholder.searchCustomers')}
          />
        </View>

        {searchResults ? (
          /* ── Search results replace the dashboard while a query is active ── */
          <View style={styles.section}>
            <SectionHeading title={`${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`} />
            {searchResults.map(({ customer, balance }, index) => (
              <ListItem key={customer.id} index={index} style={styles.resultWrap}>
                <PressableCard
                  onPress={() => nav.push(`/customers/${customer.id}`)}
                  accessibilityLabel={`${customer.name}, balance ${money0(balance)}`}
                  padding={14}
                >
                  <View style={styles.resultRow}>
                    <Avatar name={customer.name} size={44} />
                    <View style={styles.resultText}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {customer.name}
                      </Text>
                      <Text style={styles.resultMeta}>{customer.phone}</Text>
                    </View>
                    <Text
                      style={[
                        styles.resultBalance,
                        { color: balance > 0 ? Colors.danger : Colors.success },
                      ]}
                    >
                      {money0(balance)}
                    </Text>
                    <ChevronRight size={16} color={Colors.border} />
                  </View>
                </PressableCard>
              </ListItem>
            ))}

            {searchResults.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('state.noMatches')}
                description="Try a different name or phone number."
              />
            ) : null}
          </View>
        ) : (
          <>
            {/* ── Hero: today's round ── */}
            <View style={styles.section}>
              <View style={styles.heroShadow}>
                <LinearGradient
                  colors={[accent.dark, accent.color, `${accent.color}CC`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.hero}
                >
                  <View style={styles.heroBody}>
                    <AppGlassMaterial level="light" style={styles.heroChip}>
                      <Text style={styles.heroChipText}>{dateLabel}</Text>
                    </AppGlassMaterial>

                    <Text style={styles.heroLabel}>{t('label.pendingDeliveries')}</Text>

                    <View style={styles.heroCountRow}>
                      <AnimatedValueText
                        value={stats.pending}
                        format={(n) => String(n)}
                        style={styles.heroCount}
                      />
                      <Text style={styles.heroTotal}>/ {stats.totalSlots}</Text>
                    </View>

                    <View style={styles.heroTrack}>
                      <View style={[styles.heroFill, { width: `${progressPct}%` }]} />
                    </View>

                    <View style={styles.heroMetaRow}>
                      <Text style={styles.heroMeta}>{stats.delivered} delivered</Text>
                      <Text style={styles.heroMeta}>{progressPct}% done</Text>
                    </View>

                    <PressableScale
                      onPress={() => nav.navigate('/delivery')}
                      accessibilityRole="button"
                      accessibilityLabel="Start delivery"
                    >
                      <AppGlassMaterial level="light" style={styles.heroCta}>
                        <Truck size={16} color="white" />
                        <Text style={styles.heroCtaText}>{t('action.startDelivery')}</Text>
                        <ChevronRight size={14} color="rgba(255,255,255,0.85)" />
                      </AppGlassMaterial>
                    </PressableScale>
                  </View>

                  <Image
                    // Depth accounts for this screen living in `src/app/(drawer)/(tabs)/`.
                    source={require('../../../../assets/images/onboarding.png')}
                    style={styles.heroArt}
                    resizeMode="contain"
                    accessible={false}
                  />
                </LinearGradient>
              </View>
            </View>

            {/* ── Today at a glance ── */}
            <View style={styles.section}>
              <Card padding={0} radius="lg">
                <View style={styles.statStrip}>
                  <StatCell
                    icon={Milk}
                    tint={accent.color}
                    wash={accent.soft}
                    label={t('label.milkToday')}
                    value={stats.milkToday}
                    format={(n) => `${n.toFixed(1)} L`}
                  />
                  <View style={styles.statDivider} />
                  <StatCell
                    icon={IndianRupee}
                    tint={Colors.info}
                    wash={Colors.infoSoft}
                    label={t('label.collected')}
                    value={stats.collectedToday}
                    format={money0}
                  />
                  <View style={styles.statDivider} />
                  <StatCell
                    icon={UserPlus}
                    tint={Colors.success}
                    wash={Colors.successSoft}
                    label={t('label.active')}
                    value={stats.activeCount}
                    format={(n) => String(n)}
                  />
                </View>
              </Card>
            </View>

            {/* ── Shortcuts ── */}
            <View style={styles.section}>
              <SectionHeading title={t('section.quickAccess')} />
              <View style={styles.shortcuts}>
                {shortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <PressableScale
                      key={shortcut.label}
                      onPress={() => nav.navigate(shortcut.href)}
                      accessibilityRole="button"
                      accessibilityLabel={shortcut.label}
                      style={styles.shortcut}
                    >
                      <View style={[styles.shortcutTile, { backgroundColor: shortcut.wash }]}>
                        <Icon size={26} color={shortcut.tint} />
                      </View>
                      <Text
                        style={styles.shortcutLabel}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.3}
                      >
                        {shortcut.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* ── Trends ── */}
            <View style={styles.section}>
              <SectionHeading title={t('section.last7Days')} />
              <View style={styles.trendRow}>
                <Card radius="lg" padding={16} style={styles.trendCard}>
                  <Text style={[styles.trendLabel, { color: accent.color }]}>{t('label.milk')}</Text>
                  <AnimatedValueText
                    value={stats.milkToday}
                    format={(n) => `${n.toFixed(1)} L`}
                    style={styles.trendValue}
                  />
                  <Sparkline data={stats.milkTrend} color={accent.color} />
                </Card>

                <Card radius="lg" padding={16} style={styles.trendCard}>
                  <Text style={[styles.trendLabel, { color: Colors.info }]}>{t('label.collection')}</Text>
                  <AnimatedValueText
                    value={stats.collectedToday}
                    format={money0}
                    style={styles.trendValue}
                  />
                  <Sparkline data={stats.collectionTrend} color={Colors.info} />
                </Card>
              </View>
            </View>

            {/* ── Money ── */}
            <View style={styles.section}>
              <SectionHeading title={t('section.money')} />
              <Card padding={0} radius="lg">
                <View style={styles.moneyList}>
                  <MoneyRow
                    icon={IndianRupee}
                    tint={Colors.info}
                    wash={Colors.infoSoft}
                    label={t('label.dueThisMonth')}
                    value={stats.monthDue}
                    valueColor={stats.monthDue > 0 ? Colors.danger : Colors.success}
                  />
                  <MoneyRow
                    icon={Wallet}
                    tint={stats.totalDue > 0 ? Colors.danger : Colors.success}
                    wash={stats.totalDue > 0 ? Colors.dangerSoft : Colors.successSoft}
                    label={t('label.totalOutstanding')}
                    value={stats.totalDue}
                    valueColor={stats.totalDue > 0 ? Colors.danger : Colors.success}
                  />
                  {stats.highBalance > 0 ? (
                    <MoneyRow
                      icon={AlertCircle}
                      tint={Colors.warning}
                      wash={Colors.warningSoft}
                      label="Customers over ₹500"
                      value={stats.highBalance}
                      valueColor={Colors.warning}
                      format={(n) => String(n)}
                      last
                    />
                  ) : null}
                </View>
              </Card>
            </View>

            {/* ── Activity ── */}
            <View style={styles.section}>
              <SectionHeading
                title={t('section.recentActivity')}
                action={
                  <PressableScale
                    onPress={() => nav.navigate('/delivery')}
                    accessibilityRole="button"
                    accessibilityLabel="View all deliveries"
                  >
                    <Text style={[styles.viewAll, { color: accent.color }]}>
                      {t('action.viewAll')}
                    </Text>
                  </PressableScale>
                }
              />

              {stats.recent.length === 0 ? (
                <EmptyState
                  icon={Truck}
                  title={t('state.nothingToday')}
                  description="Marked deliveries will show up here."
                />
              ) : (
                <Card padding={0} radius="lg">
                  {stats.recent.map((record, index) => {
                    const customer = customers.find((c) => c.id === record.customerId);
                    const isLast = index === stats.recent.length - 1;

                    return (
                      <ListItem
                        key={record.id}
                        index={index}
                        style={[styles.activityRow, isLast ? null : styles.activityBordered]}
                      >
                        <View
                          style={[
                            styles.activityIcon,
                            {
                              backgroundColor:
                                record.status === 'delivered'
                                  ? accent.soft
                                  : record.status === 'not_delivered'
                                    ? Colors.dangerSoft
                                    : Colors.warningSoft,
                            },
                          ]}
                        >
                          <Truck
                            size={17}
                            color={
                              record.status === 'delivered'
                                ? accent.color
                                : record.status === 'not_delivered'
                                  ? Colors.danger
                                  : Colors.warning
                            }
                          />
                        </View>

                        <View style={styles.activityText}>
                          <Text style={styles.activityTitle} numberOfLines={1}>
                            {record.slot === 'morning' ? 'Morning' : 'Evening'}
                            {customer ? ` · ${customer.name}` : ''}
                          </Text>
                          <Text style={styles.activityMeta} numberOfLines={1}>
                            {record.qty.toFixed(1)} L · {money0(record.qty * record.rate)}
                          </Text>
                        </View>

                        <DeliveryStatusBadge status={record.status} />
                      </ListItem>
                    );
                  })}
                </Card>
              )}
            </View>

            {stats.totalSlots === 0 ? (
              <View style={styles.section}>
                <EmptyState
                  icon={UserPlus}
                  title="No deliveries scheduled"
                  description="Add a customer with a daily quantity to start a round."
                />
              </View>
            ) : null}

            <View style={styles.footer}>
              <Badge label={`${settings.dairyName} · Pro`} tone="accent" />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/* ─── Local pieces ───────────────────────────────────────────────────────── */

function StatCell({
  icon: Icon,
  tint,
  wash,
  label,
  value,
  format,
}: {
  icon: typeof Milk;
  tint: string;
  wash: string;
  label: string;
  value: number;
  format: (value: number) => string;
}) {
  return (
    <View style={styles.statCell}>
      <View style={[styles.statIcon, { backgroundColor: wash }]}>
        <Icon size={16} color={tint} />
      </View>
      <AnimatedValueText value={value} format={format} style={styles.statValue} />
      <Text style={styles.statLabel} numberOfLines={2} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

function MoneyRow({
  icon: Icon,
  tint,
  wash,
  label,
  value,
  valueColor,
  format = money0,
  last = false,
}: {
  icon: typeof Wallet;
  tint: string;
  wash: string;
  label: string;
  value: number;
  valueColor: string;
  format?: (value: number) => string;
  last?: boolean;
}) {
  return (
    <View style={[styles.moneyRow, last ? null : styles.moneyBordered]}>
      <View style={[styles.moneyIcon, { backgroundColor: wash }]}>
        <Icon size={16} color={tint} />
      </View>
      <Text style={styles.moneyLabel} numberOfLines={1}>
        {label}
      </Text>
      <AnimatedValueText
        value={value}
        format={format}
        style={[styles.moneyValue, { color: valueColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /* Greeting */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.gutter,
    paddingBottom: 14,
    gap: 12,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  identityText: {
    flex: 1,
  },
  dateDisplay: {
    ...Type.bodyStrong,
    fontSize: 18,
    color: Colors.foreground,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  bellCount: {
    fontSize: 8,
    fontWeight: '900',
    color: 'white',
  },

  /* Layout */
  searchWrap: {
    paddingHorizontal: Layout.gutter,
    marginBottom: 20,
  },
  section: {
    paddingHorizontal: Layout.gutter,
    marginBottom: 24,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },

  /* Hero */
  heroShadow: {
    borderRadius: Radius.xxl,
    ...cardShadow,
  },
  hero: {
    borderRadius: Radius.xxl,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  heroBody: {
    flex: 1,
  },
  heroChip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  heroChipText: {
    ...Type.micro,
    color: 'white',
  },
  heroLabel: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 2,
    marginBottom: 12,
  },
  heroCount: {
    fontSize: 40,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  heroTotal: {
    ...Type.body,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  heroTrack: {
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  heroFill: {
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: 'white',
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
    marginBottom: 16,
  },
  heroMeta: {
    ...Type.micro,
    color: 'rgba(255,255,255,0.75)',
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroCtaText: {
    ...Type.callout,
    fontWeight: '800',
    color: 'white',
  },
  heroArt: {
    width: 118,
    height: 168,
    alignSelf: 'flex-end',
    marginRight: -8,
    marginBottom: -20,
  },

  /* Stat strip */
  statStrip: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
    gap: 6,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...Type.bodyStrong,
    fontWeight: '800',
    color: Colors.foreground,
  },
  statLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },

  /* Shortcuts */
  shortcuts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shortcut: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  shortcutTile: {
    width: 62,
    height: 62,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardBorder,
    ...softShadow,
  },
  shortcutLabel: {
    ...Type.footnote,
    fontWeight: '700',
    color: Colors.foreground,
  },

  /* Trends */
  trendRow: {
    flexDirection: 'row',
    gap: 14,
  },
  trendCard: {
    flex: 1,
    overflow: 'hidden',
  },
  trendLabel: {
    ...Type.micro,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 12,
  },

  /* Money */
  moneyList: {
    paddingHorizontal: 16,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  moneyBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  moneyIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moneyLabel: {
    ...Type.caption,
    color: Colors.mutedForeground,
    flex: 1,
  },
  moneyValue: {
    ...Type.callout,
    fontWeight: '800',
  },

  /* Activity */
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  activityBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    ...Type.callout,
    fontWeight: '700',
    color: Colors.foreground,
  },
  activityMeta: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  viewAll: {
    ...Type.caption,
    fontWeight: '800',
  },

  /* Search results */
  resultWrap: {
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    ...Type.bodyStrong,
    color: Colors.foreground,
  },
  resultMeta: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  resultBalance: {
    ...Type.body,
    fontWeight: '800',
  },
});
