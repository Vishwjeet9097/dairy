/**
 * Delivery stack.
 *
 * A single screen today, but it is a stack rather than a bare route so the
 * tab's navigation state is preserved on the same terms as every other tab, and
 * so pushing a detail screen later needs no restructuring.
 */

import { Stack } from 'expo-router';

import { ScreenTransition } from '@/constants/motion';
import { Colors } from '@/constants/theme';

export default function DeliveryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        ...ScreenTransition.push,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="extra" />
    </Stack>
  );
}
