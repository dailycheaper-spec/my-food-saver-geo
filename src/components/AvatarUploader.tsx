import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIM = 512;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85),
  );
}

interface Props {
  userId: string;
  currentUrl: string | null;
  fallback: string;
  onChanged: () => void;
}

export function AvatarUploader({ userId, currentUrl, fallback, onChanged }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error(t("invalidImageType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("fileTooLarge"));
      return;
    }
    setBusy(true);
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    try {
      const blob = await compress(file);
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      // Best-effort cleanup of previous file if it was a storage path
      const prev = await getStoredPath(userId);
      if (prev && prev !== path) {
        await supabase.storage.from("avatars").remove([prev]).catch(() => {});
      }

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", userId);
      if (updErr) throw updErr;

      onChanged();
    } catch (e) {
      console.error(e);
      toast.error(t("uploadFailed"));
      setLocalPreview(null);
    } finally {
      setBusy(false);
      URL.revokeObjectURL(preview);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const prev = await getStoredPath(userId);
      if (prev) await supabase.storage.from("avatars").remove([prev]).catch(() => {});
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      setLocalPreview(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const display = localPreview ?? currentUrl;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={t("changePhoto")}
        className="group relative w-16 h-16 rounded-full overflow-hidden gradient-hero grid place-items-center text-primary-foreground text-2xl font-bold"
      >
        {display ? (
          <img src={display} alt="" className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
        </span>
      </button>
      {currentUrl && !busy && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label={t("removePhoto")}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border grid place-items-center text-destructive shadow-soft"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

async function getStoredPath(userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const v = data?.avatar_url ?? null;
  if (!v || /^(https?:|data:|blob:)/i.test(v)) return null;
  return v;
}

// Silence unused import warning when consumers don't use it.
void resolveAvatarUrl;
