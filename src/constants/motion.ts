/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MOTION DESIGN SYSTEM
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The single source of truth for every animation in the app. Screens must never
 * invent their own durations or easings — import from here so the whole app
 * speaks one motion language.
 *
 * Philosophy: motion communicates *where the user is*, *what changed*, and
 * *what completed*. It is never decoration. Responsiveness always beats
 * spectacle, so durations are deliberately short and easings favour a fast
 * start with a soft settle.
 *
 * Two easing families exist because two animation engines are in play:
 *   - `Motion.easing`   → Reanimated worklets (UI thread, our components)
 *   - `NavMotion.easing` → React Navigation `transitionSpec` (RN Animated)
 * They describe the same curves; keep them in sync if you change one.
 */

import { Platform, Easing as RNEasing } from 'react-native';
import { Easing, ReduceMotion } from 'react-native-reanimated';

/* ─── Duration scale ────────────────────────────────────────────────────────
 * Three primary steps (fast / normal / slow) plus named aliases so call sites
 * read as intent rather than as numbers. Nothing in the app should animate for
 * longer than `slow` unless it is a deliberate, one-off success moment.
 */
export const Duration = {
  /** 0ms — reduced-motion fallback, state flips that must feel instant */
  instant: 0,
  /** 120ms — press feedback, icon/colour swaps, tab switches */
  fast: 120,
  /** 200ms — the default. Most state changes and enters/exits */
  normal: 200,
  /** 300ms — larger surfaces: sheets, modals, hero value changes */
  slow: 300,

  // ── Semantic aliases (all map onto the scale above) ──
  /** Screen push/pop */
  page: 260,
  /** Modal present/dismiss */
  modal: 280,
  /** Bottom sheet open/close */
  sheet: 300,
  /** Dialog in/out */
  dialog: 180,
  /** List item insert/remove */
  list: 200,
  /** Button pressed-state */
  press: 90,
  /** Success/error confirmation beats */
  feedback: 260,
  /** Tab bar hide/reveal */
  chrome: 220,
} as const;

/* ─── Easing curves (Reanimated) ────────────────────────────────────────────
 * `standard` is the workhorse: quick departure, gentle arrival. Use
 * `decelerate` for things entering the screen and `accelerate` for things
 * leaving it. `emphasized` is reserved for the largest surfaces.
 */
export const Curve = {
  /** Default curve — fast out, soft in. Material/Apple-adjacent. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Entering elements — arrives softly, never overshoots. */
  decelerate: Easing.out(Easing.cubic),
  /** Exiting elements — leaves briskly. */
  accelerate: Easing.in(Easing.cubic),
  /** Large surfaces (sheets, modals) — a touch more character. */
  emphasized: Easing.bezier(0.05, 0.7, 0.1, 1),
  /** Progress bars, continuous values. */
  linear: Easing.linear,
} as const;

/* ─── Spring configs ────────────────────────────────────────────────────────
 * All springs are critically-ish damped: no visible bounce, no wobble. They
 * exist for gesture-driven and physical-feeling motion (sheets, toggles),
 * where a timing curve would feel mechanical.
 */
