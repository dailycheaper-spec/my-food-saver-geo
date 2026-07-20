import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ prompt: z.string().min(2).max(300) });

export const generateOfferImage = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `Appetizing high-quality food photography of: ${data.prompt}. Professional lighting, top-down or 45-degree angle, on a clean neutral background, vibrant colors, realistic, no text, no watermark.`;

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
    if (!b64) {
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
      return { dataUrl: `data:image/png;base64,${fb}` };
    }
    return { dataUrl: `data:image/png;base64,${b64}` };
  });
