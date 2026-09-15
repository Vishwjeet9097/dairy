/**
 * Record a payment — full-screen workflow.
 *
 * One of the two things this app is opened to do, and it was linked from three
 * places while the file did not exist, so every one of those taps dead-ended.
 *
 * The "remaining after this payment" figure updates live as the amount is typed,
 * through `AnimatedValueText`. That is the whole point of the screen made
 * visible: the user is not entering an abstract number, they are settling a
 * balance, and they can watch it settle before committing.
 */

import { useLocalSearchParams } from 'expo-router';
import {
  Banknote,
  Building2,
  CheckCircle2,
  IndianRupee,
  Smartphone,
  StickyNote,
  UserX,
  Wallet,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedValueText, PressableScale, useFeedback } from '@/components/motion';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  Screen,
  SectionLabel,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import {
  money0,
  outstanding,
  todayISO,
  useDairyStore,
  type PaymentMethod,
} from '@/lib/dairy-store';
import { useT, type TranslationKey } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';

const METHODS: {
  value: PaymentMethod;
  labelKey: TranslationKey;
  icon: typeof Banknote;
}[] = [
  { value: 'cash', labelKey: 'label.cash', icon: Banknote },
  { value: 'upi', labelKey: 'label.upi', icon: Smartphone },
  { value: 'bank', labelKey: 'label.bank', icon: Building2 },
];

/** Quick-fill fractions of the outstanding balance. */
const PRESETS: { labelKey: TranslationKey; fraction: number }[] = [
  { labelKey: 'label.full', fraction: 1 },
  { labelKey: 'label.half', fraction: 0.5 },
];

