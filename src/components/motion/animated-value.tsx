/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ANIMATED VALUE TEXT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * For numbers that change as a result of a user action — an outstanding balance
 * after a payment, today's litres after marking a delivery. The old screens
 * swapped the text instantly, so a payment that reduced a ₹2,000 due to ₹500
 * gave no signal that anything had happened.
 *
 * Deliberately *not* a counting/odometer effect. Tweening digits looks
 * expensive, takes as long as it takes, and draws attention to itself. Instead
 * the old value leaves and the new one arrives, and the *direction* carries the
 * meaning: a value going down exits upward, a value going up exits downward.
 * The user reads "this decreased" before they finish reading the number.
 *
 * Under reduced motion this collapses to a plain swap for free — the timing
 * configs carry `ReduceMotion.System`, so both phases resolve immediately and
 * the completion callback still runs.
 */

import { useEffect, useRef, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ValueTransition } from '@/constants/motion';

/** How far the text travels. Small enough to read as a settle, not a slide. */
const TRAVEL = ValueTransition.travel;

export interface AnimatedValueTextProps {
  /** The live numeric value. */
  value: number;
  /** Renders the number, e.g. `money0` or `(n) => n.toFixed(1) + ' L'`. */
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;
}

export function AnimatedValueText({
  value,
  format,
  style,
  numberOfLines = 1,
  maxFontSizeMultiplier,
}: AnimatedValueTextProps) {
  // What is painted right now. Lags `value` by one exit animation.
  const [displayed, setDisplayed] = useState(value);
  const displayedRef = useRef(value);

  const opacity = useSharedValue(1);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (value === displayedRef.current) return;

    // Down = the number shrank. Exit upward, enter from below.
    const decreasing = value < displayedRef.current;
    const exitTo = decreasing ? -TRAVEL : TRAVEL;
    displayedRef.current = value;

    opacity.value = withTiming(0, ValueTransition.exit);

    /**
     * The completion callback runs on Reanimated's UI runtime, so everything it
     * touches must already be a value. Calling `timing(...)` in here threw
     * "[Worklets] Tried to synchronously call a Remote Function" — and because
     * this component renders every balance and counter in the app, it fired
     * almost everywhere.
     */
    offset.value = withTiming(exitTo, ValueTransition.exit, (finished) => {
      if (!finished) return;

      // Swap the text while it is invisible, then bring it in from the
      // opposite side so the movement reads as one continuous gesture.
      runOnJS(setDisplayed)(value);
      offset.value = -exitTo;
      offset.value = withTiming(0, ValueTransition.enter);
      opacity.value = withTiming(1, ValueTransition.enter);
    });
  }, [value, opacity, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.Text
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      // The live value, not the animating one, so screen readers and tests
      // always see the truth even mid-transition.
      accessibilityLabel={format(value)}
      style={[style, animatedStyle]}
    >
      {format(displayed)}
    </Animated.Text>
  );
}
