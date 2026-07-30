import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ text: z.string().min(3).max(1000) });

export const parseOfferText = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `You are a Georgian food-offer parser. Extract offer details from natural language text (usually Georgian) and return STRICT JSON only, no prose. Schema:
{
  "title": string,                 // product name in Georgian
  "description": string,           // short description
  "category": "meal"|"bakery"|"confectionery"|"grocery"|"produce"|"dessert"|"other",
  "quantity_available": integer,
  "discounted_price": number,      // GEL
  "original_price": number,        // GEL, estimate 2-3x discounted if unknown
  "pickup_from": string,           // "HH:MM"
  "pickup_to": string              // "HH:MM"
}
If a value is missing, make a reasonable default. Return ONLY the JSON object.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: data.text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`AI Gateway ${resp.status}: ${t.slice(0, 200)}`);
    }
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
  });

const TranslateInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
});

export const translateOfferText = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => TranslateInput.parse(v))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `You translate a Georgian food-offer title and description into English, Russian, Turkish, and Persian (Farsi). Return STRICT JSON only, no prose, in this exact shape:
{
  "en": { "title": string, "description": string },
  "ru": { "title": string, "description": string },
  "tr": { "title": string, "description": string },
  "fa": { "title": string, "description": string }
}
Keep translations natural and concise, matching the tone of a food-marketplace app (not literal/robotic). If description is empty, return an empty string for description in every language. Return ONLY the JSON object.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${data.title}\nDescription: ${data.description}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`AI Gateway ${resp.status}: ${t.slice(0, 200)}`);
    }
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content) as Record<"en" | "ru" | "tr" | "fa", { title: string; description: string }>;
    } catch {
      throw new Error("Translation returned invalid JSON");
    }
  });
