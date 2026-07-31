import { formatGel } from "@/lib/db";
import bagBakery from "@/assets/bag-bakery.jpg";
import bagKhachapuri from "@/assets/bag-khachapuri.jpg";
import bagSushi from "@/assets/bag-sushi.jpg";
import bagProduce from "@/assets/bag-produce.jpg";
import bagSweets from "@/assets/bag-sweets.jpg";

export type Category = "საცხობი" | "საკონდიტრო" | "საოჯახო სამზრეულო" | "რესტორანი" | "სუპერმარკეტი" | "კაფე" | "სუში" | "პიცა";

export interface Offer {
  id: string;
  storeId: string;
  storeName: string;
  /** Optional partner-provided translations for storeName. */
  storeNameEn?: string;
  storeNameRu?: string;
  storeLogo: string;
  category: Category;
  title: string;
  /** Optional partner-provided translations for title. */
  titleEn?: string;
  titleRu?: string;
  titleTr?: string;
  titleFa?: string;
  description: string;
  /** Optional partner-provided translations for description. */
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionTr?: string;
  descriptionFa?: string;
  image: string;
  originalPrice: number;
  price: number;
  pickupFrom: string; // "18:00"
  pickupTo: string;   // "20:00"
  district: string;
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  itemsLeft: number;
  delivery: boolean;
  deliveryFee: number;
  /** Store-configured delivery radius in km (from the store row). */
  deliveryRadiusKm?: number;
  lat?: number;
  lng?: number;
  /** Partner-configured visibility radius in km (never shown to customers directly). */
  visibilityRadiusKm?: number;
  createdAt?: number; // epoch ms — used for NEW badge
  isSurprise?: boolean; // mystery bag — contents revealed at pickup
  city?: string; // store city ("თბილისი" | "ქუთაისი" | "ბათუმი")
  /** Optional partner-declared allergen keys (see src/lib/allergens.ts). */
  allergens?: string[];
}


// approx Tbilisi district centers
export const DISTRICT_COORDS: Record<string, [number, number]> = {
  "ვაკე": [41.7095, 44.7663],
  "საბურთალო": [41.7269, 44.7455],
  "ვერა": [41.7128, 44.7815],
  "ისანი": [41.6879, 44.8290],
  "დიღომი": [41.7855, 44.7570],
  "მთაწმინდა": [41.6934, 44.7994],
};

export const TBILISI_CENTER: [number, number] = [41.7151, 44.7873];

export interface Store {
  id: string;
  name: string;
  /** Optional partner-provided translations for name. */
  nameEn?: string;
  nameRu?: string;
  logo: string;
  category: Category;
  district: string;
  rating: number;
  followers: number;
}

export const STORES: Store[] = [
  { id: "s1", name: "პური გულიანი", logo: "🥖", category: "საცხობი", district: "ვაკე", rating: 4.8, followers: 1240 },
  { id: "s2", name: "ენტრე", logo: "🥐", category: "საცხობი", district: "საბურთალო", rating: 4.7, followers: 890 },
  { id: "s3", name: "მაჭახელა", logo: "🧀", category: "რესტორანი", district: "ვერა", rating: 4.6, followers: 2100 },
  { id: "s4", name: "კარფური", logo: "🛒", category: "სუპერმარკეტი", district: "დიღომი", rating: 4.4, followers: 3400 },
  { id: "s5", name: "ნიკალა", logo: "🍰", category: "საცხობი", district: "ისანი", rating: 4.9, followers: 670 },
  { id: "s6", name: "ტოკიო სუში", logo: "🍣", category: "სუში", district: "საბურთალო", rating: 4.5, followers: 1520 },
  { id: "s7", name: "კულა კაფე", logo: "☕", category: "კაფე", district: "მთაწმინდა", rating: 4.7, followers: 540 },
  { id: "s8", name: "აგრო-ჰაბი", logo: "🥦", category: "სუპერმარკეტი", district: "ვაკე", rating: 4.5, followers: 980 },
];

const NOW = typeof window !== "undefined" ? Date.now() : 0;

