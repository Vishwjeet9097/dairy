/**
 * Bill — full-screen document view.
 *
 * Listed in `FULL_SCREEN_ROUTES`: an invoice is read as a document, so the bottom
 * navigation steps aside and gives the breakdown the full height.
 *
 * `generateBill` writes to the store, so it is only ever called from an event
 * handler — never during render. The screen shows an existing bill for the
 * selected period if there is one, and otherwise offers to create it. That also
 * makes the destructive-ish "recalculate" action explicit rather than something
 * that silently happens on mount.
 */

import { useLocalSearchParams } from 'expo-router';
import {
  CalendarRange,
  Check,
  FileText,
  RefreshCw,
  Share2,
  UserX,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedValueText, PressableScale, useFeedback } from '@/components/motion';
import {
  AppBar,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Divider,
  EmptyState,
  Screen,
  SectionLabel,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import {
  formatMonthLabel,
  money0,
  monthEnd,
  monthStart,
  prevMonthISO,
  todayISO,
  useDairyStore,
} from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { shareBill } from '@/lib/share';

/** How many recent months are offered in the period picker. */
const MONTH_OPTIONS = 6;

export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavGuard();
  const t = useT();
  const feedback = useFeedback();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();

  const customers = useDairyStore((s) => s.customers);
  const bills = useDairyStore((s) => s.bills);
  const settings = useDairyStore((s) => s.settings);
  const generateBill = useDairyStore((s) => s.generateBill);
  const updateBillStatus = useDairyStore((s) => s.updateBillStatus);

  // Defaults to the previous full month — the period you'd normally bill for.
  const [month, setMonth] = useState(() => prevMonthISO(todayISO()).slice(0, 7));
  const [pickerVisible, setPickerVisible] = useState(false);

  const customer = customers.find((c) => c.id === id);

  const months = useMemo(() => {
    const list: string[] = [];
    let cursor = todayISO();
    for (let index = 0; index < MONTH_OPTIONS; index += 1) {
      list.push(cursor.slice(0, 7));
      cursor = prevMonthISO(cursor);
    }
    return list;
  }, []);

  const periodFrom = monthStart(month);
  const periodTo = monthEnd(month);

  const bill = useMemo(
    () =>
      bills.find(
        (b) => b.customerId === id && b.periodFrom === periodFrom && b.periodTo === periodTo,
      ),
    [bills, id, periodFrom, periodTo],
  );

  if (!customer) {
    return (
      <Screen>
        <AppBar title={t('title.generateBill')} backIcon={X} />
        <View style={styles.notFound}>
          <EmptyState
            icon={UserX}
            title={t('state.customerNotFound')}
            action={<Button label={t('action.back')} onPress={nav.back} size="lg" full />}
          />
        </View>
      </Screen>
    );
  }

  const handleGenerate = () => {
    const created = generateBill(customer.id, periodFrom, periodTo);
    feedback.success(
      `Bill for ${formatMonthLabel(month)} · ${money0(created.finalDue)} due`,
    );
  };

  const handleMarkPaid = () => {
    if (!bill) return;
    updateBillStatus(bill.id, 'paid');
    feedback.success(t('success.billMarkedPaid'));
  };

  const statusTone =
    bill?.status === 'paid' ? 'success' : bill?.status === 'partially_paid' ? 'warning' : 'danger';

  const statusLabel =
    bill?.status === 'paid'
      ? t('status.paid')
      : bill?.status === 'partially_paid'
        ? t('status.partiallyPaid')
        : t('status.unpaid');

  return (
    <Screen>
      <AppBar title={t('title.generateBill')} backIcon={X} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer */}
        <Card radius="xxl" padding={20} style={styles.card}>
          <View style={styles.customerRow}>
            <Avatar name={customer.name} size={52} />
            <View style={styles.customerText}>
              <Text style={styles.customerName} numberOfLines={1}>
                {customer.name}
              </Text>
              <Text style={styles.customerMeta}>
                ₹{customer.rate}/L · {customer.phone}
              </Text>
            </View>
            {bill ? <Badge label={statusLabel} tone={statusTone} /> : null}
          </View>
        </Card>

        {/* Period */}
        <SectionLabel>{t('section.billingPeriod')}</SectionLabel>
        <PressableScale
          onPress={() => setPickerVisible(true)}
          scale={0.99}
          accessibilityRole="button"
          accessibilityLabel={`Billing period, ${formatMonthLabel(month)}`}
          style={styles.periodButton}
        >
          <View style={[styles.periodIcon, { backgroundColor: accent.soft }]}>
            <CalendarRange size={19} color={accent.color} />
          </View>
          <View style={styles.periodText}>
            <Text style={styles.periodValue}>{formatMonthLabel(month)}</Text>
            <Text style={styles.periodRange}>
              {periodFrom} → {periodTo}
            </Text>
          </View>
          <Text style={[styles.periodChange, { color: accent.color }]}>{t('action.change')}</Text>
        </PressableScale>

        {/* Breakdown */}
        {bill ? (
          <>
            <SectionLabel>{t('section.breakdown')}</SectionLabel>
            <Card padding={20} style={styles.card}>
              <BillRow label={t('section.regularMilk')} value={`${bill.totalQty.toFixed(1)} L`} />
              <BillRow label="Milk charges" value={money0(bill.totalAmount)} />
              {(bill.extraQty ?? 0) > 0 ? (
                <>
                  <BillRow
                    label={t('section.extraMilk')}
                    value={`${(bill.extraQty ?? 0).toFixed(1)} L`}
                  />
                  <BillRow
                    label="Extra milk charges"
                    value={money0(bill.extraAmount ?? 0)}
                  />
                </>
              ) : null}
              <BillRow label="Delivery charge" value={money0(bill.deliveryCharge)} />
              <BillRow
                label="Previous balance"
                value={money0(bill.openingBalanceCarried)}
              />
              <BillRow
                label="Paid this period"
                value={`− ${money0(bill.amountPaidDuringPeriod)}`}
                valueColor={Colors.success}
              />

              <Divider style={styles.totalDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('label.amountDue')}</Text>
                <AnimatedValueText
                  value={bill.finalDue}
                  format={money0}
                  style={[
                    styles.totalValue,
                    { color: bill.finalDue > 0 ? Colors.danger : Colors.success },
                  ]}
                />
              </View>

              <Text style={styles.generatedOn}>
                Generated {new Date(bill.generatedOn).toLocaleString('en-IN')}
              </Text>
            </Card>

            <View style={styles.actions}>
              <Button
                label={t('action.recalculate')}
                onPress={handleGenerate}
                variant="soft"
                icon={RefreshCw}
                style={styles.action}
              />
              <Button
                label={t('action.markPaid')}
                onPress={handleMarkPaid}
                variant="primary"
                icon={Check}
                disabled={bill.status === 'paid'}
                style={styles.action}
              />
            </View>
            <Button
              label={t('action.shareBill')}
              onPress={() => shareBill(bill, customer, settings)}
              variant="outline"
              icon={Share2}
              full
              style={styles.shareButton}
            />
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title={`No bill for ${formatMonthLabel(month)}`}
            description="Generate it to total up this period's deliveries, charges and payments."
            action={
              <Button
                label={t('action.generateBill')}
                onPress={handleGenerate}
                icon={FileText}
                size="lg"
                full
              />
            }
          />
        )}
      </ScrollView>

      {/*
        A sheet rather than another pushed screen: picking a month is a choice
        within this task, not a new destination, so it should not deepen the
        stack or take the invoice off screen.
      */}
      <BottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={t('section.billingPeriod')}
      >
        <View style={{ paddingBottom: insets.bottom > 0 ? 0 : 8 }}>
          {months.map((option) => {
            const selected = option === month;
            return (
              <PressableScale
                key={option}
                onPress={() => {
                  setMonth(option);
                  setPickerVisible(false);
                }}
                scale={0.99}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={formatMonthLabel(option)}
                style={styles.monthRow}
              >
                <Text
                  style={[
                    styles.monthLabel,
                    { color: selected ? accent.color : Colors.foreground },
                  ]}
                >
                  {formatMonthLabel(option)}
                </Text>
                {selected ? <Check size={18} color={accent.color} strokeWidth={3} /> : null}
              </PressableScale>
            );
          })}
        </View>
      </BottomSheet>
    </Screen>
  );
}

