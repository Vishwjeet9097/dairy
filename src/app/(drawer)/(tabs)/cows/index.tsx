import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, ScreenHeader, EmptyState } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { DrawerToggleButton } from 'expo-router/drawer';

export default function CowsScreen() {
  const t = useT();
  
  return (
    <Screen statusBar="light">
      <ScreenHeader
        title="Herd Management"
        subtitle="Manage your cows and yield"
        action={<DrawerToggleButton tintColor="#FFF" />}
      />
      <View style={styles.container}>
        <EmptyState
          title="Herd Management Coming Soon"
          description="Track cow health, milk yield per cow, and breeding cycles here."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  }
});
