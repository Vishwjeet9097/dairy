import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { formatDate, money, useDairy } from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";

export const Route = createFileRoute("/customers/$id/payments")({
  head: () => ({
    meta: [
      { title: "Payment History — Vishal Dairy" },
      { name: "description", content: "All payments received from this milk delivery customer." },
      { property: "og:title", content: "Payment History — Vishal Dairy" },
      { property: "og:description", content: "All payments received from this milk delivery customer." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <PaymentsPage />
    </ClientOnly>
  ),
});

function PaymentsPage() {
  const { id } = Route.useParams();
  const { data } = useDairy();
  const { t } = useT();
  const list = data.payments.filter((p) => p.customerId === id).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <PhoneShell>
      <TopBar
        title={t("paymentHistory")}
        right={
          <Link to="/customers/$id/payment" params={{ id }} aria-label={t("addPayment")}>
            <Plus className="h-5 w-5" />
          </Link>
        }
      />
      <ul className="space-y-2 p-4">
        {list.map((p) => (
          <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-sm font-medium">{formatDate(p.date)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.method.toUpperCase()}
                {p.notes ? ` · ${p.notes}` : ""}
              </p>
            </div>
            <span className="text-sm font-semibold text-brand-dark">{money(p.amount)}</span>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground">—</li>
        ) : null}
      </ul>
    </PhoneShell>
  );
}
