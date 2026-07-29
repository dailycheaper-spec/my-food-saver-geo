import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { OFFER_IMAGE_SIGN_TTL_SECONDS } from "./offer-image";

const Input = z.object({ prompt: z.string().min(2).max(300) });

async function generateB64(key: string, prompt: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      size: "1024x1024",
      quality: "low",
      n: 1,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const json = await resp.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (b64) return b64;

  // Fallback: try Gemini chat-shape image model
  const fallback = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  const fj = await fallback.json().catch(() => ({}));
  const fb = fj?.data?.[0]?.b64_json;
  if (!fb) throw new Error("No image returned");
  return fb;
}

export const generateOfferImage = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `Appetizing high-quality food photography of: ${data.prompt}. Professional lighting, top-down or 45-degree angle, on a clean neutral background, vibrant colors, realistic, no text, no watermark.`;

    const b64 = await generateB64(key, prompt);

    // Upload to Storage instead of returning the inline data URL. Storing 1-3 MB
    // base64 blobs in offers.image_url made every offers-list and offer-detail
    // fetch multi-MB (see the sishu/surprise-box slowdown investigation).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `ai/${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("offer-images")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("offer-images")
      .createSignedUrl(path, SIGN_TTL_SECONDS);
    if (signErr || !signed) throw new Error(`Sign URL failed: ${signErr?.message ?? "no data"}`);

    return { url: signed.signedUrl, path };
  });
