/**
 * Reduced-motion helpers.
 *
 * Most of the app gets accessibility support for free: every config produced by
 * `timing()` / `spring()` in `constants/motion` carries
 * `ReduceMotion.System`, so Reanimated jumps straight to the final value when
 * the OS setting is on — the UI still updates, it just doesn't travel.
 *
 * These hooks cover the cases that config can't: motion that should not exist
 * at all under reduced motion (decorative entrances, staggered list reveals) or
 * durations handed to non-Reanimated APIs.
 */

import { useReducedMotion } from 'react-native-reanimated';

import { Duration } from '@/constants/motion';

/** True when the OS "Reduce Motion" / "Remove animations" setting is enabled. */
export function useReducedMotionEnabled(): boolean {
  return useReducedMotion();
}

/**
 * Collapses a duration to zero under reduced motion. Use for APIs that take a
 * raw number and don't understand `ReduceMotion` — RN's `Animated`,
 * `LayoutAnimation`, or a `setTimeout` that sequences an animation.
 */
export function useDuration(duration: number): number {
  const reduced = useReducedMotion();
  return reduced ? Duration.instant : duration;
}

/**
 * Whether decorative motion should run at all.
 *
 * Entrance animations and staggered reveals communicate nothing essential — the
 * content is the message — so under reduced motion we render items in their
 * final state rather than animating them in instantly, which avoids a burst of
 * pointless work on every list render.
 */
export function useDecorativeMotion(): boolean {
  return !useReducedMotion();
}
