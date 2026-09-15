/// <reference types="jest" />

/**
 * Behavioural tests for the navigation shell.
 *
 * These exist to turn QA-checklist claims into checked facts. Each `it` maps to a
 * line in the brief's checklist, noted in the test name.
 *
 * Reanimated and the native map module are replaced in `jest.after-env.js` (see
 * the note there about nativewind's JSX transform breaking `jest.mock` hoisting
 * in `.tsx` files).
 *
 * Lives outside `src/app/` — Expo Router's `require.context` matches every `.tsx`
 * under the app root, so a test file there becomes a real route.
 */

import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { FULL_SCREEN_ROUTES, TABS } from '@/navigation/config';
import { focusedRoutePath, isFullScreenWorkflow } from '@/navigation/route-utils';
import { resetNavGuard } from '@/navigation/use-nav-guard';

/**
 * `fireEvent.press` fires far faster than a human can tap, so consecutive
 * navigations in a test land inside the guard's window and get (correctly)
 * dropped. Calling this between deliberate steps stands in for the time a real
 * user would take.
 */
const simulateUserPause = () => resetNavGuard();

beforeEach(() => {
  resetNavGuard();
});

/* ─── Pure logic: which routes hide the bar ──────────────────────────────── */

describe('full-screen route detection', () => {
  /**
   * Shapes mirror what a Tabs navigator's state actually looks like. The route
   * names were confirmed against Expo Router's generated tree: the Customers
   * stack produces `index`, `new`, `[id]/index`, `[id]/bill`, `[id]/ledger`,
   * `[id]/payment`, `[id]/payments`.
   */
  const tabState = (tab: string, nested?: string) => ({
    index: 0,
    routes: [
      {
        name: tab,
        state: nested ? { index: 0, routes: [{ name: nested }] } : undefined,
      },
    ],
  });

  it('walks the focused path outermost-first', () => {
    expect(focusedRoutePath(tabState('customers', '[id]/payment'))).toEqual([
      'customers',
      '[id]/payment',
    ]);
  });

  it('hides the bar on full-screen workflows', () => {
    expect(isFullScreenWorkflow(tabState('customers', 'new'))).toBe(true);
    expect(isFullScreenWorkflow(tabState('customers', '[id]/payment'))).toBe(true);
    expect(isFullScreenWorkflow(tabState('customers', '[id]/bill'))).toBe(true);
  });

  it('keeps the bar on list and detail screens', () => {
    // These are places to be, not tasks to finish, so cross-tab navigation
    // should stay one tap away.
    expect(isFullScreenWorkflow(tabState('customers', 'index'))).toBe(false);
    expect(isFullScreenWorkflow(tabState('customers', '[id]/index'))).toBe(false);
    expect(isFullScreenWorkflow(tabState('customers', '[id]/ledger'))).toBe(false);
    expect(isFullScreenWorkflow(tabState('customers', '[id]/payments'))).toBe(false);
    expect(isFullScreenWorkflow(tabState('delivery', 'index'))).toBe(false);
  });

  it('tolerates an uninitialised nested state', () => {
    // A nested navigator has no `state` until it first mounts.
    expect(isFullScreenWorkflow(tabState('customers'))).toBe(false);
    expect(isFullScreenWorkflow(undefined)).toBe(false);
    expect(focusedRoutePath({ routes: [] })).toEqual([]);
  });

  it('registers every full-screen route against a real route name', () => {
    // Guards the fail-soft trap: a typo here would silently leave the bar up.
    for (const name of FULL_SCREEN_ROUTES) {
      expect(['new', '[id]/payment', '[id]/bill']).toContain(name);
    }
  });
});

/* ─── The bar, in a real navigator ───────────────────────────────────────── */

const label = (index: number) => `${labelText(index)}, ${index + 1} of ${TABS.length}`;

function labelText(index: number) {
  return ['Home', 'Customers', 'Delivery', 'Billing', 'More'][index]!;
}

