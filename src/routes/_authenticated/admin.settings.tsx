import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Bell, Truck, CreditCard, Languages, FileSignature } from "lucide-react";
import { loadAdminSettings, saveAdminSettings, type AdminSettings } from "@/lib/admin-settings";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/contracts.functions";
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => {
    const lang = typeof window !== "undefined" ? window.localStorage.getItem("cheaper-language") : null;
    const title = lang === "en" ? "Settings — Admin" : lang === "ru" ? "Настройки — Админ" : "პარამეტრები — ადმინი";
    return { meta: [{ title }] };
  },
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { t } = useI18n();
  const [s, setS] = useState<AdminSettings>(() => loadAdminSettings());
  const [saved, setSaved] = useState(false);

  function save() {
    saveAdminSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("admin.settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.settings.subtitle")}</p>
      </div>

      <Section icon={Bell} title={t("admin.settings.notifications")}>
        <label className="block text-sm">
          <span className="text-muted-foreground text-xs">{t("admin.settings.nearbyRadius")}</span>
          <input type="number" min={0.5} max={10} step={0.5} value={s.notificationsRadiusKm}
            onChange={(e) => setS({ ...s, notificationsRadiusKm: Number(e.target.value) })}
            className="mt-1 w-full px-4 py-2.5 rounded-2xl bg-muted/50 border border-border font-mono" />
        </label>
      </Section>

      <Section icon={Truck} title={t("admin.settings.deliveryService")}>
        <label className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 cursor-pointer">
          <span className="text-sm font-medium">{t("admin.settings.deliveryEnabled")}</span>
          <Toggle checked={s.deliveryEnabled} onChange={(v) => setS({ ...s, deliveryEnabled: v })} />
        </label>
      </Section>

      <Section icon={CreditCard} title={t("admin.settings.paymentMethods")}>
        <div className="space-y-2">
          {([["bog", "BOG"], ["flitt", "Flitt"], ["card", t("admin.settings.card")], ["googlepay", "Google Pay"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 cursor-pointer">
              <span className="text-sm font-medium">{label}</span>
              <Toggle checked={s.paymentProviders[key]} onChange={(v) => setS({ ...s, paymentProviders: { ...s.paymentProviders, [key]: v } })} />
            </label>
          ))}
        </div>
      </Section>

      <Section icon={Languages} title={t("admin.settings.language")}>
        <div className="flex gap-2">
          {(["ka", "en"] as const).map((l) => (
            <button key={l} onClick={() => setS({ ...s, language: l })}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold ${s.language === l ? "bg-foreground text-background" : "bg-muted"}`}>
              {l === "ka" ? "ქართული" : "English"}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("admin.settings.platformRules")}>
        <textarea value={s.rules} onChange={(e) => setS({ ...s, rules: e.target.value })} rows={4}
          className="w-full px-4 py-3 rounded-2xl bg-muted/50 border border-border text-sm resize-none" />
      </Section>

      <ContractSettingsSection />

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg flex items-center gap-2 hover:opacity-90">
          <Save className="w-4 h-4" /> {saved ? t("admin.settings.saved") : t("admin.settings.save")}
        </button>
      </div>
    </div>
  );
}

/** Contract constants live in the database because the contract text quotes them. */
function ContractSettingsSection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const load = useServerFn(getPlatformSettings);
  const update = useServerFn(updatePlatformSettings);
  const { data } = useQuery({ queryKey: ["platform-settings"], queryFn: () => load() });
  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const value = draft ?? data ?? DEFAULT_PLATFORM_SETTINGS;

  async function save() {
    setBusy(true);
    try {
      await update({ data: value });
      await qc.invalidateQueries({ queryKey: ["platform-settings"] });
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } finally {
      setBusy(false);
    }
  }

  const fields: Array<[Extract<keyof PlatformSettings, string>, string, number]> = [
    ["commission_percentage", t("admin.settings.contractCommission"), 0.5],
    ["liability_cap_multiplier", t("admin.settings.contractLiabilityCap"), 0.1],
    ["termination_notice_days", t("admin.settings.contractNoticeDays"), 1],
    ["cure_period_days", t("admin.settings.contractCureDays"), 1],
  ];

  return (
    <Section icon={FileSignature} title={t("admin.settings.contractSection")}>
      <p className="text-xs text-muted-foreground mb-3">{t("admin.settings.contractHint")}</p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label, step]) => (

          <label key={key} className="block text-sm">
            <span className="text-muted-foreground text-xs">{label}</span>
            <input
              type="number"
              min={0}
              step={step}
              value={value[key]}
              onChange={(e) => setDraft({ ...value, [key]: Number(e.target.value) })}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl bg-muted/50 border border-border font-mono"
            />
          </label>
        ))}
      </div>
      <button
        onClick={save}
        disabled={busy}
        className="mt-4 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        {done ? t("admin.settings.saved") : t("admin.settings.save")}
      </button>
    </Section>
  );
}

function Section({ icon: Icon, title, children }: { icon?: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        <h3 className="font-display font-bold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-success" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
