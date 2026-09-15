/// <reference types="jest" />

/**
 * Business logic: balances, deliveries, payments and bills.
 *
 * Every case uses an explicit fixture rather than the seeded dataset, so the
 * arithmetic in the assertions is checkable by hand.
 */

import {
  addDaysISO,
  collectionOn,
  customerBilled,
  customerPaid,
  isAutoMarked,
  milkOn,
  milkTypeLabel,
  money0,
  monthEnd,
  monthStart,
  outstanding,
  statusFor,
  todayISO,
  totalOutstanding,
  useDairyStore,
} from '@/lib/dairy-store';
import { customer, delivery, payment, seedStore, state } from '../../test-support/fixtures';

const TODAY = todayISO();
const YESTERDAY = addDaysISO(TODAY, -1);
const LAST_MONTH = addDaysISO(monthStart(TODAY), -5);

beforeEach(() => {
  seedStore();
});

/* ─── Balances ───────────────────────────────────────────────────────────── */

describe('outstanding balance', () => {
  it('is openingBalance + delivered value − payments', () => {
    seedStore({
      customers: [customer({ openingBalance: 200, rate: 50 })],
      deliveries: [
        delivery({ date: YESTERDAY, qty: 2 }), // 2 × 50 = 100
        delivery({ date: TODAY, qty: 1 }), //     1 × 50 =  50
      ],
      payments: [payment({ date: TODAY, amount: 120 })],
    });

    // 200 + 150 − 120
    expect(outstanding(state(), 'c1')).toBe(230);
  });

  it('ignores pending and skipped deliveries', () => {
    seedStore({
      deliveries: [
        delivery({ date: TODAY, qty: 1, status: 'delivered' }),
        delivery({ date: TODAY, slot: 'evening', qty: 5, status: 'pending' }),
        delivery({ date: YESTERDAY, qty: 5, status: 'not_delivered' }),
      ],
    });

    // Only the delivered litre is billable.
    expect(outstanding(state(), 'c1')).toBe(50);
  });

  it('bills at the rate recorded on the delivery, not the current rate', () => {
    seedStore({
      // Customer's rate has since risen to 60.
      customers: [customer({ rate: 60 })],
      // But this litre was delivered when the rate was 50.
      deliveries: [delivery({ date: YESTERDAY, qty: 1, rate: 50 })],
    });

    // A rate change must not retroactively reprice history.
    expect(outstanding(state(), 'c1')).toBe(50);
  });

  it('goes negative when a customer overpays', () => {
    seedStore({
      deliveries: [delivery({ date: TODAY, qty: 1 })],
      payments: [payment({ date: TODAY, amount: 200 })],
    });

    // 50 − 200. Screens clamp this for display; the ledger keeps the credit.
    expect(outstanding(state(), 'c1')).toBe(-150);
  });

  it('sums across customers, skipping none', () => {
    seedStore({
      customers: [
        customer({ id: 'c1', openingBalance: 100 }),
        customer({ id: 'c2', openingBalance: 50, paused: true }),
      ],
      deliveries: [delivery({ customerId: 'c2', date: TODAY, qty: 1 })],
    });

    // 100 + (50 + 50). A paused customer still owes what they owe.
    expect(totalOutstanding(state())).toBe(200);
  });
});

describe('date-ranged totals', () => {
  it('customerBilled honours an inclusive range', () => {
    seedStore({
      deliveries: [
        delivery({ date: LAST_MONTH, qty: 10 }),
        delivery({ date: YESTERDAY, qty: 1 }),
        delivery({ date: TODAY, qty: 2 }),
      ],
    });

    const from = monthStart(TODAY);
    // Both ends inclusive: yesterday + today, not last month.
    expect(customerBilled(state(), 'c1', from, TODAY)).toBe(150);
    // Range covering only today.
    expect(customerBilled(state(), 'c1', TODAY, TODAY)).toBe(100);
    // No range = all time.
    expect(customerBilled(state(), 'c1')).toBe(650);
  });

  it('customerPaid honours an inclusive range', () => {
    seedStore({
      payments: [
        payment({ date: LAST_MONTH, amount: 500 }),
        payment({ date: TODAY, amount: 200 }),
      ],
    });

    expect(customerPaid(state(), 'c1', monthStart(TODAY), TODAY)).toBe(200);
    expect(customerPaid(state(), 'c1')).toBe(700);
  });

  it('milkOn counts only delivered litres on that date', () => {
    seedStore({
      deliveries: [
        delivery({ date: TODAY, qty: 1.5 }),
        delivery({ date: TODAY, slot: 'evening', qty: 2, status: 'pending' }),
        delivery({ date: YESTERDAY, qty: 9 }),
      ],
    });

    expect(milkOn(state(), TODAY)).toBe(1.5);
    expect(milkOn(state(), YESTERDAY)).toBe(9);
  });

  it('collectionOn sums payments on that date', () => {
    seedStore({
      payments: [
        payment({ date: TODAY, amount: 100 }),
        payment({ date: TODAY, amount: 50 }),
        payment({ date: YESTERDAY, amount: 999 }),
      ],
    });

    expect(collectionOn(state(), TODAY)).toBe(150);
  });
});

