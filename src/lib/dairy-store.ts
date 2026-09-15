import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Slot = "morning" | "evening";
export type DeliveryStatus = "delivered" | "pending" | "not_delivered";
export type PaymentMethod = "cash" | "upi" | "bank";
export type MilkType = "cow" | "buffalo" | "toned" | "full_cream" | "custom";
export type BillStatus = "unpaid" | "partially_paid" | "paid";
export type Lang = "en" | "hi";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  morningQty: number;
  eveningQty: number;
  rate: number;
  paused: boolean;
  openingBalance: number;
  milkType: MilkType;
  autoDeliveryEnabled: boolean;
  leaveRanges?: { from: string; to: string }[];
  creditLimit?: number;
}

export interface DeliveryRecord {
  id: string;
  customerId: string;
  date: string; // yyyy-mm-dd
  slot: Slot;
  qty: number;
  rate: number;
  status: DeliveryStatus;
  productType?: 'milk' | 'curd' | 'paneer' | 'ghee';
  autoMarked: boolean;
}

export interface Payment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export interface Bill {
  id: string;
  customerId: string;
  periodFrom: string;
  periodTo: string;
  totalQty: number;
  totalAmount: number;
  deliveryCharge: number;
  openingBalanceCarried: number;
  amountPaidDuringPeriod: number;
  finalDue: number;
  generatedOn: string;
  status: BillStatus;
}

