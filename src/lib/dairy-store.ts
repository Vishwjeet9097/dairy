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
export type CowStatus = "active" | "dry" | "pregnant" | "sold" | "deceased";
export type FeedPaymentStatus = "paid" | "partial" | "due";
export type NotificationCategory = "delivery" | "billing" | "cow" | "feed" | "system";
// Base font size in pixels (default 14)
export type FontSize = number;

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
  notes?: string;
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

/**
 * Extra milk is separate from regular deliveries so the bill breakdown
 * can clearly distinguish "Regular: 60 L × ₹60" from "Extra: 5 L × ₹60".
 * Attaching it to DeliveryRecord would require nulling qty and status, which
 * would break every helper that reads those fields.
 */
export interface ExtraDelivery {
  id: string;
  customerId: string;
  date: string; // yyyy-mm-dd
  slot: Slot;
  qty: number;
  rate: number;
  notes?: string;
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
  extraQty: number;
  extraAmount: number;
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
  morningDeliveryTime: string;   // "HH:MM" 24h
  eveningDeliveryTime: string;   // "HH:MM" 24h
  gestationDays: number;         // default 280
  fontSize: FontSize;
}

// ─── Cow & Insemination ───────────────────────────────────────────────────────

export interface Cow {
  id: string;
  name: string;         // name or tag number
  breed: string;
  birthDate?: string;   // yyyy-mm-dd
  photo?: string;       // local file URI
  purchaseDate?: string;
  status: CowStatus;
  color?: string;
  notes?: string;
  createdAt: string;    // ISO timestamp
}