/* ─── Deliveries ─────────────────────────────────────────────────────────── */

describe('setStatus', () => {
  it('creates a record when none exists for that date and slot', () => {
    useDairyStore.getState().setStatus('c1', TODAY, 'morning', 'delivered', 2, 50);

    expect(state().deliveries).toHaveLength(1);
    expect(state().deliveries[0]).toMatchObject({
      customerId: 'c1',
      date: TODAY,
      slot: 'morning',
      qty: 2,
      rate: 50,
      status: 'delivered',
    });
  });

  it('updates in place rather than duplicating', () => {
    seedStore({
      deliveries: [delivery({ date: TODAY, slot: 'morning', status: 'pending' })],
    });

    // The regression this guards: a UTC/local date mismatch used to make the
    // lookup miss, so every tap appended a new row.
    useDairyStore.getState().setStatus('c1', TODAY, 'morning', 'delivered', 1, 50);
    useDairyStore.getState().setStatus('c1', TODAY, 'morning', 'not_delivered', 1, 50);

    expect(state().deliveries).toHaveLength(1);
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('not_delivered');
  });

  it('keeps morning and evening independent', () => {
    const { setStatus } = useDairyStore.getState();
    setStatus('c1', TODAY, 'morning', 'delivered', 1, 50);
    setStatus('c1', TODAY, 'evening', 'not_delivered', 1, 50);

    expect(state().deliveries).toHaveLength(2);
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('delivered');
    expect(statusFor(state(), 'c1', TODAY, 'evening')).toBe('not_delivered');
  });

  it('defaults to pending when nothing is recorded', () => {
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('pending');
  });

  it('records whether a status was set automatically', () => {
    useDairyStore.getState().setStatus('c1', TODAY, 'morning', 'delivered', 1, 50, true);
    expect(isAutoMarked(state(), 'c1', TODAY, 'morning')).toBe(true);

    useDairyStore.getState().setStatus('c1', TODAY, 'morning', 'delivered', 1, 50, false);
    expect(isAutoMarked(state(), 'c1', TODAY, 'morning')).toBe(false);
  });
});

describe('markAll', () => {
  it('covers eligible customers only', () => {
    const customers = [
      customer({ id: 'c1', morningQty: 1 }),
      customer({ id: 'c2', morningQty: 2 }),
      // Paused: excluded.
      customer({ id: 'c3', morningQty: 1, paused: true }),
      // No morning quantity: excluded.
      customer({ id: 'c4', morningQty: 0 }),
    ];
    seedStore({ customers });

    useDairyStore.getState().markAll(TODAY, 'morning', 'delivered', customers);

    const marked = state().deliveries;
    expect(marked).toHaveLength(2);
    expect(marked.map((d) => d.customerId).sort()).toEqual(['c1', 'c2']);
    expect(marked.every((d) => d.status === 'delivered')).toBe(true);
  });

  it('is idempotent — running twice does not duplicate', () => {
    const customers = [customer({ id: 'c1' })];
    seedStore({ customers });

    const { markAll } = useDairyStore.getState();
    markAll(TODAY, 'morning', 'delivered', customers);
    markAll(TODAY, 'morning', 'delivered', customers);

    expect(state().deliveries).toHaveLength(1);
  });

  it('overwrites an existing status', () => {
    const customers = [customer({ id: 'c1' })];
    seedStore({
      customers,
      deliveries: [delivery({ date: TODAY, status: 'not_delivered' })],
    });

    useDairyStore.getState().markAll(TODAY, 'morning', 'delivered', customers);

    expect(state().deliveries).toHaveLength(1);
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('delivered');
  });
});