export const OFFERS: Offer[] = [
  {
    id: "o1", storeId: "s1", storeName: "პური გულიანი", storeLogo: "🥖",
    category: "საცხობი",
    title: "სიურპრიზ პაკეტი — საცხობი",
    description: "ხაჭაპური, ლობიანი და დღის ცხობილი პური. ზუსტი შემადგენლობა სიურპრიზია!",
    image: bagKhachapuri,
    originalPrice: 30, price: 10,
    pickupFrom: "18:00", pickupTo: "20:00",
    district: "ვაკე", address: "ჭავჭავაძის გამზ. 24",
    distanceKm: 0.8, rating: 4.8, reviewCount: 342, itemsLeft: 4,
    delivery: true, deliveryFee: 3, createdAt: NOW - 2 * 60 * 1000, isSurprise: true, // 2 min ago → NEW
  },
  {
    id: "o2", storeId: "s2", storeName: "ენტრე", storeLogo: "🥐",
    category: "საცხობი",
    title: "ფრანგული საცხობის პაკეტი",
    description: "კრუასანები, ბაგეტები და ტკბილეული — ყველა დღეს გამომცხვარი.",
    image: bagBakery,
    originalPrice: 45, price: 15,
    pickupFrom: "19:00", pickupTo: "21:00",
    district: "საბურთალო", address: "ვაჟა-ფშაველას გამზ. 71",
    distanceKm: 1.2, rating: 4.7, reviewCount: 218, itemsLeft: 2,
    delivery: true, deliveryFee: 4, isSurprise: true,
  },
  {
    id: "o3", storeId: "s6", storeName: "ტოკიო სუში", storeLogo: "🍣",
    category: "სუში",
    title: "სუშის ნაკრები",
    description: "12-16 ცალი სუში დღის ასორტიმენტიდან.",
    image: bagSushi,
    originalPrice: 60, price: 22,
    pickupFrom: "21:00", pickupTo: "22:30",
    district: "საბურთალო", address: "პეკინის გამზ. 5",
    distanceKm: 1.8, rating: 4.5, reviewCount: 156, itemsLeft: 3,
    delivery: true, deliveryFee: 5,
  },
  {
    id: "o4", storeId: "s8", storeName: "აგრო-ჰაბი", storeLogo: "🥦",
    category: "სუპერმარკეტი",
    title: "ბოსტნეულის და ხილის კალათა",
    description: "სეზონური ბოსტნეული და ხილი — სრულიად კარგი, უბრალოდ ესთეტიკურად „არასრულყოფილი“.",
    image: bagProduce,
    originalPrice: 25, price: 8,
    pickupFrom: "17:00", pickupTo: "20:00",
    district: "ვაკე", address: "აბაშიძის ქ. 15",
    distanceKm: 0.5, rating: 4.5, reviewCount: 89, itemsLeft: 6,
    delivery: false, deliveryFee: 0,
  },
  {
    id: "o5", storeId: "s5", storeName: "ნიკალა", storeLogo: "🍰",
    category: "საცხობი",
    title: "ტკბილეულის სიურპრიზი",
    description: "ჩურჩხელა, ფელამუში და ტკბილი გოზინაყი.",
    image: bagSweets,
    originalPrice: 28, price: 9,
    pickupFrom: "18:30", pickupTo: "20:30",
    district: "ისანი", address: "ქეთევან წამებულის გამზ. 44",
    distanceKm: 3.4, rating: 4.9, reviewCount: 421, itemsLeft: 5,
    delivery: true, deliveryFee: 4, isSurprise: true,
  },
  {
    id: "o6", storeId: "s3", storeName: "მაჭახელა", storeLogo: "🧀",
    category: "რესტორანი",
    title: "ქართული სამზარეულოს პაკეტი",
    description: "ხინკალი, ხაჭაპური, სალათი — რესტორნის დღის საუკეთესო.",
    image: bagKhachapuri,
    originalPrice: 50, price: 18,
    pickupFrom: "22:00", pickupTo: "23:00",
    district: "ვერა", address: "კოსტავას ქ. 32",
    distanceKm: 2.1, rating: 4.6, reviewCount: 512, itemsLeft: 1,
    delivery: true, deliveryFee: 5, isSurprise: true,
  },
  {
    id: "o7", storeId: "s7", storeName: "კულა კაფე", storeLogo: "☕",
    category: "კაფე",
    title: "დილის კაფე + ორცხობილა",
    description: "ცხელი ცომეული და კაფე ან ჩაი 50%+ ფასდაკლებით.",
    image: bagBakery,
    originalPrice: 18, price: 6,
    pickupFrom: "11:00", pickupTo: "12:30",
    district: "მთაწმინდა", address: "მთაწმინდის ქ. 8",
    distanceKm: 2.8, rating: 4.7, reviewCount: 134, itemsLeft: 7,
    delivery: false, deliveryFee: 0,
  },
];

