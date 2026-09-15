/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRESSABLE SCALE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The app's single press-feedback primitive. Everything tappable uses it, so
 * pressed states feel identical from the tab bar to a customer row to a CTA.
 *
 * Why not `TouchableOpacity` (what the app used before): opacity alone reads as
 * "the thing faded", not "I pressed it". A very small scale plus a slight dim
 * reads as physical depression. The key word is *small* — 3% at most, driven on
 * the UI thread, so the feedback lands on the same frame as the touch and never
 * waits on JS.
 *
 * Scale is animated via `transform`, which the compositor handles without a
 * layout pass. No width/height/margin is ever animated.
 */

import { forwardRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Press, Timing } from '@/constants/motion';
import { Layout } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Target scale at full press. Defaults to the standard 0.97. */
  scale?: number;
  /** Dim slightly on press alongside the scale. */
  dim?: boolean;
  /** Opt out of scale entirely, keeping only the dim (e.g. for text links). */
  scaleDisabled?: boolean;
}

export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  {
    style,
    scale = Press.scale,
    dim = true,
    scaleDisabled = false,
    onPressIn,
    onPressOut,
    disabled,
    hitSlop,
    children,
    ...rest
  },
  ref,
) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  /**
   * Under reduced motion we drop the scale and keep only the opacity change.
   * An instantly-resolved scale would flick rather than animate, which is worse
   * than no scale at all — and opacity is not motion, so the feedback survives.
   */
  const allowScale = !scaleDisabled && !reducedMotion;

  /**
   * Always returns the same keys with valid values.
   *
   * This previously returned `transform: undefined` when scaling was disabled,
   * which is not a valid animated style value — Reanimated walks the returned
   * keys and hands them to the native side, so a present-but-undefined
   * `transform` breaks on the two components that opt out of scale:
   * `StatusToggle` (the mark-delivered button) and `Toggle`.
   *
   * Collapsing to `scale: 1` instead keeps the key set stable across renders and
   * is visually a no-op.
   */
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scaleValue = allowScale ? 1 - (1 - scale) * p : 1;
    const opacityValue = dim ? 1 - (1 - Press.opacity) * p : 1;

    return {
      transform: [{ scale: scaleValue }],
      opacity: opacityValue,
    };
  });

  return (
    <AnimatedPressable
      ref={ref}
      // A generous default hit area: small icon buttons in this app are 38px,
      // below the 44px minimum, so they need the slop to be comfortable.
      hitSlop={hitSlop ?? 8}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={(event) => {
        progress.value = withTiming(1, Timing.press);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.value = withTiming(0, Timing.press);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle, disabled ? { opacity: 0.45 } : null]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});

/** Minimum recommended touch target, re-exported for convenience. */
export const MIN_TOUCH_TARGET = Layout.hitSlop;
