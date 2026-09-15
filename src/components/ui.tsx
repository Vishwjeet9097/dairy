import { usePathname, useRouter } from 'expo-router';
import { ChevronLeft, FileText, Home, ReceiptText, Settings, UserPlus } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors, floatingShadow, softShadow } from '../constants/theme';
import { useAppTheme } from '../context/theme-context';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { accent } = useAppTheme();
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accent.soft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.04)',
      }}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: accent.color }}>
        {initial}
      </Text>
    </View>
  );
}

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View
      className="flex-row items-center justify-between px-6 py-4 pt-14 border-b border-gray-100"
      style={{ backgroundColor: Colors.card, ...softShadow }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        className="h-10 w-10 items-center justify-center rounded-full bg-gray-50 border border-black/[0.04]"
      >
        <ChevronLeft color={Colors.foreground} size={22} />
      </TouchableOpacity>
      <Text className="text-[17px] font-bold text-gray-900 tracking-tight">
        {title}
      </Text>
      <View className="w-10 items-end">{right}</View>
    </View>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { accent } = useAppTheme();

  const options = [
    { name: 'Home', to: '/', icon: Home },
    { name: 'Customers', to: '/customers', icon: UserPlus },
    { name: 'Billing', to: '/billing', icon: ReceiptText },
    { name: 'Reports', to: '/reports', icon: FileText },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ paddingBottom: 24, ...floatingShadow }}
    >
      <View className="flex-row items-center justify-around pt-3 pb-1">
        {options.map((opt) => {
          const isActive = pathname === opt.to;
          const Icon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.name}
              onPress={() => router.push(opt.to as any)}
              className="items-center gap-1"
              style={{ minWidth: 52 }}
            >
              <View
                className="items-center justify-center rounded-2xl"
                style={{
                  width: 40,
                  height: 32,
                  backgroundColor: isActive ? accent.soft : 'transparent',
                }}
              >
                <Icon size={20} color={isActive ? accent.color : '#9CA3AF'} />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? accent.color : '#9CA3AF',
                }}
              >
                {opt.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
