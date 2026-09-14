import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, Globe, RotateCcw, Settings, Users } from "lucide-react";
import { useDairy, useDairyActions } from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { ActionRow, ClientOnly, PhoneShell, TopBar } from "@/components/dairy/ui";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More & Settings — Vishal Dairy" },
      { name: "description", content: "Dairy settings, default milk rate, language and data export for your delivery business." },
      { property: "og:title", content: "More & Settings — Vishal Dairy" },
      { property: "og:description", content: "Dairy settings, default milk rate, language and data export." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <MorePage />
    </ClientOnly>
  ),
});

function MorePage() {
  const { data } = useDairy();
  const { setLang, saveSettings, resetAll } = useDairyActions();
  const { t, lang } = useT();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "milk-delivery-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PhoneShell>
      <TopBar title={t("more")} back={false} />
      <div className="space-y-4 p-4">
        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">{t("settings")}</h2>
          <label className="block">
            <span className="text-xs text-muted-foreground">Dairy Name</span>
            <input
              value={data.settings.dairyName}
              onChange={(e) => saveSettings({ ...data.settings, dairyName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("rate")}</span>
              <input
                type="number"
                value={data.settings.defaultRate}
                onChange={(e) => saveSettings({ ...data.settings, defaultRate: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("deliveryCharges")}</span>
              <input
                type="number"
                value={data.settings.deliveryCharge}
                onChange={(e) => saveSettings({ ...data.settings, deliveryCharge: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl bg-card px-4 shadow-sm">
          <ActionRow icon={Users} tone="brand" label={t("customers")} to="/customers" />
          <ActionRow icon={BarChart3} tone="info" label={t("reportsOverview")} to="/reports" />
          <ActionRow
            icon={Globe}
            tone="warning"
            label={`${t("language")} · ${lang === "en" ? "English" : "हिंदी"}`}
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
          />
          <ActionRow icon={Download} tone="info" label={t("exportData")} onClick={exportData} />
          <ActionRow icon={RotateCcw} tone="danger" label={t("resetData")} onClick={resetAll} />
          <ActionRow icon={Settings} tone="brand" label="v1.0.0" onClick={() => undefined} />
        </section>
      </div>
    </PhoneShell>
  );
}
