/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TAB BAR METRICS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The bottom bar is absolutely positioned and content scrolls underneath it, so
 * every scrollable primary screen has to reserve room at the bottom or the last
 * row ends up hidden behind the bar.
 *
 * Screens previously hardcoded `paddingBottom: 110 | 120 | 140`, none of which
 * matched the real bar height and none of which accounted for the safe-area
 * inset. These hooks are the only correct source.
 *
 * Why absolute positioning rather than letting the navigator lay the bar out
 * inline: hiding an inline bar changes the scene's height, which reflows and
 * visibly jumps the content. With an absolute bar the scene geometry never
 * changes, so showing and hiding is a pure transform — no layout pass, no jump.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar } from '@/constants/theme';

/**
 * Full height the bar occupies on screen, including the device's bottom
 * safe-area inset (home indicator on iOS, gesture pill on Android).
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const floatBottom = Math.max(insets.bottom, 16);
  return TabBar.height + floatBottom;
}

/**
 * Bottom padding for a scroll view on a screen that shows the tab bar.
 * Includes a small gap so content does not sit flush against the bar.
 *
 *   <ScrollView contentContainerStyle={{ paddingBottom: useScreenPadding() }} />
 */
export function useScreenPadding(): number {
  return useTabBarHeight() + TabBar.contentGap;
}

/**
 * Bottom padding for a screen that has a pinned bottom action bar *and* the tab
 * bar, e.g. Delivery's "Mark All Delivered". Reserves room for both.
 */
export function useScreenPaddingWithAction(actionHeight: number): number {
  return useScreenPadding() + actionHeight;
}

/**
 * Offset for a floating element (CTA bar, snackbar) that must sit directly on
 * top of the tab bar without overlapping it.
 */
export function useAboveTabBarOffset(): number {
  return useTabBarHeight();
}

/**
 * Bottom padding for a full-screen workflow — a screen where the tab bar is
 * hidden. Only the safe-area inset applies, plus an optional minimum so the
 * content never hugs the very bottom edge.
 */
export function useFullScreenPadding(minimum = 24): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, minimum);
}
