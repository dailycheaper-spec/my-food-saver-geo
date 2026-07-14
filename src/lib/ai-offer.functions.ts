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
  "category": "meal"|"bakery"|"grocery"|"produce"|"dessert"|"other",
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
