import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FileText, MoreVertical, Pause, Phone, MapPin, Play, ShoppingBag, Wallet } from "lucide-react";
import {
  currentMonth,
  customerBilled,
  money0,
  monthRange,
  outstanding,
  useDairy,
  useDairyActions,
} from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { ActionRow, Avatar, ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";

export const Route = createFileRoute("/customers/$id/")({
  head: () => ({
    meta: [
      { title: "Customer Details — Vishal Dairy" },
      { name: "description", content: "Customer profile with daily quantity, monthly total, outstanding balance and ledger." },
      { property: "og:title", content: "Customer Details — Vishal Dairy" },
      { property: "og:description", content: "Customer profile with daily quantity, monthly total and outstanding balance." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <CustomerDetail />
    </ClientOnly>
  ),
});

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card py-3 px-1 text-center shadow-sm">
      <p className="text-[13px] font-bold text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function CustomerDetail() {
  const { id } = Route.useParams();
  const { data } = useDairy();
  const { togglePause } = useDairyActions();
  const { t } = useT();
  const c = data.customers.find((x) => x.id === id);
  if (!c) {
    return (
      <PhoneShell>
        <TopBar title={t("customerDetails")} />
        <p className="p-6 text-center text-sm text-muted-foreground">Customer not found.</p>
      </PhoneShell>
    );
  }
  const { from, to } = monthRange(currentMonth());

  return (
    <PhoneShell>
      <TopBar
        title={t("customerDetails")}
        right={
          <Link to="/customers/$id/edit" params={{ id }} aria-label={t("editCustomer")}>
            <MoreVertical className="h-5 w-5" />
          </Link>
        }
      />
      <div className="space-y-4 p-4">
        <section className="rounded-2xl bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col items-center justify-center pb-2">
            <Avatar name={c.name} size={64} />
            <h2 className="mt-3 text-lg font-bold text-foreground">{c.name}</h2>
            <div className="mt-1.5 flex flex-col items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {c.phone}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {c.address}</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            <Tile value={`${c.morningQty} L`} label={t("morning")} />
            <Tile value={`${c.eveningQty} L`} label={t("evening")} />
            <Tile value={money0(customerBilled(data, id, from, to))} label={t("thisMonth")} />
            <Tile value={money0(outstanding(data, id))} label={t("outstanding")} />
          </div>
        </section>

        <section className="rounded-2xl bg-card px-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <ActionRow icon={ShoppingBag} tone="brand" label={t("todaysDelivery")} to="/delivery" trailing="View >" />
          <ActionRow icon={BookOpen} tone="info" label={t("ledger")} to="/customers/$id/ledger" params={{ id }} trailing="View >" />
          <ActionRow icon={Wallet} tone="warning" label={t("paymentHistory")} to="/customers/$id/payments" params={{ id }} trailing="View >" />
          <ActionRow icon={FileText} tone="info" label={t("generateBill")} to="/customers/$id/bill" params={{ id }} trailing="View >" />
          <ActionRow
            icon={c.paused ? Play : Pause}
            tone="danger"
            label={c.paused ? t("resumeDelivery") : t("pauseDelivery")}
            onClick={() => togglePause(id)}
            trailing="View >"
          />
        </section>

        <Link
          to="/customers/$id/payment"
          params={{ id }}
          className="block rounded-xl bg-brand py-3 text-center text-sm font-medium text-primary-foreground"
        >
          {t("addPayment")}
        </Link>
      </div>
    </PhoneShell>
  );
}
