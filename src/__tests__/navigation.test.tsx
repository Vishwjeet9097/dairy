/**
 * Navigation and interaction smoke tests.
 *
 * These exist because a Metro bundle proves modules compile and a static web
 * export proves components render — neither exercises *interaction*, which is
 * where the reported "error while marking delivered" lived.
 *
 * `renderRouter` mounts the real route tree from `src/app`, so these tests cover
 * the tab shell, the nested stacks, the providers and the animated components
 * together. Reanimated is deliberately NOT mocked.
 */

/// <reference types="jest" />

/**
 * Reanimated and the native map module are replaced in `jest.after-env.js`, not
 * here: nativewind's JSX transform prevents `jest.mock` from being hoisted in a
 * `.tsx` file, so a mock declared in this file would silently never apply.
 *
 * This file deliberately lives outside `src/app/`. Expo Router's `require.context`
 * matches every `.tsx` under the app root, so a test file there would be picked up
 * as a real route (`/navigation.test`).
 */

import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { useDairyStore } from '@/lib/dairy-store';

/** Fail a test if the component tree logs an error or warning. */
function captureConsole() {
  const messages: string[] = [];
  const spyError = jest.spyOn(console, 'error').mockImplementation((...args) => {
    messages.push(args.join(' '));
  });
  const spyWarn = jest.spyOn(console, 'warn').mockImplementation((...args) => {
    messages.push(args.join(' '));
  });
  return {
    messages,
    restore: () => {
      spyError.mockRestore();
      spyWarn.mockRestore();
    },
  };
}

describe('route tree', () => {
  it('renders the tab shell at the root with all five tabs in order', async () => {
    renderRouter('src/app', { initialUrl: '/' });

    /**
     * Queried by accessibility label rather than text: the tab bar renders each
     * label twice (a crossfaded active/inactive pair), and words like "Home" and
     * "Customers" also appear in the screen content itself. The label encodes
     * position, so this simultaneously asserts the bar's *order* — which comes
     * from the `TABS` config, not the filesystem.
     */
    expect(await screen.findByLabelText('Home, 1 of 5')).toBeTruthy();
    expect(screen.getByLabelText('Customers, 2 of 5')).toBeTruthy();
    expect(screen.getByLabelText('Delivery, 3 of 5')).toBeTruthy();
    expect(screen.getByLabelText('Billing, 4 of 5')).toBeTruthy();
    expect(screen.getByLabelText('More, 5 of 5')).toBeTruthy();
  });

  it.each([
    ['/', 'Home'],
    ['/customers', 'Customers'],
    ['/customers/new', 'Add Customer'],
    ['/customers/c1', 'Customer Details'],
    ['/customers/c1/payment', 'Add Payment'],
    ['/customers/c1/bill', 'Bill'],
    ['/customers/c1/ledger', 'Ledger'],
    ['/customers/c1/payments', 'Payment History'],
    ['/delivery', 'Delivery'],
    ['/billing', 'Billing'],
    ['/more', 'More'],
    ['/more/reports', 'Reports'],
    ['/more/settings', 'Settings'],
  ])('mounts %s without console errors', async (path) => {
    const log = captureConsole();
    try {
      renderRouter('src/app', { initialUrl: path });
      // Let effects, layout animations and timers settle.
      await act(async () => {
        await Promise.resolve();
      });

      const real = log.messages.filter(
        (message) =>
          // React Navigation logs this for any deep link into a nested stack in
          // tests; it is not a defect in the app.
          !message.includes('non-serializable values were found in the navigation state'),
      );
      expect(real).toEqual([]);
    } finally {
      log.restore();
    }
  });
});

describe('delivery status interaction', () => {
  beforeEach(() => {
    // Deterministic starting data for every test.
    useDairyStore.getState().resetAll();
  });

  it('cycles a customer through the delivery statuses without error', async () => {
    const log = captureConsole();

    try {
      renderRouter('src/app', { initialUrl: '/delivery' });

      // The status control is labelled "<name>, <status>".
      const control = await screen.findByLabelText(/Suresh Kumar, /);
      expect(control).toBeTruthy();

      const before = useDairyStore
        .getState()
        .deliveries.filter((d) => d.customerId === 'c2').length;

      // Press it three times: pending → delivered → skipped → pending.
      for (let i = 0; i < 3; i += 1) {
        await act(async () => {
          fireEvent.press(screen.getByLabelText(/Suresh Kumar, /));
          await Promise.resolve();
        });
      }

      // The store must have recorded status changes, not created duplicate rows.
      const after = useDairyStore
        .getState()
        .deliveries.filter((d) => d.customerId === 'c2').length;
      expect(after).toBe(before);

      const real = log.messages.filter(
        (m) => !m.includes('non-serializable values were found'),
      );
      expect(real).toEqual([]);
    } finally {
      log.restore();
    }
  });

  it('marks the whole round delivered', async () => {
    const log = captureConsole();

    try {
      renderRouter('src/app', { initialUrl: '/delivery' });

      const button = await screen.findByLabelText('Mark All Delivered');

      await act(async () => {
        fireEvent.press(button);
        await Promise.resolve();
      });

      const today = new Date().toISOString().slice(0, 10);
      const morning = useDairyStore
        .getState()
        .deliveries.filter((d) => d.date === today && d.slot === 'morning');

      expect(morning.length).toBeGreaterThan(0);
      expect(morning.every((d) => d.status === 'delivered')).toBe(true);

      const real = log.messages.filter(
        (m) => !m.includes('non-serializable values were found'),
      );
      expect(real).toEqual([]);
    } finally {
      log.restore();
    }
  });
});

describe('tab navigation preserves state', () => {
  beforeEach(() => {
    useDairyStore.getState().resetAll();
  });

  it('keeps the Customers stack on the detail screen after switching tabs', async () => {
    const user = userEvent.setup();
    renderRouter('src/app', { initialUrl: '/customers' });

    // Drill into a customer.
    await act(async () => {
      fireEvent.press(await screen.findByLabelText(/Rohan Sharma, balance/));
      await Promise.resolve();
    });
    expect(await screen.findByText('Customer Details')).toBeTruthy();

    // Switch to Delivery, then back to Customers via the tab bar.
    await act(async () => {
      await user.press(screen.getByLabelText('Delivery, 3 of 5'));
    });
    await act(async () => {
      await user.press(screen.getByLabelText('Customers, 2 of 5'));
    });

    // The Customers tab must still be on the detail screen, not reset to the list.
    expect(await screen.findByText('Customer Details')).toBeTruthy();
  });
});
