/**
 * Extra Milk — add an extra milk delivery for any customer on any date.
 *
 * Route: /delivery/extra  (push within the Delivery tab stack)
 *
 * Extra deliveries are separate from regular delivery records so billing can
 * clearly show "Regular: 60 L" vs "Extra: 5 L" without any ambiguity.
 *
 * The form defaults to today's date and the same rate as the selected customer,
 * but both can be overridden — festival orders, guest milk, etc.
 */

import {
  IndianRupee,
  Milk,
  StickyNote,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, useFeedback } from '@/components/motion';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  Field,
  Screen,
  SectionLabel,
  Segmented,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import {
  money0,
  todayISO,
  useDairyStore,
  type Slot,
} from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';

interface Errors {
  customerId?: string;
  qty?: string;
}

export default function ExtraMilkScreen() {
  const nav = useNavGuard();
  const t = useT();
  const feedback = useFeedback();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();

  const customers = useDairyStore((s) => s.customers);
  const addExtra = useDairyStore((s) => s.addExtraDelivery);
  const settings = useDairyStore((s) => s.settings);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [qty, setQty] = useState('1');
  const [slot, setSlot] = useState<Slot>('morning');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const activeCustomers = useMemo(
    () => customers.filter((c) => !c.paused),
    [customers],
  );

  const selectedCustomer = activeCustomers.find((c) => c.id === selectedCustomerId);

  // Pre-fill rate from selected customer
  const rateDefault = selectedCustomer?.rate ?? settings.defaultRate;
  const [rate, setRate] = useState(String(rateDefault));

  // Update rate whenever a different customer is selected
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const c = activeCustomers.find((x) => x.id === customerId);
    if (c) setRate(String(c.rate));
    if (errors.customerId) setErrors((e) => ({ ...e, customerId: undefined }));
  };

  const parsedQty = parseFloat(qty) || 0;
  const parsedRate = parseFloat(rate) || rateDefault;
  const totalValue = parsedQty * parsedRate;

  const validate = (): boolean => {
    const next: Errors = {};
    if (!selectedCustomerId) next.customerId = 'Select a customer';
    if (parsedQty <= 0) next.qty = t('error.extraQtyRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      feedback.error(t('error.checkFields'));
      return;
    }

    addExtra({
      customerId: selectedCustomerId!,
      date,
      slot,
      qty: parsedQty,
      rate: parsedRate,
      notes: notes.trim() || undefined,
    });

    nav.back();
    feedback.success(
      `${parsedQty.toFixed(1)} L extra milk added for ${selectedCustomer?.name} · ${money0(totalValue)}`,
    );
  };

  return (
    <Screen>
      <AppBar title={t('title.extraMilk')} backIcon={X} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer selection */}
          <SectionLabel>{t('nav.customers')}</SectionLabel>
          {errors.customerId ? (
            <Text style={styles.error}>{errors.customerId}</Text>
          ) : null}
          <Card padding={12} style={styles.card}>
            {activeCustomers.map((c) => {
              const selected = c.id === selectedCustomerId;
              return (
                <PressableScale
                  key={c.id}
                  onPress={() => handleSelectCustomer(c.id)}
                  scale={0.98}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={c.name}
                  style={[
                    styles.customerRow,
                    {
                      backgroundColor: selected ? accent.soft : 'transparent',
                      borderColor: selected ? accent.color : 'transparent',
                    },
                  ]}
                >
                  <Avatar name={c.name} size={38} />
                  <View style={styles.customerText}>
                    <Text style={styles.customerName}>{c.name}</Text>
                    <Text style={styles.customerRate}>₹{c.rate}/L</Text>
                  </View>
                  {selected ? (
                    <View style={[styles.selectedDot, { backgroundColor: accent.color }]} />
                  ) : null}
                </PressableScale>
              );
            })}
          </Card>

          {/* Date + Slot */}
          <SectionLabel>{t('label.inseminationDate')}</SectionLabel>
          <Card padding={16} style={styles.card}>
            <Field
              label="Date (yyyy-mm-dd)"
              icon={Milk}
              value={date}
              onChangeText={setDate}
              placeholder={todayISO()}
              keyboardType="numbers-and-punctuation"
              containerStyle={styles.field}
            />
            <Segmented
              options={[
                { value: 'morning', label: t('label.morning') },
                { value: 'evening', label: t('label.evening') },
              ]}
              value={slot}
              onChange={setSlot}
            />
          </Card>

          {/* Quantity + Rate */}
          <SectionLabel>{t('label.quantity')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <View style={styles.fieldRow}>
              <Field
                label={`${t('label.quantity')} (L)`}
                icon={Milk}
                value={qty}
                onChangeText={(v) => {
                  setQty(v);
                  if (errors.qty) setErrors((e) => ({ ...e, qty: undefined }));
                }}
                keyboardType="decimal-pad"
                placeholder="1.0"
                error={errors.qty}
                containerStyle={styles.fieldHalf}
              />
              <Field
                label={t('label.rate')}
                icon={IndianRupee}
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="60"
                containerStyle={styles.fieldHalf}
              />
            </View>

            {parsedQty > 0 ? (
              <View style={[styles.totalPill, { backgroundColor: accent.soft }]}>
                <Text style={[styles.totalLabel, { color: accent.color }]}>
                  {parsedQty.toFixed(1)} L × ₹{parsedRate} =
                </Text>
                <Text style={[styles.totalValue, { color: accent.color }]}>
                  {money0(totalValue)}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Notes */}
          <SectionLabel>{t('section.note')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <Field
              icon={StickyNote}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('placeholder.extraMilkNotes')}
              multiline
            />
          </Card>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <Button
            label={
              parsedQty > 0
                ? `${t('action.addExtraMilk')} · ${money0(totalValue)}`
                : t('action.addExtraMilk')
            }
            onPress={handleSave}
            icon={Milk}
            size="lg"
            pill
            full
            disabled={!selectedCustomerId || parsedQty <= 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Layout.gutterTight, paddingBottom: 32 },
  card: { marginBottom: 20 },
  field: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  error: { ...Type.footnote, color: Colors.danger, marginBottom: 8 },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  customerText: { flex: 1 },
  customerName: { ...Type.callout, fontWeight: '700', color: Colors.foreground },
  customerRate: { ...Type.micro, color: Colors.mutedForeground, marginTop: 1 },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  totalLabel: { ...Type.callout, fontWeight: '700' },
  totalValue: { ...Type.subtitle, fontWeight: '800' },
  footer: {
    paddingHorizontal: Layout.gutterTight,
    paddingTop: 14,
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
