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

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: AddressDraft): Promise<UserAddress> => {
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
      const q = draft.id
        ? supabase.from("user_addresses").update(payload).eq("id", draft.id).select().single()
        : supabase.from("user_addresses").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return data as UserAddress;
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
