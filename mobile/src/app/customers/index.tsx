import { useRouter } from 'expo-router';
import { ChevronRight, Phone, Search, SlidersHorizontal, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar, BottomNav } from '../../components/ui';
import { cardShadow, Colors, softShadow } from '../../constants/theme';
import { useAppTheme } from '../../context/theme-context';
import { money0, outstanding, useDairyStore } from '../../lib/dairy-store';

export default function CustomersScreen() {
  const router = useRouter();
  const { accent } = useAppTheme();
  const { customers } = useDairyStore();
  const [q, setQ] = useState('');

  const list = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  const activeCount = customers.filter(c => !c.paused).length;

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
                Customers
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 }}>
                {activeCount} active · {customers.length} total
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/customers/new')}
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <UserPlus size={22} color="white" />
            </TouchableOpacity>
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
              className="flex-1 rounded-full bg-white py-3.5 pl-11 pr-12 text-sm font-semibold"
              style={{ color: Colors.foreground }}
            />
            <View className="absolute right-4 z-10">
              <SlidersHorizontal size={17} color="#9CA3AF" />
            </View>
          </View>
        </View>

        {/* List */}
        <View className="px-6 -mt-6">
          {list.map(c => {
            const out = outstanding(useDairyStore.getState(), c.id);

            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push(`/customers/${c.id}`)}
                className="flex-row items-center gap-4 rounded-[24px] bg-white p-4 mb-4"
                style={cardShadow}
              >
                <Avatar name={c.name} size={52} />

                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.foreground }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {c.paused && (
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: Colors.warningSoft }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.warning }}>
                          PAUSED
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Phone size={12} color={Colors.mutedForeground} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.mutedForeground }}>
                      {c.phone}
                    </Text>
                  </View>
                </View>

                <View className="items-end gap-1">
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: out > 0 ? Colors.danger : Colors.success,
                  }}>
                    {money0(out)}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: Colors.mutedForeground }}>
                    Balance
                  </Text>
                </View>

                <ChevronRight size={18} color={Colors.border} />
              </TouchableOpacity>
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
