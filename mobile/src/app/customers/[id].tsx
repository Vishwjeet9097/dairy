import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    BookOpen,
    ChevronRight,
    FileText,
    MapPin,
    Milk,
    Pause,
    Phone,
    Play,
    ReceiptText,
    Wallet,
} from 'lucide-react-native';
import React from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { Avatar, TopBar } from '../../components/ui';
import { cardShadow, Colors, softShadow } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import {
    customerBilled,
    money0,
    outstanding,
    useDairyStore,
} from '../../lib/dairy-store';

function ActionRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  onPress,
  destructive,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between py-4 border-b"
      style={{ borderBottomColor: Colors.border }}
    >
      <View className="flex-row items-center gap-4">
        <View
          className="h-10 w-10 rounded-full items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={19} color={iconColor} />
        </View>
        <Text style={{
          fontSize: 15,
          fontWeight: '700',
          color: destructive ? Colors.danger : Colors.foreground,
        }}>
          {label}
        </Text>
      </View>
      <ChevronRight size={18} color={Colors.border} />
    </TouchableOpacity>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { accent } = useAppTheme();
  const { customers, togglePause } = useDairyStore();

  const c = customers.find(x => x.id === id);

  if (!c) {
    return (
      <View className="flex-1" style={{ backgroundColor: Colors.background }}>
        <TopBar title="Customer Details" />
        <View className="flex-1 items-center justify-center p-6">
          <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.mutedForeground }}>
            Customer not found.
          </Text>
        </View>
      </View>
    );
  }

  const out = outstanding(useDairyStore.getState(), c.id);
  const billed = customerBilled(useDairyStore.getState(), c.id);

  return (
    <View className="flex-1 relative" style={{ backgroundColor: Colors.background }}>
      <StatusBar barStyle="dark-content" />
      <TopBar title="Customer Details" />

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View className="rounded-[28px] bg-white p-6 mb-5 items-center" style={cardShadow}>
          <Avatar name={c.name} size={76} />
          <Text style={{ marginTop: 14, fontSize: 20, fontWeight: '800', color: Colors.foreground }}>
            {c.name}
          </Text>

          {c.paused && (
            <View
              className="rounded-full px-3 py-1 mt-1.5"
              style={{ backgroundColor: Colors.warningSoft }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: Colors.warning }}>
                PAUSED
              </Text>
            </View>
          )}

          <View className="mt-4 flex-row flex-wrap items-center justify-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <Phone size={14} color={Colors.mutedForeground} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.mutedForeground }}>
                {c.phone}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color={Colors.mutedForeground} />
              <Text
                style={{ fontSize: 13, fontWeight: '600', color: Colors.mutedForeground, maxWidth: 200 }}
                numberOfLines={1}
              >
                {c.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View className="flex-row gap-3 mb-5">
          {[
            { label: 'Morning', value: `${c.morningQty} L` },
            { label: 'Evening', value: `${c.eveningQty} L` },
            {
              label: 'Balance',
              value: money0(out),
              valueColor: out > 0 ? Colors.danger : Colors.success,
            },
          ].map(stat => (
            <View
              key={stat.label}
              className="flex-1 rounded-[20px] bg-white p-4 items-center"
              style={cardShadow}
            >
              <Text style={{
                fontSize: 17,
                fontWeight: '800',
                color: stat.valueColor ?? Colors.foreground,
                marginBottom: 4,
              }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.mutedForeground }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Rate card */}
        <View
          className="rounded-[20px] p-4 mb-5 flex-row items-center justify-between"
          style={{ backgroundColor: accent.soft }}
        >
          <View className="flex-row items-center gap-3">
            <Milk size={20} color={accent.value} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: accent.value }}>
              Rate per Litre
            </Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: accent.value }}>
            ₹{c.rate}
          </Text>
        </View>

        {/* Actions */}
        <View className="rounded-[24px] bg-white px-5 mb-5" style={cardShadow}>
          <ActionRow
            icon={BookOpen}
            iconBg={accent.soft}
            iconColor={accent.value}
            label="View Ledger"
            onPress={() => router.push(`/customers/${c.id}/ledger` as any)}
          />
          <ActionRow
            icon={ReceiptText}
            iconBg={Colors.warningSoft}
            iconColor={Colors.warning}
            label="Payment History"
            onPress={() => router.push(`/customers/${c.id}/payments` as any)}
          />
          <ActionRow
            icon={FileText}
            iconBg={accent.soft}
            iconColor={accent.value}
            label="Generate Bill"
            onPress={() => router.push(`/customers/${c.id}/bill` as any)}
          />
          <TouchableOpacity
            onPress={() => togglePause(c.id)}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-4">
              <View
                className="h-10 w-10 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.dangerSoft }}
              >
                {c.paused
                  ? <Play size={19} color={Colors.danger} />
                  : <Pause size={19} color={Colors.danger} />
                }
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.danger }}>
                {c.paused ? 'Resume Delivery' : 'Pause Delivery'}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.border} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-6 pt-4 pb-8 rounded-t-[32px] border-t"
        style={{ borderTopColor: Colors.border, ...softShadow }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/customers/${c.id}/payment` as any)}
          className="w-full rounded-full py-4 items-center flex-row justify-center gap-2"
          style={{ backgroundColor: accent.value }}
        >
          <Wallet size={20} color="white" />
          <Text style={{ fontSize: 16, fontWeight: '800', color: 'white', letterSpacing: 0.3 }}>
            Add Payment
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
