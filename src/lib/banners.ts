import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PROMO_BANNERS,
  rowToBanner,
  type PromoBanner,
  type PromoBannerRow,
} from "@/lib/promo-banners";

// Banner artwork lives in a private bucket (public buckets are disabled), so
// uploads are signed for a long window and the signed URL is cached on the row.
const BANNER_SIGN_TTL_SECONDS = 60 * 60 * 24 * 365;

const SELECT_COLUMNS = "*";

type BannerTable = { from: (t: "promo_banners") => any };
// `promo_banners` is newer than the checked-in generated types; the cast keeps
// this file compiling until types.ts is regenerated.
const db = supabase as unknown as BannerTable;

/**
 * Signed URLs stored on the row eventually expire, which silently blanks the
 * banner artwork. Re-sign from `image_path` on every read so the URL is fresh.
 */
async function withFreshImageUrls(rows: PromoBannerRow[]): Promise<PromoBannerRow[]> {
  const paths = rows.map((r) => r.image_path).filter((p): p is string => !!p);
  if (paths.length === 0) return rows;
  const { data } = await supabase.storage
    .from("promo-banners")
    .createSignedUrls(paths, BANNER_SIGN_TTL_SECONDS);
  const byPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) byPath.set(item.path, item.signedUrl);
  }
  return rows.map((r) =>
    r.image_path && byPath.has(r.image_path)
      ? { ...r, image_url: byPath.get(r.image_path)! }
      : r,
  );
}


// ────────────────────────────────────────────────────────────
// Public read — active banners for the homepage carousel
// ────────────────────────────────────────────────────────────
export function useActiveBanners(): { banners: PromoBanner[]; loading: boolean } {
  const [banners, setBanners] = useState<PromoBanner[]>(PROMO_BANNERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await db
        .from("promo_banners")
        .select(SELECT_COLUMNS)
        .eq("active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!alive) return;
      // Empty or failed reads keep the bundled fallback so the homepage is
      // never blank.
      if (!error && data && data.length > 0) {
        setBanners((data as PromoBannerRow[]).map(rowToBanner));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { banners, loading };
}

// ────────────────────────────────────────────────────────────
// Admin CRUD
// ────────────────────────────────────────────────────────────
export function useAdminBanners() {
  const [rows, setRows] = useState<PromoBannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data, error: err } = await db
      .from("promo_banners")
      .select(SELECT_COLUMNS)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as PromoBannerRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}

export type BannerDraft = Omit<PromoBannerRow, "id">;

export function emptyBannerDraft(position: number): BannerDraft {
  return {
    position,
    active: true,
    image_url: null,
    image_path: null,
    overlay_class: null,
    link_to: "/search",
    link_search: null,
    badge_ka: null, badge_en: null, badge_ru: null, badge_tr: null, badge_fa: null,
    headline_ka: "", headline_en: null, headline_ru: null, headline_tr: null, headline_fa: null,
    subtext_ka: "", subtext_en: null, subtext_ru: null, subtext_tr: null, subtext_fa: null,
    button_ka: "", button_en: null, button_ru: null, button_tr: null, button_fa: null,
  };
}

export async function createBanner(draft: BannerDraft) {
  const { error } = await db.from("promo_banners").insert(draft);
  if (error) throw new Error(error.message);
}

export async function updateBanner(id: string, patch: Partial<BannerDraft>) {
  const { error } = await db.from("promo_banners").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBanner(id: string) {
  const { error } = await db.from("promo_banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Persist the given order as sequential positions. */
export async function saveBannerOrder(ids: string[]) {
  await Promise.all(ids.map((id, i) => updateBanner(id, { position: i })));
}

/** Upload artwork and return the stored path plus a long-lived signed URL. */
export async function uploadBannerImage(file: File): Promise<{ path: string; url: string }> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `banners/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("promo-banners")
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);

  const { data, error: signErr } = await supabase.storage
    .from("promo-banners")
    .createSignedUrl(path, BANNER_SIGN_TTL_SECONDS);
  if (signErr || !data?.signedUrl) throw new Error(signErr?.message ?? "Failed to sign banner image");
  return { path, url: data.signedUrl };
}

export async function removeBannerImage(path: string | null) {
  if (!path) return;
  await supabase.storage.from("promo-banners").remove([path]);
}
