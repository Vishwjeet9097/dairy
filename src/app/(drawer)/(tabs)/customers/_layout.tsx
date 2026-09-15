/**
 * Customers stack.
 *
 * The deepest hierarchy in the app:
 *   list → detail → { payment · bill · ledger · history }
 *
 * `payment` and `bill` are declared as modal workflows. That gives them a
 * bottom-up transition and a downward dismiss gesture, which matches how the
 * tab bar behaves for those routes (it steps aside) — the screen reads as a task
 * layered over the app rather than another rung on the hierarchy.
 *
 * `ledger` and `payments` stay as regular pushes: they are places to read, part
 * of the customer's hierarchy, and they keep the tab bar.
 */

import { Stack } from 'expo-router';

import { ScreenTransition } from '@/constants/motion';
import { Colors } from '@/constants/theme';

export default function CustomersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        ...ScreenTransition.push,
      }}
    >
      <Stack.Screen name="index" />
      {/* Full-screen form: modal presentation, tab bar hides. */}
      <Stack.Screen name="new" options={ScreenTransition.modal} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/payment" options={ScreenTransition.modal} />
      <Stack.Screen name="[id]/bill" options={ScreenTransition.modal} />
      <Stack.Screen name="[id]/ledger" />
      <Stack.Screen name="[id]/payments" />
    </Stack>
  );
}