describe('markAbsent', () => {
  it('marks a slot not delivered, creating or updating', () => {
    useDairyStore.getState().markAbsent('c1', TODAY, 'evening');
    expect(statusFor(state(), 'c1', TODAY, 'evening')).toBe('not_delivered');

    useDairyStore.getState().markAbsent('c1', TODAY, 'evening');
    expect(state().deliveries).toHaveLength(1);
  });

  it('does nothing for an unknown customer', () => {
    useDairyStore.getState().markAbsent('nope', TODAY, 'morning');
    expect(state().deliveries).toHaveLength(0);
  });
});

describe('runAutoDeliveryJob', () => {
  it('marks enrolled customers delivered for both slots', () => {
    seedStore({ customers: [customer({ morningQty: 1, eveningQty: 2 })] });

    useDairyStore.getState().runAutoDeliveryJob(TODAY);

    expect(state().deliveries).toHaveLength(2);
    expect(state().deliveries.every((d) => d.status === 'delivered')).toBe(true);
    expect(state().deliveries.every((d) => d.autoMarked)).toBe(true);
  });

  it('runs at most once per date', () => {
    const { runAutoDeliveryJob } = useDairyStore.getState();
    runAutoDeliveryJob(TODAY);
    runAutoDeliveryJob(TODAY);

    expect(state().deliveries).toHaveLength(2);
    expect(state().lastAutoDeliveryDate).toBe(TODAY);
  });

  it('skips paused customers and those not enrolled', () => {
    seedStore({
      customers: [
        customer({ id: 'c1', paused: true }),
        customer({ id: 'c2', autoDeliveryEnabled: false }),
      ],
    });

    useDairyStore.getState().runAutoDeliveryJob(TODAY);
    expect(state().deliveries).toHaveLength(0);
  });

  it('skips dates inside a leave range', () => {
    seedStore({
      customers: [customer({ leaveRanges: [{ from: YESTERDAY, to: TODAY }] })],
    });

    useDairyStore.getState().runAutoDeliveryJob(TODAY);
    expect(state().deliveries).toHaveLength(0);
  });

  it('never overwrites a status the user already set', () => {
    seedStore({
      customers: [customer({ morningQty: 1, eveningQty: 1 })],
      deliveries: [delivery({ date: TODAY, slot: 'morning', status: 'not_delivered' })],
    });

    useDairyStore.getState().runAutoDeliveryJob(TODAY);

    // Morning stays skipped; only the untouched evening slot is filled in.
    expect(statusFor(state(), 'c1', TODAY, 'morning')).toBe('not_delivered');
    expect(statusFor(state(), 'c1', TODAY, 'evening')).toBe('delivered');
  });
});

/* ─── Payments ───────────────────────────────────────────────────────────── */

describe('addPayment', () => {
  it('appends with a generated id and reduces the balance', () => {
    seedStore({ deliveries: [delivery({ date: TODAY, qty: 4 })] }); // 200 due

    useDairyStore.getState().addPayment({
      customerId: 'c1',
      date: TODAY,
      amount: 150,
      method: 'upi',
      notes: 'NEFT',
    });

    expect(state().payments).toHaveLength(1);
    expect(state().payments[0]!.id).toBeTruthy();
    expect(state().payments[0]).toMatchObject({ amount: 150, method: 'upi', notes: 'NEFT' });
    expect(outstanding(state(), 'c1')).toBe(50);
  });

  it('keeps separate payments separate rather than merging', () => {
    const { addPayment } = useDairyStore.getState();
    addPayment({ customerId: 'c1', date: TODAY, amount: 100, method: 'cash' });
    addPayment({ customerId: 'c1', date: TODAY, amount: 100, method: 'cash' });

    // Two identical cash payments on one day are legitimate.
    expect(state().payments).toHaveLength(2);
    expect(customerPaid(state(), 'c1')).toBe(200);
  });

  it('attributes a payment to the right customer only', () => {
    seedStore({ customers: [customer({ id: 'c1' }), customer({ id: 'c2' })] });

    useDairyStore.getState().addPayment({
      customerId: 'c2',
      date: TODAY,
      amount: 100,
      method: 'cash',
    });

    expect(customerPaid(state(), 'c1')).toBe(0);
    expect(customerPaid(state(), 'c2')).toBe(100);
  });
});

/* ─── Bills ──────────────────────────────────────────────────────────────── */

