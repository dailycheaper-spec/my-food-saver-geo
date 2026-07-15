import { useEffect } from "react";
import { OFFERS } from "@/lib/mock-data";
import { trackVisit, getSeenOffers, markOffersSeen, useNotifSettings } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

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
    const relevant = notifs.categories.length
      ? newOnes.filter((o) => notifs.categories.includes(o.category))
      : newOnes;

    if (notifs.enabled && relevant.length > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const first = relevant[0];
      try {
        new Notification(`🎉 ${t("newOffer")}`, {
          body: `${first.storeName}: ${first.title} — ${first.price} ₾`,
          tag: `cheaper-new-${first.id}`,
          icon: "/favicon.ico",
        });
      } catch { /* browser blocked */ }
    }

    markOffersSeen(currentIds);
  }, [notifs.enabled, notifs.categories]);

  return null;
}
