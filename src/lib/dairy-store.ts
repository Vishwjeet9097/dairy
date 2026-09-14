import { useCallback, useSyncExternalStore } from "react";

export type Slot = "morning" | "evening";
export type DeliveryStatus = "delivered" | "pending" | "not_delivered";
export type PaymentMethod = "cash" | "upi" | "bank";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  morningQty: number;
  eveningQty: number;
  rate: number;
  paused: boolean;
  openingBalance: number;
}

export interface DeliveryRecord {
  id: string;
  customerId: string;
  date: string; // yyyy-mm-dd
  slot: Slot;
  qty: number;
  rate: number;
  status: DeliveryStatus;
}

export interface Payment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  notes?: string | undefined;
}

export interface Settings {
  dairyName: string;
  ownerName: string;
  defaultRate: number;
  deliveryCharge: number;
}

export type Lang = "en" | "hi";

interface DairyData {
  customers: Customer[];
  deliveries: DeliveryRecord[];
  payments: Payment[];
  settings: Settings;
  lang: Lang | null;
}

const KEYS = {
  customers: "md_customers",
  deliveries: "md_deliveries",
  payments: "md_payments",
  settings: "md_settings",
  lang: "md_lang",
} as const;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function money(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money0(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_SETTINGS: Settings = {
  dairyName: "Vishal Dairy",
  ownerName: "Vishal",
  defaultRate: 60,
  deliveryCharge: 100,
};

function seedCustomers(): Customer[] {
  return [
    { id: "c1", name: "Rohan Sharma", phone: "9876543210", address: "Sector 10, Rohini, Delhi", morningQty: 1.5, eveningQty: 1, rate: 60, paused: false, openingBalance: 500 },
    { id: "c2", name: "Suresh Kumar", phone: "9812345678", address: "Sector 7, Rohini, Delhi", morningQty: 1, eveningQty: 1, rate: 60, paused: false, openingBalance: 0 },
    { id: "c3", name: "Anil Verma", phone: "9898989898", address: "Pitampura, Delhi", morningQty: 2, eveningQty: 1, rate: 60, paused: false, openingBalance: 250 },
    { id: "c4", name: "Rahul Singh", phone: "9765432109", address: "Shalimar Bagh, Delhi", morningQty: 1, eveningQty: 0.5, rate: 60, paused: false, openingBalance: 0 },
    { id: "c5", name: "Meena Gupta", phone: "9654321098", address: "Ashok Vihar, Delhi", morningQty: 1, eveningQty: 1, rate: 60, paused: true, openingBalance: 120 },
  ];
}

function seedDeliveries(customers: Customer[]): DeliveryRecord[] {
  const out: DeliveryRecord[] = [];
  const today = todayISO();
  for (let i = 20; i >= 0; i--) {
    const date = addDays(today, -i);
    for (const c of customers) {
      if (c.paused) continue;
      for (const slot of ["morning", "evening"] as Slot[]) {
        const qty = slot === "morning" ? c.morningQty : c.eveningQty;
        if (!qty) continue;
        let status: DeliveryStatus = "delivered";
        if (i === 0) status = slot === "morning" ? (c.id === "c2" ? "pending" : c.id === "c3" ? "not_delivered" : "delivered") : "pending";
        else if ((i + Number(c.id.slice(1))) % 9 === 0) status = "not_delivered";
        out.push({ id: uid(), customerId: c.id, date, slot, qty, rate: c.rate, status });
      }
    }
  }
  return out;
}

function seedPayments(): Payment[] {
  const today = todayISO();
  return [
    { id: uid(), customerId: "c1", date: addDays(today, -14), amount: 500, method: "cash", notes: "Part payment" },
    { id: uid(), customerId: "c1", date: addDays(today, -4), amount: 1500, method: "upi" },
    { id: uid(), customerId: "c2", date: addDays(today, -10), amount: 1200, method: "cash" },
    { id: uid(), customerId: "c3", date: addDays(today, -6), amount: 2000, method: "bank", notes: "NEFT" },
    { id: uid(), customerId: "c4", date: addDays(today, -8), amount: 800, method: "upi" },
  ];
}

let cache: DairyData | null = null;
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function load(): DairyData {
  if (typeof window === "undefined") {
    return { customers: [], deliveries: [], payments: [], settings: DEFAULT_SETTINGS, lang: null };
  }
  if (cache) return cache;
  if (!localStorage.getItem(KEYS.customers)) {
    const customers = seedCustomers();
    localStorage.setItem(KEYS.customers, JSON.stringify(customers));
    localStorage.setItem(KEYS.deliveries, JSON.stringify(seedDeliveries(customers)));
    localStorage.setItem(KEYS.payments, JSON.stringify(seedPayments()));
    localStorage.setItem(KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
  }
  cache = {
    customers: read<Customer[]>(KEYS.customers, []),
    deliveries: read<DeliveryRecord[]>(KEYS.deliveries, []),
    payments: read<Payment[]>(KEYS.payments, []),
    settings: read<Settings>(KEYS.settings, DEFAULT_SETTINGS),
    lang: read<Lang | null>(KEYS.lang, null),
  };
  return cache;
}

function persist(data: DairyData) {
  cache = data;
  localStorage.setItem(KEYS.customers, JSON.stringify(data.customers));
  localStorage.setItem(KEYS.deliveries, JSON.stringify(data.deliveries));
  localStorage.setItem(KEYS.payments, JSON.stringify(data.payments));
  localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
  localStorage.setItem(KEYS.lang, JSON.stringify(data.lang));
  listeners.forEach((l) => l());
}

const EMPTY: DairyData = { customers: [], deliveries: [], payments: [], settings: DEFAULT_SETTINGS, lang: null };

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDairy() {
  const data = useSyncExternalStore(subscribe, load, () => EMPTY);
  const update = useCallback((fn: (d: DairyData) => DairyData) => {
    persist(fn(load()));
  }, []);
  return { data, update };
}

export function useDairyActions() {
  const { update } = useDairy();
  return {
    setLang: (lang: Lang) => update((d) => ({ ...d, lang })),
    saveCustomer: (c: Customer) =>
      update((d) => ({
        ...d,
        customers: d.customers.some((x) => x.id === c.id)
          ? d.customers.map((x) => (x.id === c.id ? c : x))
          : [...d.customers, c],
      })),
    deleteCustomer: (id: string) =>
      update((d) => ({
        ...d,
        customers: d.customers.filter((c) => c.id !== id),
        deliveries: d.deliveries.filter((x) => x.customerId !== id),
        payments: d.payments.filter((x) => x.customerId !== id),
      })),
    togglePause: (id: string) =>
      update((d) => ({
        ...d,
        customers: d.customers.map((c) => (c.id === id ? { ...c, paused: !c.paused } : c)),
      })),
    setStatus: (customerId: string, date: string, slot: Slot, status: DeliveryStatus, qty: number, rate: number) =>
      update((d) => {
        const existing = d.deliveries.find(
          (x) => x.customerId === customerId && x.date === date && x.slot === slot,
        );
        if (existing) {
          return {
            ...d,
            deliveries: d.deliveries.map((x) => (x.id === existing.id ? { ...x, status } : x)),
          };
        }
        return {
          ...d,
          deliveries: [...d.deliveries, { id: uid(), customerId, date, slot, qty, rate, status }],
        };
      }),
    markAll: (date: string, slot: Slot, status: DeliveryStatus, customers: Customer[]) =>
      update((d) => {
        let deliveries = [...d.deliveries];
        for (const c of customers) {
          const qty = slot === "morning" ? c.morningQty : c.eveningQty;
          if (!qty || c.paused) continue;
          const idx = deliveries.findIndex(
            (x) => x.customerId === c.id && x.date === date && x.slot === slot,
          );
          if (idx >= 0) deliveries[idx] = { ...deliveries[idx]!, status };
          else deliveries.push({ id: uid(), customerId: c.id, date, slot, qty, rate: c.rate, status });
        }
        return { ...d, deliveries };
      }),
    addPayment: (p: Omit<Payment, "id">) =>
      update((d) => ({ ...d, payments: [...d.payments, { ...p, id: uid() }] })),
    saveSettings: (s: Settings) => update((d) => ({ ...d, settings: s })),
    resetAll: () => {
      const customers = seedCustomers();
      persist({
        customers,
        deliveries: seedDeliveries(customers),
        payments: seedPayments(),
        settings: DEFAULT_SETTINGS,
        lang: load().lang,
      });
    },
  };
}

/* ---------- derived helpers ---------- */

export function deliveriesOn(d: DairyData, date: string, slot?: Slot) {
  return d.deliveries.filter((x) => x.date === date && (!slot || x.slot === slot));
}

export function statusFor(
  d: DairyData,
  customerId: string,
  date: string,
  slot: Slot,
): DeliveryStatus {
  return (
    d.deliveries.find((x) => x.customerId === customerId && x.date === date && x.slot === slot)
      ?.status ?? "pending"
  );
}

export function customerBilled(d: DairyData, customerId: string, from?: string, to?: string) {
  return d.deliveries
    .filter(
      (x) =>
        x.customerId === customerId &&
        x.status === "delivered" &&
        (!from || x.date >= from) &&
        (!to || x.date <= to),
    )
    .reduce((s, x) => s + x.qty * x.rate, 0);
}

export function customerMilk(d: DairyData, customerId: string, from?: string, to?: string) {
  return d.deliveries
    .filter(
      (x) =>
        x.customerId === customerId &&
        x.status === "delivered" &&
        (!from || x.date >= from) &&
        (!to || x.date <= to),
    )
    .reduce((s, x) => s + x.qty, 0);
}

export function customerPaid(d: DairyData, customerId: string, from?: string, to?: string) {
  return d.payments
    .filter((p) => p.customerId === customerId && (!from || p.date >= from) && (!to || p.date <= to))
    .reduce((s, p) => s + p.amount, 0);
}

export function outstanding(d: DairyData, customerId: string) {
  const c = d.customers.find((x) => x.id === customerId);
  return (c?.openingBalance ?? 0) + customerBilled(d, customerId) - customerPaid(d, customerId);
}

export function totalOutstanding(d: DairyData) {
  return d.customers.reduce((s, c) => s + outstanding(d, c.id), 0);
}

export interface LedgerRow {
  date: string;
  particulars: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export function ledgerRows(d: DairyData, customerId: string): LedgerRow[] {
  const c = d.customers.find((x) => x.id === customerId);
  const entries: { date: string; particulars: string; debit?: number; credit?: number; order: number }[] = [];
  if (c?.openingBalance) {
    entries.push({ date: d.deliveries[0]?.date ?? todayISO(), particulars: "Opening Balance", debit: c.openingBalance, order: 0 });
  }
  for (const x of d.deliveries) {
    if (x.customerId !== customerId || x.status !== "delivered") continue;
    entries.push({
      date: x.date,
      particulars: `${x.slot === "morning" ? "Morning" : "Evening"} Milk (${x.qty} L)`,
      debit: x.qty * x.rate,
      order: x.slot === "morning" ? 1 : 2,
    });
  }
  for (const p of d.payments) {
    if (p.customerId !== customerId) continue;
    entries.push({ date: p.date, particulars: `Payment (${p.method.toUpperCase()})`, credit: p.amount, order: 3 });
  }
  entries.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
  let balance = 0;
  return entries.map((e) => {
    balance += (e.debit ?? 0) - (e.credit ?? 0);
    return {
      date: e.date,
      particulars: e.particulars,
      debit: e.debit ?? null,
      credit: e.credit ?? null,
      balance,
    };
  });
}

export function monthRange(monthISO: string) {
  const [ys, ms] = monthISO.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const from = `${monthISO}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${monthISO}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function monthLabel(monthISO: string) {
  const [ys, ms] = monthISO.split("-");
  return new Date(Number(ys), Number(ms) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function shiftMonth(monthISO: string, delta: number) {
  const [ys, ms] = monthISO.split("-");
  const d = new Date(Number(ys), Number(ms) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonth() {
  return todayISO().slice(0, 7);
}

export function dailySeries(
  d: DairyData,
  days: number,
  pick: (date: string) => number,
): number[] {
  const today = todayISO();
  return Array.from({ length: days }, (_, i) => pick(addDays(today, -(days - 1 - i))));
}

export function salesOn(d: DairyData, date: string) {
  return d.deliveries
    .filter((x) => x.date === date && x.status === "delivered")
    .reduce((s, x) => s + x.qty * x.rate, 0);
}

export function collectionOn(d: DairyData, date: string) {
  return d.payments.filter((p) => p.date === date).reduce((s, p) => s + p.amount, 0);
}

export function milkOn(d: DairyData, date: string) {
  return d.deliveries
    .filter((x) => x.date === date && x.status === "delivered")
    .reduce((s, x) => s + x.qty, 0);
}
