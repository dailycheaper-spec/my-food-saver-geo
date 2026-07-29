import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Camera, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SIGN_TTL_SECONDS = 60 * 60 * 24 * 365 * 100; // 100 years

export function OfferPhotoPicker({
  value,
  onChange,
  compact = false,
  onValidityChange,
}: {
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
  /** Called with true when the current pasted URL fails to load (broken image). */
  onValidityChange?: (invalid: boolean) => void;
}) {
  const { t } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Report validity upward. data: URLs and empty values are always considered valid.
  useEffect(() => {
    onValidityChange?.(imgError && !!value && !value.startsWith("data:"));
  }, [imgError, value, onValidityChange]);

  // Reset error whenever the value changes (new load attempt).
  useEffect(() => {
    setImgError(false);
  }, [value]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Not signed in");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `uploads/${sess.session.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("offer-images")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("offer-images")
        .createSignedUrl(path, SIGN_TTL_SECONDS);
      if (signErr || !signed) throw signErr ?? new Error("Sign failed");
      setImgError(false);
      onChange(signed.signedUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  const imgH = compact ? "h-32" : "h-48";

  return (
    <div>
      {value && !imgError && (
        <img
          src={value}
          alt="preview"
          className={`mb-2 w-full ${imgH} object-cover rounded-2xl`}
          onLoad={() => setImgError(false)}
          onError={() => setImgError(true)}
        />
      )}
      {imgError && value && (
        <div className="mb-2 flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t("imageLoadFailed")}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => cameraRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-muted border border-border text-xs font-medium disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          {t("takePhoto")}
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => uploadRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-muted border border-border text-xs font-medium disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {t("uploadPhoto")}
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="relative">
        <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("orPasteUrl")}
          className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-muted/40 border border-border text-sm"
        />
      </div>
    </div>
  );
}
