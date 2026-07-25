import { useRef, useState } from "react";
import { Image as ImageIcon, Sparkles, Camera, Upload, Loader2, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateOfferImage } from "@/lib/ai-image.functions";
import { useI18n } from "@/lib/i18n";

export function OfferPhotoPicker({
  value,
  onChange,
  promptText,
  compact = false,
}: {
  value: string;
  onChange: (url: string) => void;
  promptText: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const generateImg = useServerFn(generateOfferImage);
  const [genAi, setGenAi] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function aiGenerate() {
    const prompt = promptText.trim();
    if (!prompt) { alert(t("productName")); return; }
    setGenAi(true);
    try {
      const r = (await generateImg({ data: { prompt } })) as { dataUrl: string };
      setImgError(false);
      onChange(r.dataUrl);
    } catch (e: any) { alert("AI: " + e.message); }
    setGenAi(false);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImgError(false); onChange(String(reader.result)); };
    reader.readAsDataURL(file);
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
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button
          type="button"
          onClick={aiGenerate}
          disabled={genAi}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          {genAi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {genAi ? t("generating") : t("generateWithAi")}
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-muted border border-border text-xs font-medium"
        >
          <Camera className="w-5 h-5" />
          {t("takePhoto")}
        </button>
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-muted border border-border text-xs font-medium"
        >
          <Upload className="w-5 h-5" />
          {t("uploadPhoto")}
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { setImgError(false); handleFile(e.target.files?.[0]); }} />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setImgError(false); handleFile(e.target.files?.[0]); }} />
      <div className="relative">
        <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => { setImgError(false); onChange(e.target.value); }}
          placeholder={t("orPasteUrl")}
          className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-muted/40 border border-border text-sm"
        />
      </div>
    </div>
  );
}
