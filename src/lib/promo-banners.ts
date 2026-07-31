/**
 * ============================================================================
 * PROMO BANNERS — home screen carousel content
 * ============================================================================
 *
 * Banners are managed in the ADMIN PANEL at /admin/banners (add, edit,
 * reorder, hide, delete). The array at the bottom of this file is only the
 * offline fallback used when the database has no banners or cannot be
 * reached, so the homepage is never blank.
 *
 * `ka` is required on every text; en/ru/tr/fa fall back to `ka`.
 * ============================================================================
 */

import type { Language } from "@/lib/i18n";
import heroImage from "@/assets/hero-bakery-clean.jpg";
import bagBakery from "@/assets/bag-bakery.jpg";
import bagKhachapuri from "@/assets/bag-khachapuri.jpg";

/**
 * Bundled artwork the seeded banners point at. The database stores the stable
 * key `asset:<name>`; the real hashed URL is resolved here at build time.
 * Admin uploads use a storage URL instead and never hit this map.
 */
export const BUNDLED_BANNER_IMAGES: Record<string, string> = {
  "hero-bakery-clean": heroImage,
  "bag-bakery": bagBakery,
  "bag-khachapuri": bagKhachapuri,
};

export function resolveBannerImage(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("asset:")) return BUNDLED_BANNER_IMAGES[value.slice(6)];
  return value;
}


/** Localized string. `ka` is required, everything else falls back to it. */
export type LocalizedText = {
  ka: string;
  en?: string;
  ru?: string;
  tr?: string;
  fa?: string;
};

export type PromoBanner = {
  /** Unique, stable key. */
  id: string;
  /** Small pill above the headline. Omit to hide the pill. */
  badge?: LocalizedText;
  headline: LocalizedText;
  subtext: LocalizedText;
  buttonText: LocalizedText;
  /** Internal route the whole banner links to. */
  buttonAction: { to: string; search?: Record<string, string> };
  /** Background image. Omit for a plain brand-gradient banner. */
  imageSource?: string;
  /** Optional gradient override (Tailwind classes). Defaults to brand green. */
  overlayClass?: string;
  /** Set to false to hide without deleting. Defaults to true. */
  active?: boolean;
};

/** Resolve a LocalizedText for the active language, falling back to Georgian. */
export function localizedText(value: LocalizedText, language: Language): string {
  return value[language] ?? value.ka;
}

/** Shape of a row from the `promo_banners` table (subset we care about). */
export type PromoBannerRow = {
  id: string;
  position: number;
  active: boolean;
  image_url: string | null;
  image_path: string | null;
  overlay_class: string | null;
  link_to: string;
  link_search: Record<string, string> | null;
  badge_ka: string | null; badge_en: string | null; badge_ru: string | null;
  badge_tr: string | null; badge_fa: string | null;
  headline_ka: string; headline_en: string | null; headline_ru: string | null;
  headline_tr: string | null; headline_fa: string | null;
  subtext_ka: string; subtext_en: string | null; subtext_ru: string | null;
  subtext_tr: string | null; subtext_fa: string | null;
  button_ka: string; button_en: string | null; button_ru: string | null;
  button_tr: string | null; button_fa: string | null;
};

/** Collapse the per-language columns of one field into a LocalizedText. */
function textOf(
  row: PromoBannerRow,
  prefix: "badge" | "headline" | "subtext" | "button",
): LocalizedText {
  const pick = (lang: string) => (row as unknown as Record<string, string | null>)[`${prefix}_${lang}`] || undefined;
  return {
    ka: pick("ka") ?? "",
    en: pick("en"),
    ru: pick("ru"),
    tr: pick("tr"),
    fa: pick("fa"),
  };
}

/** Map a database row onto the shape the carousel renders. */
export function rowToBanner(row: PromoBannerRow): PromoBanner {
  const badge = textOf(row, "badge");
  return {
    id: row.id,
    badge: badge.ka ? badge : undefined,
    headline: textOf(row, "headline"),
    subtext: textOf(row, "subtext"),
    buttonText: textOf(row, "button"),
    buttonAction: { to: row.link_to, search: row.link_search ?? undefined },
    imageSource: resolveBannerImage(row.image_url),
    overlayClass: row.overlay_class ?? undefined,
    active: row.active,
  };
}


