import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AddressLabel = "home" | "work" | "other";

export interface UserAddress {
  id: string;
  user_id: string;
  label: AddressLabel;
  custom_label: string | null;
  address_line: string;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  door_code: string | null;
  courier_note: string | null;
  lat: number;
  lng: number;
  city: string | null;
  place_id: string | null;
  street: string | null;
  street_number: string | null;
  district: string | null;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AddressDraft = Omit<
  UserAddress,
  "id" | "user_id" | "created_at" | "updated_at" | "street" | "street_number" | "district" | "postal_code" | "place_id"
> & { id?: string; place_id?: string | null };

/** Human readable "entrance 2 · floor 5 · apt 12 · code 1234" line. */
export function formatAddressDetails(
  a: Pick<UserAddress, "entrance" | "floor" | "apartment" | "door_code">,
  language: "ka" | "en" | "ru" | "tr" | "fa",
): string {
  const L = (ka: string, en: string, ru: string, tr?: string, fa?: string) =>
    language === "en" ? en : language === "ru" ? ru : language === "tr" ? (tr ?? en) : language === "fa" ? (fa ?? en) : ka;
  const parts: string[] = [];
  if (a.entrance) parts.push(`${L("სადარბაზო", "entrance", "подъезд", "giriş", "ورودی")} ${a.entrance}`);
  if (a.floor) parts.push(`${L("სართული", "floor", "этаж", "kat", "طبقه")} ${a.floor}`);
  if (a.apartment) parts.push(`${L("ბინა", "apt", "кв.", "daire", "واحد")} ${a.apartment}`);
  if (a.door_code) parts.push(`${L("კოდი", "code", "код", "kod", "کد")} ${a.door_code}`);
  return parts.join(" · ");
}

export function addressLabelText(a: UserAddress, language: "ka" | "en" | "ru" | "tr" | "fa"): string {
  if (a.custom_label) return a.custom_label;
  const L = (ka: string, en: string, ru: string, tr?: string, fa?: string) =>
    language === "en" ? en : language === "ru" ? ru : language === "tr" ? (tr ?? en) : language === "fa" ? (fa ?? en) : ka;
  if (a.label === "home") return L("სახლი", "Home", "Дом", "Ev", "خانه");
  if (a.label === "work") return L("სამსახური", "Work", "Работа", "İş", "محل کار");
  return L("სხვა", "Other", "Другое", "Diğer", "سایر");
}

/**
 * Normalises an address line so that capitalisation, punctuation, extra
 * whitespace and Latin/Cyrillic-Georgian digit noise don't produce duplicates.
 */
export function normalizeAddressLine(line: string | null | undefined): string {
  if (!line) return "";
  return line
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[.,;:'"`’“”()\[\]{}\-–—_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Two pins closer than this are treated as the same place. */
export const SAME_PLACE_METERS = 30;

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Finds an already-saved address that means the same place as `candidate`.
 * Matches on place id, then proximity, then normalised text — so translated or
 * differently-formatted address strings for one spot never duplicate.
 */
export function findEquivalentAddress(
  saved: UserAddress[],
  candidate: { lat: number; lng: number; address_line: string; place_id?: string | null },
  ignoreId?: string,
): UserAddress | null {
  const pool = saved.filter((a) => a.id !== ignoreId);
  if (candidate.place_id) {
    const byPlace = pool.find((a) => a.place_id && a.place_id === candidate.place_id);
    if (byPlace) return byPlace;
  }
  const nearby = pool
    .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lng))
    .map((a) => ({ a, d: metersBetween(a.lat, a.lng, candidate.lat, candidate.lng) }))
    .filter((x) => x.d <= SAME_PLACE_METERS)
    .sort((x, y) => x.d - y.d);
  if (nearby.length) return nearby[0].a;

  const norm = normalizeAddressLine(candidate.address_line);
  if (norm.length >= 3) {
    const byText = pool.find((a) => normalizeAddressLine(a.address_line) === norm);
    if (byText) return byText;
  }
  return null;
}

export function useMyAddresses(enabled = true) {
  return useQuery({
    queryKey: ["user-addresses"],
    enabled,
    queryFn: async (): Promise<UserAddress[]> => {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserAddress[];
    },
  });
}

export interface SaveAddressResult {
  address: UserAddress;
  /** True when an existing equivalent address was updated instead of a new one created. */
  merged: boolean;
}

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: AddressDraft): Promise<SaveAddressResult> => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Not signed in");
      const payload = {
        user_id: uid,
        label: draft.label,
        custom_label: draft.custom_label?.trim() || null,
        address_line: draft.address_line.trim().slice(0, 300),
        entrance: draft.entrance?.trim() || null,
        floor: draft.floor?.trim() || null,
        apartment: draft.apartment?.trim() || null,
        door_code: draft.door_code?.trim() || null,
        courier_note: draft.courier_note?.trim().slice(0, 300) || null,
        lat: draft.lat,
        lng: draft.lng,
        city: draft.city ?? null,
        place_id: draft.place_id ?? null,
        is_default: draft.is_default,
      };

      // Duplicate guard: reuse an equivalent saved address rather than inserting
      // a near-identical twin (same pin, translated text, different spacing…).
      let targetId = draft.id;
      let merged = false;
      if (!targetId) {
        const { data: existing } = await supabase.from("user_addresses").select("*");
        const match = findEquivalentAddress((existing ?? []) as UserAddress[], payload);
        if (match) {
          targetId = match.id;
          merged = true;
          // Keep previously entered details when the new draft leaves them blank.
          payload.entrance = payload.entrance ?? match.entrance;
          payload.floor = payload.floor ?? match.floor;
          payload.apartment = payload.apartment ?? match.apartment;
          payload.door_code = payload.door_code ?? match.door_code;
          payload.courier_note = payload.courier_note ?? match.courier_note;
          payload.custom_label = payload.custom_label ?? match.custom_label;
          payload.is_default = payload.is_default || match.is_default;
        }
      }

      const q = targetId
        ? supabase.from("user_addresses").update(payload).eq("id", targetId).select().single()
        : supabase.from("user_addresses").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return { address: data as UserAddress, merged };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user-addresses"] });
    },
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user-addresses"] });
    },
  });
}

const LAST_KEY = "cheaper:last-address-id";

export function rememberLastAddressId(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readLastAddressId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
