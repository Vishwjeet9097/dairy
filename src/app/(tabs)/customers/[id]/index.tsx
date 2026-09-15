/**
 * Customer detail.
 *
 * A push inside the Customers tab, so the bottom navigation stays visible — this
 * is a place to be, not a task to finish, and jumping to Delivery from here
 * should stay one tap away.
 *
 * The four action rows used to point at routes that did not exist, so tapping
 * them dead-ended. They are all real screens now.
 */

import { useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  FileText,
  MapPin,
  Milk,
  Pause,
  Pencil,
  Phone,
  Play,
  ReceiptText,
  UserX,
  Wallet,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedValueText, useFeedback } from '@/components/motion';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  NavRow,
  Screen,
} from '@/components/ui';
import { Colors, Layout, Radius, Type, cardBorder } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import {
  milkTypeLabel,
  money0,
  outstanding,
  useDairyStore,
} from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

const ACTION_BAR_HEIGHT = 84;

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavGuard();
  const t = useT();
  const feedback = useFeedback();
  const { accent } = useAppTheme();

  const customers = useDairyStore((s) => s.customers);
  const deliveries = useDairyStore((s) => s.deliveries);
  const payments = useDairyStore((s) => s.payments);
  const togglePause = useDairyStore((s) => s.togglePause);

  const paddingBottom = useScreenPadding() + ACTION_BAR_HEIGHT;

  const customer = customers.find((c) => c.id === id);

  const balance = useMemo(() => {
    if (!customer) return 0;
    const state = { customers, deliveries, payments } as Parameters<typeof outstanding>[0];
    return outstanding(state, customer.id);
  }, [customer, customers, deliveries, payments]);

  if (!customer) {
    return (
      <Screen>
        <AppBar title={t('title.customerDetail')} />
        <View style={styles.notFound}>
          <EmptyState
            icon={UserX}
            title={t('state.customerNotFound')}
            description="This customer may have been deleted."
            action={<Button label={t('action.back')} onPress={nav.back} size="lg" full />}
          />
        </View>
      </Screen>
    );
  }

  const handleTogglePause = () => {
    togglePause(customer.id);
    feedback.success(
      customer.paused
        ? `Deliveries resumed for ${customer.name}`
        : `Deliveries paused for ${customer.name}`,
    );
  };

  return (
    <Screen>
      <AppBar
        title={t('title.customerDetail')}
        right={
          <IconButton
            icon={Pencil}
            onPress={() => nav.push(`/customers/${customer.id}/edit`)}
            accessibilityLabel={t('action.edit')}
          />
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <Card radius="xxl" padding={24} style={styles.profile}>
          <Avatar name={customer.name} size={76} />
          <Text style={styles.name}>{customer.name}</Text>

          {customer.paused ? (
            <Badge label={t('label.paused')} tone="warning" style={styles.pausedBadge} />
          ) : null}

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Phone size={14} color={Colors.mutedForeground} />
              <Text style={styles.metaText}>{customer.phone}</Text>
            </View>
            {customer.address ? (
              <View style={styles.metaItem}>
                <MapPin size={14} color={Colors.mutedForeground} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {customer.address}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.stats}>
          <StatTile label={t('label.morning')} value={`${customer.morningQty} L`} />
          <StatTile label={t('label.evening')} value={`${customer.eveningQty} L`} />
          <View style={styles.statTile}>
            <AnimatedValueText
              value={balance}
              format={money0}
              style={[
                styles.statValue,
                { color: balance > 0 ? Colors.danger : Colors.success },
              ]}
            />
            <Text style={styles.statLabel}>{t('label.balance')}</Text>
          </View>
        </View>

        {/* Rate */}
        <View style={[styles.rate, { backgroundColor: accent.soft }]}>
          <View style={styles.rateLeft}>
            <Milk size={20} color={accent.color} />
            <Text style={[styles.rateLabel, { color: accent.color }]}>
              {milkTypeLabel(customer.milkType)} · {t('label.ratePerLitre')}
            </Text>
          </View>
          <Text style={[styles.rateValue, { color: accent.color }]}>₹{customer.rate}</Text>
        </View>

        {/* Actions */}
        <Card padding={0} style={styles.actions}>
          <View style={styles.actionsInner}>
            <NavRow
              icon={BookOpen}
              iconBackground={accent.soft}
              iconColor={accent.color}
              label={t('title.ledger')}
              onPress={() => nav.push(`/customers/${customer.id}/ledger`)}
            />
            <NavRow
              icon={ReceiptText}
              iconBackground={Colors.warningSoft}
              iconColor={Colors.warning}
              label={t('title.paymentHistory')}
              onPress={() => nav.push(`/customers/${customer.id}/payments`)}
            />
            <NavRow
              icon={FileText}
              iconBackground={Colors.infoSoft}
              iconColor={Colors.info}
              label={t('title.generateBill')}
              onPress={() => nav.push(`/customers/${customer.id}/bill`)}
            />
            <NavRow
              icon={customer.paused ? Play : Pause}
              iconBackground={Colors.dangerSoft}
              iconColor={Colors.danger}
              label={customer.paused ? t('action.resume') : t('action.pause')}
              onPress={handleTogglePause}
              destructive
              showChevron={false}
              last
            />
          </View>
        </Card>
      </ScrollView>

      <ActionBar>
        <Button
          label={t('title.addPayment')}
          onPress={() => nav.push(`/customers/${customer.id}/payment`)}
          icon={Wallet}
          size="lg"
          pill
          full
        />
      </ActionBar>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionBar({ children }: { children: React.ReactNode }) {
  const offset = useScreenPadding();
  return <View style={[styles.actionBar, { bottom: offset }]}>{children}</View>;
}

const styles = StyleSheet.create({
  content: {
    padding: Layout.gutter,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    padding: Layout.gutter,
  },
  profile: {
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    ...Type.heading,
    fontSize: 20,
    color: Colors.foreground,
    marginTop: 14,
    textAlign: 'center',
  },
  pausedBadge: {
    marginTop: 8,
  },
  meta: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
  },
  metaText: {
    ...Type.caption,
    color: Colors.mutedForeground,
    flexShrink: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...cardBorder,
  },
  statValue: {
    ...Type.subtitle,
    fontWeight: '800',
    color: Colors.foreground,
    marginBottom: 4,
  },
  statLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
  },
  rate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  rateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rateLabel: {
    ...Type.callout,
    fontWeight: '700',
    flexShrink: 1,
  },
  rateValue: {
    ...Type.subtitle,
    fontWeight: '800',
  },
  actions: {
    marginBottom: 8,
  },
  actionsInner: {
    paddingHorizontal: 18,
  },
  actionBar: {
    position: 'absolute',
    left: Layout.gutter,
    right: Layout.gutter,
    zIndex: 40,
  },
});