describe('generateBill', () => {
  const from = monthStart(TODAY);
  const to = monthEnd(TODAY);

  it('totals the period and carries the prior balance', () => {
    seedStore({
      customers: [customer({ openingBalance: 100, rate: 50 })],
      deliveries: [
        // Before the period: becomes carried balance, not period total.
        delivery({ date: LAST_MONTH, qty: 2 }), // 100
        // Inside the period.
        delivery({ date: from, qty: 1 }), // 50
        delivery({ date: TODAY, slot: 'evening', qty: 3 }), // 150
      ],
      payments: [
        payment({ date: LAST_MONTH, amount: 40 }), // before period
        payment({ date: TODAY, amount: 60 }), // during period
      ],
      settings: { deliveryCharge: 20 },
    });

    const bill = useDairyStore.getState().generateBill('c1', from, to);

    expect(bill.totalQty).toBe(4);
    expect(bill.totalAmount).toBe(200);
    expect(bill.deliveryCharge).toBe(20);
    // opening 100 + billedBefore 100 − paidBefore 40
    expect(bill.openingBalanceCarried).toBe(160);
    expect(bill.amountPaidDuringPeriod).toBe(60);
    // 160 + 200 + 20 − 60
    expect(bill.finalDue).toBe(320);
    expect(bill.status).toBe('partially_paid');
  });

  it('is unpaid when nothing was paid in the period', () => {
    seedStore({ deliveries: [delivery({ date: TODAY, qty: 1 })] });

    const bill = useDairyStore.getState().generateBill('c1', from, to);
    expect(bill.finalDue).toBe(50);
    expect(bill.status).toBe('unpaid');
  });

  it('is paid when the period is fully settled', () => {
    seedStore({
      deliveries: [delivery({ date: TODAY, qty: 1 })],
      payments: [payment({ date: TODAY, amount: 50 })],
    });

    const bill = useDairyStore.getState().generateBill('c1', from, to);
    expect(bill.finalDue).toBe(0);
    expect(bill.status).toBe('paid');
  });

  it('excludes skipped and pending deliveries from the total', () => {
    seedStore({
      deliveries: [
        delivery({ date: TODAY, qty: 1, status: 'delivered' }),
        delivery({ date: TODAY, slot: 'evening', qty: 9, status: 'not_delivered' }),
      ],
    });

    const bill = useDairyStore.getState().generateBill('c1', from, to);
    expect(bill.totalQty).toBe(1);
    expect(bill.totalAmount).toBe(50);
  });

  it('regenerating the same period updates instead of adding a bill', () => {
    seedStore({ deliveries: [delivery({ date: TODAY, qty: 1 })] });

    const first = useDairyStore.getState().generateBill('c1', from, to);
    expect(state().bills).toHaveLength(1);

    // Record a payment, then recalculate — the Bill screen's "Recalculate".
    useDairyStore.getState().addPayment({
      customerId: 'c1',
      date: TODAY,
      amount: 50,
      method: 'cash',
    });
    const second = useDairyStore.getState().generateBill('c1', from, to);

    expect(state().bills).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(second.finalDue).toBe(0);
    expect(second.status).toBe('paid');
  });

  it('keeps bills for different periods separate', () => {
    seedStore({ deliveries: [delivery({ date: TODAY, qty: 1 })] });

    const { generateBill } = useDairyStore.getState();
    generateBill('c1', from, to);
    generateBill('c1', monthStart(LAST_MONTH), monthEnd(LAST_MONTH));

    expect(state().bills).toHaveLength(2);
  });
});

describe('updateBillStatus', () => {
  it('overrides the computed status', () => {
    seedStore({ deliveries: [delivery({ date: TODAY, qty: 1 })] });

    const bill = useDairyStore
      .getState()
      .generateBill('c1', monthStart(TODAY), monthEnd(TODAY));
    expect(bill.status).toBe('unpaid');

    useDairyStore.getState().updateBillStatus(bill.id, 'paid');
    expect(state().bills[0]!.status).toBe('paid');
  });
});

/* ─── Customers ──────────────────────────────────────────────────────────── */

describe('saveCustomer', () => {
  it('appends a new customer', () => {
    useDairyStore.getState().saveCustomer(customer({ id: 'c9', name: 'New Person' }));

    expect(state().customers).toHaveLength(2);
    expect(state().customers.find((c) => c.id === 'c9')?.name).toBe('New Person');
  });

  it('updates in place when the id already exists', () => {
    useDairyStore.getState().saveCustomer(customer({ id: 'c1', name: 'Renamed', rate: 99 }));

    expect(state().customers).toHaveLength(1);
    expect(state().customers[0]!.name).toBe('Renamed');
    expect(state().customers[0]!.rate).toBe(99);
  });
});

