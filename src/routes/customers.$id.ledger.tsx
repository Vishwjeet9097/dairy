import { createFileRoute } from "@tanstack/react-router";
import { formatDay, ledgerRows, money, useDairy } from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { Avatar, ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customers/$id/ledger")({
  head: () => ({
    meta: [
      { title: "Customer Ledger — Vishal Dairy" },
      { name: "description", content: "Day-wise debit, credit and running balance for a milk delivery customer." },
      { property: "og:title", content: "Customer Ledger — Vishal Dairy" },
      { property: "og:description", content: "Day-wise debit, credit and running balance for a milk delivery customer." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <LedgerPage />
    </ClientOnly>
  ),
});

function LedgerPage() {
  const { id } = Route.useParams();
  const { data } = useDairy();
  const { t } = useT();
  const c = data.customers.find((x) => x.id === id);
  const rows = ledgerRows(data, id).slice(-40).reverse();

  return (
    <PhoneShell>
      <TopBar title={t("customerLedger")} variant="card" />
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <Avatar name={c?.name ?? "?"} size={40} />
          <p className="truncate text-sm font-medium">{c?.name}</p>
        </div>
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-brand-soft text-brand-dark">
                <th className="px-2 py-2 text-left font-medium">{t("date")}</th>
                <th className="px-2 py-2 text-left font-medium">{t("particulars")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("debit")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("credit")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("balance")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="whitespace-nowrap px-2 py-2 text-brand-dark">{formatDay(r.date)}</td>
                  <td className="px-2 py-2">{r.particulars}</td>
                  <td className="px-2 py-2 text-right">{r.debit ? money(r.debit) : "-"}</td>
                  <td className="px-2 py-2 text-right">{r.credit ? money(r.credit) : "-"}</td>
                  <td className={cn("whitespace-nowrap px-2 py-2 text-right font-medium", r.balance > 0 ? "text-danger" : "text-brand-dark")}>
                    {money(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-border bg-card">
            <button className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft">
              View All
            </button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
