/**
 * Add customer — a full-screen workflow.
 *
 * Listed in `FULL_SCREEN_ROUTES`, so the bottom navigation animates away while
 * this is open and returns on dismiss. A tab bar here would both steal vertical
 * space from a long form and invite the user to abandon it half-finished.
 *
 * Presented modally (see the Customers stack layout), which gives it a bottom-up
 * transition and a downward dismiss gesture — the platform's own vocabulary for
 * "a task on top of what I was doing".
 *
 * Validation moved from `Alert.alert` to inline field errors: an alert hides the
 * field it is complaining about and costs a tap to dismiss, while an inline
 * message points straight at the problem.
 */

import { Home, IndianRupee, Milk, Phone, User, X, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapPickerModal from '@/components/map-picker-modal';
import { PressableScale, useFeedback } from '@/components/motion';
import { AppBar, Button, Card, Field, Screen, SectionLabel, ToggleRow, Text } from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { milkTypeLabel, uid, useDairyStore, type MilkType } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';

const MILK_TYPES: MilkType[] = ['cow', 'buffalo', 'toned', 'full_cream', 'custom'];

interface Errors {
  name?: string;
  phone?: string;
  quantity?: string;
}

export default function AddCustomerScreen() {
  const nav = useNavGuard();
  const t = useT();
  const feedback = useFeedback();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();

  const saveCustomer = useDairyStore((s) => s.saveCustomer);
  const settings = useDairyStore((s) => s.settings);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [milkType, setMilkType] = useState<MilkType>('cow');
  const [morningQty, setMorningQty] = useState('1');
  const [eveningQty, setEveningQty] = useState('0');
  const [rate, setRate] = useState(String(settings.defaultRate));
  const [openingBalance, setOpeningBalance] = useState('0');
  const [autoDelivery, setAutoDelivery] = useState(settings.autoDeliveryDefault);
  const [mapVisible, setMapVisible] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): boolean => {
    const next: Errors = {};

    if (!name.trim()) next.name = t('error.nameRequired');
    if (!phone.trim()) next.phone = t('error.phoneRequired');

    const morning = parseFloat(morningQty) || 0;
    const evening = parseFloat(eveningQty) || 0;

    if (morning < 0 || evening < 0) {
      next.quantity = t('error.quantityNegative');
    } else if (morning === 0 && evening === 0) {
      next.quantity = t('error.quantityZero');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      feedback.error(t('error.checkFields'));
      return;
    }

    saveCustomer({
      id: uid(),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      latitude,
      longitude,
      morningQty: parseFloat(morningQty) || 0,
      eveningQty: parseFloat(eveningQty) || 0,
      rate: parseFloat(rate) || settings.defaultRate,
      paused: false,
      openingBalance: parseFloat(openingBalance) || 0,
      milkType,
      autoDeliveryEnabled: autoDelivery,
    });

    /**
     * Dismiss first, confirm second. The list behind is already updated by the
     * store, so the user sees the new row arrive as the form slides away — the
     * banner then confirms what they just watched happen, rather than
     * interrupting it.
     */
    nav.dismiss();
    feedback.success(`${name.trim()} added`);
  };

  return (
    <Screen>
      {/* X rather than a chevron: this is a modal to dismiss, not a page to go back from. */}
      <AppBar title={t('title.addCustomer')} backIcon={X} />

      <KeyboardAvoidingView
        style={styles.flex}
        // iOS needs padding; Android's windowSoftInputMode already resizes.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionLabel>{t('section.basicInfo')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <Field
              label={t('label.fullName')}
              icon={User}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder="e.g. Rohan Sharma"
              error={errors.name}
              autoCapitalize="words"
              containerStyle={styles.field}
            />
            <Field
              label={t('label.phone')}
              icon={Phone}
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
              }}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              error={errors.phone}
            />
          </Card>

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

          <SectionLabel>{t('section.dailyQuantity')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <View style={styles.fieldRow}>
              <Field
                label={`${t('label.morning')} (L)`}
                icon={Milk}
                value={morningQty}
                onChangeText={(value) => {
                  setMorningQty(value);
                  if (errors.quantity) setErrors((e) => ({ ...e, quantity: undefined }));
                }}
                keyboardType="decimal-pad"
                placeholder="1.0"
                containerStyle={styles.fieldHalf}
              />
              <Field
                label={`${t('label.evening')} (L)`}
                icon={Milk}
                value={eveningQty}
                onChangeText={(value) => {
                  setEveningQty(value);
                  if (errors.quantity) setErrors((e) => ({ ...e, quantity: undefined }));
                }}
                keyboardType="decimal-pad"
                placeholder="0.5"
                containerStyle={styles.fieldHalf}
              />
            </View>
            {errors.quantity ? <Text style={styles.error}>{errors.quantity}</Text> : null}
          </Card>

          <SectionLabel>{t('section.pricing')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <View style={styles.fieldRow}>
              <Field
                label={t('label.rate')}
                icon={IndianRupee}
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="60"
                containerStyle={styles.fieldHalf}
              />
              <Field
                label={t('label.openingBalance')}
                icon={IndianRupee}
                value={openingBalance}
                onChangeText={setOpeningBalance}
                keyboardType="decimal-pad"
                placeholder="0"
                containerStyle={styles.fieldHalf}
              />
            </View>
          </Card>

          <SectionLabel>{t('section.automation')}</SectionLabel>
          <Card padding={20} style={styles.card}>
            <ToggleRow
              label={t('label.autoDelivery')}
              description="Mark as delivered automatically each day"
              value={autoDelivery}
              onValueChange={setAutoDelivery}
              leading={
                <View
                  style={[
                    styles.toggleIcon,
                    { backgroundColor: autoDelivery ? accent.soft : Colors.surface },
                  ]}
                >
                  <Zap
                    size={19}
                    color={autoDelivery ? accent.color : Colors.mutedForeground}
                  />
                </View>
              }
            />
          </Card>
        </ScrollView>

        {/*
          No tab bar on this route, so the CTA only has to clear the device inset.
        */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
        >
          <Button
            label={t('action.saveCustomer')}
            onPress={handleSave}
            icon={User}
            size="lg"
            pill
            full
          />
        </View>
      </KeyboardAvoidingView>

      {/*
        A React Native Modal, so this screen stays mounted underneath — every
        field the user has already filled in is still there on return.
      */}
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
  card: {
    marginBottom: 20,
  },
  field: {
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  error: {
    ...Type.footnote,
    color: Colors.danger,
    marginTop: 10,
  },
  coords: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  chipLabel: {
    ...Type.caption,
    fontWeight: '800',
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Layout.gutterTight,
    paddingTop: 14,
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
