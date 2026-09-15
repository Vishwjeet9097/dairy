/**
 * Jest configuration for the Expo Router app.
 *
 * Note: `setupFiles` is intentionally NOT set — overriding it would replace
 * jest-expo's own preset setup. Node-module mocks live in the root `__mocks__`
 * folder instead, which Jest applies automatically.
 */
module.exports = {
  preset: 'jest-expo',

  setupFilesAfterEnv: ['<rootDir>/jest.after-env.js'],

  /**
   * This project's node_modules was created by bun, which nests rather than
   * hoists some of Expo's own dependencies (`expo-modules-core` lives under
   * `expo/node_modules`). jest-expo's setup requires it by bare name, so the
   * nested folder has to be on the resolution path.
   */
  moduleDirectories: ['node_modules', '<rootDir>/node_modules/expo/node_modules'],

  /**
   * Order matters — Jest uses the first matching pattern.
   *   1. CSS: NativeWind's `global.css` is imported by `constants/theme.ts`;
   *      Metro understands it, Jest does not.
   *   2. Asset alias before the general one: `@/assets/...` also matches `@/...`.
   */
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test-support/style-mock.js',

    /**
     * lucide-react-native resolves to an ESM `.mjs` bundle that Jest's transform
     * does not cover. Point it at the package's CommonJS build, which needs no
     * transform at all.
     */
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',

    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  /**
   * Packages listed here ship untransformed ESM and must go through babel.
   * `standard-navigation`, `use-latest-callback` and `@react-native-masked-view`
   * arrive transitively via expo-router.
   */
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)' +
      '|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*' +
      '|react-navigation|@react-navigation/.*' +
      '|native-base|react-native-svg' +
      '|nativewind|react-native-css-interop' +
      '|react-native-gesture-handler' +
      '|standard-navigation|use-latest-callback|@react-native-masked-view/.*' +
      '|nanoid|query-string|decode-uri-component|split-on-first|filter-obj' +
      ')',
  ],

  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
