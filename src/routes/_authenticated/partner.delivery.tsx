import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck, Check } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_PROVIDERS, providerBadge } from "@/lib/delivery/registry";
import { getProvider } from "@/lib/delivery/registry";
import type { DeliveryProviderId } from "@/lib/delivery/types";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/partner/delivery")({
  head: () => ({ meta: [{ title: "Delivery Settings — Cheaper" }] }),
  component: PartnerDelivery,
});

function PartnerDelivery() {
  const { t } = useI18n();
  const { stores, loading } = useMyStores();
  const store = stores[0] ?? null;

  const [enabled, setEnabled] = useState(false);
  const [radius, setRadius] = useState(3);
  const [feeBase, setFeeBase] = useState(3);
  const [feePerKm, setFeePerKm] = useState(1);
  const [minOrder, setMinOrder] = useState(0);
  const [providers, setProviders] = useState<DeliveryProviderId[]>(["in_house"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!store) return;
    setEnabled(store.delivery_enabled ?? false);
    setRadius(Number(store.delivery_radius_km ?? 3));
    setFeeBase(Number(store.delivery_fee_base ?? 3));
    setFeePerKm(Number(store.delivery_fee_per_km ?? 1));
    setMinOrder(Number(store.min_order_for_delivery ?? 0));
    setProviders((store.delivery_providers ?? ["in_house"]) as DeliveryProviderId[]);
  }, [store]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  function toggleProvider(id: DeliveryProviderId) {
    setProviders((cur) => (cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id]));
  }

  async function save() {
    setSaving(true);
    await supabase.from("stores").update({
      delivery_enabled: enabled,
      delivery_radius_km: radius,
      delivery_fee_base: feeBase,
      delivery_fee_per_km: feePerKm,
      min_order_for_delivery: minOrder,
      delivery_providers: providers,
    }).eq("id", store!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
        <Truck className="w-6 h-6 text-primary" /> {t("deliverySettings")}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{t("deliverySettingsDesc")}</p>

      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-semibold text-sm">{t("enableDelivery")}</div>
            <div className="text-xs text-muted-foreground">{t("enableDeliveryDesc")}</div>
          </div>
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </label>
      </div>

      {enabled && (
        <>
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <div className="font-semibold text-sm mb-3">{t("deliveryProviders")}</div>
            <div className="space-y-2">
              {AVAILABLE_PROVIDERS.map((pid) => {
                const badge = providerBadge(pid);
                const p = getProvider(pid);
                const active = providers.includes(pid);
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => toggleProvider(pid)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {badge.label}
                        {!p.configured && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warm text-warm-foreground font-bold uppercase">
                            {t("comingSoon")}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.id}</div>
                    </div>
                    {active && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">{t("providerPriorityHint")}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 mb-4 grid grid-cols-2 gap-4">
            <Field label={t("deliveryRadius")} suffix="km" value={radius} onChange={setRadius} />
            <Field label={t("minOrder")} suffix={t("currency")} value={minOrder} onChange={setMinOrder} />
            <Field label={t("baseFee")} suffix={t("currency")} value={feeBase} onChange={setFeeBase} />
            <Field label={t("feePerKm")} suffix={t("currency")} value={feePerKm} onChange={setFeePerKm} />
          </div>
        </>
      )}

      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
        {saving ? t("saving") : saved ? `✓ ${t("saveDone")}` : t("save")}
      </button>
    </div>
  );
}

function Field({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-1 border border-border rounded-xl px-3 py-2 bg-background">
        <input type="number" step="0.1" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 bg-transparent outline-none text-sm" />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );
}
