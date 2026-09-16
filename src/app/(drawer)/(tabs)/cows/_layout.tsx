/**
 * Cows stack.
 */

import { Stack } from 'expo-router';

import { ScreenTransition } from '@/constants/motion';
import { Colors } from '@/constants/theme';

export default function CowsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        ...ScreenTransition.push,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
