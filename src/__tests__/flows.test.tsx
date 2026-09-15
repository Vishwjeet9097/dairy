/// <reference types="jest" />

/**
 * End-to-end workflow tests: screen → store → screen.
 *
 * These drive the real navigator and the real screens, so they cover the wiring
 * that unit tests miss — that a form's fields reach the right store action, that
 * the screen behind updates, and that navigation lands where it should.
 *
 * Reanimated and the map module are replaced in `jest.after-env.js`. Animated
 * *values* are therefore not evaluated natively; what these tests assert is
 * behaviour and data, not motion.
 */

import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import {
  addDaysISO,
  money0,
  monthEnd,
  monthStart,
  outstanding,
  statusFor,
  todayISO,
  useDairyStore,
} from '@/lib/dairy-store';
import { resetNavGuard } from '@/navigation/use-nav-guard';
import { customer, delivery, payment, seedStore, state } from '../../test-support/fixtures';

const TODAY = todayISO();
const YESTERDAY = addDaysISO(TODAY, -1);
/** The Bill screen opens on the previous full month. */
const PREVIOUS_MONTH = addDaysISO(monthStart(TODAY), -1);

/**
 * `fireEvent.press` fires faster than a human can tap, so consecutive
 * navigations land inside the guard's window and are (correctly) dropped.
 */
const pause = () => resetNavGuard();

/** Flush effects and any synchronously-resolved animation callbacks. */
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const press = async (element: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(element);
    await Promise.resolve();
  });
};

const type = async (element: Parameters<typeof fireEvent.changeText>[0], text: string) => {
  await act(async () => {
    fireEvent.changeText(element, text);
    await Promise.resolve();
  });
};

beforeEach(() => {
  resetNavGuard();
});

/* ─────────────────────────────────────────────────────────────────────────────
 * PAYMENT
 * ─────────────────────────────────────────────────────────────────────────── */

