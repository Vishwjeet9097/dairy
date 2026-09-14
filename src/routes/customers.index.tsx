import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { money0, outstanding, useDairy } from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { Avatar, ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — Vishal Dairy" },
      { name: "description", content: "All milk delivery customers with daily quantity and outstanding balance." },
      { property: "og:title", content: "Customers — Vishal Dairy" },
      { property: "og:description", content: "All milk delivery customers with daily quantity and outstanding balance." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <CustomersPage />
    </ClientOnly>
  ),
});

function CustomersPage() {
  const { data } = useDairy();
  const { t } = useT();
  const [q, setQ] = useState("");
  const list = data.customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PhoneShell>
      <TopBar
        title={t("customers")}
        back={false}
        right={
          <Link to="/customers/new" aria-label={t("addCustomer")}>
            <Plus className="h-5 w-5" />
          </Link>
        }
      />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchCustomer")}
            className="min-w-0 bg-transparent py-1 text-sm outline-none"
          />
        </div>
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                to="/customers/$id"
                params={{ id: c.id }}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-card p-3 shadow-sm"
              >
                <Avatar name={c.name} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.name}
                    {c.paused ? <span className="ml-2 text-[10px] text-warning">{t("paused")}</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.morningQty} L / {c.eveningQty} L · {c.phone}
                  </p>
                </div>
                <span className="text-sm font-semibold text-danger">{money0(outstanding(data, c.id))}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {list.length === 0 ? (
            <li className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground">{t("noCustomers")}</li>
          ) : null}
        </ul>
      </div>
    </PhoneShell>
  );
}
