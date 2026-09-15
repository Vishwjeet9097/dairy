import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, ScreenHeader, EmptyState } from '@/components/ui';
import { DrawerToggleButton } from 'expo-router/drawer';

export default function FeedScreen() {
  
  return (
    <Screen statusBar="light">
      <ScreenHeader
        title="Feed & Nutrition"
        subtitle="Manage cattle food stock"
        action={<DrawerToggleButton tintColor="#FFF" />}
      />
      <View style={styles.container}>
        <EmptyState
          title="Feed Management Coming Soon"
          description="Track your stock of fodder, cattle feed, and supplements."
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
