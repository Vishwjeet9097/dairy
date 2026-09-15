/**
 * Test environment setup. Runs after the test framework is installed and before
 * each test module is loaded, so `jest.mock` calls here apply to everything the
 * test subsequently imports — including route modules that Expo Router's
 * `renderRouter` loads from disk.
 *
 * ── Why the mocks live here and not in the test files ──
 * This project's babel config sets `jsxImportSource: 'nativewind'`. In a `.tsx`
 * file that transform runs ahead of babel-jest's `jest.mock` hoisting, so a
 * `jest.mock` written at the top of a `.tsx` test does NOT take effect — the real
 * module loads first. (Verified: the identical mock applied correctly from a `.ts`
 * file and silently did nothing from a `.tsx` file.) Keeping them in this plain
 * `.js` setup file sidesteps the interaction entirely.
 *
 * ── Why Reanimated must be mocked at all ──
 * Reanimated 4 moved worklets into `react-native-worklets`, which installs a
 * native module the moment it is imported and throws under Node
 * ("Cannot read properties of undefined (reading 'loadUnpackers')"). Its own
 * shipped mock re-enters the same code path, so it is unusable too.
 *
 * The replacements live in `test-support/` rather than a root `__mocks__/`
 * folder: a file at `__mocks__/react-native-reanimated.js` is itself resolved as
 * the manual mock for that module name, so requiring it by path recurses
 * infinitely.
 */

jest.mock('react-native-reanimated', () =>
  require('./test-support/reanimated-mock'),
);

/**
 * `expo-router/testing-library` registers its OWN reanimated mock on import,
 * which overrides the one above. Its factory is:
 *
 *   try   { return require('react-native-reanimated/mock') }
 *   catch { return {} }
 *
 * Under Reanimated 4 that require throws (native worklets again), so it silently
 * falls back to an empty object and every `Easing` / `withTiming` reference in
 * the app becomes undefined. That is a genuine incompatibility between
 * expo-router's test helpers and Reanimated 4, not a defect in this app.
 *
 * Mocking the `/mock` subpath makes expo-router's own factory succeed and hand
 * back our implementation. `Reanimated.default.call` is assigned by that factory,
 * so `default` must be a mutable object — it is.
 */
jest.mock('react-native-reanimated/mock', () =>
  require('./test-support/reanimated-mock'),
);

jest.mock('react-native-maps', () => require('./test-support/maps-mock'));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./test-support/async-storage-mock'),
);

// The map picker geocodes via Nominatim. Tests must never hit the network.
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }),
);

/**
 * React 19 + react-test-renderer requires this flag to accept `act(...)`.
 * Without it every state update logs "The current testing environment is not
 * configured to support act(...)".
 *
 * Re-asserted before each test: React Testing Library toggles the flag off during
 * its own cleanup, so a single assignment at module scope leaves later tests (and
 * async work that lands after a test's act window) logging the warning.
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
