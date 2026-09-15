/**
 * Billing stack.
 *
 * Billing links out to customer-scoped screens (`/customers/:id/bill`), which
 * live in the Customers tab. Navigating there deliberately *switches tabs*
 * rather than duplicating those screens here — one canonical route per screen,
 * so the back path is always unambiguous and the bill screen is never on two
 * stacks at once.
 */

import { Stack } from 'expo-router';

import { ScreenTransition } from '@/constants/motion';
import { Colors } from '@/constants/theme';

export default function BillingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        ...ScreenTransition.push,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