export const CATEGORIES: { id: Category | "ყველა"; label: string; icon: string }[] = [
  { id: "ყველა", label: "ყველა", icon: "✨" },
  { id: "საცხობი", label: "საცხობი", icon: "🥖" },
  { id: "საკონდიტრო", label: "საკონდიტრო", icon: "🍰" },
  { id: "საოჯახო სამზრეულო", label: "საოჯახო სამზრეულო", icon: "🍲" },
  { id: "რესტორანი", label: "რესტორანი", icon: "🍽️" },
  { id: "სუპერმარკეტი", label: "მარკეტი", icon: "🛒" },
  { id: "კაფე", label: "კაფე", icon: "☕" },
  { id: "სუში", label: "სუში", icon: "🍣" },
  { id: "პიცა", label: "პიცა", icon: "🍕" },
];

export const DISTRICTS = ["ყველა უბანი", "ვაკე", "საბურთალო", "ვერა", "ისანი", "დიღომი", "მთაწმინდა", "ჩუღურეთი", "ნაძალადევი", "სამგორი"];

type UiLanguage = "ka" | "en" | "ru" | "tr" | "fa";

const CATEGORY_LABELS: Record<Category | "ყველა", Record<UiLanguage, string>> = {
  "ყველა": { ka: "ყველა", en: "All", ru: "Все", tr: "Tümü", fa: "همه" },
  "საცხობი": { ka: "საცხობი", en: "Bakery", ru: "Пекарня", tr: "Fırın", fa: "نانوایی" },
  "საკონდიტრო": { ka: "საკონდიტრო", en: "Patisserie", ru: "Кондитерская", tr: "Pastane", fa: "شیرینی‌فروشی" },
  "საოჯახო სამზრეულო": { ka: "საოჯახო სამზრეულო", en: "Home Kitchen", ru: "Домашняя кухня", tr: "Ev Yemekleri", fa: "غذای خانگی" },
  "რესტორანი": { ka: "რესტორანი", en: "Restaurant", ru: "Ресторан", tr: "Restoran", fa: "رستوران" },
  "სუპერმარკეტი": { ka: "მარკეტი", en: "Market", ru: "Маркет", tr: "Market", fa: "سوپرمارکت" },
  "კაფე": { ka: "კაფე", en: "Cafe", ru: "Кафе", tr: "Kafe", fa: "کافه" },
  "სუში": { ka: "სუში", en: "Sushi", ru: "Суши", tr: "Suşi", fa: "سوشی" },
  "პიცა": { ka: "პიცა", en: "Pizza", ru: "Пицца", tr: "Pizza", fa: "پیتزا" },
};

