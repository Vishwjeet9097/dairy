/**
 * Ledger — deliveries and payments, merged chronologically with a running
 * balance.
 *
 * A regular push, not a modal: this is part of the customer's hierarchy and a
 * screen to *read*, so it keeps the bottom navigation. That is the distinction
 * `FULL_SCREEN_ROUTES` encodes — tasks hide the bar, places don't.
 *
 * The running balance is computed oldest-first (so each entry can carry the
 * balance as of that moment) and then reversed for display, because the useful
 * default view is "what happened most recently".
 */

import { useLocalSearchParams } from 'expo-router';
import { BookOpen, Milk, UserX, Wallet } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListItem } from '@/components/motion';
import { AppBar, Badge, Button, Card, EmptyState, Screen, Text } from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { money0, useDairyStore } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

interface LedgerEntry {
  key: string;
  date: string;
  kind: 'delivery' | 'payment';
  description: string;
  detail?: string;
  /** Positive increases what is owed, negative reduces it. */
  delta: number;
  balanceAfter: number;
  skipped?: boolean;
}

export default function LedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavGuard();
  const t = useT();
  const { accent } = useAppTheme();

  const customers = useDairyStore((s) => s.customers);
  const deliveries = useDairyStore((s) => s.deliveries);
  const payments = useDairyStore((s) => s.payments);

  const paddingBottom = useScreenPadding();
  const customer = customers.find((c) => c.id === id);

  const entries = useMemo<LedgerEntry[]>(() => {
    if (!customer) return [];

    const rows: Omit<LedgerEntry, 'balanceAfter'>[] = [];

    for (const record of deliveries) {
      if (record.customerId !== customer.id) continue;
      // Only delivered milk is billable; pending and skipped slots are shown
      // for context but move the balance by zero.
      const billable = record.status === 'delivered';
      rows.push({
        key: `d-${record.id}`,
        date: record.date,
        kind: 'delivery',
        description: `${record.slot === 'morning' ? 'Morning' : 'Evening'} delivery`,
        detail: `${record.qty.toFixed(1)} L × ₹${record.rate}`,
        delta: billable ? record.qty * record.rate : 0,
        skipped: !billable,
      });
    }

    for (const payment of payments) {
      if (payment.customerId !== customer.id) continue;
      rows.push({
        key: `p-${payment.id}`,
        date: payment.date,
        kind: 'payment',
        description: `Payment · ${payment.method.toUpperCase()}`,
        detail: payment.notes,
        delta: -payment.amount,
      });
    }

    // Oldest first so the running balance accumulates correctly. Payments sort
    // after deliveries on the same date, which matches how a day actually runs.
    rows.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.kind === b.kind) return 0;
      return a.kind === 'delivery' ? -1 : 1;
    });

    let balance = customer.openingBalance ?? 0;
    const withBalance = rows.map((row) => {
      balance += row.delta;
      return { ...row, balanceAfter: balance };
    });

    // Newest first for display.
    return withBalance.reverse();
  }, [customer, deliveries, payments]);

  if (!customer) {
    return (
      <Screen>
        <AppBar title={t('title.ledger')} />
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

  const closingBalance = entries[0]?.balanceAfter ?? customer.openingBalance ?? 0;

  return (
    <Screen>
      <AppBar title={t('title.ledger')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <Card radius="xxl" padding={20} style={styles.summary}>
          <Text style={styles.summaryName} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={styles.summaryLabel}>{t('label.currentBalance')}</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: closingBalance > 0 ? Colors.danger : Colors.success },
            ]}
          >
            {money0(closingBalance)}
          </Text>
          <Text style={styles.summaryMeta}>
            Opening {money0(customer.openingBalance ?? 0)} · {entries.length} entries
          </Text>
        </Card>

        {entries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('state.noActivity')}
            description="Deliveries and payments will appear here as they are recorded."
          />
        ) : (
          entries.map((entry, index) => {
            const isPayment = entry.kind === 'payment';
            const Icon = isPayment ? Wallet : Milk;

            return (
              <ListItem key={entry.key} index={index} style={styles.rowWrap}>
                <Card padding={14}>
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.rowIcon,
                        {
                          backgroundColor: isPayment
                            ? Colors.successSoft
                            : entry.skipped
                              ? Colors.dangerSoft
                              : accent.soft,
                        },
                      ]}
                    >
                      <Icon
                        size={17}
                        color={
                          isPayment
                            ? Colors.success
                            : entry.skipped
                              ? Colors.danger
                              : accent.color
                        }
                      />
                    </View>

                    <View style={styles.rowText}>
                      <View style={styles.rowTitleLine}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {entry.description}
                        </Text>
                        {entry.skipped ? (
                          <Badge label={t('status.notDelivered')} tone="danger" />
                        ) : null}
                      </View>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {entry.date}
                        {entry.detail ? ` · ${entry.detail}` : ''}
                      </Text>
                    </View>

                    <View style={styles.rowAmounts}>
                      <Text
                        style={[
                          styles.rowDelta,
                          {
                            color: entry.delta < 0
                              ? Colors.success
                              : entry.delta > 0
                                ? Colors.foreground
                                : Colors.mutedForeground,
                          },
                        ]}
                      >
                        {entry.delta < 0 ? '−' : entry.delta > 0 ? '+' : ''}
                        {money0(Math.abs(entry.delta))}
                      </Text>
                      <Text style={styles.rowBalance}>{money0(entry.balanceAfter)}</Text>
                    </View>
                  </View>
                </Card>
              </ListItem>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Layout.gutterTight,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    padding: Layout.gutter,
  },
  summary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryName: {
    ...Type.bodyStrong,
    color: Colors.foreground,
    marginBottom: 10,
  },
  summaryLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
  },
  summaryValue: {
    ...Type.title,
    fontSize: 30,
    marginTop: 4,
  },
  summaryMeta: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    marginTop: 10,
  },
  rowWrap: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    ...Type.callout,
    fontWeight: '700',
    color: Colors.foreground,
    flexShrink: 1,
  },
  rowMeta: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  rowAmounts: {
    alignItems: 'flex-end',
  },
  rowDelta: {
    ...Type.callout,
    fontWeight: '800',
  },
  rowBalance: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
});