export interface Insemination {
  id: string;
  cowId: string;
  date: string;             // yyyy-mm-dd
  semenInfo?: string;       // bull name / semen batch
  technician?: string;
  expectedCalvingDate: string; // computed from date + gestationDays
  actualCalvingDate?: string;
  notes?: string;
  remindersSent: string[];  // list of reminder intervals already fired e.g. ["30d","7d"]
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedEntry {
  id: string;
  name: string;
  category?: string;        // hay / concentrate / mineral / etc.
  quantity: number;
  unit: string;             // kg / bag / litre
  supplier?: string;
  purchaseDate: string;     // yyyy-mm-dd
  rate: number;             // per unit
  totalCost: number;        // quantity × rate
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: FeedPaymentStatus;
  dueDate?: string;
  notes?: string;
}

// ─── In-app Notification ─────────────────────────────────────────────────────

export interface InAppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;        // ISO timestamp
  relatedId?: string;       // cowId / customerId / feedEntryId
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface DairyState {
  customers: Customer[];
  deliveries: DeliveryRecord[];
  extraDeliveries: ExtraDelivery[];
  payments: Payment[];
  bills: Bill[];
  cows: Cow[];
  inseminations: Insemination[];
  feedEntries: FeedEntry[];
  inAppNotifications: InAppNotification[];
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

  // Extra milk
  addExtraDelivery: (e: Omit<ExtraDelivery, 'id'>) => void;
  removeExtraDelivery: (id: string) => void;

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

  // Cows
  saveCow: (c: Cow) => void;
  deleteCow: (id: string) => void;
  saveInsemination: (ins: Insemination) => void;
  deleteInsemination: (id: string) => void;
  markCalvingDelivered: (inseminationId: string, actualDate: string) => void;
  markReminderSent: (inseminationId: string, interval: string) => void;

  // Feed
  saveFeedEntry: (e: FeedEntry) => void;
  deleteFeedEntry: (id: string) => void;
  recordFeedPayment: (feedEntryId: string, amount: number) => void;

  // In-app notifications
  addInAppNotification: (n: Omit<InAppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * ─── Dates are LOCAL calendar dates ──────────────────────────────────────────
 *
 * A dairy round is a local-day concept: the morning delivery on the 15th belongs
 * to the 15th wherever the phone is. Every `yyyy-mm-dd` string in this store is
 * therefore a *local* date.
 *
 * `toISODate` formats from local calendar fields and never round-trips through
 * UTC, so todayISO() and addDaysISO() always agree.
 */
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a `yyyy-mm-dd` string as local midnight. */
function fromISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export const todayISO = () => toISODate(new Date());
export const uid = () => Math.random().toString(36).slice(2, 10);

export function addDaysISO(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatMonthLabel(iso: string): string {
  return new Date(iso + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function monthStart(iso: string): string {
  return iso.slice(0, 7) + '-01';
}

export function monthEnd(iso: string): string {
  const d = fromISODate(`${iso.slice(0, 7)}-01`);
  d.setMonth(d.getMonth() + 1);
  // Day 0 of the next month is the last day of this one.
  d.setDate(0);
  return toISODate(d);
}

export function prevMonthISO(iso: string): string {
  const d = fromISODate(`${iso.slice(0, 7)}-01`);
  d.setMonth(d.getMonth() - 1);
  return toISODate(d);
}

export function nextMonthISO(iso: string): string {
  const d = fromISODate(`${iso.slice(0, 7)}-01`);
  d.setMonth(d.getMonth() + 1);
  return toISODate(d);
}

/**
 * Calculates expected calving date using the configured gestation period.
 * Uses local-calendar arithmetic to avoid UTC off-by-one issues.
 */
export function calcExpectedCalvingDate(inseminationDate: string, gestationDays: number): string {
  return addDaysISO(inseminationDate, gestationDays);
}

/**
 * Returns days remaining until the expected calving date.
 * Negative means it's overdue.
 */
export function daysUntilCalving(expectedDate: string): number {
  const today = fromISODate(todayISO());
  const target = fromISODate(expectedDate);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
  morningDeliveryTime: "08:00",
  eveningDeliveryTime: "19:00",
  gestationDays: 280,
  fontSize: 14, // default base font size
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

function seedCows(): Cow[] {
  const today = todayISO();
  return [
    {
      id: "cow1",
      name: "Lakshmi",
      breed: "Sahiwal",
      birthDate: addDaysISO(today, -1460),
      purchaseDate: addDaysISO(today, -730),
      status: "pregnant",
      notes: "High milk yielder",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cow2",
      name: "Ganga",
      breed: "Gir",
      birthDate: addDaysISO(today, -1825),
      purchaseDate: addDaysISO(today, -900),
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ];
}

function seedInseminations(): Insemination[] {
  const today = todayISO();
  return [
    {
      id: "ins1",
      cowId: "cow1",
      date: addDaysISO(today, -200),
      semenInfo: "HF Bull #A12",
      technician: "Dr. Ramesh",
      expectedCalvingDate: addDaysISO(today, 80),
      notes: "Second insemination",
      remindersSent: ["180d", "90d"],
    },
  ];
}

function seedFeedEntries(): FeedEntry[] {
  const today = todayISO();
  return [
    {
      id: "feed1",
      name: "Wheat Bhusa",
      category: "Roughage",
      quantity: 100,
      unit: "kg",
      supplier: "Sharma Agro",
      purchaseDate: addDaysISO(today, -5),
      rate: 12,
      totalCost: 1200,
      paidAmount: 800,
      remainingAmount: 400,
      paymentStatus: "partial",
      dueDate: addDaysISO(today, 25),
    },
    {
      id: "feed2",
      name: "Cattle Feed Pellets",
      category: "Concentrate",
      quantity: 50,
      unit: "kg",
      supplier: "ABC Feed Co.",
      purchaseDate: addDaysISO(today, -2),
      rate: 30,
      totalCost: 1500,
      paidAmount: 1500,
      remainingAmount: 0,
      paymentStatus: "paid",
    },
  ];
}

const initialCustomers = seedCustomers();

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDairyStore = create<DairyState>()(
  persist(
    (set, get) => ({
      customers: initialCustomers,
      deliveries: seedDeliveries(initialCustomers),
      extraDeliveries: [],
      payments: seedPayments(),
      bills: [],
      cows: seedCows(),
      inseminations: seedInseminations(),
      feedEntries: seedFeedEntries(),
      inAppNotifications: [],
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
        extraDeliveries: state.extraDeliveries.filter((x) => x.customerId !== id),
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

      addExtraDelivery: (e) => set((state) => ({
        extraDeliveries: [...state.extraDeliveries, { ...e, id: uid() }],
      })),

      removeExtraDelivery: (id) => set((state) => ({
        extraDeliveries: state.extraDeliveries.filter((e) => e.id !== id),
      })),

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

        // Extra deliveries for this period
        const extraRecords = state.extraDeliveries.filter(
          (x) => x.customerId === customerId && x.date >= from && x.date <= to
        );
        const extraQty = extraRecords.reduce((s, x) => s + x.qty, 0);
        const extraAmount = extraRecords.reduce((s, x) => s + x.qty * x.rate, 0);

        const paidDuring = state.payments
          .filter((p) => p.customerId === customerId && p.date >= from && p.date <= to)
          .reduce((s, p) => s + p.amount, 0);

        // Opening balance = all billed before `from` minus all paid before `from` + customer opening
        const billedBefore = state.deliveries
          .filter((x) => x.customerId === customerId && x.status === "delivered" && x.date < from)
          .reduce((s, x) => s + x.qty * x.rate, 0);
        const extraBilledBefore = state.extraDeliveries
          .filter((x) => x.customerId === customerId && x.date < from)
          .reduce((s, x) => s + x.qty * x.rate, 0);
        const paidBefore = state.payments
          .filter((p) => p.customerId === customerId && p.date < from)
          .reduce((s, p) => s + p.amount, 0);
        const openingBalanceCarried = (c.openingBalance ?? 0) + billedBefore + extraBilledBefore - paidBefore;
        const finalDue = openingBalanceCarried + totalAmount + extraAmount + state.settings.deliveryCharge - paidDuring;

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
          extraQty,
          extraAmount,
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

      resetAll: () => {
        const customers = seedCustomers();
        set({
          customers,
          deliveries: seedDeliveries(customers),
          extraDeliveries: [],
          payments: seedPayments(),
          bills: [],
          cows: seedCows(),
          inseminations: seedInseminations(),
          feedEntries: seedFeedEntries(),
          inAppNotifications: [],
          settings: DEFAULT_SETTINGS,
          lastAutoDeliveryDate: null,
          lastBillingRunDate: null,
        });
      },

      // ── Cow actions ──────────────────────────────────────────────────────────

      saveCow: (c) => set((state) => ({
        cows: state.cows.some((x) => x.id === c.id)
          ? state.cows.map((x) => (x.id === c.id ? c : x))
          : [...state.cows, c],
      })),

      deleteCow: (id) => set((state) => ({
        cows: state.cows.filter((c) => c.id !== id),
        inseminations: state.inseminations.filter((i) => i.cowId !== id),
      })),

      saveInsemination: (ins) => set((state) => ({
        inseminations: state.inseminations.some((x) => x.id === ins.id)
          ? state.inseminations.map((x) => (x.id === ins.id ? ins : x))
          : [...state.inseminations, ins],
      })),

      deleteInsemination: (id) => set((state) => ({
        inseminations: state.inseminations.filter((i) => i.id !== id),
      })),

      markCalvingDelivered: (inseminationId, actualDate) => set((state) => ({
        inseminations: state.inseminations.map((i) =>
          i.id === inseminationId ? { ...i, actualCalvingDate: actualDate } : i
        ),
      })),

      markReminderSent: (inseminationId, interval) => set((state) => ({
        inseminations: state.inseminations.map((i) =>
          i.id === inseminationId
            ? { ...i, remindersSent: [...i.remindersSent, interval] }
            : i
        ),
      })),

      // ── Feed actions ─────────────────────────────────────────────────────────

      saveFeedEntry: (e) => set((state) => ({
        feedEntries: state.feedEntries.some((x) => x.id === e.id)
          ? state.feedEntries.map((x) => (x.id === e.id ? e : x))
          : [...state.feedEntries, e],
      })),

      deleteFeedEntry: (id) => set((state) => ({
        feedEntries: state.feedEntries.filter((e) => e.id !== id),
      })),

      recordFeedPayment: (feedEntryId, amount) => set((state) => ({
        feedEntries: state.feedEntries.map((e) => {
          if (e.id !== feedEntryId) return e;
          const newPaid = Math.min(e.totalCost, e.paidAmount + amount);
          const newRemaining = Math.max(0, e.totalCost - newPaid);
          const newStatus: FeedPaymentStatus =
            newRemaining === 0 ? "paid" : newPaid > 0 ? "partial" : "due";
          return { ...e, paidAmount: newPaid, remainingAmount: newRemaining, paymentStatus: newStatus };
        }),
      })),

      // ── In-app notification actions ───────────────────────────────────────────

      addInAppNotification: (n) => set((state) => ({
        inAppNotifications: [
          { ...n, id: uid(), read: false, createdAt: new Date().toISOString() },
          ...state.inAppNotifications,
        ].slice(0, 100), // keep last 100 notifications
      })),

      markNotificationRead: (id) => set((state) => ({
        inAppNotifications: state.inAppNotifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      })),

      markAllNotificationsRead: () => set((state) => ({
        inAppNotifications: state.inAppNotifications.map((n) => ({ ...n, read: true })),
      })),

      clearNotifications: () => set({ inAppNotifications: [] }),
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
  const regular = state.deliveries
    .filter((x) => x.date === date && x.status === "delivered")
    .reduce((s, x) => s + x.qty, 0);
  const extra = (state.extraDeliveries || [])
    .filter((x) => x.date === date)
    .reduce((s, x) => s + x.qty, 0);
  return regular + extra;
}

export function collectionOn(state: DairyState, date: string) {
  return state.payments.filter((p) => p.date === date).reduce((s, p) => s + p.amount, 0);
}

export function money0(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function customerBilled(state: DairyState, customerId: string, from?: string, to?: string) {
  const regular = state.deliveries
    .filter(
      (x) =>
        x.customerId === customerId &&
        x.status === "delivered" &&
        (!from || x.date >= from) &&
        (!to || x.date <= to),
    )
    .reduce((s, x) => s + x.qty * x.rate, 0);

  const extra = (state.extraDeliveries || [])
    .filter(
      (x) =>
        x.customerId === customerId &&
        (!from || x.date >= from) &&
        (!to || x.date <= to),
    )
    .reduce((s, x) => s + x.qty * x.rate, 0);

  return regular + extra;
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

export function cowStatusLabel(status: CowStatus): string {
  const map: Record<CowStatus, string> = {
    active: 'Active',
    dry: 'Dry',
    pregnant: 'Pregnant',
    sold: 'Sold',
    deceased: 'Deceased',
  };
  return map[status];
}

export function feedPaymentStatusLabel(status: FeedPaymentStatus): string {
  const map: Record<FeedPaymentStatus, string> = {
    paid: 'Paid',
    partial: 'Partial',
    due: 'Due',
  };
  return map[status];
}

/**
 * Returns all inseminations where calving is upcoming (actualCalvingDate not set),
 * sorted by nearest expected calving date.
 */
export function upcomingCalvings(state: DairyState): Array<{
  insemination: Insemination;
  cow: Cow;
  daysRemaining: number;
}> {
  const results: Array<{ insemination: Insemination; cow: Cow; daysRemaining: number }> = [];
  for (const ins of (state.inseminations || [])) {
    if (ins.actualCalvingDate) continue; // already delivered
    const cow = (state.cows || []).find((c) => c.id === ins.cowId);
    if (!cow) continue;
    const daysRemaining = daysUntilCalving(ins.expectedCalvingDate);
    results.push({ insemination: ins, cow, daysRemaining });
  }
  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/** Total outstanding feed payments. */
export function totalFeedOutstanding(state: DairyState): number {
  return (state.feedEntries || []).reduce((s, e) => s + e.remainingAmount, 0);
}

/** Unread in-app notification count. */
export function unreadNotificationCount(state: DairyState): number {
  return (state.inAppNotifications || []).filter((n) => !n.read).length;
}
