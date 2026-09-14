import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Search, Unlock, Calendar, Settings } from "lucide-react";
import {
  addDays,
  formatDate,
  money,
  statusFor,
  todayISO,
  useDairy,
  useDairyActions,
  type DeliveryStatus,
  type Slot,
} from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { Avatar, ClientOnly, PhoneShell, StatusChip, TopBar } from "@/components/dairy/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Today's Delivery — Vishal Dairy" },
      { name: "description", content: "Mark morning and evening milk deliveries as delivered, pending or not delivered." },
      { property: "og:title", content: "Today's Delivery — Vishal Dairy" },
      { property: "og:description", content: "Mark morning and evening milk deliveries for every customer." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <DeliveryPage />
    </ClientOnly>
  ),
});

const nextStatus: Record<DeliveryStatus, DeliveryStatus> = {
  pending: "delivered",
  delivered: "not_delivered",
  not_delivered: "pending",
};

function DeliveryPage() {
  const { data } = useDairy();
  const { setStatus, markAll } = useDairyActions();
  const { t } = useT();
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState<Slot>("morning");
  const [q, setQ] = useState("");

  const list = data.customers
    .filter((c) => !c.paused && (slot === "morning" ? c.morningQty : c.eveningQty) > 0)
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PhoneShell>
      <TopBar title={t("todaysDelivery")} right={<Settings className="h-5 w-5" />} />
      <div className="space-y-4 p-4 pb-28">
        <div className="flex items-center justify-between">
          <button aria-label="Previous day" className="p-2 text-muted-foreground opacity-0 pointer-events-none">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <button aria-label="Previous day" onClick={() => setDate(addDays(date, -1))} className="p-1 text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="truncate text-center text-[15px] font-bold">{formatDate(date)}</span>
            <button aria-label="Next day" onClick={() => setDate(addDays(date, 1))} className="p-1 text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button className="p-2 text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </button>
        </div>

        <div className="flex rounded-full bg-surface p-1 shadow-inner border border-border/50">
          {(["morning", "evening"] as Slot[]).map((s) => (
            <button
              key={s}
              onClick={() => setSlot(s)}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-semibold transition-all capitalize",
                slot === s ? "bg-brand text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(s)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-surface px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchCustomer")}
            className="min-w-0 bg-transparent text-[13px] outline-none"
          />
        </div>

        <ul className="space-y-2">
          {list.map((c) => {
            const qty = slot === "morning" ? c.morningQty : c.eveningQty;
            const status = statusFor(data, c.id, date, slot);
            return (
              <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl bg-card p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <Avatar name={c.name} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground leading-tight">{c.name}</p>
                  <p className="mt-1 text-xs font-medium text-foreground">
                    {qty.toFixed(1)} L <span className="ml-2 text-muted-foreground">{money(qty * c.rate)}</span>
                  </p>
                </div>
                <button onClick={() => setStatus(c.id, date, slot, nextStatus[status], qty, c.rate)}>
                  <StatusChip status={status} />
                </button>
                <button
                  onClick={() => setStatus(c.id, date, slot, nextStatus[status], qty, c.rate)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg shadow-sm transition-colors",
                    status === "not_delivered" ? "bg-danger text-white" : "bg-brand text-white",
                  )}
                >
                  {status === "not_delivered" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
          {list.length === 0 ? (
            <li className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground">{t("noCustomers")}</li>
          ) : null}
        </ul>
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 bg-card p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] border-t border-border">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => markAll(date, slot, "delivered", data.customers)}
            className="rounded-xl bg-brand py-3.5 text-[13px] font-semibold text-white shadow-sm"
          >
            {t("markAllDelivered")}
          </button>
          <button
            onClick={() => markAll(date, slot, "not_delivered", data.customers)}
            className="rounded-xl bg-danger py-3.5 text-[13px] font-semibold text-white shadow-sm"
          >
            {t("markAllNotDelivered")}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
