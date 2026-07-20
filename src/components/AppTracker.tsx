import { useEffect } from "react";
import { OFFERS } from "@/lib/mock-data";
import { trackVisit, getSeenOffers, markOffersSeen, useNotifSettings } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

type RealtimeOffer = {
  id: string;
  title: string;
  discounted_price: number;
  category: string;
  store: { name: string | null; lat: number | null; lng: number | null } | null;
};

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - s1 - s2));
}

// Fires once on mount: tracks a visit, and notifies user about offers they haven't seen yet.
export function AppTracker() {
  const { t } = useI18n();
  const notifs = useNotifSettings();

  useEffect(() => {
    trackVisit();

    const seen = getSeenOffers();
    const currentIds = OFFERS.map((o) => o.id);

    if (seen.length === 0) {
      // First run: don't spam, just mark all as seen.
      markOffersSeen(currentIds);
      return;
    }

    const newOnes = OFFERS.filter((o) => !seen.includes(o.id));
    if (newOnes.length === 0) return;

    // Filter by user's category preferences if any.
    const nearby = newOnes.filter((o) => o.distanceKm <= notifs.radiusKm);
    const relevant = notifs.categories.length
      ? nearby.filter((o) => notifs.categories.includes(o.category))
      : nearby;

    if (notifs.enabled && relevant.length > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const first = relevant[0];
      try {
        new Notification(`🎉 ${t("newOffer")}`, {
          body: `${first.storeName}: ${first.title} — ${first.price} ${t("currency")}`,
          tag: `cheaper-new-${first.id}`,
          icon: "/favicon.ico",
        });
      } catch { /* browser blocked */ }
    }

    markOffersSeen(currentIds);
  }, [notifs.enabled, notifs.categories, notifs.radiusKm, t]);

  useEffect(() => {
    const notify = (offer: RealtimeOffer) => {
      if (!notifs.enabled) return;
      if (notifs.categories.length && !notifs.categories.includes(offer.category)) return;
      if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      try {
        new Notification(`🎉 ${t("newOffer")}`, {
          body: `${offer.store?.name ?? "Cheaper"}: ${offer.title} — ${Number(offer.discounted_price).toFixed(2)} ${t("currency")}`,
          tag: `cheaper-live-${offer.id}`,
          icon: "/icon-192.png",
        });
      } catch { /* browser blocked */ }
    };

    const shouldNotify = (offer: RealtimeOffer) => {
      const storeLat = offer.store?.lat;
      const storeLng = offer.store?.lng;
      if (!storeLat || !storeLng || !("geolocation" in navigator)) {
        notify(offer);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
          const storePoint = { lat: storeLat, lng: storeLng };
          if (distanceKm(userPoint, storePoint) <= notifs.radiusKm) notify(offer);
        },
        () => notify(offer),
        { maximumAge: 5 * 60 * 1000, timeout: 2500 },
      );
    };

    const channel = supabase
      .channel("app-new-offer-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "offers" }, async (payload) => {
        const id = (payload.new as { id?: string }).id;
        if (!id) return;
        const { data } = await supabase
          .from("offers")
          .select("id,title,discounted_price,category,store:stores(name,lat,lng)")
          .eq("id", id)
          .maybeSingle();
        if (data) shouldNotify(data as unknown as RealtimeOffer);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [notifs.enabled, notifs.categories, notifs.radiusKm, t]);

  return null;
}
