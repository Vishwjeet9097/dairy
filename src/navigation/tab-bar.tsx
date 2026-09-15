/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GLOBAL BOTTOM NAVIGATION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * One bar, rendered once by the tabs navigator — not re-created per screen as
 * before, which is what made it drift (Settings had no bar at all) and lose all
 * tab state on every switch.
 *
 * Behaviour notes worth knowing before editing:
 *
 * • Switching tabs uses `navigation.navigate`, never `router.push`. Pushing a
 *   tab onto the root stack is what previously made the back button retrace tab
 *   history and remount every screen from scratch.
 *
 * • Pressing the *already focused* tab still emits `tabPress`. That single event
 *   is what lets the nested native stack pop to its root and any list using
 *   `useScrollToTop` scroll back up — the standard "tap the tab you're on to go
 *   home" gesture, for free.
 *
 * • The bar is absolutely positioned so hiding it is a pure transform with no
 *   layout pass, and so it can never reflow content mid-transition.
 *
 * • Active state is a crossfade between two pre-coloured icon/label pairs
 *   rather than an animated colour value. Lucide icons take colour as a prop,
 *   not a style, so it cannot be interpolated — and opacity is cheaper anyway.
 */

import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/pressable-scale';
import { Timing } from '@/constants/motion';
import { Colors, Radius, TabBar as TabBarMetrics, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useT, type Translate } from '@/lib/i18n';
import { TABS, type TabDefinition } from './config';
import { isFullScreenWorkflow } from './route-utils';

const INACTIVE_TINT = TabBarMetrics.inactiveTint;

export function AppTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const t = useT();
  const { accent } = useAppTheme();

  /**
   * Derived synchronously from navigation state, so the bar starts leaving on
   * the same frame the full-screen route starts entering. Nothing to flicker.
   */
  const hidden = isFullScreenWorkflow(state);

  // The bar's own height plus whatever the device reserves at the bottom
  // (home indicator, gesture pill, or nothing on older Android).
  const barHeight = TabBarMetrics.height + insets.bottom;

  const hideProgress = useSharedValue(hidden ? 1 : 0);

  useEffect(() => {
    hideProgress.value = withTiming(hidden ? 1 : 0, Timing.chrome);
  }, [hidden, hideProgress]);

  const containerStyle = useAnimatedStyle(() => ({
    // Slide fully off-screen, plus a partial fade so it reads as "stepping
    // aside" rather than being yanked down.
    transform: [{ translateY: hideProgress.value * barHeight }],
    opacity: 1 - hideProgress.value * 0.35,
  }));

  const visibleTabs = state.routes
    .map((route, index) => {
      const definition = TABS.find((tab) => tab.name === route.name);
      return definition ? { route, index, definition } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <Animated.View
      // Not just visually hidden — unreachable, so a stray tap during a
      // transition can't switch tabs out from under a full-screen form.
      pointerEvents={hidden ? 'none' : 'auto'}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[
        styles.container,
        {
          height: barHeight,
          paddingBottom: insets.bottom,
          // Respect landscape / notched side insets too.
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        containerStyle,
      ]}
    >
      <View accessibilityRole="tablist" style={styles.row}>
        {visibleTabs.map(({ route, index, definition }) => {
          const focused = state.index === index;

          return (
            <TabItem
              key={route.key}
              definition={definition}
              focused={focused}
              activeColor={accent.color}
              activePillColor={accent.soft}
              t={t}
              position={index + 1}
              total={visibleTabs.length}
              onPress={() => {
                // Emitted even when already focused — see the header comment.
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  // `navigate`, not `push`: focuses the existing tab and leaves
                  // its nested stack exactly where the user left it.
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

interface TabItemProps {
  definition: TabDefinition;
  focused: boolean;
  activeColor: string;
  activePillColor: string;
  t: Translate;
  position: number;
  total: number;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({
  definition,
  focused,
  activeColor,
  activePillColor,
  t,
  position,
  total,
  onPress,
  onLongPress,
}: TabItemProps) {
  const Icon: LucideIcon = definition.icon;
  const label = t(definition.labelKey);

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    // `fast` (120ms). Tab switching must feel like it already happened; any
    // longer and the user is watching the bar instead of the new screen.
    progress.value = withTiming(focused ? 1 : 0, Timing.fast);
  }, [focused, progress]);

  // The pill grows in from 85% rather than 0 — a full scale-up from nothing
  // reads as a pop, which is exactly the bounce we want to avoid.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.85 + 0.15 * progress.value }],
  }));

  const activeLayerStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const inactiveLayerStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      // Icons are small; a slightly firmer press reads better here.
      scale={0.92}
      dim={false}
      style={styles.item}
      // iOS ignores role="tab" in practice, so mirror what React Navigation
      // itself does and fall back to button.
      accessibilityRole={Platform.OS === 'ios' ? 'button' : 'tab'}
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${label}, ${position} of ${total}`}
    >
      <View style={styles.iconSlot}>
        {/* Active pill sits behind the icon and carries the accent tint. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: activePillColor }, pillStyle]}
        />

        {/* Crossfaded icon pair — see header note on why colour isn't animated. */}
        <Animated.View style={[styles.iconLayer, inactiveLayerStyle]}>
          <Icon size={21} color={INACTIVE_TINT} strokeWidth={2} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, activeLayerStyle]}>
          <Icon size={21} color={activeColor} strokeWidth={2.4} />
        </Animated.View>
      </View>

      {/* Same crossfade for the label. Both layers are identical in metrics, so
          the text never reflows and the bar height stays constant. */}
      <View style={styles.labelSlot}>
        <Animated.Text
          accessible={false}
          numberOfLines={1}
          // Hard cap: without this, "Larger Text" at maximum can double the
          // label height and break the bar's fixed height.
          maxFontSizeMultiplier={TabBarMetrics.maxFontScale}
          style={[styles.label, { color: INACTIVE_TINT }, inactiveLayerStyle]}
        >
          {label}
        </Animated.Text>
        <Animated.Text
          accessible={false}
          numberOfLines={1}
          maxFontSizeMultiplier={TabBarMetrics.maxFontScale}
          style={[styles.label, styles.labelOverlay, { color: activeColor }, activeLayerStyle]}
        >
          {label}
        </Animated.Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    // Above scroll content, below modals.
    zIndex: 50,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
    minWidth: TabBarMetrics.itemMinWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  iconSlot: {
    width: TabBarMetrics.pillWidth,
    height: TabBarMetrics.pillHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.full,
  },
  iconLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSlot: {
    // Height comes from the first (in-flow) label; the active one is overlaid.
    alignSelf: 'stretch',
  },
  label: {
    ...Type.micro,
    textAlign: 'center',
  },
  labelOverlay: {
    /**
     * Only the horizontal edges are pinned. Leaving `top`/`bottom` unset lets
     * Yoga position this at the container's top edge and size it to its own
     * content — identical metrics to the in-flow label, so the two align to the
     * pixel. `absoluteFill` would stretch it to the full height instead and the
     * active label would sit a couple of pixels high.
     */
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
