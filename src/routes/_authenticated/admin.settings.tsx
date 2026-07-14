import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Percent, Bell, Truck, CreditCard, Languages } from "lucide-react";
import { loadAdminSettings, saveAdminSettings, type AdminSettings } from "@/lib/admin-settings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "პარამეტრები — ადმინი" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
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
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">პარამეტრები</h1>
        <p className="text-sm text-muted-foreground mt-1">პლატფორმის კონფიგურაცია</p>
      </div>

      <Section icon={Percent} title="კომისია">
        <label className="block text-sm">
          <span className="text-muted-foreground text-xs">კომისიის პროცენტი (%)</span>
          <input type="number" min={0} max={50} step={0.5} value={s.commissionPct}
            onChange={(e) => setS({ ...s, commissionPct: Number(e.target.value) })}
            className="mt-1 w-full px-4 py-2.5 rounded-2xl bg-muted/50 border border-border font-mono text-lg font-bold" />
        </label>
      </Section>

      <Section icon={Bell} title="შეტყობინებები">
        <label className="block text-sm">
          <span className="text-muted-foreground text-xs">უახლოესი შემოთავაზების რადიუსი (კმ)</span>
          <input type="number" min={0.5} max={10} step={0.5} value={s.notificationsRadiusKm}
            onChange={(e) => setS({ ...s, notificationsRadiusKm: Number(e.target.value) })}
            className="mt-1 w-full px-4 py-2.5 rounded-2xl bg-muted/50 border border-border font-mono" />
        </label>
      </Section>

      <Section icon={Truck} title="მიტანის სერვისი">
        <label className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 cursor-pointer">
          <span className="text-sm font-medium">მიტანა ჩართული</span>
          <Toggle checked={s.deliveryEnabled} onChange={(v) => setS({ ...s, deliveryEnabled: v })} />
        </label>
      </Section>

      <Section icon={CreditCard} title="გადახდის მეთოდები">
        <div className="space-y-2">
          {([["bog", "BOG"], ["tbc", "TBC Pay"], ["card", "ბარათი"], ["cash", "ნაღდი"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 cursor-pointer">
              <span className="text-sm font-medium">{label}</span>
              <Toggle checked={s.paymentProviders[key]} onChange={(v) => setS({ ...s, paymentProviders: { ...s.paymentProviders, [key]: v } })} />
            </label>
          ))}
        </div>
      </Section>

      <Section icon={Languages} title="ენა">
        <div className="flex gap-2">
          {(["ka", "en"] as const).map((l) => (
            <button key={l} onClick={() => setS({ ...s, language: l })}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold ${s.language === l ? "bg-foreground text-background" : "bg-muted"}`}>
              {l === "ka" ? "ქართული" : "English"}
            </button>
          ))}
        </div>
      </Section>

      <Section title="პლატფორმის წესები">
        <textarea value={s.rules} onChange={(e) => setS({ ...s, rules: e.target.value })} rows={4}
          className="w-full px-4 py-3 rounded-2xl bg-muted/50 border border-border text-sm resize-none" />
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg flex items-center gap-2 hover:opacity-90">
          <Save className="w-4 h-4" /> {saved ? "შენახულია ✓" : "შენახვა"}
        </button>
      </div>
    </div>
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
