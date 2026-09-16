/**
 * Deterministic store fixtures.
 *
 * The seeded dataset is generated at module load with random ids and 21 days of
 * history, which is fine for looking at the app but hopeless for asserting money
 * math. These builders let a test state exactly the data it depends on, so a
 * failure points at the logic rather than at the seed.
 */

import {
  useDairyStore,
  type Customer,
  type DeliveryRecord,
  type Payment,
  type Settings,
  type Slot,
} from '@/lib/dairy-store';

export const CUSTOMER_DEFAULTS: Customer = {
  id: 'c1',
  name: 'Rohan Sharma',
  phone: '9876543210',
  address: 'Sector 10, Rohini, Delhi',
  morningQty: 1,
  eveningQty: 1,
  rate: 50,
  paused: false,
  openingBalance: 0,
  milkType: 'cow',
  autoDeliveryEnabled: true,
};

export const SETTINGS_DEFAULTS: Settings = {
  dairyName: 'Test Dairy',
  ownerName: 'Tester',
  defaultRate: 50,
  deliveryCharge: 0,
  autoDeliveryDefault: true,
  billingCycleDay: 1,
  notificationsEnabled: false,
  morningDeliveryTime: '08:00',
  eveningDeliveryTime: '19:00',
  gestationDays: 280,
  fontSize: 14,
};

export function customer(overrides: Partial<Customer> = {}): Customer {
  return { ...CUSTOMER_DEFAULTS, ...overrides };
}

let deliverySeq = 0;

export function delivery(
  overrides: Partial<DeliveryRecord> & { date: string; slot?: Slot },
): DeliveryRecord {
  deliverySeq += 1;
  return {
    id: `d${deliverySeq}`,
    customerId: 'c1',
    slot: 'morning',
    qty: 1,
    rate: 50,
    status: 'delivered',
    autoMarked: false,
    ...overrides,
  };
}

let paymentSeq = 0;

export function payment(overrides: Partial<Payment> & { date: string }): Payment {
  paymentSeq += 1;
  return {
    id: `p${paymentSeq}`,
    customerId: 'c1',
    amount: 100,
    method: 'cash',
    ...overrides,
  };
}

export interface Fixture {
  customers?: Customer[];
  deliveries?: DeliveryRecord[];
  payments?: Payment[];
  settings?: Partial<Settings>;
}

/**
 * Replaces the store's data with exactly what the test declares. Bills,
 * job-run markers and language are reset too, so tests cannot leak into
 * each other through `lastAutoDeliveryDate` or a stale bill.
 */
export function seedStore(fixture: Fixture = {}) {
  deliverySeq = 0;
  paymentSeq = 0;

  useDairyStore.setState({
    customers: fixture.customers ?? [customer()],
    deliveries: fixture.deliveries ?? [],
    payments: fixture.payments ?? [],
    bills: [],
    settings: { ...SETTINGS_DEFAULTS, ...fixture.settings },
    lang: 'en',
    themeAccentId: 'mono',
    lastAutoDeliveryDate: null,
    lastBillingRunDate: null,
  });
}

/** Non-reactive snapshot, for assertions. */
export const state = () => useDairyStore.getState();
