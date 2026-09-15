/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ROOT LAYOUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Providers, and a root stack that holds exactly one thing: the tab shell.
 *
 * Keeping the root stack this thin is deliberate. Previously every screen —
 * Delivery, Billing, Reports, Settings, all the customer screens — was a
 * sibling on one flat root stack, and the tab bar navigated with `router.push`.
 * That meant tapping four tabs left four entries on the stack, back retraced
 * tab history instead of exiting, and every tab revisit remounted the screen
 * from scratch. All per-section navigation now lives inside each tab's own
 * stack, so the root has nothing to accumulate.
 */

import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../../global.css';

import { FeedbackProvider } from '@/components/motion';
import { ScreenTransition } from '@/constants/motion';
import { Colors } from '@/constants/theme';
import { ThemeProvider } from '@/context/theme-context';

export default function RootLayout() {
  return (
    /**
     * Required for the pan gesture that drives bottom sheets. Expo Router does
     * not mount this for us, and without it a sheet is visible but not
     * draggable — the gesture silently never fires.
     */
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        {/*
          Above the navigator so a success banner outlives the navigation that
          triggered it: closing a form and confirming the save happen together.
        */}
        <FeedbackProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              // A flat background behind every transition. Without it, the
              // gap revealed mid-push renders as black on Android and reads
              // as a flash.
              contentStyle: { backgroundColor: Colors.background },
              ...ScreenTransition.push,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" options={ScreenTransition.modal} />
          </Stack>
        </FeedbackProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
