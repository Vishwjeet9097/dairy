/**
 * Customers — tab root.
 *
 * The list keeps its scroll position and search text across tab switches
 * because the tab's stack stays mounted; nothing here has to persist state
 * explicitly.
 */

import { useScrollToTop } from 'expo-router';
import { ChevronRight, Phone, UserPlus, Users } from 'lucide-react-native';
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedValueText, ListItem } from '@/components/motion';
import { DrawerToggleButton } from 'expo-router/drawer';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  HeaderAction,
  PressableCard,
  Screen,
  ScreenHeader,
  SearchField,
} from '@/components/ui';
import { Colors, Layout, Type } from '@/constants/theme';
import { money0, outstanding, useDairyStore } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';
import { useState } from 'react';

export default function CustomersScreen() {
  const nav = useNavGuard();
  const t = useT();

  const customers = useDairyStore((s) => s.customers);
  // Balances derive from deliveries and payments, so subscribe to both or the
  // list shows stale figures after recording a payment.
  const deliveries = useDairyStore((s) => s.deliveries);
  const payments = useDairyStore((s) => s.payments);

  const [query, setQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const paddingBottom = useScreenPadding();

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.phone.includes(needle),
    );
  }, [customers, query]);

  /**
   * Computed once per customer per render against the subscribed slices, rather
   * than by pulling a fresh `getState()` snapshot inside the render loop as
   * before — that pattern read values React had not been told about, so the
   * balances could lag a frame behind the data.
   */
  const balances = useMemo(() => {
    const state = { customers, deliveries, payments } as Parameters<typeof outstanding>[0];
    const map = new Map<string, number>();
    for (const customer of customers) {
      map.set(customer.id, outstanding(state, customer.id));
    }
    return map;
  }, [customers, deliveries, payments]);

  const activeCount = customers.filter((c) => !c.paused).length;

  return (
    <Screen statusBar="light">
      <ScreenHeader
        title={t('title.customers')}
        subtitle={`${activeCount} active · ${customers.length} total`}
        leftAction={<DrawerToggleButton tintColor="#FFF" />}
        action={
          <HeaderAction
            icon={UserPlus}
            onPress={() => nav.push('/customers/new')}
            accessibilityLabel={t('title.addCustomer')}
          />
        }
      >
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('placeholder.searchNameOrPhone')}
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
                <PressableCard
                  onPress={() => nav.push(`/customers/${customer.id}`)}
                  accessibilityLabel={`${customer.name}, balance ${money0(balance)}`}
                  padding={14}
                >
                  <View style={styles.row}>
                    <Avatar name={customer.name} size={50} />

                    <View style={styles.rowText}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>
                          {customer.name}
                        </Text>
                        {customer.paused ? <Badge label={t('label.paused')} tone="warning" /> : null}
                      </View>
                      <View style={styles.phoneRow}>
                        <Phone size={12} color={Colors.mutedForeground} />
                        <Text style={styles.phone} numberOfLines={1}>
                          {customer.phone}
                        </Text>
                      </View>
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
                      <Text style={styles.balanceLabel}>{t('label.balance')}</Text>
                    </View>

                    <ChevronRight size={18} color={Colors.border} />
                  </View>
                </PressableCard>
              </ListItem>
            );
          })}

          {list.length === 0 ? (
            <EmptyState
              icon={Users}
              title={query ? t('state.noMatches') : t('state.noCustomers')}
              description={
                query
                  ? 'Try a different name or phone number.'
                  : 'Add your first customer to start tracking deliveries.'
              }
              action={
                query ? undefined : (
                  <Button
                    label={t('title.addCustomer')}
                    onPress={() => nav.push('/customers/new')}
                    icon={UserPlus}
                    size="lg"
                    full
                  />
                )
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  name: {
    ...Type.bodyStrong,
    color: Colors.foreground,
    flexShrink: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phone: {
    ...Type.footnote,
    color: Colors.mutedForeground,
  },
  balanceWrap: {
    alignItems: 'flex-end',
  },
  balance: {
    ...Type.body,
    fontWeight: '800',
  },
  balanceLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 1,
  },
});
