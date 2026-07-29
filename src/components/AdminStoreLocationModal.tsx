import { useState, lazy, Suspense } from "react";
import { X, LocateFixed, RotateCcw, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { updateAdminStoreLocation } from "@/lib/admin-store.functions";
import { VisibilityRadiusSelector } from "@/components/VisibilityRadiusSelector";
import { evaluateStoreLocation, isValidLatLng, isWithinGeorgia } from "@/lib/geo";
import type { DbStore } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

const StoreLocationPicker = lazy(() =>
  import("@/components/StoreLocationPicker").then((m) => ({ default: m.StoreLocationPicker }))
);

interface Props {
  store: DbStore;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminStoreLocationModal({ store, onClose, onSaved }: Props) {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);
  const anyStore = store as unknown as Record<string, unknown>;
  const initialLat = typeof anyStore.lat === "number" ? (anyStore.lat as number) : null;
  const initialLng = typeof anyStore.lng === "number" ? (anyStore.lng as number) : null;
  const initialRadius =
    typeof anyStore.visibility_radius_km === "number"
      ? (anyStore.visibility_radius_km as number)
      : 3;

  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const updateFn = useServerFn(updateAdminStoreLocation);

  const hadInitialLocation = initialLat != null && initialLng != null;
  const status = evaluateStoreLocation(lat, lng);
  const outsideGeorgia =
    lat != null && lng != null && isValidLatLng(lat, lng) && !isWithinGeorgia(lat, lng);

  function useCurrent() {
    if (!navigator?.geolocation) return;
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setLocBusy(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function reset() {
    setLat(null);
    setLng(null);
  }

  async function submit() {
    if (status !== "ok") {
      setErr(L("გთხოვთ, აირჩიოთ სწორი კოორდინატები რუკაზე (საქართველოს ტერიტორია).", "Please pick valid coordinates on the map (within Georgia).", "Пожалуйста, выберите верные координаты на карте (в пределах Грузии)."));
      return;
    }
    if (hadInitialLocation) {
      const ok = window.confirm(
        L("დარწმუნებული ხართ, რომ გსურთ პარტნიორის მდებარეობის მონაცემების შეცვლა?",
          "Are you sure you want to change this partner's location data?",
          "Вы уверены, что хотите изменить данные о местоположении партнёра?")
      );
      if (!ok) return;
    }
    setBusy(true);
    setErr("");
    try {
      await updateFn({
        data: {
          storeId: store.id,
          lat,
          lng,
          visibility_radius_km: radius,
        },
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold">{L("მდებარეობის რედაქტირება", "Edit location", "Редактировать местоположение")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{store.name}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={useCurrent}
            disabled={locBusy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold disabled:opacity-60"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            {locBusy ? L("იძებნება…", "Locating…", "Определяется…") : L("ჩემი მდებარეობა", "My location", "Моё местоположение")}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {L("გასუფთავება", "Clear", "Очистить")}
          </button>
        </div>

        <MapAddressField
          value={{ lat, lng }}
          onChange={({ lat: la, lng: ln }) => {
            setLat(la);
            setLng(ln);
          }}
          height={300}
          radiusKm={radius < 50 ? radius : undefined}
          storageKey="cheaper-admin-location-map"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {L("მწვანე წრე გვიჩვენებს ტერიტორიას, სადაც ეს ობიექტი გამოჩნდება მომხმარებლების რუკაზე.",
            "The green circle shows the area where this place will appear on customers' maps.",
            "Зелёный круг показывает область, в которой это заведение будет отображаться на карте у клиентов.")}
        </p>


        <div className="grid grid-cols-2 gap-3 mt-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Latitude</span>
            <input
              type="number"
              step="0.000001"
              value={lat ?? ""}
              onChange={(e) => setLat(e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Longitude</span>
            <input
              type="number"
              step="0.000001"
              value={lng ?? ""}
              onChange={(e) => setLng(e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-sm font-mono"
            />
          </label>
        </div>

        {outsideGeorgia && (
          <div className="mt-3 text-xs text-warm-foreground bg-warm/40 border border-warm rounded-xl p-3">
            {L("⚠️ კოორდინატები საქართველოს სავარაუდო საზღვრებს გარეთ არის.",
              "⚠️ Coordinates are outside Georgia's approximate borders.",
              "⚠️ Координаты находятся за пределами приблизительных границ Грузии.")}
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">{L("ხილვადობის რადიუსი", "Visibility radius", "Радиус видимости")}</h3>
          <VisibilityRadiusSelector value={radius} onChange={setRadius} />
        </div>

        {err && <div className="mt-3 text-sm text-destructive">{err}</div>}

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border font-semibold"
          >
            {L("გაუქმება", "Cancel", "Отмена")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || status !== "ok"}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {busy ? L("შენახვა…", "Saving…", "Сохранение…") : L("შენახვა", "Save", "Сохранить")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminStoreLocationModal;