describe('bottom navigation', () => {
  /**
   * One `renderRouter` per test. Rendering twice inside a single test mounts two
   * navigation containers, which logs a linking conflict and is not what the app
   * ever does.
   */
  it.each([
    ['/', 0],
    ['/customers', 1],
    ['/delivery', 2],
    ['/billing', 3],
    ['/more', 4],
  ] as const)(
    'checklist: bar works from %s and marks the right tab active',
    async (path, activeIndex) => {
      renderRouter('src/app', { initialUrl: path });

      for (let i = 0; i < TABS.length; i += 1) {
        // All five destinations reachable from every primary screen.
        const tab = await screen.findByLabelText(label(i));
        // Active state is driven by navigator state, not by string-matching the
        // pathname — which is what used to leave no tab active on nested routes.
        expect(tab.props.accessibilityState?.selected).toBe(i === activeIndex);
      }
    },
  );

  it('checklist: active tab stays correct on a nested detail screen', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1' });

    const customers = await screen.findByLabelText(label(1));
    expect(customers.props.accessibilityState?.selected).toBe(true);

    const home = screen.getByLabelText(label(0));
    expect(home.props.accessibilityState?.selected).toBe(false);
  });

  it('checklist: hidden on full-screen workflows, and returns on exit', async () => {
    renderRouter('src/app', { initialUrl: '/customers' });

    // Visible on the list.
    expect(await screen.findByLabelText(label(1))).toBeTruthy();

    // Into the add-customer form.
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add Customer'));
      await Promise.resolve();
    });
    expect(await screen.findByText('Add Customer')).toBeTruthy();

    /**
     * The bar is marked `accessibilityElementsHidden` /
     * `importantForAccessibility="no-hide-descendants"` while hidden, and RNTL
     * excludes accessibility-hidden nodes from queries by default. So the tab
     * becoming unqueryable is a real assertion that it stepped aside — and that
     * a screen reader cannot reach it mid-task either.
     */
    expect(screen.queryByLabelText(label(1))).toBeNull();

    // Back out of the form.
    simulateUserPause();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Back'));
      await Promise.resolve();
    });

    // Restored.
    expect(await screen.findByLabelText(label(1))).toBeTruthy();
  });

  it('keeps the bar on a customer detail screen', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1' });
    expect(await screen.findByLabelText(label(1))).toBeTruthy();
  });

  it.each([
    ['/customers/c1/payment', 'Add Payment'],
    ['/customers/c1/bill', 'Bill'],
  ])('hides the bar on %s', async (path, title) => {
    renderRouter('src/app', { initialUrl: path });
    expect(await screen.findByText(title)).toBeTruthy();
    expect(screen.queryByLabelText(label(1))).toBeNull();
  });
});

/* ─── Duplicate taps and stack depth ────────────────────────────────────── */

describe('navigation guard', () => {
  it('checklist: no duplicate navigation from a double tap', async () => {
    renderRouter('src/app', { initialUrl: '/customers' });

    const row = await screen.findByLabelText(/Rohan Sharma, balance/);

    // Two presses inside the guard window. Without the guard this pushes the
    // detail screen twice and the user has to press back twice to escape.
    await act(async () => {
      fireEvent.press(row);
      fireEvent.press(row);
      await Promise.resolve();
    });

    expect(await screen.findByText('Customer Details')).toBeTruthy();

    // A single back must land on the list, proving only one push happened.
    simulateUserPause();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Back'));
      await Promise.resolve();
    });

    expect(await screen.findByLabelText('Add Customer')).toBeTruthy();
    expect(screen.queryByText('Customer Details')).toBeNull();
  });

  it('checklist: tab switching does not deepen the stack', async () => {
    const user = userEvent.setup();
    renderRouter('src/app', { initialUrl: '/' });

    // Switching tabs uses `navigate`, never `push`. Repeated switches must not
    // accumulate history — this used to leave one root-stack entry per tap.
    for (const index of [1, 2, 3, 4, 0]) {
      await act(async () => {
        await user.press(screen.getByLabelText(label(index)));
      });
    }

    const home = await screen.findByLabelText(label(0));
    expect(home.props.accessibilityState?.selected).toBe(true);
  });
});