const DISTRICT_LABELS: Record<string, Record<UiLanguage, string>> = {
  "ყველა უბანი": { ka: "ყველა უბანი", en: "All districts", ru: "Все районы", tr: "Tüm semtler", fa: "همه محله‌ها" },
  "ვაკე": { ka: "ვაკე", en: "Vake", ru: "Ваке", tr: "Vake", fa: "واکه" },
  "საბურთალო": { ka: "საბურთალო", en: "Saburtalo", ru: "Сабуртало", tr: "Saburtalo", fa: "سابورتالو" },
  "ვერა": { ka: "ვერა", en: "Vera", ru: "Вера", tr: "Vera", fa: "ورا" },
  "ისანი": { ka: "ისანი", en: "Isani", ru: "Исани", tr: "İsani", fa: "ایسانی" },
  "დიღომი": { ka: "დიღომი", en: "Dighomi", ru: "Дигоми", tr: "Dighomi", fa: "دیقومی" },
  "მთაწმინდა": { ka: "მთაწმინდა", en: "Mtatsminda", ru: "Мтацминда", tr: "Mtatsminda", fa: "متاتسمیندا" },
  "ჩუღურეთი": { ka: "ჩუღურეთი", en: "Chughureti", ru: "Чугурети", tr: "Chughureti", fa: "چوقورتی" },
  "ნაძალადევი": { ka: "ნაძალადევი", en: "Nadzaladevi", ru: "Надзаладеви", tr: "Nadzaladevi", fa: "نادزالادوی" },
  "სამგორი": { ka: "სამგორი", en: "Samgori", ru: "Самгори", tr: "Samgori", fa: "سامگوری" },
};

const STORE_LABELS: Record<string, Record<UiLanguage, string>> = {
  s1: { ka: "პური გულიანი", en: "Puri Guliani", ru: "Пури Гулиани", tr: "Puri Guliani", fa: "پوری گولیانی" },
  s2: { ka: "ენტრე", en: "Entree", ru: "Энтре", tr: "Entree", fa: "آنتره" },
  s3: { ka: "მაჭახელა", en: "Machakhela", ru: "Мачахела", tr: "Machakhela", fa: "ماچاخلا" },
  s4: { ka: "კარფური", en: "Carrefour", ru: "Карфур", tr: "Carrefour", fa: "کارفور" },
  s5: { ka: "ნიკალა", en: "Nikala", ru: "Никала", tr: "Nikala", fa: "نیکالا" },
  s6: { ka: "ტოკიო სუში", en: "Tokyo Sushi", ru: "Токио Суши", tr: "Tokyo Suşi", fa: "توکیو سوشی" },
  s7: { ka: "კულა კაფე", en: "Kula Cafe", ru: "Кула Кафе", tr: "Kula Kafe", fa: "کولا کافه" },
  s8: { ka: "აგრო-ჰაბი", en: "Agrohub", ru: "Агрохаб", tr: "Agrohub", fa: "آگروهاب" },
};

