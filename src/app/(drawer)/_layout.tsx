import { Drawer, DrawerContentScrollView } from 'expo-router/drawer';
import { Settings, FileText, Beef, Wheat, X, LogOut, ChevronRight, HelpCircle, Phone, FileSignature } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui';
import { Colors, Layout, Radius, Type, softShadow, cardShadow } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useT } from '@/lib/i18n';
import { useRouter, usePathname } from 'expo-router';
import { useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDairyStore } from '@/lib/dairy-store';

const SCREEN_WIDTH = Dimensions.get('window').width;

function CustomDrawerContent(props: any) {
  const { accent } = useAppTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useNavigation();
  const settings = useDairyStore(s => s.settings);

  const isSelected = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const closeDrawer = () => {
    (navigation as any).closeDrawer();
  };

  const navGroups = [
    {
      title: 'DAIRY MANAGEMENT',
      icon: Beef,
      items: [
        { label: 'Herd Management', desc: 'Manage your livestock', icon: Beef, path: '/cows', color: '#EF4444', bg: '#FEE2E2' },
        { label: 'Feed & Nutrition', desc: 'Track feed and health', icon: Wheat, path: '/feed', color: '#10B981', bg: '#D1FAE5' },
        { label: 'Reports', desc: 'View analytics & reports', icon: FileText, path: '/reports', color: '#6366F1', bg: '#E0E7FF' },
      ],
    },
    {
      title: 'SUPPORT & SETTINGS',
      icon: Settings,
      items: [
        { label: 'Settings', desc: 'App & account preferences', icon: Settings, path: '/settings', color: '#3B82F6', bg: '#DBEAFE' },
        { label: "FAQ's", desc: 'Find quick answers', icon: HelpCircle, path: '/faq', color: '#8B5CF6', bg: '#EDE9FE' },
        { label: 'Contact Us', desc: "We're here to help", icon: Phone, path: '/contact', color: '#10B981', bg: '#D1FAE5' },
        { label: 'Terms & Conditions', desc: 'Read our policies', icon: FileSignature, path: '/terms', color: '#F59E0B', bg: '#FEF3C7' },
      ],
    }
  ];

  return (
    <View style={[styles.drawerContainer, { backgroundColor: '#F8FAFC' }]}>
      {/* Background Gradient matching the reference image */}
      <LinearGradient
        colors={['#FFF0F5', '#F8FAFC']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0.3 }}
        style={StyleSheet.absoluteFill}
      />

      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}>
        
        {/* Header Area */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatarRing, { borderColor: '#FFE4E6' }]}>
                <Avatar name={settings.ownerName} size={64} />
              </View>
              {/* Crown Icon / Badge representation */}
              <View style={styles.proBadge}>
                <Text style={{ fontSize: 10 }}>👑</Text>
              </View>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.userName} numberOfLines={1}>{settings.dairyName}</Text>
              <View style={styles.viewProfileRow}>
                <Text style={styles.userRole}>View my Profile</Text>
                <ChevronRight size={14} color={Colors.mutedForeground} />
              </View>
            </View>
          </View>
          <Pressable onPress={closeDrawer} style={styles.closeBtn}>
            <X size={20} color={Colors.foreground} />
          </Pressable>
        </View>

        {/* Menu Groups */}
        <View style={styles.menuContent}>
          {navGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <group.icon size={16} color={Colors.mutedForeground} style={{ marginRight: 8 }} />
                <Text style={styles.groupTitle}>{group.title}</Text>
                <View style={styles.groupLine} />
              </View>
              
              <View style={styles.cardContainer}>
                {group.items.map((item, index) => {
                  const active = isSelected(item.path);
                  const Icon = item.icon;
                  const isLast = index === group.items.length - 1;
                  return (
                    <Pressable
                      key={index}
                      onPress={() => router.push(item.path as any)}
                    >
                      {({ pressed }) => (
                        <View style={[styles.menuItem, !isLast && styles.menuItemBorder, pressed && { opacity: 0.7 }]}>
                          <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                            <Icon size={20} color={item.color} />
                          </View>
                          <View style={styles.menuItemTextContainer}>
                            <Text style={styles.menuItemText}>{item.label}</Text>
                            <Text style={styles.menuItemDesc}>{item.desc}</Text>
                          </View>
                          <ChevronRight size={16} color={Colors.border} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Logout Footer inside scrollview for exact reference match */}
        <View style={styles.logoutContainer}>
          <Pressable>
            {({ pressed }) => (
              <View style={[styles.logoutBtn, pressed && { opacity: 0.7 }]}>
                <LogOut size={22} color="#E11D48" strokeWidth={2.5} />
                <View style={styles.logoutDivider} />
                <Text style={styles.logoutText}>Log Out</Text>
                <View style={{ flex: 1 }} />
                <ChevronRight size={18} color="#94A3B8" />
              </View>
            )}
          </Pressable>
        </View>

      </DrawerContentScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: 'transparent',
          width: SCREEN_WIDTH,
        },
        drawerType: 'front',
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ drawerLabel: 'Home' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    marginBottom: 32,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: Radius.full,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  proBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FBBF24',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileText: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    ...Type.title,
    fontSize: 22,
    color: '#111827',
    marginBottom: 4,
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userRole: {
    ...Type.footnote,
    color: Colors.mutedForeground,
  },
  closeBtn: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    ...cardShadow,
  },
  menuContent: {
    paddingHorizontal: Layout.gutter,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupTitle: {
    ...Type.micro,
    color: Colors.mutedForeground,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  groupLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 12,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    ...cardShadow,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemText: {
    ...Type.bodyStrong,
    color: '#0F172A',
    marginBottom: 2,
  },
  menuItemDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  logoutContainer: {
    paddingHorizontal: Layout.gutter,
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  logoutDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#FECDD3',
    marginHorizontal: 16,
  },
  logoutText: {
    ...Type.bodyStrong,
    color: '#E11D48',
  }
});
