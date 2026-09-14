import { usePathname, useRouter } from 'expo-router';
import { ChevronLeft, FileText, Home, ReceiptText, Settings, UserPlus } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors, cardShadow, softShadow } from '../constants/theme';
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
      }}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: accent.value }}>
        {initial}
      </Text>
    </View>
  );
}

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  const { accent } = useAppTheme();
  return (
    <View
      className="flex-row items-center justify-between px-6 py-4 pt-14"
      style={{ backgroundColor: Colors.card, ...cardShadow }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: Colors.surface }}
      >
        <ChevronLeft color={Colors.foreground} size={24} />
      </TouchableOpacity>
      <Text className="text-[17px] font-bold" style={{ color: Colors.foreground }}>
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
    { name: 'Home',      to: '/',          icon: Home },
    { name: 'Customers', to: '/customers', icon: UserPlus },
    { name: 'Billing',   to: '/billing',   icon: ReceiptText },
    { name: 'Reports',   to: '/reports',   icon: FileText },
    { name: 'Settings',  to: '/settings',  icon: Settings },
  ];

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EBEBEB]"
      style={{ paddingBottom: 24, ...softShadow }}
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
                <Icon size={20} color={isActive ? accent.value : '#AAAAAA'} />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: isActive ? accent.value : '#AAAAAA',
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