export const Spring = {
  /** Toggles, tab indicator, small controls. Settles quickly. */
  snappy: {
    damping: 22,
    stiffness: 260,
    mass: 0.9,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
  /** Cards and medium surfaces. */
  gentle: {
    damping: 26,
    stiffness: 180,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
  /** Bottom sheets — heavier, fully clamped so it never bounces past. */
  sheet: {
    damping: 30,
    stiffness: 220,
    mass: 1,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
} as const;

/* ─── Press / interaction feedback ──────────────────────────────────────────
 * Deliberately restrained. A press should register, not perform. Scale stays
 * within 3% so nothing appears to jump or reflow.
 */
export const Press = {
  /** Standard button / row scale on press-in */
  scale: 0.97,
  /** Large surfaces (full-width cards) scale less to avoid looking rubbery */
  scaleSubtle: 0.985,
  /** Small icon buttons can take slightly more */
  scaleStrong: 0.94,
  /** Opacity companion to the scale */
  opacity: 0.92,
  /** Duration for both directions */
  duration: Duration.press,
} as const;

/* ─── Timing helpers ────────────────────────────────────────────────────────
 * `ReduceMotion.System` makes Reanimated honour the OS "Reduce Motion"
 * accessibility setting automatically — animations resolve instantly to their
 * final value instead of being skipped or broken. Every timing/spring config
 * in the app should carry it.
 *
 * ⚠ MODULE SCOPE ONLY — never call these from inside a worklet.
 *
 * These are ordinary JavaScript functions. Reanimated runs worklets on a
 * separate UI runtime, where an ordinary function is a "remote function" that
 * cannot be called synchronously. Calling one inside `useDerivedValue`, a
 * gesture callback, or an animation completion callback crashes with:
 *
 *   [Worklets] Tried to synchronously call a Remote Function.
 *              Called "spring" on the UI Runtime.
 *
 * Use them here, at module scope, to build the named configs below — then
 * reference those configs from worklets. A plain object gets captured into the
 * worklet's closure and serialised; a function call does not.
 */
export const timing = (
  duration: number = Duration.normal,
  easing: (typeof Curve)[keyof typeof Curve] = Curve.standard,
) => ({ duration, easing, reduceMotion: ReduceMotion.System });

export const spring = (config: (typeof Spring)[keyof typeof Spring] = Spring.snappy) => ({
  ...config,
  reduceMotion: ReduceMotion.System,
});

/** Ready-made timing configs for the most common cases. */
export const Timing = {
  fast: timing(Duration.fast),
  normal: timing(Duration.normal),
  slow: timing(Duration.slow),
  enter: timing(Duration.normal, Curve.decelerate),
  exit: timing(Duration.fast, Curve.accelerate),
  press: timing(Duration.press, Curve.standard),
  chrome: timing(Duration.chrome, Curve.standard),
  feedback: timing(Duration.feedback, Curve.emphasized),
  value: timing(Duration.slow, Curve.decelerate),
} as const;

/* ─── Stagger ───────────────────────────────────────────────────────────────
 * Used for list entrances. Capped so a long list never turns into a slow
 * cascade — past `maxIndex` every item shares the same delay.
 */
export const Stagger = {
  step: 28,
  maxIndex: 6,
  delay(index: number) {
    return Math.min(index, Stagger.maxIndex) * Stagger.step;
  },
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
 * NAVIGATION MOTION
 * ─────────────────────────────────────────────────────────────────────────────
 * React Navigation drives transitions with the RN Animated engine and with
 * native (react-native-screens) animators, so these are configured separately
 * from the Reanimated values above while describing the same curves.
 */

const navEasing = {
  standard: RNEasing.bezier(0.2, 0, 0, 1),
  decelerate: RNEasing.out(RNEasing.cubic),
} as const;

/**
 * Native stack animations.
 *
 * We respect platform convention rather than forcing identical behaviour:
 * iOS gets its native `default` (edge-swipeable slide from right), Android
 * gets an explicit horizontal slide, which reads as the Material shared-axis
 * pattern and is far cleaner than the OS default fade on some skins.
 */
export const StackAnimation = {
  /** Forward push / reverse pop within a section */
  push: Platform.select<'default' | 'slide_from_right'>({
    ios: 'default',
    android: 'slide_from_right',
    default: 'slide_from_right',
  })!,
  /** Modal workflows — slides up from the bottom on both platforms */
  modal: 'slide_from_bottom' as const,
  /** Cross-fade, for swaps where there is no spatial relationship */
  fade: 'fade' as const,
  none: 'none' as const,
} as const;

/**
 * Screen option presets. Spread these into a `<Stack.Screen options={...}>`
 * so no screen hand-rolls its own transition.
 */
export const ScreenTransition = {
  /** Standard forward navigation inside a tab's stack. */
  push: {
    animation: StackAnimation.push,
    animationDuration: Duration.page,
    gestureEnabled: true,
  },
  /**
   * Full-screen workflow (forms, invoices, documents). Presented modally so
   * it reads as "a task on top of the app" and can be swiped away downward.
   */
  modal: {
    presentation: 'modal' as const,
    animation: StackAnimation.modal,
    animationDuration: Duration.modal,
    gestureEnabled: true,
    gestureDirection: 'vertical' as const,
  },
  /** Transparent modal, for custom dialog/sheet surfaces rendered in-route. */
  transparentModal: {
    presentation: 'transparentModal' as const,
    animation: StackAnimation.fade,
    animationDuration: Duration.dialog,
    gestureEnabled: true,
  },
  /** Root-level section swap with no spatial meaning. */
  fade: {
    animation: StackAnimation.fade,
    animationDuration: Duration.normal,
  },
} as const;

/**
 * Tab switching.
 *
 * A cross-fade rather than a slide: tabs are siblings, not a hierarchy, so
 * horizontal movement would imply a spatial relationship that does not exist.
 * Kept at `fast` so switching feels immediate — the user should never wait on
 * this animation.
 */
export const TabTransition = {
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    config: {
      duration: Duration.fast,
      easing: navEasing.standard,
    },
  },
} as const;

export const NavMotion = { easing: navEasing } as const;

/* ─────────────────────────────────────────────────────────────────────────────
 * NAMED TRANSITIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * The surfaces that animate themselves rather than being animated by a
 * navigator. Declared here so every one of them is defined in one place
 * alongside the page and modal transitions, and so a component never invents its
 * own numbers.
 *
 * Reduced motion is handled without any extra work at the call sites:
 *   • `timing()` / `spring()` inject `ReduceMotion.System`.
 *   • Reanimated's layout-animation builders (`FadeIn`, `LinearTransition`, …)
 *     already default `reduceMotion` to `ReduceMotion.System`.
 * Components that should skip decorative motion *entirely* rather than resolve
 * it instantly additionally gate on `useDecorativeMotion()`.
 */

/**
 * ⚠ Every animation config below is a plain, precomputed OBJECT — never a
 * factory function.
 *
 * This is load-bearing, not a style preference. These configs are read from
 * inside worklets (`useDerivedValue`, gesture handlers, animation completion
 * callbacks), which execute on Reanimated's UI runtime. A worklet can capture a
 * plain object; it cannot synchronously call a JavaScript function. An earlier
 * version of this file exposed them as `() => timing(...)` factories and crashed
 * on a real device the moment a `Toggle` mounted:
 *
 *   [Worklets] Tried to synchronously call a Remote Function.
 *              Called "spring" on the UI Runtime.
 *
 * If you add a config here, add it as a value.
 */

/** Bottom sheet — gesture-driven, so spring rather than curve. */
export const SheetTransition = {
  /** Open, and snap-back after an incomplete drag. */
  open: spring(Spring.sheet),
  /** Close, when not carrying finger velocity. */
  close: timing(Duration.fast, Curve.accelerate),
  /** Backdrop fade. */
  backdrop: timing(Duration.normal, Curve.standard),
  /** Fraction of sheet height past which a release dismisses. */
  dismissDistanceRatio: 0.33,
  /** Downward velocity (px/s) that dismisses regardless of distance. */
  dismissVelocity: 900,
} as const;

/** List insertion / removal / reflow. */
export const ListTransition = {
  enter: timing(Duration.list, Curve.decelerate),
  exit: timing(Duration.fast, Curve.accelerate),
  /** Reflow when neighbours move — kept even under reduced motion. */
  reorder: timing(Duration.normal, Curve.standard),
  /** Vertical drift on entrance. Small: a list is content, not a carousel. */
  travel: 10,
  stagger: Stagger,
} as const;

/** Dialog — no spatial origin, so it surfaces rather than slides. */
export const DialogTransition = {
  enter: timing(Duration.dialog, Curve.decelerate),
  exit: timing(Duration.fast, Curve.accelerate),
  /** Start scale. Any lower reads as a pop. */
  fromScale: 0.96,
} as const;

/**
 * Success confirmation. A single settle, no bounce — the point is to confirm,
 * not to celebrate.
 */
export const SuccessAnimation = {
  enter: timing(Duration.feedback, Curve.emphasized),
  exit: timing(Duration.normal, Curve.accelerate),
  /** Entrance offset for the confirmation banner. */
  travel: -14,
  /** How long a confirmation stays on screen before dismissing itself. */
  holdMs: 2400,
  /** Pulse applied to a control whose state just changed. */
  pulseScale: 0.06,
  pulseIn: timing(80, Curve.decelerate),
  pulseOut: timing(100, Curve.standard),
} as const;

/**
 * Error feedback. Same motion as success — an error is not more animated, only
 * differently coloured and held longer so it can be read.
 */
export const ErrorAnimation = {
  enter: timing(Duration.feedback, Curve.emphasized),
  exit: timing(Duration.normal, Curve.accelerate),
  travel: -14,
  /** Longer than a success: an error carries information to read. */
  holdMs: 3200,
} as const;

/**
 * The two phases of `AnimatedValueText`'s swap. Precomputed because the second
 * phase is started from inside the first one's completion callback, which runs
 * on the UI runtime.
 */
export const ValueTransition = {
  exit: timing(Duration.fast, Curve.accelerate),
  enter: timing(Duration.normal, Curve.decelerate),
  /** How far the text travels. Small enough to read as a settle, not a slide. */
  travel: 8,
} as const;

/**
 * Everything, in one namespace. Mirrors the motion system the brief asks for:
 * duration · easing · curves · page · modal · sheet · list · button feedback ·
 * success · error.
 */
export const Motion = {
  duration: Duration,
  easing: Curve,
  curve: Curve,
  spring: Spring,
  timing: Timing,
  stagger: Stagger,

  page: ScreenTransition.push,
  modal: ScreenTransition.modal,
  tab: TabTransition,
  sheet: SheetTransition,
  list: ListTransition,
  dialog: DialogTransition,
  button: Press,
  success: SuccessAnimation,
  error: ErrorAnimation,
} as const;
