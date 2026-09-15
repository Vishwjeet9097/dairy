/**
 * Reanimated mock for Jest.
 *
 * Lives in a root `__mocks__` folder so Jest applies it automatically to every
 * test — node-module mocks placed here need no `jest.mock()` call, which also
 * avoids clobbering jest-expo's own `setupFiles`.
 *
 * ── Why a hand-written mock ──
 * Reanimated 4 moved worklets into `react-native-worklets`, which installs a
 * native module the moment it is imported and throws under Node
 * ("Cannot read properties of undefined (reading 'loadUnpackers')"). Its own
 * shipped mock (`react-native-reanimated/mock`) re-enters the same code path, so
 * it is unusable here too.
 *
 * ── Deliberately behaviour-preserving where it matters ──
 *   • `createAnimatedComponent` returns the component unchanged, so
 *     `AnimatedPressable` is the real `Pressable` and presses behave exactly as
 *     they do in the app.
 *   • `Animated.View` / `Animated.Text` are the real RN components, so text and
 *     accessibility queries work.
 *   • `useAnimatedStyle` actually invokes the style worklet, and `withTiming` /
 *     `withSpring` invoke their completion callbacks synchronously — so logic
 *     living inside animation callbacks (the value swap in `AnimatedValueText`,
 *     for example) really runs.
 *
 * ── What this cannot catch ──
 * Native style validation. A bug like returning `transform: undefined` from
 * `useAnimatedStyle` is only observable on a device, because nothing here hands
 * the style to the native shadow tree.
 */

const RN = require('react-native');

const identity = (value) => value;

/** Chainable stand-in for a layout-animation builder. */
const makeBuilder = () => {
  const builder = {};
  const chain = () => builder;
  for (const method of [
    'duration',
    'delay',
    'easing',
    'withInitialValues',
    'withCallback',
    'springify',
    'damping',
    'stiffness',
    'mass',
    'randomDelay',
    'reduceMotion',
    'build',
  ]) {
    builder[method] = chain;
  }
  return builder;
};

const Easing = {
  linear: identity,
  ease: identity,
  quad: identity,
  cubic: identity,
  poly: () => identity,
  sin: identity,
  circle: identity,
  exp: identity,
  elastic: () => identity,
  back: () => identity,
  bounce: identity,
  bezier: () => ({ factory: () => identity }),
  bezierFn: () => identity,
  steps: () => identity,
  in: identity,
  out: identity,
  inOut: identity,
};

const Animated = {
  View: RN.View,
  Text: RN.Text,
  ScrollView: RN.ScrollView,
  Image: RN.Image,
  FlatList: RN.FlatList,
  // Returning the component untouched keeps real press/gesture behaviour.
  createAnimatedComponent: (Component) => Component,
};

module.exports = {
  __esModule: true,
  default: Animated,

  Easing,
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },

  useSharedValue: (initial) => ({ value: initial }),
  // Invokes the worklet so the style object is genuinely produced.
  useAnimatedStyle: (worklet) => worklet(),
  useDerivedValue: (worklet) => ({ value: worklet() }),
  useAnimatedProps: (worklet) => worklet(),
  useAnimatedRef: () => ({ current: null }),
  useAnimatedReaction: () => {},
  useReducedMotion: () => false,

  /**
   * Required by `react-native-gesture-handler`'s `GestureDetector`, which wires
   * gesture callbacks through Reanimated's event plumbing. Without these, any
   * screen containing a `BottomSheet` throws
   * "Reanimated.useEvent is not a function" on mount.
   */
  useEvent: () => ({ current: null }),
  useHandler: () => ({ context: {}, doDependenciesDiffer: false, useWeb: false }),
  useComposedEventHandler: () => undefined,
  useScrollOffset: () => ({ value: 0 }),
  useFrameCallback: () => ({ setActive: () => {}, isActive: false }),
  measure: () => null,
  scrollTo: () => {},
  setGestureState: () => {},
  isSharedValue: (value) =>
    typeof value === 'object' && value !== null && 'value' in value,

  withTiming: (toValue, _config, callback) => {
    if (callback) callback(true);
    return toValue;
  },
  withSpring: (toValue, _config, callback) => {
    if (callback) callback(true);
    return toValue;
  },
  withDecay: (_config, callback) => {
    if (callback) callback(true);
    return 0;
  },
  withDelay: (_delay, animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withRepeat: (animation) => animation,
  cancelAnimation: () => {},

  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,

  interpolate: (value) => value,
  interpolateColor: (_value, _input, output) => output[0],

  /**
   * Reanimated's babel plugin rewrites any style object containing a `.value`
   * access to call this helper, so it can warn when a shared value is used as a
   * plain style. Real builds provide it; the mock must too, or those call sites
   * throw "getUseOfValueInStyleWarning is not a function".
   */
  getUseOfValueInStyleWarning: () => '',

  LayoutAnimationConfig: RN.View,

  // Entering / exiting / layout presets used across the app.
  FadeIn: makeBuilder(),
  FadeOut: makeBuilder(),
  FadeInUp: makeBuilder(),
  FadeInDown: makeBuilder(),
  FadeOutUp: makeBuilder(),
  FadeOutDown: makeBuilder(),
  LinearTransition: makeBuilder(),
  CurvedTransition: makeBuilder(),
  SlideInDown: makeBuilder(),
  SlideOutDown: makeBuilder(),
  ZoomIn: makeBuilder(),
  ZoomOut: makeBuilder(),
};
