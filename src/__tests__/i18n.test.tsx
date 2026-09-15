/// <reference types="jest" />

/**
 * Verifies the Hindi path is real, not just declared.
 *
 * Checklist items covered:
 *   • "Support Hindi and English"
 *   • "Hindi labels do not overflow"  (partially — this asserts the *length*
 *     budget the tab bar is designed around; actual rendered width still needs a
 *     device, since text measurement does not happen under Jest.)
 */

import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { useDairyStore } from '@/lib/dairy-store';
import { translate, type TranslationKey } from '@/lib/i18n';
import { TABS } from '@/navigation/config';

/**
 * Longest label the tab bar can show before it needs to ellipsize. Five tabs on a
 * 360dp screen leaves ~68dp each; at 11px that is roughly nine Devanagari
 * clusters. Kept as an assertion so a future translation cannot quietly break the
 * bar.
 */
const MAX_TAB_LABEL_CHARS = 9;

describe('translations', () => {
  /**
   * Exhaustiveness is already a *compile-time* property: `hi` is typed as
   * `Record<TranslationKey, string>`, so a missing key fails `tsc`. What types
   * cannot catch is a key that exists but was left as the English text, which is
   * what this checks for the labels that matter most.
   */
  it('actually translates the navigation labels rather than copying English', () => {
    for (const tab of TABS) {
      const hindi = translate(tab.labelKey, 'hi');
      expect(hindi.trim()).not.toBe('');
      expect(hindi).not.toBe(translate(tab.labelKey, 'en'));
    }
  });

  it('translates status labels, which appear on three screens', () => {
    const statusKeys: TranslationKey[] = [
      'status.delivered',
      'status.pending',
      'status.notDelivered',
    ];

    for (const key of statusKeys) {
      expect(translate(key, 'hi')).not.toBe(translate(key, 'en'));
    }
  });

  it('keeps Hindi tab labels within the bar’s width budget', () => {
    for (const tab of TABS) {
      const hindi = translate(tab.labelKey, 'hi');
      const english = translate(tab.labelKey, 'en');

      expect(hindi.length).toBeLessThanOrEqual(MAX_TAB_LABEL_CHARS);
      expect(english.length).toBeLessThanOrEqual(MAX_TAB_LABEL_CHARS);
    }
  });

  it('falls back to English for an unknown language', () => {
    // `lang` is nullable in the store; a null must not blank the UI.
    expect(translate('nav.home', null)).toBe('Home');
    expect(translate('nav.home', undefined)).toBe('Home');
  });
});

describe('language switching', () => {
  afterEach(() => {
    useDairyStore.getState().setLang('en');
  });

  it('renders the tab bar in Hindi when the store language is hi', async () => {
    useDairyStore.getState().setLang('hi');

    renderRouter('src/app', { initialUrl: '/' });

    // Accessibility labels are built from the translated text, so finding them in
    // Hindi proves the bar re-rendered in the selected language.
    expect(await screen.findByLabelText('होम, 1 of 5')).toBeTruthy();
    expect(screen.getByLabelText('ग्राहक, 2 of 5')).toBeTruthy();
    expect(screen.getByLabelText('डिलीवरी, 3 of 5')).toBeTruthy();
    expect(screen.getByLabelText('बिलिंग, 4 of 5')).toBeTruthy();
    expect(screen.getByLabelText('और, 5 of 5')).toBeTruthy();
  });

  it('renders screen chrome in Hindi', async () => {
    useDairyStore.getState().setLang('hi');

    renderRouter('src/app', { initialUrl: '/customers' });

    /**
     * "ग्राहक" is both the screen title and the tab label (and the bar renders its
     * label twice for the active/inactive crossfade), so this counts occurrences
     * rather than expecting one: the header plus two bar layers.
     */
    expect((await screen.findAllByText('ग्राहक')).length).toBeGreaterThanOrEqual(3);

    // A per-row data label, proving translation reaches beyond navigation chrome.
    expect(screen.getAllByText('बकाया').length).toBeGreaterThan(0);

    // And the search placeholder.
    expect(screen.getByPlaceholderText('नाम या फ़ोन खोजें…')).toBeTruthy();
  });

  it('renders the delivery round in Hindi', async () => {
    useDairyStore.getState().setLang('hi');

    renderRouter('src/app', { initialUrl: '/delivery' });

    expect(await screen.findByText('सुबह')).toBeTruthy();
    expect(screen.getByText('शाम')).toBeTruthy();
    expect(screen.getByLabelText('सभी डिलीवर करें')).toBeTruthy();
  });
});
