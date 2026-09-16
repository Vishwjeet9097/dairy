/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TAB SHELL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The persistent shell for the app's five primary destinations. Each tab owns a
 * nested stack (see the sibling `_layout.tsx` files), which is what makes
 * per-tab navigation state survive tab switches:
 *
 *   Customers → Customer Detail, switch to Delivery, come back
 *   → still on Customer Detail, still scrolled where you left it.
 *
 * That works because the navigator keeps blurred tabs mounted. Nothing is
 * unmounted, so component state, scroll offsets and half-typed search fields
 * are all still there — no cache layer needed.
 */

import { Tabs } from 'expo-router/js-tabs';

import { TabTransition } from '@/constants/motion';
import { Colors } from '@/constants/theme';
import { useT } from '@/lib/i18n';
import { INITIAL_TAB, TABS } from '@/navigation/config';
import { AppTabBar } from '@/navigation/tab-bar';

export default function TabsLayout() {
  const t = useT();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      /**
       * Android back goes to Home, then exits. `history` (back retraces every
       * tab you visited) makes the stack feel unbounded, and `firstRoute`
       * without an explicit initial route is ambiguous once tabs are reordered.
       * This is the shallowest predictable behaviour: at most one back press
       * from anywhere to Home.
       */
      backBehavior="initialRoute"
      initialRouteName={INITIAL_TAB}
      screenOptions={{
        headerShown: false,
        /**
         * Our bar is absolutely positioned and reports no height, so the
         * navigator must tell scenes the tab bar inset is zero — otherwise
         * screens would be padded twice, once by the navigator and once by
         * `useScreenPadding()`. This is what `BottomTabView` reads to seed
         * `BottomTabBarHeightContext`; it does not style our custom bar.
         */
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: Colors.background },
        /**
         * Cross-fade at 120ms. Tabs are siblings, not a hierarchy — a
         * horizontal slide would imply a spatial order that doesn't exist.
         */
        ...TabTransition,
        /**
         * Blurred tabs stop re-rendering but stay mounted. This is the setting
         * that keeps animations smooth on low-end Android: without it, all five
         * tabs re-render on every store update, so a delivery tap on one tab
         * costs work on four invisible ones.
         */
        freezeOnBlur: true,
        /** Don't mount a tab until it is first visited — faster cold start. */
        lazy: true,
        /**
         * A tab's stack keeps its history when you leave it. This is the other
         * half of state preservation and must stay false.
         */
        popToTopOnBlur: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            // Used for accessibility and as the fallback label; the custom bar
            // renders its own translated text.
            title: t(tab.labelKey),
          }}
        />
      ))}
      <Tabs.Screen name="delivery" options={{ href: null }} />
      <Tabs.Screen name="billing" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
