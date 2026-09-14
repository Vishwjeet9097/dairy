import { useRouter } from 'expo-router';
import { ChevronRight, FileText, ReceiptText, Search, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, BottomNav } from '../components/ui';
import { cardShadow, Colors, softShadow } from '../constants/theme';
import { useAppTheme } from '../context/theme-context';
import { money0, outstanding, useDairyStore } from '../lib/dairy-store';

export default function BillingScreen() {
  const router = useRouter();
  const { accent } = useAppTheme();
  const { customers } = useDairyStore();
  const [q, setQ] = useState('');

  const list = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  const totalOut = customers.reduce(
    (sum, c) => sum + outstanding(useDairyStore.getState(), c.id),
    0,
  );

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
          className="px-6 pt-16 pb-12 rounded-b-[36px]"
          style={{ backgroundColor: accent.header, ...softShadow }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: 'white', letterSpacing: -0.5 }}>
                Billing
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 }}>
                Manage payments & receipts
              </Text>
            </View>
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <ReceiptText size={22} color="white" />
            </View>
          </View>

          {/* Total outstanding pill */}
          <View
            className="rounded-2xl px-5 py-3 mb-5 flex-row items-center justify-between"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
              Total Outstanding
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: 'white' }}>
              {money0(totalOut)}
            </Text>
          </View>

          {/* Search */}
          <View className="flex-row items-center relative">
            <View className="absolute left-4 z-10">
              <Search size={18} color="#9CA3AF" />
            </View>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search customers..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 rounded-full bg-white py-3.5 pl-11 pr-4 text-sm font-semibold"
              style={{ color: Colors.foreground }}
            />
          </View>
        </View>

        {/* List */}
        <View className="px-6 -mt-6">
          {list.map(c => {
            const out = outstanding(useDairyStore.getState(), c.id);

            return (
              <View
                key={c.id}
                className="rounded-[24px] bg-white p-4 mb-4"
                style={cardShadow}
              >
                {/* Customer row */}
                <TouchableOpacity
                  onPress={() => router.push(`/customers/${c.id}`)}
                  className="flex-row items-center gap-4 mb-4"
                >
                  <Avatar name={c.name} size={52} />
                  <View className="flex-1">
                    <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.foreground, marginBottom: 2 }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.mutedForeground }}>
                      Outstanding Balance
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text style={{
                      fontSize: 17,
                      fontWeight: '800',
                      color: out > 0 ? Colors.danger : Colors.success,
                    }}>
                      {money0(out)}
                    </Text>
                    <ChevronRight size={16} color={Colors.border} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>

                {/* Action buttons */}
                <View
                  className="flex-row gap-3 pt-4 border-t"
                  style={{ borderTopColor: Colors.border }}
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/customers/${c.id}/bill` as any)}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3"
                    style={{ backgroundColor: accent.soft }}
                  >
                    <FileText size={16} color={accent.value} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: accent.value }}>Bill</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push(`/customers/${c.id}/payment` as any)}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3"
                    style={{ backgroundColor: accent.value }}
                  >
                    <Wallet size={16} color="white" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: 'white' }}>Pay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {list.length === 0 && (
            <View className="rounded-[24px] bg-white p-10 items-center justify-center mt-4" style={cardShadow}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.mutedForeground }}>
                No customers found.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}
