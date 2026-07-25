import { useRef, useState } from "react";
import { Camera, Loader2, Smile, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { StoreLogo, isLogoUrl } from "@/components/StoreLogo";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_DIM = 512;
// 100 years — logos are effectively public assets rendered anonymously.
const SIGN_TTL = 60 * 60 * 24 * 365 * 100;

const EMOJIS = [
  "🏪","🥖","🥐","🍞","🥯","🥨","🧀","🥗","🥙","🌮","🌯","🥪",
  "🍕","🍝","🍜","🍲","🍛","🍱","🍣","🍤","🍚","🍙","🍢","🍡",
  "🍰","🎂","🧁","🍮","🍩","🍪","🍫","🍦","🍨","🍧","🍯","🍭",
  "🍎","🍊","🍇","🍓","🍑","🍒","🥝","🥑","🥦","🥕","🌽","🍅",
  "🍔","🍟","🌭","🥓","🍗","🍖","🥩","🥚","🍳","🥞","☕","🍵",
  "🧋","🥤","🍺","🍷","🛒","🥡","🍶","🥛","🍴","🍽️","🥂","🍹",
];

interface Props {
  storeId?: string | null; // needed for instant upload; if missing, use onFileSelected
  logoUrl: string | null;   // current image URL (or emoji)
  logoEmoji: string;        // current emoji fallback
  onChange: (next: { logo?: string; logo_url?: string | null }) => void;
  /** Deferred-upload mode: return the picked File to caller instead of uploading. */
  onFileSelected?: (file: File | null) => void;
}

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85),
  );
}

export function StoreLogoPicker({ storeId, logoUrl, logoEmoji, onChange, onFileSelected }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"image" | "emoji">(isLogoUrl(logoUrl) ? "image" : "emoji");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) { toast.error(t("invalidImageType")); return; }
    if (file.size > MAX_BYTES) { toast.error(t("fileTooLarge")); return; }
    if (onFileSelected) {
      const preview = URL.createObjectURL(file);
      onChange({ logo_url: preview });
      onFileSelected(file);
      return;
    }
    if (!storeId) { toast.error(t("uploadFailed")); return; }
    setBusy(true);
    try {
      const blob = await compress(file);
      const path = `${storeId}/logo-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("store-logos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("store-logos").createSignedUrl(path, SIGN_TTL);
      if (signErr || !signed) throw signErr ?? new Error("sign failed");
      onChange({ logo_url: signed.signedUrl });
    } catch (e) {
      console.error(e);
      toast.error(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-secondary grid place-items-center overflow-hidden text-3xl shrink-0 border border-border">
          <StoreLogo value={logoUrl || logoEmoji} emojiClassName="text-3xl" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("image")}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1 ${mode === "image" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
            <Upload className="w-3.5 h-3.5" /> {t("logoUploadImage")}
          </button>
          <button type="button" onClick={() => setMode("emoji")}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1 ${mode === "emoji" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
            <Smile className="w-3.5 h-3.5" /> {t("logoPickEmoji")}
          </button>
        </div>
      </div>

      {mode === "image" ? (
        <div>
          <button type="button" disabled={busy || (!storeId && !onFileSelected)} onClick={() => inputRef.current?.click()}
            className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-dashed border-border text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {t("logoUploadImage")} <span className="text-xs text-muted-foreground">(JPG/PNG/WebP, ≤3MB)</span>
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
      ) : (
        <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 p-2 rounded-xl bg-muted/40 border border-border max-h-40 overflow-y-auto">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => onChange({ logo: e, logo_url: null })}
              className={`w-8 h-8 grid place-items-center rounded-lg text-xl hover:bg-secondary ${logoEmoji === e && !isLogoUrl(logoUrl) ? "bg-primary/20 ring-2 ring-primary" : ""}`}>
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
