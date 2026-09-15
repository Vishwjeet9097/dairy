/**
 * More stack.
 *
 * Hub → Reports · Settings. These were top-level tabs before, but they are
 * visited occasionally rather than daily, and holding two of five tab slots for
 * them pushed Delivery — the screen used twice a day — off the bar entirely.
 */

import { Stack } from 'expo-router';

import { ScreenTransition } from '@/constants/motion';
import { Colors } from '@/constants/theme';

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        ...ScreenTransition.push,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
