import { Drawer, DrawerContentScrollView } from 'expo-router/drawer';
import { Settings, FileText, Beef, Wheat } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui';
import { Colors, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useT } from '@/lib/i18n';
import { useRouter, usePathname } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;

function CustomDrawerContent(props: any) {
  const { accent } = useAppTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isSelected = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  // Main menu (everything except bottom nav)
  const navItems = [
    { label: 'Herd Management', icon: Beef, path: '/cows' },
    { label: 'Feed & Nutrition', icon: Wheat, path: '/feed' },
    { label: 'Reports', icon: FileText, path: '/reports' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  // Secondary menu
  const secondaryItems = [
    { label: "FAQ's", path: '/faq' },
    { label: 'Contact Us', path: '/contact' },
    { label: 'Terms & Conditions', path: '/terms' },
  ];

  return (
    <View style={[styles.drawerContainer, { backgroundColor: '#FFFFFF' }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: 60 }}>
        
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar name="Vishwjeet" size={64} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.userName}>The luxury Flavor</Text>
            <Text style={styles.userRole}>View my Profile</Text>
          </View>
        </View>

        {/* Primary Menu (No dividers, massive padding) */}
        <View style={styles.navSection}>
          {navItems.map((item, index) => {
            const active = isSelected(item.path);
            const tint = active ? accent.color : '#222222';
            return (
              <Pressable
                key={index}
                onPress={() => router.push(item.path as any)}
              >
                {({ pressed }) => (
                  <View style={[styles.menuItem, pressed && { opacity: 0.6 }]}>
                    <View style={styles.iconContainer}>
                      <item.icon size={28} color={tint} strokeWidth={active ? 2.5 : 1.5} />
                    </View>
                    <Text style={[styles.menuItemText, active && { color: tint, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Secondary Menu (No dividers) */}
        <View style={styles.secondarySection}>
          {secondaryItems.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => console.log('Navigate to', item.path)}
            >
              {({ pressed }) => (
                <View style={[styles.secondaryMenuItem, pressed && { opacity: 0.6 }]}>
                  <Text style={styles.secondaryMenuItemText}>{item.label}</Text>
                </View>
              )}
            </Pressable>
          ))}
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
          backgroundColor: '#FFFFFF',
          width: SCREEN_WIDTH, // Guaranteed 100% full screen
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
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 40,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    backgroundColor: '#FFF',
    borderRadius: 40, // fully round
  },
  headerText: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  userRole: {
    fontSize: 15,
    fontWeight: '500',
    color: '#888888',
  },
  navSection: {
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20, // Huge vertical breathing room
  },
  iconContainer: {
    width: 36,
    alignItems: 'center', // Center the icon within the fixed width container
    marginRight: 24, // Generous gap
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  secondarySection: {
    paddingHorizontal: 32,
  },
  secondaryMenuItem: {
    paddingVertical: 16,
  },
  secondaryMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
  },
});
