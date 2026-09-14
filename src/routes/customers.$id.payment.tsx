import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { todayISO, useDairy, useDairyActions, type PaymentMethod } from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { Avatar, ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";

export const Route = createFileRoute("/customers/$id/payment")({
  head: () => ({
    meta: [
      { title: "Add Payment — Vishal Dairy" },
      { name: "description", content: "Record a cash, UPI or bank payment received from a milk delivery customer." },
      { property: "og:title", content: "Add Payment — Vishal Dairy" },
      { property: "og:description", content: "Record a cash, UPI or bank payment from a milk delivery customer." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <AddPaymentPage />
    </ClientOnly>
  ),
});

function AddPaymentPage() {
  const { id } = Route.useParams();
  const { data } = useDairy();
  const { addPayment } = useDairyActions();
  const { t } = useT();
  const navigate = useNavigate();
  const c = data.customers.find((x) => x.id === id);

  const [amount, setAmount] = useState("1000");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  return (
    <PhoneShell>
      <TopBar title={t("addPayment")} variant="card" />
      <form
        className="space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(amount);
          if (!value) return;
          addPayment({ customerId: id, date, amount: value, method, notes: notes || "" });
          navigate({ to: "/customers/$id", params: { id } });
        }}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <Avatar name={c?.name ?? "?"} size={48} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{c?.name}</p>
            <p className="text-xs text-muted-foreground">{c?.phone}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3.5">
            <span className="text-sm font-medium text-muted-foreground">{t("amount")}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 bg-transparent text-right text-sm font-bold text-foreground outline-none"
            />
          </label>
          <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3.5">
            <span className="text-sm font-medium text-muted-foreground">{t("paymentMethod")}</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="bg-transparent text-right text-sm font-bold text-foreground outline-none"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
            <span className="text-sm font-medium text-muted-foreground">{t("date")}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-right text-sm font-bold text-foreground outline-none"
            />
          </label>
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <span className="text-sm font-medium text-muted-foreground">{t("notes")}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("enterNotes")}
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-brand"
          />
        </div>

        <button type="submit" className="w-full rounded-xl bg-brand py-3.5 text-[15px] font-semibold text-white shadow-sm">
          {t("savePayment")}
        </button>
      </form>
    </PhoneShell>
  );
}