const OFFER_TEXT: Record<string, Record<UiLanguage, { title: string; description: string }>> = {
  o1: {
    ka: { title: "სიურპრიზ პაკეტი — საცხობი", description: "ხაჭაპური, ლობიანი და დღის ცხობილი პური. ზუსტი შემადგენლობა სიურპრიზია!" },
    en: { title: "Bakery surprise bag", description: "Khachapuri, lobiani, and fresh bread from today. The exact mix is a surprise!" },
    ru: { title: "Сюрприз-пакет из пекарни", description: "Хачапури, лобиани и свежий хлеб дня. Точный состав — сюрприз!" },
    tr: { title: "Fırın sürpriz paketi", description: "Haçapuri, lobiani ve günün taze ekmeği. Tam içeriği sürpriz!" },
    fa: { title: "بسته سورپرایز نانوایی", description: "خاچاپوری، لوبیانی و نان تازه امروز. ترکیب دقیق آن سورپرایز است!" },
  },
  o2: {
    ka: { title: "ფრანგული საცხობის პაკეტი", description: "კრუასანები, ბაგეტები და ტკბილეული — ყველა დღეს გამომცხვარი." },
    en: { title: "French bakery bag", description: "Croissants, baguettes, and pastries — all baked today." },
    ru: { title: "Пакет французской пекарни", description: "Круассаны, багеты и сладкая выпечка — всё испечено сегодня." },
    tr: { title: "Fransız fırın paketi", description: "Kruvasanlar, baget ekmekler ve tatlılar — hepsi bugün pişirildi." },
    fa: { title: "بسته نانوایی فرانسوی", description: "کروسان، باگت و شیرینی — همه امروز پخته شده." },
  },
  o3: {
    ka: { title: "სუშის ნაკრები", description: "12-16 ცალი სუში დღის ასორტიმენტიდან." },
    en: { title: "Sushi set", description: "12–16 sushi pieces from today's selection." },
    ru: { title: "Суши-сет", description: "12–16 кусочков суши из ассортимента дня." },
    tr: { title: "Suşi seti", description: "Günün seçkisinden 12–16 parça suşi." },
    fa: { title: "ست سوشی", description: "۱۲ تا ۱۶ تکه سوشی از انتخاب امروز." },
  },
  o4: {
    ka: { title: "ბოსტნეულის და ხილის კალათა", description: "სეზონური ბოსტნეული და ხილი — სრულიად კარგი, უბრალოდ ესთეტიკურად „არასრულყოფილი“." },
    en: { title: "Fruit and vegetable basket", description: "Seasonal fruit and vegetables — perfectly good, just visually imperfect." },
    ru: { title: "Корзина овощей и фруктов", description: "Сезонные овощи и фрукты — полностью хорошие, просто внешне неидеальные." },
    tr: { title: "Meyve ve sebze sepeti", description: "Mevsim meyve ve sebzeleri — tamamen taze, sadece görsel olarak kusurlu." },
    fa: { title: "سبد میوه و سبزیجات", description: "میوه و سبزیجات فصلی — کاملاً سالم، فقط از نظر ظاهری کامل نیست." },
  },
  o5: {
    ka: { title: "ტკბილეულის სიურპრიზი", description: "ჩურჩხელა, ფელამუში და ტკბილი გოზინაყი." },
    en: { title: "Dessert surprise", description: "Churchkhela, pelamushi, and sweet gozinaki." },
    ru: { title: "Сладкий сюрприз", description: "Чурчхела, пеламуши и сладкий гозинаки." },
    tr: { title: "Tatlı sürprizi", description: "Çurçhela, pelamuşi ve tatlı gozinaki." },
    fa: { title: "سورپرایز شیرینی", description: "چورچخلا، پلاموشی و گوزیناکی شیرین." },
  },
  o6: {
    ka: { title: "ქართული სამზარეულოს პაკეტი", description: "ხინკალი, ხაჭაპური, სალათი — რესტორნის დღის საუკეთესო." },
    en: { title: "Georgian cuisine bag", description: "Khinkali, khachapuri, salad — the restaurant's best of the day." },
    ru: { title: "Пакет грузинской кухни", description: "Хинкали, хачапури, салат — лучшее за день из ресторана." },
    tr: { title: "Gürcü mutfağı paketi", description: "Hinkali, haçapuri, salata — restoranın günün en iyileri." },
    fa: { title: "بسته آشپزی گرجی", description: "خینکالی، خاچاپوری، سالاد — بهترین‌های امروز رستوران." },
  },
  o7: {
    ka: { title: "დილის კაფე + ორცხობილა", description: "ცხელი ცომეული და კაფე ან ჩაი 50%+ ფასდაკლებით." },
    en: { title: "Morning coffee + cookies", description: "Fresh pastries plus coffee or tea, 50%+ off." },
    ru: { title: "Утренний кофе + печенье", description: "Свежая выпечка и кофе или чай со скидкой 50%+." },
    tr: { title: "Sabah kahvesi + kurabiye", description: "Taze hamur işleri artı kahve veya çay, %50+ indirimli." },
    fa: { title: "قهوه صبحگاهی + بیسکویت", description: "شیرینی تازه به همراه قهوه یا چای، با ۵۰٪+ تخفیف." },
  },
};

export function formatPrice(n: number) {
  return formatGel(n);
}

export function getCategoryLabel(id: Category | "ყველა", language: UiLanguage) {
  return CATEGORY_LABELS[id]?.[language] ?? id;
}

export function getDistrictLabel(id: string, language: UiLanguage) {
  return DISTRICT_LABELS[id]?.[language] ?? id;
}

