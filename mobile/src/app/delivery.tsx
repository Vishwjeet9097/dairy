import { useRouter } from 'expo-router';
import { Calendar, Check, ChevronLeft, ChevronRight, CircleDashed, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, TopBar } from '../components/ui';
import { cardBorder, cardShadow, Colors, softShadow } from '../constants/theme';
import { useAppTheme } from '../context/theme-context';
import { statusFor, todayISO, useDairyStore, type DeliveryStatus, type Slot } from '../lib/dairy-store';

const nextStatus: Record<DeliveryStatus, DeliveryStatus> = {
  pending: 'delivered',
  delivered: 'not_delivered',
  not_delivered: 'pending',
};

export default function DeliveryScreen() {
  const router = useRouter();
  const { accent } = useAppTheme();
  const { customers, setStatus, markAll } = useDairyStore();
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState<Slot>('morning');
  const [q, setQ] = useState('');

  const list = customers
    .filter(c => !c.paused && (slot === 'morning' ? c.morningQty : c.eveningQty) > 0)
    .filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  const displayDate = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const addDays = (d: string, n: number) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().slice(0, 10);
  };

  const deliveredCount = list.filter(
    c => statusFor(useDairyStore.getState(), c.id, date, slot) === 'delivered',
  ).length;

  return (
    <View className="flex-1 relative" style={{ backgroundColor: Colors.background }}>
      <StatusBar barStyle="dark-content" />
      <TopBar title="Delivery" />

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date selector */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="w-10" />
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => setDate(addDays(date, -1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
              style={[cardBorder, cardShadow]}
            >
              <ChevronLeft size={20} color={Colors.foreground} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.foreground, letterSpacing: -0.3 }}>
              {displayDate}
            </Text>
            <TouchableOpacity
              onPress={() => setDate(addDays(date, 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
              style={[cardBorder, cardShadow]}
            >
              <ChevronRight size={20} color={Colors.foreground} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity className="h-10 w-10 items-center justify-center">
            <Calendar size={22} color={Colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Slot toggle */}
        <View
          className="flex-row rounded-full p-1.5 mb-6 bg-white"
          style={[cardBorder, cardShadow]}
        >
          {(['morning', 'evening'] as Slot[]).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSlot(s)}
              className="flex-1 rounded-full py-3 items-center"
              style={{ backgroundColor: slot === s ? accent.color : 'transparent' }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '800',
                textTransform: 'capitalize',
                letterSpacing: 0.3,
                color: slot === s ? 'white' : Colors.mutedForeground,
              }}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress pill */}
        <View
          className="flex-row items-center justify-between rounded-2xl px-5 py-3 mb-6"
          style={{ backgroundColor: accent.soft }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: accent.color }}>
            {deliveredCount} / {list.length} delivered
          </Text>
          <View className="rounded-full h-2 flex-1 mx-4" style={{ backgroundColor: `${accent.color}30` }}>
            <View
              className="h-2 rounded-full"
              style={{
                backgroundColor: accent.color,
                width: list.length > 0 ? `${(deliveredCount / list.length) * 100}%` : '0%',
              }}
            />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: accent.color }}>
            {list.length > 0 ? Math.round((deliveredCount / list.length) * 100) : 0}%
          </Text>
        </View>

        {/* Search */}
        <View className="flex-row items-center relative mb-6">
          <View className="absolute left-4 z-10">
            <Search size={18} color={Colors.mutedForeground} />
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search customer..."
            placeholderTextColor={Colors.mutedForeground}
            className="flex-1 rounded-full bg-white py-3.5 pl-11 pr-4 text-sm font-semibold"
            style={[{ color: Colors.foreground }, cardBorder, cardShadow]}
          />
        </View>

        {/* Customer list */}
        {list.map(c => {
          const qty = slot === 'morning' ? c.morningQty : c.eveningQty;
          const status = statusFor(useDairyStore.getState(), c.id, date, slot);

          const statusBg =
            status === 'delivered' ? accent.color :
              status === 'not_delivered' ? Colors.danger :
                Colors.surface;

          const statusIcon =
            status === 'delivered' ? <Check size={18} color="white" strokeWidth={3} /> :
              status === 'not_delivered' ? <X size={18} color="white" strokeWidth={3} /> :
                <CircleDashed size={18} color={Colors.mutedForeground} />;

          return (
            <View
              key={c.id}
              className="flex-row items-center gap-4 rounded-[24px] bg-white p-4 mb-4"
              style={[cardBorder, cardShadow]}
            >
              <Avatar name={c.name} size={52} />
              <View className="flex-1">
                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.foreground, marginBottom: 2 }} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: accent.color }}>
                  {qty.toFixed(1)} L{' '}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.mutedForeground }}>
                    · ₹{qty * c.rate}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setStatus(c.id, date, slot, nextStatus[status], qty, c.rate)}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: statusBg }}
              >
                {statusIcon}
              </TouchableOpacity>
            </View>
          );
        })}

        {list.length === 0 && (
          <View className="rounded-[24px] bg-white p-10 items-center justify-center" style={[cardBorder, cardShadow]}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.mutedForeground }}>
              No deliveries found.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-6 pt-4 pb-8 rounded-t-[32px]"
        style={[{ borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.04)' }, softShadow]}
      >
        <TouchableOpacity
          onPress={() => markAll(date, slot, 'delivered', customers)}
          className="w-full rounded-full py-4 items-center flex-row justify-center gap-2"
          style={{ backgroundColor: accent.color }}
        >
          <Check size={20} color="white" strokeWidth={3} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: 'white', letterSpacing: 0.3 }}>
            Mark All Delivered
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
