import { useRouter } from 'expo-router';
import {
  Home,
  IndianRupee,
  MapPin,
  Milk,
  Phone,
  User,
  Zap
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapPickerModal from '../../components/map-picker-modal';
import { TopBar } from '../../components/ui';
import { cardBorder, cardShadow, Colors, softShadow } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import {
  MilkType,
  milkTypeLabel,
  uid,
  useDairyStore,
} from '../../lib/dairy-store';

const MILK_TYPES: MilkType[] = ['cow', 'buffalo', 'toned', 'full_cream', 'custom'];

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontSize: 13, fontWeight: '800', color: Colors.mutedForeground,
      textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginTop: 4,
    }}>
      {label}
    </Text>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontSize: 12, fontWeight: '800', color: Colors.mutedForeground,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
    }}>
      {label}
    </Text>
  );
}

function InputRow({ icon: Icon, value, onChangeText, placeholder, keyboardType, editable }: {
  icon: any; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any; editable?: boolean;
}) {
  const { accent } = useAppTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13,
    }}>
      <Icon size={18} color={accent.color} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.mutedForeground}
        keyboardType={keyboardType ?? 'default'}
        editable={editable !== false}
        style={{ flex: 1, fontSize: 15, fontWeight: '600', color: Colors.foreground }}
      />
    </View>
  );
}

export default function AddCustomerScreen() {
  const router = useRouter();
  const { accent } = useAppTheme();
  const { saveCustomer, settings } = useDairyStore();

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

  const validate = (): boolean => {
    if (!name.trim()) { Alert.alert('Missing Field', 'Customer name is required.'); return false; }
    if (!phone.trim()) { Alert.alert('Missing Field', 'Phone number is required.'); return false; }
    const mq = parseFloat(morningQty) || 0;
    const eq = parseFloat(eveningQty) || 0;
    if (mq < 0 || eq < 0) { Alert.alert('Invalid Qty', 'Quantities cannot be negative.'); return false; }
    if (mq === 0 && eq === 0) { Alert.alert('Invalid Qty', 'At least one delivery slot must have qty > 0.'); return false; }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
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
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <TopBar title="Add Customer" />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Basic Info ── */}
        <SectionLabel label="Basic Info" />
        <View style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 20, marginBottom: 20, ...cardBorder, ...cardShadow }}>
          <View style={{ marginBottom: 14 }}>
            <FieldLabel label="Full Name" />
            <InputRow icon={User} value={name} onChangeText={setName} placeholder="e.g. Rohan Sharma" />
          </View>
          <View>
            <FieldLabel label="Phone Number" />
            <InputRow icon={Phone} value={phone} onChangeText={setPhone} placeholder="e.g. 9876543210" keyboardType="phone-pad" />
          </View>
        </View>

        {/* ── Address ── */}
        <SectionLabel label="Address" />
        <View style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 20, marginBottom: 20, ...cardBorder, ...cardShadow }}>
          <FieldLabel label="Delivery Address" />
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13,
            marginBottom: 12,
          }}>
            <Home size={18} color={accent.color} />
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Street, Area, City"
              placeholderTextColor={Colors.mutedForeground}
              style={{ flex: 1, fontSize: 15, fontWeight: '600', color: Colors.foreground }}
              multiline
            />
          </View>
          <TouchableOpacity
            onPress={() => setMapVisible(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 16, paddingVertical: 12,
              borderWidth: 1.5, borderColor: accent.color,
            }}
          >
            <MapPin size={16} color={accent.color} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: accent.color }}>
              {latitude ? 'Change on Map' : 'Pick on Map'}
            </Text>
          </TouchableOpacity>
          {latitude ? (
            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>
              📍 Location saved ({latitude.toFixed(4)}, {longitude?.toFixed(4)})
            </Text>
          ) : null}
        </View>

        {/* ── Milk Type ── */}
        <SectionLabel label="Milk Type" />
        <View style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 20, marginBottom: 20, ...cardBorder, ...cardShadow }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {MILK_TYPES.map((t) => {
              const selected = milkType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setMilkType(t)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
                    backgroundColor: selected ? accent.color : Colors.surface,
                    borderWidth: selected ? 0 : 1.5,
                    borderColor: Colors.border,
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '800',
                    color: selected ? 'white' : Colors.mutedForeground,
                  }}>
                    {milkTypeLabel(t)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Delivery Qty ── */}
        <SectionLabel label="Daily Quantity" />
        <View style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 20, marginBottom: 20, ...cardBorder, ...cardShadow }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Morning (L)" />
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13,
              }}>
                <Milk size={16} color={accent.color} />
                <TextInput
                  value={morningQty}
                  onChangeText={setMorningQty}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  placeholderTextColor={Colors.mutedForeground}
                  style={{ flex: 1, fontSize: 15, fontWeight: '700', color: Colors.foreground }}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Evening (L)" />
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13,
              }}>
                <Milk size={16} color={Colors.mutedForeground} />
                <TextInput
                  value={eveningQty}
                  onChangeText={setEveningQty}
                  keyboardType="decimal-pad"
                  placeholder="0.5"
                  placeholderTextColor={Colors.mutedForeground}
                  style={{ flex: 1, fontSize: 15, fontWeight: '700', color: Colors.foreground }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ── Pricing ── */}
        <SectionLabel label="Pricing" />
        <View style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 20, marginBottom: 20, ...cardBorder, ...cardShadow }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Rate (₹/L)" />
              <InputRow icon={IndianRupee} value={rate} onChangeText={setRate} placeholder="60" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Opening Balance" />
              <InputRow icon={IndianRupee} value={openingBalance} onChangeText={setOpeningBalance} placeholder="0" keyboardType="decimal-pad" />
            </View>
          </View>
        </View>

        {/* ── Auto Delivery ── */}
        <SectionLabel label="Automation" />
        <View style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 20, marginBottom: 24, ...cardBorder, ...cardShadow }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: autoDelivery ? accent.soft : Colors.surface,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={19} color={autoDelivery ? accent.color : Colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.foreground }}>
                  Auto-mark Deliveries
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: Colors.mutedForeground, marginTop: 2 }}>
                  Automatically mark as delivered each day
                </Text>
              </View>
            </View>
            <Switch
              value={autoDelivery}
              onValueChange={setAutoDelivery}
              trackColor={{ false: Colors.surface, true: `${accent.color}60` }}
              thumbColor={autoDelivery ? accent.color : Colors.mutedForeground}
            />
          </View>
        </View>
      </ScrollView>

      {/* Save CTA */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.card, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32,
        borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.04)', ...softShadow,
      }}>
        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: accent.color, borderRadius: 20,
            paddingVertical: 16, alignItems: 'center',
            flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          <User size={20} color="white" />
          <Text style={{ fontSize: 16, fontWeight: '800', color: 'white' }}>Save Customer</Text>
        </TouchableOpacity>
      </View>

      <MapPickerModal
        visible={mapVisible}
        initialAddress={address}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onConfirm={(addr, lat, lng) => {
          setAddress(addr);
          setLatitude(lat);
          setLongitude(lng);
          setMapVisible(false);
        }}
        onClose={() => setMapVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
