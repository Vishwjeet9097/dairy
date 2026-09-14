import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  addDays,
  collectionOn,
  dailySeries,
  milkOn,
  money0,
  salesOn,
  totalOutstanding,
  useDairy,
} from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { ClientOnly, PhoneShell, Sparkline, TopBar } from "@/components/dairy/ui";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports Overview — Vishal Dairy" },
      { name: "description", content: "Sales, collection, outstanding and milk delivery trends for your dairy business." },
      { property: "og:title", content: "Reports Overview — Vishal Dairy" },
      { property: "og:description", content: "Sales, collection, outstanding and milk delivery trends for your dairy." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <ReportsPage />
    </ClientOnly>
  ),
});

function ReportCard({
  label,
  value,
  change,
  points,
  color,
}: {
  label: string;
  value: string;
  change: string;
  points: number[];
  color: string;
}) {
  const positive = !change.startsWith("-");
  return (
    <div className="rounded-2xl bg-card p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
      <p className={`text-[10px] font-bold ${positive ? "text-brand" : "text-danger"}`}>{change}</p>
      <Sparkline points={points} color={color} />
    </div>
  );
}

function ReportsPage() {
  const { data } = useDairy();
  const { t } = useT();
  const [days, setDays] = useState(30);

  const sales = dailySeries(data, days, (d) => salesOn(data, d));
  const collection = dailySeries(data, days, (d) => collectionOn(data, d));
  const milk = dailySeries(data, days, (d) => milkOn(data, d));
  const outstandingSeries = sales.map((_, i) =>
    Math.max(totalOutstanding(data) - sales.slice(i).reduce((s, v) => s + v, 0) / 4, 0),
  );

  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const pct = (a: number[]) => {
    const half = Math.floor(a.length / 2);
    const first = sum(a.slice(0, half)) || 1;
    const second = sum(a.slice(half));
    return `${second >= first ? "+" : ""}${Math.round(((second - first) / first) * 100)}%`;
  };

  return (
    <PhoneShell>
      <TopBar title={t("reportsOverview")} back={false} variant="card" />
      <div className="p-4">
        <div className="mb-3 flex justify-end">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium outline-none shadow-sm"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>This Month</option>
          </select>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          {addDays(new Date().toISOString().slice(0, 10), -(days - 1))} → today
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ReportCard label={t("totalSales")} value={money0(sum(sales))} change={pct(sales)} points={sales} color="#4CAF50" />
          <ReportCard label={t("totalCollection")} value={money0(sum(collection))} change={pct(collection)} points={collection} color="#2196F3" />
          <ReportCard label={t("outstanding")} value={money0(totalOutstanding(data))} change="-5%" points={outstandingSeries} color="#FF9800" />
          <ReportCard label={t("totalMilkDelivered")} value={`${sum(milk).toFixed(1)} L`} change={pct(milk)} points={milk} color="#9C27B0" />
        </div>
      </div>
    </PhoneShell>
  );
}
