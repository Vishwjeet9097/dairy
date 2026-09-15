/**
 * Billing — tab root.
 *
 * Note on cross-tab links: the Bill and Pay actions navigate to
 * `/customers/:id/bill` and `/customers/:id/payment`, which live in the
 * Customers tab. That *switches tabs*, and deliberately so — one canonical route
 * per screen. Duplicating those screens into this stack would put the same route
 * on two stacks at once, and the back path would depend on how the user got
 * there. Switching tabs keeps the destination and its history unambiguous, and
 * the active tab correctly reflects where the user now is.
 */

import { useScrollToTop } from 'expo-router';
import { ChevronRight, FileText, ReceiptText, Wallet } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedValueText, ListItem, PressableScale } from '@/components/motion';
import {
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
  SearchField,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { money0, outstanding, useDairyStore } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

export default function BillingScreen() {
  const nav = useNavGuard();
  const t = useT();

  const customers = useDairyStore((s) => s.customers);
  const deliveries = useDairyStore((s) => s.deliveries);
  const payments = useDairyStore((s) => s.payments);

  const [query, setQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const paddingBottom = useScreenPadding();

  const balances = useMemo(() => {
    const state = { customers, deliveries, payments } as Parameters<typeof outstanding>[0];
    const map = new Map<string, number>();
    for (const customer of customers) {
      map.set(customer.id, outstanding(state, customer.id));
    }
    return map;
  }, [customers, deliveries, payments]);

  const totalOutstanding = useMemo(
    () => [...balances.values()].reduce((sum, value) => sum + value, 0),
    [balances],
  );

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = needle
      ? customers.filter((c) => c.name.toLowerCase().includes(needle))
      : customers;
    // Largest dues first — this screen exists to chase money.
    return [...base].sort(
      (a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0),
    );
  }, [customers, query, balances]);

  return (
    <Screen statusBar="light">
      <ScreenHeader
        title={t('title.billing')}
        subtitle="Dues & collection"
        action={
          <View style={styles.headerIcon}>
            <ReceiptText size={22} color="white" />
          </View>
        }
      >
        <View style={styles.totalPill}>
          <Text style={styles.totalLabel}>{t('label.totalOutstanding')}</Text>
          <AnimatedValueText
            value={totalOutstanding}
            format={money0}
            style={styles.totalValue}
          />
        </View>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('placeholder.searchCustomers')}
          style={styles.search}
        />
      </ScreenHeader>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.overlap}>
          {list.map((customer, index) => {
            const balance = balances.get(customer.id) ?? 0;

            return (
              <ListItem key={customer.id} index={index} style={styles.rowWrap}>
                <Card padding={14}>
                  <PressableScale
                    onPress={() => nav.push(`/customers/${customer.id}`)}
                    scale={0.99}
                    accessibilityRole="button"
                    accessibilityLabel={`${customer.name}, outstanding ${money0(balance)}`}
                    style={styles.row}
                  >
                    <Avatar name={customer.name} size={48} />
                    <View style={styles.rowText}>
                      <Text style={styles.name} numberOfLines={1}>
                        {customer.name}
                      </Text>
                      <Text style={styles.rowCaption}>{t('label.outstanding')}</Text>
                    </View>
                    <View style={styles.balanceWrap}>
                      <AnimatedValueText
                        value={balance}
                        format={money0}
                        style={[
                          styles.balance,
                          { color: balance > 0 ? Colors.danger : Colors.success },
                        ]}
                      />
                    </View>
                    <ChevronRight size={16} color={Colors.border} />
                  </PressableScale>

                  <Divider style={styles.divider} />

                  <View style={styles.actions}>
                    <Button
                      label={t('title.generateBill')}
                      onPress={() => nav.push(`/customers/${customer.id}/bill`)}
                      variant="soft"
                      icon={FileText}
                      style={styles.action}
                    />
                    <Button
                      label={t('title.addPayment')}
                      onPress={() => nav.push(`/customers/${customer.id}/payment`)}
                      variant="primary"
                      icon={Wallet}
                      style={styles.action}
                    />
                  </View>
                </Card>
              </ListItem>
            );
          })}

          {list.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title={query ? t('state.noMatches') : t('state.nothingToBill')}
              description={
                query
                  ? 'Try a different name.'
                  : 'Add customers to start tracking dues.'
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,
  },
  overlap: {
    paddingHorizontal: Layout.gutter,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  totalLabel: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  totalValue: {
    ...Type.subtitle,
    fontWeight: '800',
    color: 'white',
  },
  search: {
    marginTop: 12,
  },
  rowWrap: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  name: {
    ...Type.bodyStrong,
    color: Colors.foreground,
    marginBottom: 2,
  },
  rowCaption: {
    ...Type.footnote,
    color: Colors.mutedForeground,
  },
  balanceWrap: {
    alignItems: 'flex-end',
  },
  balance: {
    ...Type.subtitle,
    fontWeight: '800',
  },
  divider: {
    marginVertical: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    flex: 1,
  },
});
