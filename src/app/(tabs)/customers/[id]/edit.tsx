/**
 * Edit Customer — same form as Add Customer but pre-populated.
 *
 * Route: /customers/:id/edit  (push inside Customers stack)
 *
 * Design decisions:
 * - AppBar uses pencil icon + X (edit context, not navigation back).
 * - Delete is at the bottom of the form behind a confirmation dialog, not in the
 *   header — destructive actions should not sit next to the save affordance.
 * - Leave ranges have their own card so they are easy to scan and remove
 *   without touching the rest of the form.
 * - Opening balance is read-only after creation — it is a historical anchor, not
 *   something you adjust after the fact (record a payment instead).
 */

import { useLocalSearchParams } from 'expo-router';
import {
  Calendar,
  Check,
  Home,
  IndianRupee,
  Milk,
  Phone,
  Plus,
  Trash2,
  User,
  UserX,
  X,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapPickerModal from '@/components/map-picker-modal';
import { PressableScale, useFeedback } from '@/components/motion';
import {
  AppBar,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Screen,
  SectionLabel,
  ToggleRow,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { milkTypeLabel, useDairyStore, type MilkType } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';

const MILK_TYPES: MilkType[] = ['cow', 'buffalo', 'toned', 'full_cream', 'custom'];

interface Errors {
  name?: string;
  phone?: string;
  quantity?: string;
  leaveDate?: string;
}

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavGuard();
  const t = useT();
  const feedback = useFeedback();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();

  const customers = useDairyStore((s) => s.customers);
  const saveCustomer = useDairyStore((s) => s.saveCustomer);
  const deleteCustomer = useDairyStore((s) => s.deleteCustomer);
  const addLeaveRange = useDairyStore((s) => s.addLeaveRange);
  const removeLeaveRange = useDairyStore((s) => s.removeLeaveRange);

  const customer = customers.find((c) => c.id === id);

  // Form state initialised from the customer record.
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [latitude, setLatitude] = useState<number | undefined>(customer?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(customer?.longitude);
  const [milkType, setMilkType] = useState<MilkType>(customer?.milkType ?? 'cow');
  const [morningQty, setMorningQty] = useState(String(customer?.morningQty ?? 1));
  const [eveningQty, setEveningQty] = useState(String(customer?.eveningQty ?? 0));
  const [rate, setRate] = useState(String(customer?.rate ?? 60));
  const [autoDelivery, setAutoDelivery] = useState(customer?.autoDeliveryEnabled ?? true);
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [mapVisible, setMapVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');

  if (!customer) {
    return (
      <Screen>
        <AppBar title={t('title.editCustomer')} backIcon={X} />
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

  const validate = (): boolean => {
    const next: Errors = {};
    if (!name.trim()) next.name = t('error.nameRequired');
    if (!phone.trim()) next.phone = t('error.phoneRequired');
    const morning = parseFloat(morningQty) || 0;
    const evening = parseFloat(eveningQty) || 0;
    if (morning < 0 || evening < 0) next.quantity = t('error.quantityNegative');
    else if (morning === 0 && evening === 0) next.quantity = t('error.quantityZero');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      feedback.error(t('error.checkFields'));
      return;
    }
    saveCustomer({
      ...customer,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      latitude,
      longitude,
      milkType,
      morningQty: parseFloat(morningQty) || 0,
      eveningQty: parseFloat(eveningQty) || 0,
      rate: parseFloat(rate) || customer.rate,
      autoDeliveryEnabled: autoDelivery,
      notes: notes.trim() || undefined,
    });
    nav.back();
    feedback.success(t('success.customerSaved'));
  };

  const handleDelete = () => {
    setDeleteVisible(false);
    deleteCustomer(customer.id);
    // Go to customers list, not back — the detail screen would show "not found".
    nav.replace('/customers');
    feedback.success(t('success.customerDeleted'));
  };

  const handleAddLeave = () => {
    if (!leaveFrom) { setErrors((e) => ({ ...e, leaveDate: 'Enter start date (yyyy-mm-dd)' })); return; }
    if (!leaveTo) { setErrors((e) => ({ ...e, leaveDate: 'Enter end date (yyyy-mm-dd)' })); return; }
    if (leaveTo < leaveFrom) { setErrors((e) => ({ ...e, leaveDate: t('error.leaveDateInvalid') })); return; }
    addLeaveRange(customer.id, leaveFrom, leaveTo);
    setLeaveFrom('');
    setLeaveTo('');
    setErrors((e) => ({ ...e, leaveDate: undefined }));
    feedback.success(t('success.leaveAdded'));
  };

  const leaveRanges = customer.leaveRanges ?? [];

  return (
    <Screen>
      <AppBar title={t('title.editCustomer')} backIcon={X} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic info */}
          <SectionLabel>{t('section.basicInfo')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <Field
              label={t('label.fullName')}
              icon={User}
              value={name}
              onChangeText={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); }}
              placeholder="e.g. Rohan Sharma"
              error={errors.name}
              autoCapitalize="words"
              containerStyle={styles.field}
            />
            <Field
              label={t('label.phone')}
              icon={Phone}
              value={phone}
              onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors((e) => ({ ...e, phone: undefined })); }}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              error={errors.phone}
              containerStyle={styles.field}
            />
            <Field
              label={t('label.notes')}
              icon={User}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes about this customer"
              multiline
            />
          </Card>

          {/* Address */}
          <SectionLabel>{t('section.address')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <Field
              label={t('label.deliveryAddress')}
              icon={Home}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, area, city"
              multiline
              containerStyle={styles.field}
            />
            <Button
              label={latitude ? t('action.changeOnMap') : t('action.pickOnMap')}
              onPress={() => setMapVisible(true)}
              variant="outline"
              full
            />
            {latitude ? (
              <Text style={styles.coords}>
                Location saved · {latitude.toFixed(4)}, {longitude?.toFixed(4)}
              </Text>
            ) : null}
          </Card>

          {/* Milk type */}
          <SectionLabel>{t('section.milkType')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <View style={styles.chips}>
              {MILK_TYPES.map((type) => {
                const selected = milkType === type;
                return (
                  <PressableScale
                    key={type}
                    onPress={() => setMilkType(type)}
                    scale={0.96}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={milkTypeLabel(type)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? accent.color : Colors.surface,
                        borderColor: selected ? accent.color : Colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: selected ? '#FFFFFF' : Colors.mutedForeground },
                      ]}
                    >
                      {milkTypeLabel(type)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Card>

          {/* Quantities */}
          <SectionLabel>{t('section.dailyQuantity')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <View style={styles.fieldRow}>
              <Field
                label={`${t('label.morning')} (L)`}
                icon={Milk}
                value={morningQty}
                onChangeText={(v) => { setMorningQty(v); if (errors.quantity) setErrors((e) => ({ ...e, quantity: undefined })); }}
                keyboardType="decimal-pad"
                placeholder="1.0"
                containerStyle={styles.fieldHalf}
              />
              <Field
                label={`${t('label.evening')} (L)`}
                icon={Milk}
                value={eveningQty}
                onChangeText={(v) => { setEveningQty(v); if (errors.quantity) setErrors((e) => ({ ...e, quantity: undefined })); }}
                keyboardType="decimal-pad"
                placeholder="0.5"
                containerStyle={styles.fieldHalf}
              />
            </View>
            {errors.quantity ? <Text style={styles.error}>{errors.quantity}</Text> : null}
          </Card>

          {/* Pricing */}
          <SectionLabel>{t('section.pricing')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <Field
              label={t('label.rate')}
              icon={IndianRupee}
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholder="60"
            />
            <Text style={styles.openingHint}>
              Opening balance: ₹{customer.openingBalance} (set on creation — record a payment to adjust)
            </Text>
          </Card>

          {/* Automation */}
          <SectionLabel>{t('section.automation')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <ToggleRow
              label={t('label.autoDelivery')}
              description="Mark as delivered automatically each day"
              value={autoDelivery}
              onValueChange={setAutoDelivery}
              leading={
                <View style={[styles.toggleIcon, { backgroundColor: autoDelivery ? accent.soft : Colors.surface }]}>
                  <Zap size={19} color={autoDelivery ? accent.color : Colors.mutedForeground} />
                </View>
              }
            />
          </Card>

          {/* Leave ranges */}
          <SectionLabel>{t('section.leaveRanges')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            {leaveRanges.length === 0 ? (
              <Text style={styles.emptyLeave}>{t('label.noLeaves')}</Text>
            ) : (
              leaveRanges.map((range, index) => (
                <View key={index} style={styles.leaveRow}>
                  <Calendar size={15} color={Colors.mutedForeground} />
                  <Text style={styles.leaveText}>{range.from} → {range.to}</Text>
                  <PressableScale
                    onPress={() => removeLeaveRange(customer.id, index)}
                    scale={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove leave ${range.from} to ${range.to}`}
                    style={styles.leaveRemove}
                  >
                    <X size={14} color={Colors.danger} />
                  </PressableScale>
                </View>
              ))
            )}

            <View style={styles.addLeaveRow}>
              <Field
                label={t('label.leaveFrom')}
                value={leaveFrom}
                onChangeText={setLeaveFrom}
                placeholder="yyyy-mm-dd"
                keyboardType="numbers-and-punctuation"
                containerStyle={styles.leaveField}
              />
              <Field
                label={t('label.leaveTo')}
                value={leaveTo}
                onChangeText={setLeaveTo}
                placeholder="yyyy-mm-dd"
                keyboardType="numbers-and-punctuation"
                containerStyle={styles.leaveField}
              />
            </View>
            {errors.leaveDate ? <Text style={styles.error}>{errors.leaveDate}</Text> : null}
            <Button
              label={t('action.addLeave')}
              onPress={handleAddLeave}
              icon={Plus}
              variant="outline"
              full
              style={styles.addLeaveButton}
            />
          </Card>

          {/* Danger zone */}
          <SectionLabel>Danger zone</SectionLabel>
          <Card padding={18} style={styles.card}>
            <Button
              label={t('action.delete') + ' ' + customer.name}
              onPress={() => setDeleteVisible(true)}
              variant="danger"
              icon={Trash2}
              size="lg"
              full
            />
          </Card>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <Button
            label={t('action.saveCustomer')}
            onPress={handleSave}
            icon={Check}
            size="lg"
            pill
            full
          />
        </View>
      </KeyboardAvoidingView>

      <MapPickerModal
        visible={mapVisible}
        initialAddress={address}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onConfirm={(pickedAddress, lat, lng) => {
          setAddress(pickedAddress);
          setLatitude(lat);
          setLongitude(lng);
          setMapVisible(false);
        }}
        onClose={() => setMapVisible(false)}
      />

      <Dialog
        visible={deleteVisible}
        icon={Trash2}
        iconTone="danger"
        title={`Delete ${customer.name}?`}
        message="This removes the customer along with all their deliveries, payments, and bills. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel={t('action.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteVisible(false)}
        destructive
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notFound: { flex: 1, justifyContent: 'center', padding: Layout.gutter },
  content: { padding: Layout.gutterTight, paddingBottom: 32 },
  card: { marginBottom: 20 },
  field: { marginBottom: 14 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  error: { ...Type.footnote, color: Colors.danger, marginTop: 10 },
  coords: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  chipLabel: { ...Type.caption, fontWeight: '800' },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openingHint: {
    ...Type.micro,
    color: Colors.mutedForeground,
    marginTop: 12,
  },
  emptyLeave: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    marginBottom: 12,
  },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  leaveText: { ...Type.callout, color: Colors.foreground, flex: 1 },
  leaveRemove: {
    padding: 4,
  },
  addLeaveRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  leaveField: { flex: 1 },
  addLeaveButton: { marginTop: 12 },
  footer: {
    paddingHorizontal: Layout.gutterTight,
    paddingTop: 14,
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