describe('payment workflow', () => {
  beforeEach(() => {
    seedStore({
      customers: [customer({ id: 'c1', name: 'Rohan Sharma', rate: 50 })],
      // 4 L delivered at ₹50 = ₹200 outstanding.
      deliveries: [delivery({ date: YESTERDAY, qty: 4 })],
    });
  });

  it('records a payment from the customer detail screen and updates the balance', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1' });

    // Balance before.
    expect(await screen.findByText('Customer Details')).toBeTruthy();
    expect(outstanding(state(), 'c1')).toBe(200);

    // Into the payment workflow.
    await press(screen.getByLabelText('Add Payment'));
    const amount = await screen.findByPlaceholderText('0');

    // The screen states the balance before anything is entered. ₹200 appears both
    // as the outstanding figure and inside the "Full" preset, so count instead of
    // expecting a single node.
    expect(screen.getByText('Outstanding')).toBeTruthy();
    expect(screen.getAllByText(money0(200)).length).toBeGreaterThan(0);

    await type(amount, '150');

    // Record. The CTA reflects the amount, which is also its a11y label.
    await press(screen.getByLabelText('Record ₹150'));

    // Store: exactly one payment, correct amount and customer.
    expect(state().payments).toHaveLength(1);
    expect(state().payments[0]).toMatchObject({
      customerId: 'c1',
      amount: 150,
      method: 'cash',
      date: TODAY,
    });

    // Balance reduced, and we are back on the detail screen.
    expect(outstanding(state(), 'c1')).toBe(50);
    expect(await screen.findByText('Customer Details')).toBeTruthy();
  });

  it('fills the full outstanding amount from the preset', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/payment' });

    await press(await screen.findByLabelText(`Full, ${money0(200)}`));
    await press(screen.getByLabelText('Record ₹200'));

    expect(state().payments[0]!.amount).toBe(200);
    expect(outstanding(state(), 'c1')).toBe(0);
  });

  it('fills half the outstanding amount from the preset', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/payment' });

    await press(await screen.findByLabelText(`Half, ${money0(100)}`));
    await press(screen.getByLabelText('Record ₹100'));

    expect(state().payments[0]!.amount).toBe(100);
    expect(outstanding(state(), 'c1')).toBe(100);
  });

  it('records the selected payment method', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/payment' });

    await press(await screen.findByLabelText('UPI'));
    await type(screen.getByPlaceholderText('0'), '75');
    await press(screen.getByLabelText('Record ₹75'));

    expect(state().payments[0]).toMatchObject({ amount: 75, method: 'upi' });
  });

  it('saves an optional note', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/payment' });

    await type(await screen.findByPlaceholderText('0'), '50');
    await type(
      screen.getByPlaceholderText('e.g. NEFT reference, part payment'),
      'NEFT 8891',
    );
    await press(screen.getByLabelText('Record ₹50'));

    expect(state().payments[0]!.notes).toBe('NEFT 8891');
  });

  it('refuses a zero or empty amount', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/payment' });

    // The CTA is disabled until there is an amount, so nothing can be recorded.
    const cta = await screen.findByLabelText('Record payment');
    expect(cta.props.accessibilityState?.disabled).toBe(true);

    await press(cta);
    expect(state().payments).toHaveLength(0);

    // Explicit zero is also refused.
    await type(screen.getByPlaceholderText('0'), '0');
    await press(screen.getByLabelText('Record payment'));
    expect(state().payments).toHaveLength(0);
  });

  it('accepts an overpayment and carries it as credit', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/payment' });

    await type(await screen.findByPlaceholderText('0'), '300');
    await press(screen.getByLabelText('Record ₹300'));

    // 200 owed, 300 paid.
    expect(outstanding(state(), 'c1')).toBe(-100);
  });

  it('does not double-record when the CTA is tapped twice', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/payment' });

    await type(await screen.findByPlaceholderText('0'), '100');
    const cta = screen.getByLabelText('Record ₹100');

    // `Button` wraps onPress in a single-fire guard, so a bounced tap cannot
    // create two payments.
    await act(async () => {
      fireEvent.press(cta);
      fireEvent.press(cta);
      await Promise.resolve();
    });

    expect(state().payments).toHaveLength(1);
    expect(outstanding(state(), 'c1')).toBe(100);
  });

  it('shows the new payment in the customer’s history', async () => {
    useDairyStore.getState().addPayment({
      customerId: 'c1',
      date: TODAY,
      amount: 120,
      method: 'bank',
      notes: 'IMPS',
    });

    renderRouter('src/app', { initialUrl: '/customers/c1/payments' });

    expect(await screen.findByText('Payment History')).toBeTruthy();
    // Once as the total received, once on the row itself.
    expect(screen.getAllByText(money0(120))).toHaveLength(2);
    expect(screen.getByText(/IMPS/)).toBeTruthy();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * DELIVERY
 * ─────────────────────────────────────────────────────────────────────────── */

describe('delivery workflow', () => {
  beforeEach(() => {
    seedStore({
      customers: [
        customer({ id: 'c1', name: 'Rohan Sharma', morningQty: 2, eveningQty: 1 }),
        customer({ id: 'c2', name: 'Suresh Kumar', morningQty: 1, eveningQty: 1 }),
        customer({ id: 'c3', name: 'Paused Person', paused: true }),
      ],
    });
  });

  it('cycles a customer pending → delivered → skipped → pending', async () => {
    renderRouter('src/app', { initialUrl: '/delivery' });

    const control = await screen.findByLabelText(/Rohan Sharma, /);

    await press(control);
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('delivered');

    await press(screen.getByLabelText(/Rohan Sharma, /));
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('not_delivered');

    await press(screen.getByLabelText(/Rohan Sharma, /));
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('pending');

    // Three taps, still one record — no duplicates.
    expect(state().deliveries).toHaveLength(1);
  });

  it('records the customer’s quantity and rate on the delivery', async () => {
    renderRouter('src/app', { initialUrl: '/delivery' });

    await press(await screen.findByLabelText(/Rohan Sharma, /));

    expect(state().deliveries[0]).toMatchObject({
      customerId: 'c1',
      slot: 'morning',
      qty: 2,
      rate: 50,
    });
  });

  it('excludes paused customers from the round', async () => {
    renderRouter('src/app', { initialUrl: '/delivery' });

    await screen.findByLabelText(/Rohan Sharma, /);
    expect(screen.queryByLabelText(/Paused Person, /)).toBeNull();
  });

  it('marks the whole round delivered', async () => {
    renderRouter('src/app', { initialUrl: '/delivery' });

    await press(await screen.findByLabelText('Mark All Delivered'));

    const morning = state().deliveries.filter(
      (d) => d.date === TODAY && d.slot === 'morning',
    );
    // Two eligible customers; the paused one is skipped.
    expect(morning).toHaveLength(2);
    expect(morning.every((d) => d.status === 'delivered')).toBe(true);
  });

  it('switching slot targets the evening quantities', async () => {
    renderRouter('src/app', { initialUrl: '/delivery' });

    await press(await screen.findByLabelText('Evening'));
    await press(screen.getByLabelText(/Rohan Sharma, /));

    expect(statusFor(state(), 'c1', TODAY, 'evening')).toBe('delivered');
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('pending');
    // Evening quantity, not morning.
    expect(state().deliveries[0]!.qty).toBe(1);
  });

  it('filters the round by search', async () => {
    renderRouter('src/app', { initialUrl: '/delivery' });

    await type(await screen.findByPlaceholderText('Search customer…'), 'Suresh');

    expect(screen.getByLabelText(/Suresh Kumar, /)).toBeTruthy();
    expect(screen.queryByLabelText(/Rohan Sharma, /)).toBeNull();
  });

  it('stepping to the previous day keeps today untouched', async () => {
    renderRouter('src/app', { initialUrl: '/delivery' });

    await press(await screen.findByLabelText('Previous day'));
    await press(screen.getByLabelText(/Rohan Sharma, /));

    expect(statusFor(state(), 'c1', YESTERDAY, 'morning')).toBe('delivered');
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('pending');
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * CUSTOMER CREATION
 * ─────────────────────────────────────────────────────────────────────────── */

describe('add customer workflow', () => {
  beforeEach(() => {
    // One existing customer, so the list is not empty. The empty state renders its
    // own "Add Customer" CTA, which would collide with the header action.
    seedStore({
      customers: [customer({ id: 'c0', name: 'Existing Person' })],
      settings: { defaultRate: 60 },
    });
  });

  it('creates a customer and returns to the list', async () => {
    renderRouter('src/app', { initialUrl: '/customers' });

    await press(await screen.findByLabelText('Add Customer'));

    await type(await screen.findByPlaceholderText('e.g. Rohan Sharma'), 'Meena Gupta');
    await type(screen.getByPlaceholderText('e.g. 9876543210'), '9998887776');
    await type(screen.getByPlaceholderText('Street, area, city'), 'Ashok Vihar');

    await press(screen.getByLabelText('Save customer'));

    expect(state().customers).toHaveLength(2);
    expect(state().customers[1]).toMatchObject({
      name: 'Meena Gupta',
      phone: '9998887776',
      address: 'Ashok Vihar',
      // Defaults inherited from settings.
      rate: 60,
      morningQty: 1,
      eveningQty: 0,
      paused: false,
      milkType: 'cow',
    });

    // The list behind is updated and focused again.
    expect(await screen.findByText('Meena Gupta')).toBeTruthy();
  });

  it('blocks save and reports which fields are missing', async () => {
    renderRouter('src/app', { initialUrl: '/customers/new' });

    await press(await screen.findByLabelText('Save customer'));

    // Still just the pre-existing customer — nothing was created.
    expect(state().customers).toHaveLength(1);
    expect(screen.getByText('Name is required')).toBeTruthy();
    expect(screen.getByText('Phone number is required')).toBeTruthy();
  });

  it('requires a quantity in at least one slot', async () => {
    renderRouter('src/app', { initialUrl: '/customers/new' });

    await type(await screen.findByPlaceholderText('e.g. Rohan Sharma'), 'Zero Qty');
    await type(screen.getByPlaceholderText('e.g. 9876543210'), '9000000000');
    await type(screen.getByPlaceholderText('1.0'), '0');
    await type(screen.getByPlaceholderText('0.5'), '0');

    await press(screen.getByLabelText('Save customer'));

    expect(state().customers).toHaveLength(1);
    expect(screen.getByText('Set a quantity for at least one slot')).toBeTruthy();
  });

  it('clears a field error as soon as it is corrected', async () => {
    renderRouter('src/app', { initialUrl: '/customers/new' });

    await press(await screen.findByLabelText('Save customer'));
    expect(screen.getByText('Name is required')).toBeTruthy();

    await type(screen.getByPlaceholderText('e.g. Rohan Sharma'), 'Fixed');
    expect(screen.queryByText('Name is required')).toBeNull();
  });

  it('records the chosen milk type and opening balance', async () => {
    renderRouter('src/app', { initialUrl: '/customers/new' });

    await type(await screen.findByPlaceholderText('e.g. Rohan Sharma'), 'Buffalo Buyer');
    await type(screen.getByPlaceholderText('e.g. 9876543210'), '9111111111');
    await press(screen.getByLabelText('Buffalo'));
    await type(screen.getByPlaceholderText('0'), '250');

    await press(screen.getByLabelText('Save customer'));

    expect(state().customers).toHaveLength(2);
    expect(state().customers[1]).toMatchObject({
      milkType: 'buffalo',
      openingBalance: 250,
    });
  });

  it('does not create two customers from a double tap', async () => {
    renderRouter('src/app', { initialUrl: '/customers/new' });

    await type(await screen.findByPlaceholderText('e.g. Rohan Sharma'), 'Once Only');
    await type(screen.getByPlaceholderText('e.g. 9876543210'), '9222222222');

    const save = screen.getByLabelText('Save customer');
    await act(async () => {
      fireEvent.press(save);
      fireEvent.press(save);
      await Promise.resolve();
    });

    // One pre-existing plus exactly one new — not two.
    expect(state().customers).toHaveLength(2);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * BILLING
 * ─────────────────────────────────────────────────────────────────────────── */

describe('bill workflow', () => {
  beforeEach(() => {
    seedStore({
      customers: [customer({ id: 'c1', name: 'Rohan Sharma', rate: 50 })],
      deliveries: [delivery({ date: TODAY, qty: 3 })], // ₹150 this month
      settings: { deliveryCharge: 20 },
    });
  });

  it('generates a bill for the selected period', async () => {
    renderRouter('src/app', { initialUrl: '/customers/c1/bill' });

    // Defaults to the previous full month, which has no deliveries here.
    expect(await screen.findByText('Bill')).toBeTruthy();
    await press(screen.getByLabelText('Generate bill'));

    expect(state().bills).toHaveLength(1);
    // Empty period: only the delivery charge is due.
    expect(state().bills[0]!.totalQty).toBe(0);
    expect(state().bills[0]!.deliveryCharge).toBe(20);
  });

  it('marks a generated bill as paid', async () => {
    // Generate for the current month, where the delivery sits.
    useDairyStore.getState().generateBill('c1', monthStart(TODAY), monthEnd(TODAY));
    expect(state().bills[0]!.status).toBe('unpaid');

    renderRouter('src/app', { initialUrl: '/customers/c1/bill' });
    await settle();

    // The screen opens on the previous full month — the period you would normally
    // bill for — so switch to the current month, where the delivery sits.
    await press(
      await screen.findByLabelText(`Billing period, ${monthLabel(PREVIOUS_MONTH)}`),
    );
    await press(await screen.findByLabelText(monthLabel(TODAY)));

    await press(await screen.findByLabelText('Mark paid'));

    expect(state().bills[0]!.status).toBe('paid');
  });

  it('shows the running balance in the ledger', async () => {
    seedStore({
      customers: [customer({ id: 'c1', openingBalance: 100, rate: 50 })],
      deliveries: [delivery({ date: YESTERDAY, qty: 2 })], // +100 → 200
      payments: [payment({ date: TODAY, amount: 60 })], //    −60  → 140
    });

    renderRouter('src/app', { initialUrl: '/customers/c1/ledger' });

    expect(await screen.findByText('Ledger')).toBeTruthy();
    // Closing balance in the summary, and the same running balance on the newest
    // row — the ledger is newest-first, so they agree by construction.
    expect(screen.getAllByText(money0(140)).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Current balance')).toBeTruthy();
  });
});

function monthLabel(iso: string) {
  return new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SETTINGS
 * ─────────────────────────────────────────────────────────────────────────── */

describe('settings workflow', () => {
  beforeEach(() => {
    seedStore({
      settings: {
        dairyName: 'Old Name',
        autoDeliveryDefault: true,
        billingCycleDay: 7,
        notificationsEnabled: false,
      },
    });
  });

  it('saves edits without dropping fields the form does not show', async () => {
    renderRouter('src/app', { initialUrl: '/more/settings' });

    await type(await screen.findByPlaceholderText('e.g. Vishal Dairy'), 'New Name');
    await press(screen.getByLabelText('Save'));

    expect(state().settings).toMatchObject({
      dairyName: 'New Name',
      // Regression: these were silently reset by the old partial payload.
      billingCycleDay: 7,
      autoDeliveryDefault: true,
    });
  });

  it('persists the automation toggles', async () => {
    renderRouter('src/app', { initialUrl: '/more/settings' });

    await press(await screen.findByLabelText('Notifications'));
    await press(screen.getByLabelText('Save'));

    expect(state().settings.notificationsEnabled).toBe(true);
  });

  it('switches language and keeps the rest of settings intact', async () => {
    renderRouter('src/app', { initialUrl: '/more/settings' });

    await press(await screen.findByLabelText('हिंदी'));

    expect(state().lang).toBe('hi');
    expect(state().settings.dairyName).toBe('Old Name');
  });

  it('changes the accent theme', async () => {
    renderRouter('src/app', { initialUrl: '/more/settings' });

    await press(await screen.findByLabelText('Ocean'));
    expect(state().themeAccentId).toBe('blue');
  });

  it('asks before resetting, and cancelling destroys nothing', async () => {
    seedStore({
      customers: [customer({ id: 'c1' })],
      payments: [payment({ date: TODAY, amount: 500 })],
    });

    renderRouter('src/app', { initialUrl: '/more/settings' });

    await press(await screen.findByLabelText('Reset all data'));

    // Dialog open, nothing destroyed yet.
    expect(await screen.findByText('Reset all data?')).toBeTruthy();
    expect(state().payments).toHaveLength(1);

    await press(screen.getByLabelText('Cancel'));
    expect(state().payments).toHaveLength(1);
    expect(state().customers).toHaveLength(1);
  });

  /**
   * Separate test on purpose: `Button` single-fires for 600ms, so the destructive
   * trigger cannot be pressed a second time within one test. That guard is the
   * point — it is what stops a bounced tap from opening and confirming.
   */
  it('resets all data once confirmed', async () => {
    seedStore({
      customers: [customer({ id: 'c1' })],
      payments: [payment({ date: TODAY, amount: 500 })],
    });

    renderRouter('src/app', { initialUrl: '/more/settings' });

    await press(await screen.findByLabelText('Reset all data'));
    await press(await screen.findByLabelText('Reset'));

    /**
     * Back to the seeded dataset, not the one-customer fixture. Asserted by shape
     * rather than by a specific amount — the seed happens to include a ₹500
     * payment of its own, so matching on the value would pass either way.
     */
    expect(state().customers.length).toBeGreaterThan(1);
    expect(state().payments.length).toBeGreaterThan(1);
    expect(state().deliveries.length).toBeGreaterThan(1);
    expect(state().bills).toHaveLength(0);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * DASHBOARD & SEARCH
 * ─────────────────────────────────────────────────────────────────────────── */

describe('dashboard', () => {
  it('reflects a delivery marked on another tab', async () => {
    seedStore({
      customers: [customer({ id: 'c1', morningQty: 2, eveningQty: 0 })],
    });

    renderRouter('src/app', { initialUrl: '/delivery' });
    await press(await screen.findByLabelText(/Rohan Sharma, /));

    // Home reads the same subscribed slices, so its figures must follow.
    pause();
    await press(screen.getByLabelText('Home, 1 of 5'));
    await settle();

    // 2 L delivered today. Shown in the stat strip and again on the trend card.
    expect((await screen.findAllByText('2.0 L')).length).toBeGreaterThanOrEqual(2);
  });

  it('searches customers from the dashboard', async () => {
    seedStore({
      customers: [
        customer({ id: 'c1', name: 'Rohan Sharma', phone: '9876543210' }),
        customer({ id: 'c2', name: 'Suresh Kumar', phone: '9812345678' }),
      ],
    });

    renderRouter('src/app', { initialUrl: '/' });

    await type(
      await screen.findByPlaceholderText('Search customers…'),
      'Suresh',
    );

    // The dashboard is replaced by results — the field used to be inert.
    expect(await screen.findByText('Suresh Kumar')).toBeTruthy();
    expect(screen.queryByText('Rohan Sharma')).toBeNull();
  });

  it('finds a customer by phone number', async () => {
    seedStore({
      customers: [customer({ id: 'c1', name: 'Rohan Sharma', phone: '9876543210' })],
    });

    renderRouter('src/app', { initialUrl: '/' });
    await type(await screen.findByPlaceholderText('Search customers…'), '98765');

    expect(await screen.findByText('Rohan Sharma')).toBeTruthy();
  });
});
