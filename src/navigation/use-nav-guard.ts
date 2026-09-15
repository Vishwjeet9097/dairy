/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NAVIGATION GUARD
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Prevents the classic double-tap bug: tapping a list row twice in quick
 * succession pushes the same screen twice, so the user has to press back twice
 * to get out. Every `router.push` in the app goes through here instead.
 *
 * The lock is module-level on purpose. A per-component lock would not help when
 * two *different* components can both navigate — for example a card and the
 * chevron inside it, or two rows under one fat-finger tap. One shared lock
 * means the first navigation wins and everything else in that window is
 * ignored.
 *
 * The window is a little longer than a screen transition so a double-tap is
 * always swallowed, but short enough that deliberate back-and-forth navigation
 * never feels blocked.
 */

import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

import { Duration } from '@/constants/motion';

/**
 * Two windows, because "duplicate" and "too fast" are different problems.
 *
 * A single global lock (the first version of this) blocked *any* second
 * navigation, which also swallowed legitimate sequences — pushing a screen and
 * immediately backing out of it, for example, felt broken rather than protected.
 *
 *   SAME_TARGET — the same destination twice is always a duplicate. Held past the
 *                 end of the transition so a bounced tap can't land.
 *   ANY_TARGET  — two *different* destinations in under this is a fat finger
 *                 hitting two rows, not intent. Short enough that a deliberate
 *                 tap-then-back still goes through.
 */
const SAME_TARGET_MS = Duration.page + 240;
const ANY_TARGET_MS = 260;

let lastNavigationAt = 0;
let lastTarget: string | null = null;

/** Escape hatch for tests and hot reload. */
export function resetNavGuard() {
  lastNavigationAt = 0;
  lastTarget = null;
}

/**
 * `target` identifies the destination so repeats can be told apart from
 * distinct navigations. Non-string hrefs (the `{ pathname, params }` object form)
 * are stringified; a stable-enough key is all this needs.
 */
function acquire(target: string): boolean {
  const now = Date.now();
  const sinceLast = now - lastNavigationAt;

  if (target === lastTarget && sinceLast < SAME_TARGET_MS) return false;
  if (sinceLast < ANY_TARGET_MS) return false;

  lastNavigationAt = now;
  lastTarget = target;
  return true;
}

function keyOf(href: unknown): string {
  return typeof href === 'string' ? href : JSON.stringify(href);
}

type Href = Parameters<ReturnType<typeof useRouter>['push']>[0];

export interface NavGuard {
  /** Guarded `router.push` — forward navigation within a section. */
  push: (href: Href) => void;
  /** Guarded `router.replace` — swap the current screen. */
  replace: (href: Href) => void;
  /**
   * Guarded `router.navigate` — go to a route, reusing it if already in the
   * stack instead of pushing a duplicate. Prefer this for destinations the user
   * may already be near, to keep stacks shallow.
   */
  navigate: (href: Href) => void;
  /** Guarded `router.back` — double-tapping back must not pop two screens. */
  back: () => void;
  /**
   * Unguarded dismissal, for closing a screen *after* an action has completed —
   * saving a customer, recording a payment.
   *
   * These must never be blocked. The write has already happened, so a swallowed
   * dismissal leaves the user staring at a form they think failed, next to data
   * that actually saved. Double submission is already prevented at the source by
   * `Button`'s single-fire guard, so there is nothing left for the navigation
   * window to protect against here.
   */
  dismiss: () => void;
  /** Wrap any imperative navigation not covered above. */
  guard: (fn: () => void) => void;
}

export function useNavGuard(): NavGuard {
  const router = useRouter();

  return {
    push: useCallback(
      (href: Href) => acquire(`push:${keyOf(href)}`) && router.push(href),
      [router],
    ),
    replace: useCallback(
      (href: Href) => acquire(`replace:${keyOf(href)}`) && router.replace(href),
      [router],
    ),
    navigate: useCallback(
      (href: Href) => acquire(`navigate:${keyOf(href)}`) && router.navigate(href),
      [router],
    ),
    back: useCallback(() => acquire('back') && router.back(), [router]),
    dismiss: useCallback(() => {
      // Deliberately ungated — see the interface comment.
      resetNavGuard();
      router.back();
    }, [router]),
    guard: useCallback((fn: () => void) => {
      if (acquire('guard')) fn();
    }, []),
  };
}

/**
 * Single-fire guard for non-navigation side effects — "Save", "Mark all",
 * "Record payment". Uses its own per-instance lock (not the shared navigation
 * one) so submitting a form never blocks an unrelated tap elsewhere, and so a
 * double-tap can't create two customers or two payments.
 */
export function useSingleFire<A extends unknown[]>(
  fn: (...args: A) => void,
  windowMs = 600,
): (...args: A) => void {
  const lastAt = useRef(0);
  return useCallback(
    (...args: A) => {
      const now = Date.now();
      if (now - lastAt.current < windowMs) return;
      lastAt.current = now;
      fn(...args);
    },
    [fn, windowMs],
  );
}