export interface Settings {
  dairyName: string;
  ownerName: string;
  defaultRate: number;
  deliveryCharge: number;
  autoDeliveryDefault: boolean;
  billingCycleDay: number;
  notificationsEnabled: boolean;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface DairyState {
  customers: Customer[];
  deliveries: DeliveryRecord[];
  payments: Payment[];
  bills: Bill[];
  settings: Settings;
  lang: Lang | null;
  themeAccentId: string;
  lastAutoDeliveryDate: string | null;
  lastBillingRunDate: string | null;

  // Theme / lang
  setLang: (lang: Lang) => void;
  setThemeAccentId: (id: string) => void;

  // Customers
  saveCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  togglePause: (id: string) => void;

  // Deliveries
  setStatus: (customerId: string, date: string, slot: Slot, status: DeliveryStatus, qty: number, rate: number, autoMarked?: boolean) => void;
  markAll: (date: string, slot: Slot, status: DeliveryStatus, customers: Customer[]) => void;
  markAbsent: (customerId: string, date: string, slot: Slot) => void;
  runAutoDeliveryJob: (date: string) => void;

  // Payments
  addPayment: (p: Omit<Payment, "id">) => void;

  // Leave
  addLeaveRange: (customerId: string, from: string, to: string) => void;
  removeLeaveRange: (customerId: string, index: number) => void;

  // Bills
  generateBill: (customerId: string, from: string, to: string) => Bill;
  generateMonthlyBillsIfDue: () => void;
  updateBillStatus: (billId: string, status: BillStatus) => void;

  // Settings
  saveSettings: (s: Settings) => void;
  resetAll: () => void;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const uid = () => Math.random().toString(36).slice(2, 10);

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatMonthLabel(iso: string): string {
  return new Date(iso + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function monthStart(iso: string): string {
  return iso.slice(0, 7) + '-01';
}

export function monthEnd(iso: string): string {
  const d = new Date(iso.slice(0, 7) + '-01T00:00:00');
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function prevMonthISO(iso: string): string {
  const d = new Date(iso.slice(0, 7) + '-01T00:00:00');
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export function nextMonthISO(iso: string): string {
  const d = new Date(iso.slice(0, 7) + '-01T00:00:00');
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  dairyName: "Vishal Dairy",
  ownerName: "Vishal",
  defaultRate: 60,
  deliveryCharge: 100,
  autoDeliveryDefault: true,
  billingCycleDay: 1,
  notificationsEnabled: false,
};

function seedCustomers(): Customer[] {
  return [
    { id: "c1", name: "Rohan Sharma",  phone: "9876543210", address: "Sector 10, Rohini, Delhi",    morningQty: 1.5, eveningQty: 1,   rate: 60, paused: false, openingBalance: 500, milkType: "cow",      autoDeliveryEnabled: true },
    { id: "c2", name: "Suresh Kumar",  phone: "9812345678", address: "Sector 7, Rohini, Delhi",     morningQty: 1,   eveningQty: 1,   rate: 60, paused: false, openingBalance: 0,   milkType: "buffalo",  autoDeliveryEnabled: true },
    { id: "c3", name: "Anil Verma",    phone: "9898989898", address: "Pitampura, Delhi",            morningQty: 2,   eveningQty: 1,   rate: 60, paused: false, openingBalance: 250, milkType: "toned",    autoDeliveryEnabled: true },
    { id: "c4", name: "Rahul Singh",   phone: "9765432109", address: "Shalimar Bagh, Delhi",       morningQty: 1,   eveningQty: 0.5, rate: 60, paused: false, openingBalance: 0,   milkType: "full_cream", autoDeliveryEnabled: true },
    { id: "c5", name: "Meena Gupta",   phone: "9654321098", address: "Ashok Vihar, Delhi",         morningQty: 1,   eveningQty: 1,   rate: 60, paused: true,  openingBalance: 120, milkType: "cow",      autoDeliveryEnabled: false },
  ];
}

function seedDeliveries(customers: Customer[]): DeliveryRecord[] {
  const out: DeliveryRecord[] = [];
  const today = todayISO();
  for (let i = 20; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    for (const c of customers) {
      if (c.paused) continue;
      for (const slot of ["morning", "evening"] as Slot[]) {
        const qty = slot === "morning" ? c.morningQty : c.eveningQty;
        if (!qty) continue;
        let status: DeliveryStatus = "delivered";
        if (i === 0) status = slot === "morning" ? (c.id === "c2" ? "pending" : c.id === "c3" ? "not_delivered" : "delivered") : "pending";
        else if ((i + Number(c.id.slice(1))) % 9 === 0) status = "not_delivered";
        out.push({ id: uid(), customerId: c.id, date, slot, qty, rate: c.rate, status, autoMarked: true });
      }
    }
  }
  return out;
}

function seedPayments(): Payment[] {
  const today = todayISO();
  return [
    { id: uid(), customerId: "c1", date: addDaysISO(today, -14), amount: 500,  method: "cash", notes: "Part payment" },
    { id: uid(), customerId: "c1", date: addDaysISO(today, -4),  amount: 1500, method: "upi" },
    { id: uid(), customerId: "c2", date: addDaysISO(today, -10), amount: 1200, method: "cash" },
    { id: uid(), customerId: "c3", date: addDaysISO(today, -6),  amount: 2000, method: "bank", notes: "NEFT" },
    { id: uid(), customerId: "c4", date: addDaysISO(today, -8),  amount: 800,  method: "upi" },
  ];
}

const initialCustomers = seedCustomers();

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDairyStore = create<DairyState>()(
  persist(
    (set, get) => ({
      customers: initialCustomers,
      deliveries: seedDeliveries(initialCustomers),
      payments: seedPayments(),
      bills: [],
      settings: DEFAULT_SETTINGS,
      lang: "en",
      themeAccentId: "mono",
      lastAutoDeliveryDate: null,
      lastBillingRunDate: null,

      setLang: (lang) => set({ lang }),
      setThemeAccentId: (id) => set({ themeAccentId: id }),

      saveCustomer: (c) => set((state) => ({
        customers: state.customers.some((x) => x.id === c.id)
          ? state.customers.map((x) => (x.id === c.id ? c : x))
          : [...state.customers, c],
      })),

      deleteCustomer: (id) => set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        deliveries: state.deliveries.filter((x) => x.customerId !== id),
        payments: state.payments.filter((x) => x.customerId !== id),
        bills: state.bills.filter((b) => b.customerId !== id),
      })),

      togglePause: (id) => set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? { ...c, paused: !c.paused } : c)),
      })),

      setStatus: (customerId, date, slot, status, qty, rate, autoMarked = false) => set((state) => {
        const existing = state.deliveries.find(
          (x) => x.customerId === customerId && x.date === date && x.slot === slot
        );
        if (existing) {
          return {
            deliveries: state.deliveries.map((x) =>
              x.id === existing.id ? { ...x, status, autoMarked } : x
            ),
          };
        }
        return {
          deliveries: [...state.deliveries, { id: uid(), customerId, date, slot, qty, rate, status, autoMarked }],
        };
      }),

      markAll: (date, slot, status, customers) => set((state) => {
        let deliveries = [...state.deliveries];
        for (const c of customers) {
          const qty = slot === "morning" ? c.morningQty : c.eveningQty;
          if (!qty || c.paused) continue;
          const idx = deliveries.findIndex(
            (x) => x.customerId === c.id && x.date === date && x.slot === slot
          );
          if (idx >= 0) deliveries[idx] = { ...deliveries[idx]!, status, autoMarked: false };
          else deliveries.push({ id: uid(), customerId: c.id, date, slot, qty, rate: c.rate, status, autoMarked: false });
        }
        return { deliveries };
      }),

      markAbsent: (customerId, date, slot) => set((state) => {
        const c = state.customers.find((x) => x.id === customerId);
        if (!c) return {};
        const qty = slot === "morning" ? c.morningQty : c.eveningQty;
        const existing = state.deliveries.find(
          (x) => x.customerId === customerId && x.date === date && x.slot === slot
        );
        if (existing) {
          return {
            deliveries: state.deliveries.map((x) =>
              x.id === existing.id ? { ...x, status: "not_delivered", autoMarked: false } : x
            ),
          };
        }
        return {
          deliveries: [...state.deliveries, {
            id: uid(), customerId, date, slot, qty, rate: c.rate,
            status: "not_delivered", autoMarked: false,
          }],
        };
      }),

      runAutoDeliveryJob: (date) => set((state) => {
        // Only run once per date
        if (state.lastAutoDeliveryDate === date) return {};
        let deliveries = [...state.deliveries];
        for (const c of state.customers) {
          if (c.paused || !c.autoDeliveryEnabled) continue;
          // Skip if leave range covers this date
          const onLeave = c.leaveRanges?.some((r) => date >= r.from && date <= r.to);
          if (onLeave) continue;
          for (const slot of ["morning", "evening"] as Slot[]) {
            const qty = slot === "morning" ? c.morningQty : c.eveningQty;
            if (!qty) continue;
            // Only auto-mark if no existing record for this date/slot
            const already = deliveries.find(
              (x) => x.customerId === c.id && x.date === date && x.slot === slot
            );
            if (!already) {
              deliveries.push({
                id: uid(), customerId: c.id, date, slot, qty,
                rate: c.rate, status: "delivered", autoMarked: true,
              });
            }
          }
        }
        return { deliveries, lastAutoDeliveryDate: date };
      }),

      addPayment: (p) => set((state) => ({
        payments: [...state.payments, { ...p, id: uid() }],
      })),

      addLeaveRange: (customerId, from, to) => set((state) => ({
        customers: state.customers.map((c) =>
          c.id === customerId
            ? { ...c, leaveRanges: [...(c.leaveRanges ?? []), { from, to }] }
            : c
        ),
      })),

      removeLeaveRange: (customerId, index) => set((state) => ({
        customers: state.customers.map((c) =>
          c.id === customerId
            ? { ...c, leaveRanges: c.leaveRanges?.filter((_, i) => i !== index) }
            : c
        ),
      })),

      generateBill: (customerId, from, to) => {
        const state = get();
        const c = state.customers.find((x) => x.id === customerId)!;
        const deliveredRecords = state.deliveries.filter(
          (x) => x.customerId === customerId && x.status === "delivered" && x.date >= from && x.date <= to
        );
        const totalQty = deliveredRecords.reduce((s, x) => s + x.qty, 0);
        const totalAmount = deliveredRecords.reduce((s, x) => s + x.qty * x.rate, 0);
        const paidDuring = state.payments
          .filter((p) => p.customerId === customerId && p.date >= from && p.date <= to)
          .reduce((s, p) => s + p.amount, 0);
        // Opening balance = all billed before `from` minus all paid before `from` + customer opening
        const billedBefore = state.deliveries
          .filter((x) => x.customerId === customerId && x.status === "delivered" && x.date < from)
          .reduce((s, x) => s + x.qty * x.rate, 0);
        const paidBefore = state.payments
          .filter((p) => p.customerId === customerId && p.date < from)
          .reduce((s, p) => s + p.amount, 0);
        const openingBalanceCarried = (c.openingBalance ?? 0) + billedBefore - paidBefore;
        const finalDue = openingBalanceCarried + totalAmount + state.settings.deliveryCharge - paidDuring;

        const existing = state.bills.find(
          (b) => b.customerId === customerId && b.periodFrom === from && b.periodTo === to
        );
        const bill: Bill = {
          id: existing?.id ?? uid(),
          customerId,
          periodFrom: from,
          periodTo: to,
          totalQty,
          totalAmount,
          deliveryCharge: state.settings.deliveryCharge,
          openingBalanceCarried,
          amountPaidDuringPeriod: paidDuring,
          finalDue,
          generatedOn: new Date().toISOString(),
          status: finalDue <= 0 ? "paid" : paidDuring > 0 ? "partially_paid" : "unpaid",
        };

        set((s) => ({
          bills: existing
            ? s.bills.map((b) => (b.id === existing.id ? bill : b))
            : [...s.bills, bill],
        }));
        return bill;
      },

      generateMonthlyBillsIfDue: () => {
        const state = get();
        const today = todayISO();
        const cycleDay = state.settings.billingCycleDay;
        const todayDay = parseInt(today.slice(8, 10), 10);

        if (todayDay !== cycleDay) return;
        if (state.lastBillingRunDate === today) return;

        // Generate for previous month
        const prevMonthDate = addDaysISO(today.slice(0, 7) + '-01', -1);
        const from = monthStart(prevMonthDate);
        const to = monthEnd(prevMonthDate);

        for (const c of state.customers) {
          if (c.paused) continue;
          const already = state.bills.find(
            (b) => b.customerId === c.id && b.periodFrom === from && b.periodTo === to
          );
          if (!already) {
            get().generateBill(c.id, from, to);
          }
        }
        set({ lastBillingRunDate: today });
      },

      updateBillStatus: (billId, status) => set((state) => ({
        bills: state.bills.map((b) => (b.id === billId ? { ...b, status } : b)),
      })),

      saveSettings: (s) => set({ settings: s }),

      resetAll: () => set({
        customers: initialCustomers,
        deliveries: seedDeliveries(initialCustomers),
        payments: seedPayments(),
        bills: [],
        settings: DEFAULT_SETTINGS,
        lastAutoDeliveryDate: null,
        lastBillingRunDate: null,
      }),
    }),
    {
      name: 'dairy-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function statusFor(state: DairyState, customerId: string, date: string, slot: Slot): DeliveryStatus {
  return state.deliveries.find((x) => x.customerId === customerId && x.date === date && x.slot === slot)?.status ?? "pending";
}

