import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { uid, useDairy, useDairyActions, type Customer } from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { PhoneShell, TopBar } from "@/components/dairy/ui";

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

export function CustomerForm({ customerId }: { customerId?: string }) {
  const { data } = useDairy();
  const { saveCustomer } = useDairyActions();
  const { t } = useT();
  const navigate = useNavigate();
  const existing = data.customers.find((c) => c.id === customerId);

  const [form, setForm] = useState<Customer>(
    existing ?? {
      id: uid(),
      name: "",
      phone: "",
      address: "",
      morningQty: 1,
      eveningQty: 1,
      rate: data.settings.defaultRate,
      paused: false,
      openingBalance: 0,
    },
  );

  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <PhoneShell>
      <TopBar title={existing ? t("editCustomer") : t("newCustomer")} />
      <form
        className="space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          saveCustomer(form);
          navigate({ to: "/customers" });
        }}
      >
        <Field label={t("name")} value={form.name} onChange={(v) => set("name", v)} />
        <Field label={t("phone")} value={form.phone} onChange={(v) => set("phone", v)} />
        <Field label={t("address")} value={form.address} onChange={(v) => set("address", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("morningQty")} type="number" value={String(form.morningQty)} onChange={(v) => set("morningQty", Number(v) || 0)} />
          <Field label={t("eveningQty")} type="number" value={String(form.eveningQty)} onChange={(v) => set("eveningQty", Number(v) || 0)} />
        </div>
        <Field label={t("rate")} type="number" value={String(form.rate)} onChange={(v) => set("rate", Number(v) || 0)} />
        <button type="submit" className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-primary-foreground">
          {t("save")}
        </button>
      </form>
    </PhoneShell>
  );
}
