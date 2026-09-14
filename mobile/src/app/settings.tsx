import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check,
  Palette,
  Store,
  User,
  IndianRupee,
  Trash2,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import { useDairyStore } from '../lib/dairy-store';
import { ACCENT_COLORS, useAppTheme } from '../context/theme-context';
import { Colors, softShadow, cardShadow } from '../constants/theme';
import { TopBar } from '../components/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { accent, setAccentId } = useAppTheme();
  const { settings, saveSettings, resetAll } = useDairyStore();

  const [dairyName, setDairyName] = useState(settings.dairyName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [defaultRate, setDefaultRate] = useState(String(settings.defaultRate));
  const [deliveryCharge, setDeliveryCharge] = useState(
    String(settings.deliveryCharge),
  );

  const handleSaveSettings = () => {
    saveSettings({
      dairyName: dairyName.trim() || settings.dairyName,
      ownerName: ownerName.trim() || settings.ownerName,
      defaultRate: parseFloat(defaultRate) || settings.defaultRate,
      deliveryCharge: parseFloat(deliveryCharge) || settings.deliveryCharge,
    });
    Alert.alert('Saved', 'Settings updated successfully.');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all customers, deliveries, and payments. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAll();
            router.replace('/');
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-[#F7F7F7] relative">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View
        style={[{ backgroundColor: accent.header }, softShadow]}
        className="px-6 pt-16 pb-10 rounded-b-[32px]"
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[26px] font-bold text-white tracking-tight">
              Settings
            </Text>
            <Text className="text-[13px] text-white/70 font-medium mt-1">
              Preferences & configuration
            </Text>
          </View>
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Palette size={22} color="white" />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Theme Color ── */}
        <Text className="text-[13px] font-bold text-[#888888] uppercase tracking-widest mb-3 mt-2">
          Theme Color
        </Text>
        <View
          className="bg-white rounded-[24px] p-5 mb-6"
          style={cardShadow}
        >
          <View className="flex-row flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => {
              const isSelected = accent.id === color.id;
              return (
                <TouchableOpacity
                  key={color.id}
                  onPress={() => setAccentId(color.id)}
                  className="items-center gap-2"
                  style={{ width: 64 }}
                >
                  {/* Swatch */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: color.value,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isSelected ? 3 : 0,
                      borderColor: isSelected ? color.value : 'transparent',
                      // outer ring via shadow when selected
                      shadowColor: color.value,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isSelected ? 0.5 : 0,
                      shadowRadius: isSelected ? 8 : 0,
                      elevation: isSelected ? 6 : 0,
                    }}
                  >
                    {isSelected && (
                      <Check size={20} color="white" strokeWidth={3} />
                    )}
                  </View>
                  <Text
                    className="text-[11px] font-bold text-center"
                    style={{ color: isSelected ? color.value : Colors.mutedForeground }}
                    numberOfLines={1}
                  >
                    {color.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preview strip */}
          <View className="mt-5 pt-4 border-t border-[#F0F0F0]">
            <Text className="text-[12px] font-semibold text-[#888888] mb-3">
              Preview
            </Text>
            <View className="flex-row gap-3">
              <View
                className="flex-1 rounded-2xl py-3 items-center"
                style={{ backgroundColor: accent.value }}
              >
                <Text className="text-[13px] font-bold text-white">
                  Primary
                </Text>
              </View>
              <View
                className="flex-1 rounded-2xl py-3 items-center"
                style={{ backgroundColor: accent.soft }}
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: accent.value }}
                >
                  Soft
                </Text>
              </View>
              <View
                className="flex-1 rounded-2xl py-3 items-center border"
                style={{ borderColor: accent.value }}
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: accent.value }}
                >
                  Outline
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Dairy Info ── */}
        <Text className="text-[13px] font-bold text-[#888888] uppercase tracking-widest mb-3">
          Dairy Info
        </Text>
        <View className="bg-white rounded-[24px] p-5 mb-6" style={cardShadow}>
          <View className="mb-4">
            <Text className="text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wide">
              Dairy Name
            </Text>
            <View className="flex-row items-center gap-3 bg-[#F7F7F7] rounded-2xl px-4 py-3">
              <Store size={18} color={accent.value} />
              <TextInput
                value={dairyName}
                onChangeText={setDairyName}
                placeholder="e.g. Vishal Dairy"
                placeholderTextColor="#AAAAAA"
                className="flex-1 text-[15px] font-semibold text-[#111111]"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wide">
              Owner Name
            </Text>
            <View className="flex-row items-center gap-3 bg-[#F7F7F7] rounded-2xl px-4 py-3">
              <User size={18} color={accent.value} />
              <TextInput
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="e.g. Vishal"
                placeholderTextColor="#AAAAAA"
                className="flex-1 text-[15px] font-semibold text-[#111111]"
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-1">
            <View className="flex-1">
              <Text className="text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wide">
                Default Rate (₹/L)
              </Text>
              <View className="flex-row items-center gap-3 bg-[#F7F7F7] rounded-2xl px-4 py-3">
                <IndianRupee size={18} color={accent.value} />
                <TextInput
                  value={defaultRate}
                  onChangeText={setDefaultRate}
                  keyboardType="decimal-pad"
                  placeholder="60"
                  placeholderTextColor="#AAAAAA"
                  className="flex-1 text-[15px] font-semibold text-[#111111]"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wide">
                Delivery Charge
              </Text>
              <View className="flex-row items-center gap-3 bg-[#F7F7F7] rounded-2xl px-4 py-3">
                <IndianRupee size={18} color={accent.value} />
                <TextInput
                  value={deliveryCharge}
                  onChangeText={setDeliveryCharge}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor="#AAAAAA"
                  className="flex-1 text-[15px] font-semibold text-[#111111]"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSaveSettings}
            className="mt-5 rounded-2xl py-3.5 items-center"
            style={{ backgroundColor: accent.value }}
          >
            <Text className="text-[15px] font-bold text-white tracking-wide">
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text className="text-[13px] font-bold text-[#888888] uppercase tracking-widest mb-3">
          About
        </Text>
        <View className="bg-white rounded-[24px] px-5 mb-6" style={cardShadow}>
          <View className="flex-row items-center justify-between py-4 border-b border-[#F0F0F0]">
            <View className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 rounded-full items-center justify-center"
                style={{ backgroundColor: accent.soft }}
              >
                <Info size={18} color={accent.value} />
              </View>
              <Text className="text-[15px] font-bold text-[#111111]">App Version</Text>
            </View>
            <Text className="text-[14px] font-semibold text-[#888888]">1.0.0</Text>
          </View>

          <View className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 rounded-full items-center justify-center"
                style={{ backgroundColor: accent.soft }}
              >
                <Store size={18} color={accent.value} />
              </View>
              <Text className="text-[15px] font-bold text-[#111111]">Dairy Manager</Text>
            </View>
            <Text className="text-[14px] font-semibold text-[#888888]">Free</Text>
          </View>
        </View>

        {/* ── Danger Zone ── */}
        <Text className="text-[13px] font-bold text-[#888888] uppercase tracking-widest mb-3">
          Danger Zone
        </Text>
        <View className="bg-white rounded-[24px] px-5" style={cardShadow}>
          <TouchableOpacity
            onPress={handleReset}
            className="flex-row items-center gap-3 py-4"
          >
            <View className="h-9 w-9 rounded-full items-center justify-center bg-[#FFF1F2]">
              <Trash2 size={18} color="#E11D48" />
            </View>
            <Text className="text-[15px] font-bold text-[#E11D48] flex-1">
              Reset All Data
            </Text>
            <ChevronRight size={18} color="#E11D48" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