function BillRow({
  label,
  value,
  valueColor = Colors.foreground,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.billRow}>
      <Text style={styles.billLabel}>{label}</Text>
      <Text style={[styles.billValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Layout.gutterTight,
    paddingBottom: 40,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    padding: Layout.gutter,
  },
  card: {
    marginBottom: 22,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  customerText: {
    flex: 1,
  },
  customerName: {
    ...Type.bodyStrong,
    color: Colors.foreground,
  },
  customerMeta: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  periodIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    flex: 1,
  },
  periodValue: {
    ...Type.body,
    fontWeight: '800',
    color: Colors.foreground,
  },
  periodRange: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  periodChange: {
    ...Type.caption,
    fontWeight: '800',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
  },
  billLabel: {
    ...Type.callout,
    color: Colors.mutedForeground,
    flex: 1,
  },
  billValue: {
    ...Type.callout,
    fontWeight: '800',
  },
  totalDivider: {
    marginVertical: 14,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    ...Type.body,
    fontWeight: '800',
    color: Colors.foreground,
  },
  totalValue: {
    ...Type.heading,
    fontSize: 22,
    fontWeight: '800',
  },
  generatedOn: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  action: {
    flex: 1,
  },
  shareButton: {
    marginBottom: 0,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  monthLabel: {
    ...Type.body,
    fontWeight: '700',
  },
});