export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: "daily-discount",
    badge: {
      ka: "ხარისხიანი ფასი, უკეთესი საკვები",
      en: "Quality price, better food",
      ru: "Качественная цена, лучшая еда",
      tr: "Kaliteli fiyat, daha iyi yemek",
      fa: "قیمت باکیفیت، غذای بهتر",
    },
    headline: {
      ka: "ყოველდღე 50%+ ფასდაკლებით",
      en: "Every day 50%+ off",
      ru: "Каждый день скидка 50%+",
      tr: "Her gün %50+ indirim",
      fa: "هر روز بیش از ۵۰٪ تخفیف",
    },
    subtext: {
      ka: "გემრიელი საკვები საყვარელი ადგილებიდან!",
      en: "Tasty food from your favorite spots!",
      ru: "Вкусная еда из любимых мест!",
      tr: "Sevdiğiniz mekanlardan lezzetli yemekler!",
      fa: "غذای خوشمزه از مکان‌های موردعلاقه‌تان!",
    },
    buttonText: {
      ka: "შეუკვეთე",
      en: "Order now",
      ru: "Заказать",
      tr: "Şimdi sipariş ver",
      fa: "اکنون سفارش دهید",
    },
    buttonAction: { to: "/search" },
    imageSource: heroImage,
  },
  {
    id: "save-more",
    badge: {
      ka: "დაზოგე ყოველ შეკვეთაზე",
      en: "Save on every order",
      ru: "Экономьте на каждом заказе",
      tr: "Her siparişte tasarruf",
      fa: "در هر سفارش صرفه‌جویی کنید",
    },
    headline: {
      ka: "დაზოგეთ მეტი",
      en: "Save more",
      ru: "Экономьте больше",
      tr: "Daha fazla tasarruf",
      fa: "بیشتر صرفه‌جویی کنید",
    },
    subtext: {
      ka: "დღის ბოლოს ფასები ორჯერ და მეტჯერ ეცემა.",
      en: "End-of-day prices drop by half and more.",
      ru: "К концу дня цены падают вдвое и больше.",
      tr: "Gün sonunda fiyatlar yarı yarıya ve daha fazla düşer.",
      fa: "در پایان روز قیمت‌ها نصف و کمتر می‌شوند.",
    },
    buttonText: {
      ka: "ნახე შეთავაზებები",
      en: "See offers",
      ru: "Смотреть предложения",
      tr: "Teklifleri gör",
      fa: "مشاهده پیشنهادها",
    },
    buttonAction: { to: "/search" },
    imageSource: bagBakery,
  },
  {
    id: "popular-dish",
    badge: {
      ka: "ყველაზე მოთხოვნადი",
      en: "Most wanted",
      ru: "Самое популярное",
      tr: "En çok tercih edilen",
      fa: "پرطرفدارترین",
    },
    headline: {
      ka: "პოპულარული დღის კერძი",
      en: "Popular dish of the day",
      ru: "Популярное блюдо дня",
      tr: "Günün popüler yemeği",
      fa: "غذای محبوب روز",
    },
    subtext: {
      ka: "ის, რასაც დღეს ყველაზე მეტად ყიდულობენ შენს უბანში.",
      en: "What everyone is buying in your neighborhood today.",
      ru: "То, что сегодня чаще всего покупают рядом с вами.",
      tr: "Bugün mahallende en çok alınan ürün.",
      fa: "چیزی که امروز در محله شما بیشترین خرید را دارد.",
    },
    buttonText: {
      ka: "შეუკვეთე",
      en: "Order now",
      ru: "Заказать",
      tr: "Şimdi sipariş ver",
      fa: "اکنون سفارش دهید",
    },
    buttonAction: { to: "/search" },
    imageSource: bagKhachapuri,
  },
];
