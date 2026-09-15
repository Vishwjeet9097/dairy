/**
 * Payment history.
 *
 * A push that keeps the bottom navigation, same reasoning as the ledger: a list
 * to read, not a task to complete.
 *
 * Newly recorded payments animate into place via `ListItem`'s layout transition,
 * so returning here after recording one shows the new row arriving rather than
 * the list silently jumping.
 */

import { useLocalSearchParams } from 'expo-router';
import {
  Banknote,
  Building2,
  Smartphone,
  UserX,
  Wallet,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListItem } from '@/components/motion';
import {
  AppBar,
  Button,
  Card,
  EmptyState,
  Screen,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { money0, useDairyStore, type PaymentMethod } from '@/lib/dairy-store';
import { useT, type TranslationKey } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  upi: Smartphone,
  bank: Building2,
};

const METHOD_LABEL: Record<PaymentMethod, TranslationKey> = {
  cash: 'label.cash',
  upi: 'label.upi',
  bank: 'label.bank',
};

export default function PaymentHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavGuard();
  const t = useT();
  const { accent } = useAppTheme();

  const customers = useDairyStore((s) => s.customers);
  const payments = useDairyStore((s) => s.payments);

  const paddingBottom = useScreenPadding();
  const customer = customers.find((c) => c.id === id);

  const { history, total } = useMemo(() => {
    const rows = payments
      .filter((payment) => payment.customerId === id)
      // Newest first.
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return {
      history: rows,
      total: rows.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [payments, id]);

  if (!customer) {
    return (
      <Screen>
        <AppBar title={t('title.paymentHistory')} />
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

  return (
    <Screen>
      <AppBar title={t('title.paymentHistory')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Card radius="xxl" padding={20} style={styles.summary}>
          <Text style={styles.summaryName} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={styles.summaryLabel}>{t('label.totalReceived')}</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            {money0(total)}
          </Text>
          <Text style={styles.summaryMeta}>
            {history.length} {history.length === 1 ? 'payment' : 'payments'}
          </Text>
        </Card>

        {history.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t('state.noPayments')}
            description="Recorded payments will appear here."
            action={
              <Button
                label={t('title.addPayment')}
                onPress={() => nav.push(`/customers/${customer.id}/payment`)}
                icon={Wallet}
                size="lg"
                full
              />
            }
          />
        ) : (
          history.map((payment, index) => {
            const Icon = METHOD_ICON[payment.method];

            return (
              <ListItem key={payment.id} index={index} style={styles.rowWrap}>
                <Card padding={14}>
                  <View style={styles.row}>
                    <View style={[styles.rowIcon, { backgroundColor: accent.soft }]}>
                      <Icon size={18} color={accent.color} />
                    </View>

                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{t(METHOD_LABEL[payment.method])}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {new Date(`${payment.date}T00:00:00`).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {payment.notes ? ` · ${payment.notes}` : ''}
                      </Text>
                    </View>

                    <Text style={styles.rowAmount}>{money0(payment.amount)}</Text>
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
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...Type.callout,
    fontWeight: '700',
    color: Colors.foreground,
  },
  rowMeta: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  rowAmount: {
    ...Type.body,
    fontWeight: '800',
    color: Colors.success,
  },
});
