import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Image as ImageIcon, Plus, Trash2, Pencil, ArrowUp, ArrowDown, Eye, EyeOff, X, Upload, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  useAdminBanners, createBanner, updateBanner, deleteBanner, saveBannerOrder,
  uploadBannerImage, removeBannerImage, emptyBannerDraft, type BannerDraft,
} from "@/lib/banners";
import { resolveBannerImage, type PromoBannerRow } from "@/lib/promo-banners";
import { PromoCarousel } from "@/components/PromoCarousel";
import { rowToBanner } from "@/lib/promo-banners";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  head: () => {
    const lang = typeof window !== "undefined" ? window.localStorage.getItem("cheaper-language") : null;
    const title = lang === "en" ? "Banners — Admin" : lang === "ru" ? "Баннеры — Админ" : "ბანერები — ადმინი";
    return { meta: [{ title }] };
  },
  component: AdminBanners,
});

const LINK_TARGETS = ["/search", "/", "/map", "/favorites"] as const;
const LANGS = [
  { key: "ka", label: "ქართული" },
  { key: "en", label: "English" },
  { key: "ru", label: "Русский" },
  { key: "tr", label: "Türkçe" },
  { key: "fa", label: "فارسی" },
] as const;

type FieldPrefix = "badge" | "headline" | "subtext" | "button";

function AdminBanners() {
  const { t } = useI18n();
  const { rows, loading, error, reload } = useAdminBanners();
  const [editing, setEditing] = useState<{ id: string | null; draft: BannerDraft } | null>(null);
  const [busy, setBusy] = useState(false);

  const previewBanners = useMemo(
    () => rows.filter((r) => r.active).map(rowToBanner),
    [rows],
  );

  async function move(index: number, delta: number) {
    const next = [...rows];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await saveBannerOrder(next.map((r) => r.id));
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: PromoBannerRow) {
    try {
      await updateBanner(row.id, { active: !row.active });
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(row: PromoBannerRow) {
    const label = row.headline_ka || row.headline_en || "";
    if (!window.confirm(t("admin.banners.confirmDelete", { label }))) return;
    try {
      await deleteBanner(row.id);
      await removeBannerImage(row.image_path);
      toast.success(t("admin.banners.deleted"));
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            {t("admin.banners.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.banners.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setEditing({ id: null, draft: emptyBannerDraft(rows.length) })}
          className="mt-3 sm:mt-0 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> {t("admin.banners.add")}
        </button>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}

      <div className="space-y-3">
        {rows.map((row, i) => {
          const img = resolveBannerImage(row.image_url);
          return (
            <div key={row.id} className="bg-card rounded-3xl border border-border p-4 shadow-sm flex gap-4 items-center">
              <div className="w-24 h-16 rounded-2xl overflow-hidden bg-muted grid place-items-center shrink-0">
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{row.headline_ka}</div>
                <div className="text-xs text-muted-foreground truncate">{row.subtext_ka}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-muted font-mono">{row.link_to}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${row.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {row.active ? t("admin.banners.active") : t("admin.banners.hidden")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconBtn disabled={busy || i === 0} onClick={() => move(i, -1)} label={t("admin.banners.moveUp")}><ArrowUp className="w-4 h-4" /></IconBtn>
                <IconBtn disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)} label={t("admin.banners.moveDown")}><ArrowDown className="w-4 h-4" /></IconBtn>
                <IconBtn onClick={() => toggleActive(row)} label={t("admin.banners.toggle")}>
                  {row.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </IconBtn>
                <IconBtn onClick={() => setEditing({ id: row.id, draft: { ...row } })} label={t("admin.banners.edit")}><Pencil className="w-4 h-4" /></IconBtn>
                <IconBtn onClick={() => remove(row)} label={t("admin.banners.delete")} danger><Trash2 className="w-4 h-4" /></IconBtn>
              </div>
            </div>
          );
        })}
        {!loading && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">{t("admin.banners.noneYet")}</div>
        )}
      </div>

      {previewBanners.length > 0 && (
        <div className="bg-card rounded-3xl border border-border p-4 lg:p-6 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-3">{t("admin.banners.preview")}</h3>
          <PromoCarousel banners={previewBanners} />
        </div>
      )}

      {editing && (
        <BannerEditor
          
          initial={editing.draft}
          isNew={editing.id === null}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing.id) await updateBanner(editing.id, draft);
            else await createBanner(draft);
            setEditing(null);
            await reload();
            toast.success(t("admin.banners.saved"));
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, label, disabled, danger,
}: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-9 h-9 grid place-items-center rounded-xl disabled:opacity-30 ${
        danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function BannerEditor({
  initial, isNew, onClose, onSave, 
}: {
  initial: BannerDraft;
  isNew: boolean;
  onClose: () => void;
  onSave: (draft: BannerDraft) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<BannerDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (patch: Partial<BannerDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const field = (prefix: FieldPrefix, lang: string) =>
    ((draft as unknown as Record<string, string | null>)[`${prefix}_${lang}`] ?? "") as string;

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { path, url } = await uploadBannerImage(file);
      set({ image_path: path, image_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!draft.headline_ka.trim()) {
      toast.error(t("admin.banners.headlineRequired"));
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const img = resolveBannerImage(draft.image_url);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-3xl border border-border w-full max-w-2xl my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-bold text-lg">
            {isNew ? t("admin.banners.newBanner") : t("admin.banners.editBanner")}
          </h3>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-xl hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Image */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">{t("admin.banners.image")}</div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-20 rounded-2xl overflow-hidden bg-muted grid place-items-center shrink-0">
                {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
              </div>
              <label className="px-4 py-2.5 rounded-2xl bg-muted text-sm font-semibold flex items-center gap-2 cursor-pointer hover:opacity-90">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {t("admin.banners.upload")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
              </label>
              {draft.image_url && (
                <button onClick={() => set({ image_url: null, image_path: null })} className="text-sm text-destructive hover:underline">
                  {t("admin.banners.remove")}
                </button>
              )}
            </div>
          </div>

          {/* Link target */}
          <label className="block text-sm">
            <span className="text-muted-foreground text-xs">{t("admin.banners.linkTarget")}</span>
            <select
              value={draft.link_to}
              onChange={(e) => set({ link_to: e.target.value })}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm"
            >
              {LINK_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 cursor-pointer">
            <span className="text-sm font-medium">{t("admin.banners.active")}</span>
            <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} className="w-5 h-5 accent-[var(--color-primary)]" />
          </label>

          {/* Localized text fields */}
          {([
            ["badge", t("admin.banners.badge")],
            ["headline", t("admin.banners.headline")],
            ["subtext", t("admin.banners.subtext")],
            ["button", t("admin.banners.buttonText")],
          ] as const).map(([prefix, label]) => (
            <div key={prefix}>
              <div className="text-xs text-muted-foreground mb-2">{label}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {LANGS.map(({ key, label: langLabel }) => (
                  <label key={key} className="block">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{langLabel}</span>
                    <input
                      value={field(prefix, key)}
                      dir={key === "fa" ? "rtl" : "ltr"}
                      onChange={(e) => set({ [`${prefix}_${key}`]: e.target.value || null } as Partial<BannerDraft>)}
                      className="mt-0.5 w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-2xl bg-muted text-sm font-semibold">{t("admin.banners.cancel")}</button>
          <button onClick={submit} disabled={saving || uploading} className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
            {saving ? t("admin.banners.saving") : t("admin.banners.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