export function getStoreName(
  offerOrStore:
    | Pick<Offer, "storeId" | "storeName"> & Partial<Pick<Offer, "storeNameEn" | "storeNameRu">>
    | Pick<Store, "id" | "name"> & Partial<Pick<Store, "nameEn" | "nameRu">>,
  language: UiLanguage,
) {
  const id = "storeId" in offerOrStore ? offerOrStore.storeId : offerOrStore.id;
  const fallback = "storeName" in offerOrStore ? offerOrStore.storeName : offerOrStore.name;
  // Mock hardcoded translations win only for mock IDs (real DB uses uuids that never match).
  const mock = STORE_LABELS[id]?.[language];
  if (mock) return mock;
  const en = "storeNameEn" in offerOrStore ? offerOrStore.storeNameEn : (offerOrStore as { nameEn?: string }).nameEn;
  const ru = "storeNameRu" in offerOrStore ? offerOrStore.storeNameRu : (offerOrStore as { nameRu?: string }).nameRu;
  if (language === "en" && en && en.trim()) return en;
  if (language === "ru" && ru && ru.trim()) return ru;
  if ((language === "tr" || language === "fa") && en && en.trim()) return en;
  return fallback;
}

export function getOfferText(offer: Offer, language: UiLanguage) {
  const mock = OFFER_TEXT[offer.id]?.[language];
  if (mock) return mock;
  const title =
    language === "en" ? (offer.titleEn?.trim() || offer.title)
    : language === "ru" ? (offer.titleRu?.trim() || offer.title)
    : language === "tr" ? (offer.titleEn?.trim() || offer.title)
    : language === "fa" ? (offer.titleEn?.trim() || offer.title)
    : offer.title;
  const description =
    language === "en" ? (offer.descriptionEn?.trim() || offer.description)
    : language === "ru" ? (offer.descriptionRu?.trim() || offer.description)
    : language === "tr" ? (offer.descriptionEn?.trim() || offer.description)
    : language === "fa" ? (offer.descriptionEn?.trim() || offer.description)
    : offer.description;
  return { title, description };
}

// Multi-language keyword tags per offer — used by search so typing a food
// name in any language (ka/en/ru) matches related offers.
const OFFER_KEYWORDS: Record<string, string[]> = {
  o1: ["ხაჭაპური","ლობიანი","პური","საცხობი","ცომეული","khachapuri","lobiani","bread","bakery","хачапури","лобиани","хлеб","пекарня","выпечка"],
  o2: ["კრუასანი","ბაგეტი","ტკბილეული","საცხობი","ცომეული","croissant","baguette","pastry","bakery","круассан","багет","выпечка","пекарня","сладости"],
  o3: ["სუში","როლი","იაპონური","sushi","roll","japanese","суши","роллы","японская"],
  o4: ["ხილი","ბოსტნეული","კალათა","ვეგან","fruit","vegetable","produce","basket","vegan","фрукты","овощи","корзина","веган"],
  o5: ["ტკბილეული","დესერტი","ჩურჩხელა","ფელამუში","გოზინაყი","dessert","sweets","churchkhela","gozinaki","десерт","сладости","чурчхела","пеламуши","гозинаки"],
  o6: ["ხინკალი","ხაჭაპური","ქართული","რესტორანი","სალათი","khinkali","khachapuri","georgian","restaurant","salad","хинкали","хачапури","грузинская","ресторан","салат"],
  o7: ["კაფე","ყავა","ჩაი","ორცხობილა","ცომეული","coffee","tea","cookies","cafe","pastry","кафе","кофе","чай","печенье","выпечка"],
};

