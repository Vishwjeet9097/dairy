import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Wallet } from "lucide-react";
import { money0, outstanding, useDairy } from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { Avatar, ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Vishal Dairy" },
      { name: "description", content: "Generate monthly milk bills and record payments for every customer." },
      { property: "og:title", content: "Billing — Vishal Dairy" },
      { property: "og:description", content: "Generate monthly milk bills and record payments for every customer." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <BillingPage />
    </ClientOnly>
  ),
});

function BillingPage() {
  const { data } = useDairy();
  const { t } = useT();

  return (
    <PhoneShell>
      <TopBar title={t("billing")} back={false} />
      <ul className="space-y-2 p-4">
        {data.customers.map((c) => (
          <li key={c.id} className="rounded-xl bg-card p-3 shadow-sm">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <Avatar name={c.name} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("outstanding")}: {money0(outstanding(data, c.id))}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/customers/$id/bill"
                params={{ id: c.id }}
                className="flex items-center justify-center gap-1 rounded-lg bg-brand py-2 text-xs font-medium text-primary-foreground"
              >
                <FileText className="h-3.5 w-3.5" /> {t("generateBill")}
              </Link>
              <Link
                to="/customers/$id/payment"
                params={{ id: c.id }}
                className="flex items-center justify-center gap-1 rounded-lg border border-brand py-2 text-xs font-medium text-brand-dark"
              >
                <Wallet className="h-3.5 w-3.5" /> {t("addPayment")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </PhoneShell>
  );
}
