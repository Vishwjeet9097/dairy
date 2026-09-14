import {
    Activity,
    BarChart2, Download,
    FileText,
    IndianRupee, Milk,
    TrendingUp
} from 'lucide-react-native';
import React from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { BottomNav } from '../components/ui';
import { cardShadow, Colors, softShadow } from '../constants/theme';
import { useAppTheme } from '../context/theme-context';
import {
    collectionOn,
    milkOn,
    money0,
    todayISO,
    totalOutstanding,
    useDairyStore,
} from '../lib/dairy-store';

export default function ReportsScreen() {
  const { accent } = useAppTheme();
  const { customers } = useDairyStore();

  const today = todayISO();
  const addDays = (d: string, n: number) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().slice(0, 10);
  };

  let totalMilk7d = 0;
  let totalCollection7d = 0;
  const dailyData: { day: string; milk: number; collection: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const milk = milkOn(useDairyStore.getState(), d);
    const col = collectionOn(useDairyStore.getState(), d);
    totalMilk7d += milk;
    totalCollection7d += col;
    dailyData.push({
      day: new Date(d).toLocaleDateString('en-IN', { weekday: 'short' }),
      milk,
      collection: col,
    });
  }

  const out = totalOutstanding(useDairyStore.getState());
  const maxMilk = Math.max(...dailyData.map(d => d.milk), 1);

  return (
    <View className="flex-1 relative" style={{ backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View
          className="px-6 pt-16 pb-10 rounded-b-[36px]"
          style={{ backgroundColor: accent.header, ...softShadow }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: 'white', letterSpacing: -0.5 }}>
                Reports
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 }}>
                Analytics & trends
              </Text>
            </View>
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Activity size={22} color="white" />
            </View>
          </View>
        </View>

        <View className="px-6 -mt-6">
          {/* Outstanding card */}
          <View
            className="rounded-[28px] bg-white p-6 mb-5 items-center"
            style={cardShadow}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.mutedForeground, marginBottom: 6 }}>
              Total Outstanding
            </Text>
            <Text style={{
              fontSize: 36,
              fontWeight: '900',
              color: out > 0 ? Colors.danger : Colors.success,
              letterSpacing: -1,
            }}>
              {money0(out)}
            </Text>
            <View
              className="mt-4 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: accent.soft }}
            >
              <TrendingUp size={13} color={accent.value} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: accent.value }}>Live Sync</Text>
            </View>
          </View>

          {/* 7-day stats */}
          <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.foreground, marginBottom: 14 }}>
            Last 7 Days
          </Text>
          <View className="flex-row gap-4 mb-5">
            <View className="flex-1 rounded-[24px] bg-white p-5" style={cardShadow}>
              <View
                className="h-10 w-10 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: accent.soft }}
              >
                <IndianRupee size={20} color={accent.value} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.foreground }}>
                {money0(totalCollection7d)}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.mutedForeground, marginTop: 2 }}>
                Collection
              </Text>
            </View>

            <View className="flex-1 rounded-[24px] bg-white p-5" style={cardShadow}>
              <View
                className="h-10 w-10 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: accent.soft }}
              >
                <Milk size={20} color={accent.value} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.foreground }}>
                {totalMilk7d.toFixed(1)} L
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.mutedForeground, marginTop: 2 }}>
                Delivered
              </Text>
            </View>
          </View>

          {/* Mini bar chart */}
          <View className="rounded-[24px] bg-white p-5 mb-5" style={cardShadow}>
            <View className="flex-row items-center justify-between mb-5">
              <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.foreground }}>
                Daily Milk (L)
              </Text>
              <BarChart2 size={18} color={Colors.mutedForeground} />
            </View>
            <View className="flex-row items-end justify-between" style={{ height: 80 }}>
              {dailyData.map((d, i) => {
                const barH = Math.max(8, (d.milk / maxMilk) * 72);
                const isToday = i === dailyData.length - 1;
                return (
                  <View key={d.day} className="items-center gap-1" style={{ flex: 1 }}>
                    <View
                      className="rounded-t-lg w-6"
                      style={{
                        height: barH,
                        backgroundColor: isToday ? accent.value : `${accent.value}40`,
                      }}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.mutedForeground }}>
                      {d.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Ledger export row */}
          <TouchableOpacity
            className="rounded-[24px] bg-white p-5 flex-row items-center gap-4"
            style={cardShadow}
          >
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: accent.soft }}
            >
              <FileText size={24} color={accent.value} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.foreground }}>
                Detailed Ledger
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.mutedForeground }}>
                Export customer data
              </Text>
            </View>
            <Download size={20} color={accent.value} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}
