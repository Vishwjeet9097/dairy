import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import {
  currentMonth,
  customerBilled,
  customerMilk,
  customerPaid,
  formatDate,
  money,
  monthLabel,
  monthRange,
  shiftMonth,
  useDairy,
} from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { Avatar, ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/customers/$id/bill")({
  head: () => ({
    meta: [
      { title: "Monthly Bill — Vishal Dairy" },
      { name: "description", content: "Monthly milk bill with total milk, charges, discount, paid amount and outstanding." },
      { property: "og:title", content: "Monthly Bill — Vishal Dairy" },
      { property: "og:description", content: "Monthly milk bill with total milk, charges, paid amount and outstanding." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <BillPage />
    </ClientOnly>
  ),
});

function Row({ label, value, tone, subLabel }: { label: string; value: string; tone?: "danger" | "brand" | "bold"; subLabel?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <div className="flex gap-4">
        <span className={cn("text-sm text-foreground", tone === "bold" && "font-bold text-[15px]")}>{label}</span>
        {subLabel ? <span className="text-sm font-medium text-foreground">{subLabel}</span> : null}
      </div>
      <span className={`text-sm font-semibold ${tone === "danger" ? "text-danger" : tone === "brand" ? "text-brand" : tone === "bold" ? "font-bold text-[15px]" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function BillPage() {
  const { id } = Route.useParams();
  const { data } = useDairy();
  const { t } = useT();
  const [month, setMonth] = useState(currentMonth());
  const c = data.customers.find((x) => x.id === id);
  const { from, to } = monthRange(month);

  const milk = customerMilk(data, id, from, to);
  const milkAmount = customerBilled(data, id, from, to);
  const charges = data.settings.deliveryCharge;
  const discount = 50;
  const total = milkAmount + charges - discount;
  const paid = customerPaid(data, id, from, to);
  const previous = (c?.openingBalance ?? 0) + customerBilled(data, id, undefined, from) - customerPaid(data, id, undefined, from);
  const due = total - paid + previous;

  return (
    <PhoneShell>
      <TopBar title={t("monthlyBill")} />
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between px-2 py-1">
          <button aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className="p-1 text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-[15px] font-bold">{monthLabel(month)}</span>
            <ChevronDown className="h-4 w-4" />
          </div>
          <button
            onClick={() => window.print()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-danger/20 bg-danger-soft px-3 py-1.5 text-[10px] font-semibold text-danger"
          >
            <FileDown className="h-4 w-4" /> PDF
          </button>
        </div>

        <section className="rounded-2xl bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <Avatar name={c?.name ?? "?"} size={48} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{c?.name}</p>
              <p className="text-xs font-medium text-muted-foreground">{c?.phone}</p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> {formatDate(from)} - {formatDate(to)}
          </p>
          <div className="mt-5 space-y-1">
            <Row label={t("totalMilk")} subLabel={`${milk.toFixed(1)} L`} value={money(milkAmount)} />
            <Row label={t("deliveryCharges")} value={money(charges)} />
            <Row label={t("discount")} value={`- ${money(discount)}`} tone="brand" />
            
            <div className="my-2 h-[1px] w-full bg-border" />
            <Row label={t("totalAmount")} value={money(total)} tone="bold" />
            <div className="my-2 h-[1px] w-full bg-border" />
            
            <Row label={t("paidAmount")} value={money(paid)} />
            <Row label={t("previousBalance")} value={money(previous)} />
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-brand px-5 py-4 text-white shadow-sm">
          <span className="truncate text-[15px] font-semibold">{t("outstandingAmount")}</span>
          <span className="text-lg font-bold">{money(due)}</span>
        </div>
      </div>
    </PhoneShell>
  );
}