export default function AddPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavGuard();
  const t = useT();
  const feedback = useFeedback();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();

  const customers = useDairyStore((s) => s.customers);
  const deliveries = useDairyStore((s) => s.deliveries);
  const payments = useDairyStore((s) => s.payments);
  const addPayment = useDairyStore((s) => s.addPayment);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>();

  const customer = customers.find((c) => c.id === id);

  const balance = useMemo(() => {
    if (!customer) return 0;
    const state = { customers, deliveries, payments } as Parameters<typeof outstanding>[0];
    return outstanding(state, customer.id);
  }, [customer, customers, deliveries, payments]);

  if (!customer) {
    return (
      <Screen>
        <AppBar title={t('title.addPayment')} backIcon={X} />
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

  const parsedAmount = parseFloat(amount) || 0;
  // Clamped at zero: an overpayment leaves a zero balance, not a negative one
  // rendered in red as though it were a debt.
  const remaining = Math.max(0, balance - parsedAmount);
  const isOverpayment = parsedAmount > balance && balance > 0;

  const handleSave = () => {
    if (parsedAmount <= 0) {
      setError(t('error.validAmount'));
      feedback.error(t('error.validAmount'));
      return;
    }

    addPayment({
      customerId: customer.id,
      date: todayISO(),
      amount: parsedAmount,
      method,
      notes: notes.trim() || undefined,
    });

    /**
     * Dismiss, then confirm. The detail screen underneath is already subscribed
     * to `payments`, so its balance animates to the new figure as this screen
     * slides away — the banner confirms what the user just watched happen.
     */
    nav.dismiss();
    feedback.success(`${money0(parsedAmount)} received from ${customer.name}`);
  };

  return (
    <Screen>
      <AppBar title={t('title.addPayment')} backIcon={X} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Who and how much is owed */}
          <Card radius="xxl" padding={20} style={styles.customerCard}>
            <View style={styles.customerRow}>
              <Avatar name={customer.name} size={52} />
              <View style={styles.customerText}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {customer.name}
                </Text>
                <Text style={styles.customerPhone}>{customer.phone}</Text>
              </View>
            </View>

            <View style={styles.balanceRow}>
              <View style={styles.balanceCell}>
                <Text style={styles.balanceLabel}>{t('label.outstanding')}</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    { color: balance > 0 ? Colors.danger : Colors.success },
                  ]}
                >
                  {money0(balance)}
                </Text>
              </View>

              <View style={styles.balanceDivider} />

              <View style={styles.balanceCell}>
                <Text style={styles.balanceLabel}>{t('label.afterPayment')}</Text>
                {/* Live preview — the reason this screen exists, made visible. */}
                <AnimatedValueText
                  value={remaining}
                  format={money0}
                  style={[
                    styles.balanceValue,
                    { color: remaining > 0 ? Colors.warning : Colors.success },
                  ]}
                />
              </View>
            </View>
          </Card>

          {/* Amount */}
          <SectionLabel>{t('section.amount')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <Field
              icon={IndianRupee}
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                if (error) setError(undefined);
              }}
              placeholder="0"
              keyboardType="decimal-pad"
              error={error}
              autoFocus
            />

            {balance > 0 ? (
              <View style={styles.presets}>
                {PRESETS.map((preset) => (
                  <PressableScale
                    key={preset.labelKey}
                    onPress={() => {
                      setAmount(String(Math.round(balance * preset.fraction)));
                      setError(undefined);
                    }}
                    scale={0.96}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(preset.labelKey)}, ${money0(balance * preset.fraction)}`}
                    style={[styles.preset, { backgroundColor: accent.soft }]}
                  >
                    <Text style={[styles.presetLabel, { color: accent.color }]}>
                      {t(preset.labelKey)} · {money0(balance * preset.fraction)}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            ) : null}

            {isOverpayment ? (
              <Text style={styles.overpayment}>
                This is {money0(parsedAmount - balance)} more than the balance. It will
                be carried as credit.
              </Text>
            ) : null}
          </Card>

          {/* Method */}
          <SectionLabel>{t('section.method')}</SectionLabel>
          <Card padding={16} style={styles.card}>
            <View style={styles.methods}>
              {METHODS.map((entry) => {
                const selected = method === entry.value;
                const Icon = entry.icon;
                return (
                  <PressableScale
                    key={entry.value}
                    onPress={() => setMethod(entry.value)}
                    scale={0.96}
                    dim={false}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(entry.labelKey)}
                    style={[
                      styles.method,
                      {
                        backgroundColor: selected ? accent.soft : Colors.surface,
                        borderColor: selected ? accent.color : 'transparent',
                      },
                    ]}
                  >
                    <Icon
                      size={20}
                      color={selected ? accent.color : Colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.methodLabel,
                        { color: selected ? accent.color : Colors.mutedForeground },
                      ]}
                    >
                      {t(entry.labelKey)}
                    </Text>
                    {selected ? (
                      <CheckCircle2 size={14} color={accent.color} />
                    ) : (
                      // Reserves the checkmark's space so selecting a method
                      // cannot resize the row and nudge its siblings.
                      <View style={styles.checkPlaceholder} />
                    )}
                  </PressableScale>
                );
              })}
            </View>
          </Card>

          {/* Notes */}
          <SectionLabel>{t('section.note')}</SectionLabel>
          <Card padding={20}>
            <Field
              icon={StickyNote}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. NEFT reference, part payment"
              multiline
            />
          </Card>
        </ScrollView>

        {/* No tab bar on this route, so only the device inset applies. */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <Button
            label={`Record ${parsedAmount > 0 ? money0(parsedAmount) : 'payment'}`}
            onPress={handleSave}
            icon={Wallet}
            size="lg"
            pill
            full
            disabled={parsedAmount <= 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Layout.gutterTight,
    paddingBottom: 32,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    padding: Layout.gutter,
  },
  customerCard: {
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
  customerPhone: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  balanceCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  balanceDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
  },
  balanceLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
  },
  balanceValue: {
    ...Type.subtitle,
    fontWeight: '800',
  },
  card: {
    marginBottom: 22,
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  preset: {
    flex: 1,
    borderRadius: Radius.full,
    paddingVertical: 9,
    alignItems: 'center',
  },
  presetLabel: {
    ...Type.footnote,
    fontWeight: '800',
  },
  overpayment: {
    ...Type.footnote,
    color: Colors.warning,
    marginTop: 12,
    lineHeight: 17,
  },
  methods: {
    gap: 10,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  methodLabel: {
    ...Type.body,
    fontWeight: '700',
    flex: 1,
  },
  checkPlaceholder: {
    width: 14,
    height: 14,
  },
  footer: {
    paddingHorizontal: Layout.gutterTight,
    paddingTop: 14,
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