describe('togglePause', () => {
  it('flips only the target customer', () => {
    seedStore({ customers: [customer({ id: 'c1' }), customer({ id: 'c2' })] });

    useDairyStore.getState().togglePause('c1');

    expect(state().customers.find((c) => c.id === 'c1')?.paused).toBe(true);
    expect(state().customers.find((c) => c.id === 'c2')?.paused).toBe(false);

    useDairyStore.getState().togglePause('c1');
    expect(state().customers.find((c) => c.id === 'c1')?.paused).toBe(false);
  });
});

describe('deleteCustomer', () => {
  it('cascades to deliveries, payments and bills', () => {
    seedStore({
      customers: [customer({ id: 'c1' }), customer({ id: 'c2' })],
      deliveries: [
        delivery({ customerId: 'c1', date: TODAY }),
        delivery({ customerId: 'c2', date: TODAY }),
      ],
      payments: [
        payment({ customerId: 'c1', date: TODAY }),
        payment({ customerId: 'c2', date: TODAY }),
      ],
    });
    useDairyStore.getState().generateBill('c1', monthStart(TODAY), monthEnd(TODAY));

    useDairyStore.getState().deleteCustomer('c1');

    // Nothing belonging to c1 may survive, or the totals would count a ghost.
    expect(state().customers.map((c) => c.id)).toEqual(['c2']);
    expect(state().deliveries.every((d) => d.customerId === 'c2')).toBe(true);
    expect(state().payments.every((p) => p.customerId === 'c2')).toBe(true);
    expect(state().bills).toHaveLength(0);
  });
});

describe('leave ranges', () => {
  it('adds and removes by index', () => {
    const { addLeaveRange, removeLeaveRange } = useDairyStore.getState();

    addLeaveRange('c1', YESTERDAY, TODAY);
    addLeaveRange('c1', LAST_MONTH, LAST_MONTH);
    expect(state().customers[0]!.leaveRanges).toHaveLength(2);

    removeLeaveRange('c1', 0);
    expect(state().customers[0]!.leaveRanges).toHaveLength(1);
    expect(state().customers[0]!.leaveRanges?.[0]?.from).toBe(LAST_MONTH);
  });
});

/* ─── Settings ───────────────────────────────────────────────────────────── */

describe('saveSettings', () => {
  it('persists every field it is given', () => {
    // Regression: the Settings screen used to send a partial object, silently
    // resetting automation config whenever the dairy name was saved.
    useDairyStore.getState().saveSettings({
      ...state().settings,
      dairyName: 'Renamed Dairy',
      deliveryCharge: 75,
      autoDeliveryDefault: false,
      billingCycleDay: 5,
      notificationsEnabled: true,
    });

    expect(state().settings).toMatchObject({
      dairyName: 'Renamed Dairy',
      deliveryCharge: 75,
      autoDeliveryDefault: false,
      billingCycleDay: 5,
      notificationsEnabled: true,
    });
  });
});

describe('setLang', () => {
  it('stores the selected language', () => {
    useDairyStore.getState().setLang('hi');
    expect(state().lang).toBe('hi');
    useDairyStore.getState().setLang('en');
    expect(state().lang).toBe('en');
  });
});

/* ─── Formatting ─────────────────────────────────────────────────────────── */

describe('money0', () => {
  it('rounds and groups in the Indian numbering system', () => {
    expect(money0(0)).toBe('₹0');
    expect(money0(50)).toBe('₹50');
    expect(money0(1234.4)).toBe('₹1,234');
    // Rounds half up.
    expect(money0(1234.5)).toBe('₹1,235');
    // Lakh grouping, not thousands.
    expect(money0(100000)).toBe('₹1,00,000');
  });

  it('keeps the sign on a credit balance', () => {
    expect(money0(-150)).toBe('₹-150');
  });
});

describe('milkTypeLabel', () => {
  it('covers every milk type', () => {
    expect(milkTypeLabel('cow')).toBe('Cow');
    expect(milkTypeLabel('buffalo')).toBe('Buffalo');
    expect(milkTypeLabel('toned')).toBe('Toned');
    expect(milkTypeLabel('full_cream')).toBe('Full Cream');
    expect(milkTypeLabel('custom')).toBe('Custom');
  });
});