export function offerMatchesQuery(offer: Offer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const langs: UiLanguage[] = ["ka", "en", "ru", "tr", "fa"];
  const parts: string[] = [];
  for (const l of langs) {
    const t = OFFER_TEXT[offer.id]?.[l];
    if (t) parts.push(t.title, t.description);
    const sn = STORE_LABELS[offer.storeId]?.[l];
    if (sn) parts.push(sn);
    parts.push(CATEGORY_LABELS[offer.category]?.[l] ?? "");
  }
  // Partner-provided translations from DB rows.
  parts.push(
    offer.title, offer.description, offer.storeName, offer.category,
    offer.titleEn ?? "", offer.titleRu ?? "",
    offer.descriptionEn ?? "", offer.descriptionRu ?? "",
    offer.storeNameEn ?? "", offer.storeNameRu ?? "",
  );
  parts.push(...(OFFER_KEYWORDS[offer.id] ?? []));
  return parts.join(" \n ").toLowerCase().includes(q);
}


export function findOffer(id: string) {
  return OFFERS.find((o) => o.id === id);
}

export function findStore(id: string) {
  return STORES.find((s) => s.id === id);
}

// -------- Offer detail helpers (allergens / ingredients / pickup instructions) --------

type Localized = Record<UiLanguage, string>;

const ALLERGENS_BY_CATEGORY: Record<Category, Localized[]> = {
  "საცხობი": [
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен", tr: "Gluten", fa: "گلوتن" },
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные", tr: "Süt ürünü", fa: "لبنیات" },
    { ka: "კვერცხი", en: "Eggs", ru: "Яйца", tr: "Yumurta", fa: "تخم‌مرغ" },
  ],
  "საკონდიტრო": [
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен", tr: "Gluten", fa: "گلوتن" },
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные", tr: "Süt ürünü", fa: "لبنیات" },
    { ka: "კვერცხი", en: "Eggs", ru: "Яйца", tr: "Yumurta", fa: "تخم‌مرغ" },
    { ka: "თხილეული", en: "Nuts", ru: "Орехи", tr: "Kuruyemiş", fa: "آجیل" },
  ],
  "საოჯახო სამზრეულო": [
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен", tr: "Gluten", fa: "گلوتن" },
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные", tr: "Süt ürünü", fa: "لبنیات" },
    { ka: "კვერცხი", en: "Eggs", ru: "Яйца", tr: "Yumurta", fa: "تخم‌مرغ" },
  ],
  "რესტორანი": [
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен", tr: "Gluten", fa: "گلوتن" },
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные", tr: "Süt ürünü", fa: "لبنیات" },
  ],
  "სუპერმარკეტი": [],
  "კაფე": [
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные", tr: "Süt ürünü", fa: "لبنیات" },
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен", tr: "Gluten", fa: "گلوتن" },
  ],
  "სუში": [
    { ka: "თევზი", en: "Fish", ru: "Рыба", tr: "Balık", fa: "ماهی" },
    { ka: "სოია", en: "Soy", ru: "Соя", tr: "Soya", fa: "سویا" },
    { ka: "მოლუსკები", en: "Shellfish", ru: "Моллюски", tr: "Kabuklu deniz ürünleri", fa: "صدف‌داران" },
  ],
  "პიცა": [
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен", tr: "Gluten", fa: "گلوتن" },
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные", tr: "Süt ürünü", fa: "لبنیات" },
  ],
};