export function isAutoMarked(state: DairyState, customerId: string, date: string, slot: Slot): boolean {
  return state.deliveries.find((x) => x.customerId === customerId && x.date === date && x.slot === slot)?.autoMarked ?? false;
}

export function milkOn(state: DairyState, date: string) {
  return state.deliveries
    .filter((x) => x.date === date && x.status === "delivered")
    .reduce((s, x) => s + x.qty, 0);
}

export function collectionOn(state: DairyState, date: string) {
  return state.payments.filter((p) => p.date === date).reduce((s, p) => s + p.amount, 0);
}

export function money0(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function customerBilled(state: DairyState, customerId: string, from?: string, to?: string) {
  return state.deliveries
    .filter(
      (x) =>
        x.customerId === customerId &&
        x.status === "delivered" &&
        (!from || x.date >= from) &&
        (!to || x.date <= to),
    )
    .reduce((s, x) => s + x.qty * x.rate, 0);
}

export function customerPaid(state: DairyState, customerId: string, from?: string, to?: string) {
  return state.payments
    .filter((p) => p.customerId === customerId && (!from || p.date >= from) && (!to || p.date <= to))
    .reduce((s, p) => s + p.amount, 0);
}

export function outstanding(state: DairyState, customerId: string) {
  const c = state.customers.find((x) => x.id === customerId);
  return (c?.openingBalance ?? 0) + customerBilled(state, customerId) - customerPaid(state, customerId);
}

export function totalOutstanding(state: DairyState) {
  return state.customers.reduce((s, c) => s + outstanding(state, c.id), 0);
}

export function milkTypeLabel(type: MilkType): string {
  const map: Record<MilkType, string> = {
    cow: 'Cow',
    buffalo: 'Buffalo',
    toned: 'Toned',
    full_cream: 'Full Cream',
    custom: 'Custom',
  };
  return map[type];
}
