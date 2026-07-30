/**
 * ============================================================================
 * PROMO BANNERS — home screen carousel content ("mini CMS")
 * ============================================================================
 *
 * This file is the SINGLE place to add, edit, or remove home-page banners.
 * No database, no admin panel needed — just edit the array below and save.
 *
 * ── HOW TO ADD A BANNER ─────────────────────────────────────────────────────
 *   1. (optional) import an image at the top:
 *        import myImage from "@/assets/my-banner.jpg";
 *   2. append an object to PROMO_BANNERS:
 *
 *        {
 *          id: "summer-sale",                        // unique, stable
 *          badge:      { ka: "ახალი", en: "New" },
 *          headline:   { ka: "ზაფხულის ფასდაკლება", en: "Summer sale" },
 *          subtext:    { ka: "-50% ყველაფერზე",      en: "-50% on everything" },
 *          buttonText: { ka: "ნახე", en: "Browse" },
 *          buttonAction: { to: "/search" },          // internal route
 *          imageSource: myImage,
 *        }
 *
 * ── HOW TO EDIT ─────────────────────────────────────────────────────────────
 *   Change any field in place. `ka` is required; en/ru/tr/fa are optional and
 *   fall back to `ka` when missing.
 *
 * ── HOW TO REMOVE / TEMPORARILY HIDE ────────────────────────────────────────
 *   Delete the object, or set `active: false` to keep it for later.
 *
 * ── ORDER ───────────────────────────────────────────────────────────────────
 *   Banners rotate top-to-bottom in array order.
 *
 * ── LATER: MOVING TO THE DATABASE ───────────────────────────────────────────
 *   This array maps 1:1 to a `promo_banners` table. Swap `PROMO_BANNERS` for a
 *   query result of the same shape — PromoCarousel needs no changes.
 * ============================================================================
 */

import type { Language } from "@/lib/i18n";
import heroImage from "@/assets/hero-bakery-clean.jpg";
import bagBakery from "@/assets/bag-bakery.jpg";
import bagKhachapuri from "@/assets/bag-khachapuri.jpg";

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