const INGREDIENTS_BY_OFFER: Record<string, Localized[]> = {
  o1: [
    { ka: "ხაჭაპური", en: "Khachapuri", ru: "Хачапури", tr: "Haçapuri", fa: "خاچاپوری" },
    { ka: "ლობიანი", en: "Lobiani", ru: "Лобиани", tr: "Lobiani", fa: "لوبیانی" },
    { ka: "დღის პური", en: "Fresh bread", ru: "Свежий хлеб", tr: "Taze ekmek", fa: "نان تازه" },
  ],
  o2: [
    { ka: "კრუასანი", en: "Croissant", ru: "Круассан", tr: "Kruvasan", fa: "کروسان" },
    { ka: "ბაგეტი", en: "Baguette", ru: "Багет", tr: "Baget", fa: "باگت" },
    { ka: "ტკბილი ცომეული", en: "Sweet pastry", ru: "Сладкая выпечка", tr: "Tatlı hamur işi", fa: "شیرینی" },
  ],
  o3: [
    { ka: "ორაგული", en: "Salmon", ru: "Лосось", tr: "Somon", fa: "سالمون" },
    { ka: "ტუნა", en: "Tuna", ru: "Тунец", tr: "Ton balığı", fa: "تن ماهی" },
    { ka: "ავოკადო", en: "Avocado", ru: "Авокадо", tr: "Avokado", fa: "آووکادو" },
    { ka: "ბრინჯი", en: "Rice", ru: "Рис", tr: "Pirinç", fa: "برنج" },
  ],
  o4: [
    { ka: "სეზონური ხილი", en: "Seasonal fruit", ru: "Сезонные фрукты", tr: "Mevsim meyvesi", fa: "میوه فصلی" },
    { ka: "სეზონური ბოსტნეული", en: "Seasonal vegetables", ru: "Сезонные овощи", tr: "Mevsim sebzesi", fa: "سبزیجات فصلی" },
  ],
  o5: [
    { ka: "ჩურჩხელა", en: "Churchkhela", ru: "Чурчхела", tr: "Çurçhela", fa: "چورچخلا" },
    { ka: "ფელამუში", en: "Pelamushi", ru: "Пеламуши", tr: "Pelamuşi", fa: "پلاموشی" },
    { ka: "გოზინაყი", en: "Gozinaki", ru: "Гозинаки", tr: "Gozinaki", fa: "گوزیناکی" },
  ],
  o6: [
    { ka: "ხინკალი", en: "Khinkali", ru: "Хинкали", tr: "Hinkali", fa: "خینکالی" },
    { ka: "ხაჭაპური", en: "Khachapuri", ru: "Хачапури", tr: "Haçapuri", fa: "خاچاپوری" },
    { ka: "სალათი", en: "Salad", ru: "Салат", tr: "Salata", fa: "سالاد" },
  ],
  o7: [
    { ka: "ყავა ან ჩაი", en: "Coffee or tea", ru: "Кофе или чай", tr: "Kahve veya çay", fa: "قهوه یا چای" },
    { ka: "ცომეული", en: "Pastry", ru: "Выпечка", tr: "Hamur işi", fa: "شیرینی" },
  ],
};

export function getAllergens(offer: Offer, language: UiLanguage): string[] {
  return (ALLERGENS_BY_CATEGORY[offer.category] ?? []).map((l) => l[language]);
}

export function getIngredients(offer: Offer, language: UiLanguage): string[] {
  return (INGREDIENTS_BY_OFFER[offer.id] ?? []).map((l) => l[language]);
}

export function getPickupInstructions(offer: Offer, language: UiLanguage): string {
  const store = getStoreName(offer, language);
  if (language === "en") {
    return `Show your QR code at the counter of ${store} between ${offer.pickupFrom} and ${offer.pickupTo}. Please arrive on time — bags are prepared just before pickup.`;
  }
  if (language === "ru") {
    return `Покажите QR-код на кассе ${store} с ${offer.pickupFrom} до ${offer.pickupTo}. Приходите вовремя — пакет готовится непосредственно перед выдачей.`;
  }
  if (language === "tr") {
    return `QR kodunuzu ${store} kasasında ${offer.pickupFrom} ile ${offer.pickupTo} arasında gösterin. Lütfen zamanında gelin — paketler alım öncesinde hazırlanır.`;
  }
  if (language === "fa") {
    return `کد QR خود را در صندوق ${store} بین ساعت ${offer.pickupFrom} تا ${offer.pickupTo} نشان دهید. لطفاً به‌موقع مراجعه کنید — بسته‌ها درست قبل از تحویل آماده می‌شوند.`;
  }
  return `მიუტანე QR კოდი ${store}-ის სალაროზე ${offer.pickupFrom}–${offer.pickupTo}. მიბრძანდით დროულად — პაკეტი მზადდება აღების წინ.`;
}

export function getSimilarOffers(offer: Offer, limit = 4): Offer[] {
  return OFFERS
    .filter((o) => o.id !== offer.id && o.category === offer.category)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
