import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

/** Thrown when the Maps connector is missing/unlinked — callers degrade instead of crashing. */
export class MapsUnavailableError extends Error {}

function gatewayHeaders(extra?: Record<string, string>) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) throw new MapsUnavailableError("Google Maps connector is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    ...extra,
  };
}

async function handle403(response: Response) {
  const details: Array<{ reason?: string }> =
    (await response.clone().json().catch(() => null))?.error?.details ?? [];
  const reason = details.find((d) => d.reason)?.reason;
  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
    throw new Error(
      'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key\'s application restrictions to "None" or "IP addresses".',
    );
  }
  if (reason === "API_KEY_SERVICE_BLOCKED") {
    throw new Error(
      "Google Maps server key does not allow this API. In Google Cloud Console, add this Maps API to the server key's allowed-APIs list.",
    );
  }
  throw new Error("Google Maps request was denied (403). Check the server key's restrictions.");
}

const langMap: Record<string, string> = { ka: "ka", en: "en", ru: "ru" };

/** lat/lng → human readable street address (Georgian by default). */
export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        language: z.enum(["ka", "en", "ru"]).default("ka"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      latlng: `${data.lat},${data.lng}`,
      language: langMap[data.language] ?? "ka",
      region: "ge",
    });
    const res = await fetch(`${GATEWAY_URL}/maps/api/geocode/json?${params}`, {
      headers: gatewayHeaders(),
    });
    if (res.status === 401) throw new MapsUnavailableError("Google Maps connector credential not found");
    if (res.status === 403) await handle403(res);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Reverse geocoding failed [${res.status}]: ${body}`);
    }
    const json = (await res.json()) as {
      status?: string;
      results?: Array<{ formatted_address?: string; address_components?: Array<{ long_name: string; types: string[] }> }>;
    };
    const best = json.results?.[0];
    if (!best) return { addressLine: "", city: null as string | null };
    const comps = best.address_components ?? [];
    const pick = (type: string) => comps.find((c) => c.types.includes(type))?.long_name ?? "";
    const route = pick("route");
    const number = pick("street_number");
    const line = route ? [route, number].filter(Boolean).join(" ") : (best.formatted_address ?? "");
    const city = pick("locality") || pick("administrative_area_level_1") || null;
    return { addressLine: line.trim(), city, formatted: best.formatted_address ?? line };
  });

/** Typed query → address suggestions (Places API New, biased to Georgia). */
export const autocompleteAddress = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        query: z.string().trim().min(2).max(120),
        language: z.enum(["ka", "en", "ru"]).default("ka"),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        sessionToken: z.string().max(80).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = {
      input: data.query,
      languageCode: langMap[data.language] ?? "ka",
      regionCode: "GE",
      includedRegionCodes: ["GE"],
    };
    if (data.sessionToken) body.sessionToken = data.sessionToken;
    if (data.lat != null && data.lng != null) {
      body.locationBias = {
        circle: { center: { latitude: data.lat, longitude: data.lng }, radius: 30000 },
      };
    }
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: gatewayHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    if (res.status === 401) throw new MapsUnavailableError("Google Maps connector credential not found");
    if (res.status === 403) await handle403(res);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Address autocomplete failed [${res.status}]: ${text}`);
    }
    const json = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
        };
      }>;
    };
    return (json.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
      .map((p) => ({
        placeId: p.placeId!,
        main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondary: p.structuredFormat?.secondaryText?.text ?? "",
      }))
      .slice(0, 6);
  });

/** placeId → coordinates + formatted address. */
export const placeDetails = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        placeId: z.string().trim().min(3).max(200),
        language: z.enum(["ka", "en", "ru"]).default("ka"),
        sessionToken: z.string().max(80).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({ languageCode: langMap[data.language] ?? "ka" });
    if (data.sessionToken) params.set("sessionToken", data.sessionToken);
    const res = await fetch(
      `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(data.placeId)}?${params}`,
      {
        headers: gatewayHeaders({
          "X-Goog-FieldMask": "id,displayName,formattedAddress,shortFormattedAddress,location",
        }),
      },
    );
    if (res.status === 401) throw new MapsUnavailableError("Google Maps connector credential not found");
    if (res.status === 403) await handle403(res);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Place details failed [${res.status}]: ${text}`);
    }
    const json = (await res.json()) as {
      displayName?: { text?: string };
      formattedAddress?: string;
      shortFormattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    };
    return {
      addressLine: json.shortFormattedAddress || json.displayName?.text || json.formattedAddress || "",
      formatted: json.formattedAddress ?? "",
      lat: json.location?.latitude ?? null,
      lng: json.location?.longitude ?? null,
    };
  });
