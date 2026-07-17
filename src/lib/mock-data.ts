import bagBakery from "@/assets/bag-bakery.jpg";
import bagKhachapuri from "@/assets/bag-khachapuri.jpg";
import bagSushi from "@/assets/bag-sushi.jpg";
import bagProduce from "@/assets/bag-produce.jpg";
import bagSweets from "@/assets/bag-sweets.jpg";

export type Category = "საცხობი" | "რესტორანი" | "სუპერმარკეტი" | "კაფე" | "სუში";

export interface Offer {
  id: string;
  storeId: string;
  storeName: string;
  storeLogo: string;
  category: Category;
  title: string;
  description: string;
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
  lat?: number;
  lng?: number;
  createdAt?: number; // epoch ms — used for NEW badge
  isSurprise?: boolean; // mystery bag — contents revealed at pickup
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
    delivery: true, deliveryFee: 3, createdAt: NOW - 2 * 60 * 1000, // 2 min ago → NEW
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
    delivery: true, deliveryFee: 4,
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
    delivery: true, deliveryFee: 4,
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
    delivery: true, deliveryFee: 5,
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
  { id: "რესტორანი", label: "რესტორანი", icon: "🍽️" },
  { id: "სუპერმარკეტი", label: "მარკეტი", icon: "🛒" },
  { id: "კაფე", label: "კაფე", icon: "☕" },
  { id: "სუში", label: "სუში", icon: "🍣" },
];

export const DISTRICTS = ["ყველა უბანი", "ვაკე", "საბურთალო", "ვერა", "ისანი", "დიღომი", "მთაწმინდა"];

type UiLanguage = "ka" | "en" | "ru";

const CATEGORY_LABELS: Record<Category | "ყველა", Record<UiLanguage, string>> = {
  "ყველა": { ka: "ყველა", en: "All", ru: "Все" },
  "საცხობი": { ka: "საცხობი", en: "Bakery", ru: "Пекарня" },
  "რესტორანი": { ka: "რესტორანი", en: "Restaurant", ru: "Ресторан" },
  "სუპერმარკეტი": { ka: "მარკეტი", en: "Market", ru: "Маркет" },
  "კაფე": { ka: "კაფე", en: "Cafe", ru: "Кафе" },
  "სუში": { ka: "სუში", en: "Sushi", ru: "Суши" },
};

const DISTRICT_LABELS: Record<string, Record<UiLanguage, string>> = {
  "ყველა უბანი": { ka: "ყველა უბანი", en: "All districts", ru: "Все районы" },
  "ვაკე": { ka: "ვაკე", en: "Vake", ru: "Ваке" },
  "საბურთალო": { ka: "საბურთალო", en: "Saburtalo", ru: "Сабуртало" },
  "ვერა": { ka: "ვერა", en: "Vera", ru: "Вера" },
  "ისანი": { ka: "ისანი", en: "Isani", ru: "Исани" },
  "დიღომი": { ka: "დიღომი", en: "Dighomi", ru: "Дигоми" },
  "მთაწმინდა": { ka: "მთაწმინდა", en: "Mtatsminda", ru: "Мтацминда" },
};

const STORE_LABELS: Record<string, Record<UiLanguage, string>> = {
  s1: { ka: "პური გულიანი", en: "Puri Guliani", ru: "Пури Гулиани" },
  s2: { ka: "ენტრე", en: "Entree", ru: "Энтре" },
  s3: { ka: "მაჭახელა", en: "Machakhela", ru: "Мачахела" },
  s4: { ka: "კარფური", en: "Carrefour", ru: "Карфур" },
  s5: { ka: "ნიკალა", en: "Nikala", ru: "Никала" },
  s6: { ka: "ტოკიო სუში", en: "Tokyo Sushi", ru: "Токио Суши" },
  s7: { ka: "კულა კაფე", en: "Kula Cafe", ru: "Кула Кафе" },
  s8: { ka: "აგრო-ჰაბი", en: "Agrohub", ru: "Агрохаб" },
};

const OFFER_TEXT: Record<string, Record<UiLanguage, { title: string; description: string }>> = {
  o1: {
    ka: { title: "სიურპრიზ პაკეტი — საცხობი", description: "ხაჭაპური, ლობიანი და დღის ცხობილი პური. ზუსტი შემადგენლობა სიურპრიზია!" },
    en: { title: "Bakery surprise bag", description: "Khachapuri, lobiani, and fresh bread from today. The exact mix is a surprise!" },
    ru: { title: "Сюрприз-пакет из пекарни", description: "Хачапури, лобиани и свежий хлеб дня. Точный состав — сюрприз!" },
  },
  o2: {
    ka: { title: "ფრანგული საცხობის პაკეტი", description: "კრუასანები, ბაგეტები და ტკბილეული — ყველა დღეს გამომცხვარი." },
    en: { title: "French bakery bag", description: "Croissants, baguettes, and pastries — all baked today." },
    ru: { title: "Пакет французской пекарни", description: "Круассаны, багеты и сладкая выпечка — всё испечено сегодня." },
  },
  o3: {
    ka: { title: "სუშის ნაკრები", description: "12-16 ცალი სუში დღის ასორტიმენტიდან." },
    en: { title: "Sushi set", description: "12–16 sushi pieces from today's selection." },
    ru: { title: "Суши-сет", description: "12–16 кусочков суши из ассортимента дня." },
  },
  o4: {
    ka: { title: "ბოსტნეულის და ხილის კალათა", description: "სეზონური ბოსტნეული და ხილი — სრულიად კარგი, უბრალოდ ესთეტიკურად „არასრულყოფილი“." },
    en: { title: "Fruit and vegetable basket", description: "Seasonal fruit and vegetables — perfectly good, just visually imperfect." },
    ru: { title: "Корзина овощей и фруктов", description: "Сезонные овощи и фрукты — полностью хорошие, просто внешне неидеальные." },
  },
  o5: {
    ka: { title: "ტკბილეულის სიურპრიზი", description: "ჩურჩხელა, ფელამუში და ტკბილი გოზინაყი." },
    en: { title: "Dessert surprise", description: "Churchkhela, pelamushi, and sweet gozinaki." },
    ru: { title: "Сладкий сюрприз", description: "Чурчхела, пеламуши и сладкий гозинаки." },
  },
  o6: {
    ka: { title: "ქართული სამზარეულოს პაკეტი", description: "ხინკალი, ხაჭაპური, სალათი — რესტორნის დღის საუკეთესო." },
    en: { title: "Georgian cuisine bag", description: "Khinkali, khachapuri, salad — the restaurant's best of the day." },
    ru: { title: "Пакет грузинской кухни", description: "Хинкали, хачапури, салат — лучшее за день из ресторана." },
  },
  o7: {
    ka: { title: "დილის კაფე + ორცხობილა", description: "ცხელი ცომეული და კაფე ან ჩაი 50%+ ფასდაკლებით." },
    en: { title: "Morning coffee + cookies", description: "Fresh pastries plus coffee or tea, 50%+ off." },
    ru: { title: "Утренний кофе + печенье", description: "Свежая выпечка и кофе или чай со скидкой 50%+." },
  },
};

export function formatPrice(n: number) {
  const lang = typeof window !== "undefined" ? (window.localStorage.getItem("cheaper-language") || "ka") : "ka";
  const sym = lang === "en" ? "GEL" : lang === "ru" ? "Лари" : "ლარი";
  return `${n.toFixed(2)} ${sym}`;
}

export function getCategoryLabel(id: Category | "ყველა", language: UiLanguage) {
  return CATEGORY_LABELS[id]?.[language] ?? id;
}

export function getDistrictLabel(id: string, language: UiLanguage) {
  return DISTRICT_LABELS[id]?.[language] ?? id;
}

export function getStoreName(offerOrStore: Pick<Offer, "storeId" | "storeName"> | Pick<Store, "id" | "name">, language: UiLanguage) {
  const id = "storeId" in offerOrStore ? offerOrStore.storeId : offerOrStore.id;
  const fallback = "storeName" in offerOrStore ? offerOrStore.storeName : offerOrStore.name;
  return STORE_LABELS[id]?.[language] ?? fallback;
}

export function getOfferText(offer: Offer, language: UiLanguage) {
  return OFFER_TEXT[offer.id]?.[language] ?? { title: offer.title, description: offer.description };
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
  const langs: UiLanguage[] = ["ka", "en", "ru"];
  const parts: string[] = [];
  for (const l of langs) {
    const t = OFFER_TEXT[offer.id]?.[l];
    if (t) parts.push(t.title, t.description);
    const sn = STORE_LABELS[offer.storeId]?.[l];
    if (sn) parts.push(sn);
    parts.push(CATEGORY_LABELS[offer.category]?.[l] ?? "");
  }
  parts.push(offer.title, offer.description, offer.storeName, offer.category);
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
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен" },
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные" },
    { ka: "კვერცხი", en: "Eggs", ru: "Яйца" },
  ],
  "რესტორანი": [
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен" },
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные" },
  ],
  "სუპერმარკეტი": [],
  "კაფე": [
    { ka: "რძის პროდუქტი", en: "Dairy", ru: "Молочные" },
    { ka: "გლუტენი", en: "Gluten", ru: "Глютен" },
  ],
  "სუში": [
    { ka: "თევზი", en: "Fish", ru: "Рыба" },
    { ka: "სოია", en: "Soy", ru: "Соя" },
    { ka: "მოლუსკები", en: "Shellfish", ru: "Моллюски" },
  ],
};

const INGREDIENTS_BY_OFFER: Record<string, Localized[]> = {
  o1: [
    { ka: "ხაჭაპური", en: "Khachapuri", ru: "Хачапури" },
    { ka: "ლობიანი", en: "Lobiani", ru: "Лобиани" },
    { ka: "დღის პური", en: "Fresh bread", ru: "Свежий хлеб" },
  ],
  o2: [
    { ka: "კრუასანი", en: "Croissant", ru: "Круассан" },
    { ka: "ბაგეტი", en: "Baguette", ru: "Багет" },
    { ka: "ტკბილი ცომეული", en: "Sweet pastry", ru: "Сладкая выпечка" },
  ],
  o3: [
    { ka: "ორაგული", en: "Salmon", ru: "Лосось" },
    { ka: "ტუნა", en: "Tuna", ru: "Тунец" },
    { ka: "ავოკადო", en: "Avocado", ru: "Авокадо" },
    { ka: "ბრინჯი", en: "Rice", ru: "Рис" },
  ],
  o4: [
    { ka: "სეზონური ხილი", en: "Seasonal fruit", ru: "Сезонные фрукты" },
    { ka: "სეზონური ბოსტნეული", en: "Seasonal vegetables", ru: "Сезонные овощи" },
  ],
  o5: [
    { ka: "ჩურჩხელა", en: "Churchkhela", ru: "Чурчхела" },
    { ka: "ფელამუში", en: "Pelamushi", ru: "Пеламуши" },
    { ka: "გოზინაყი", en: "Gozinaki", ru: "Гозинаки" },
  ],
  o6: [
    { ka: "ხინკალი", en: "Khinkali", ru: "Хинкали" },
    { ka: "ხაჭაპური", en: "Khachapuri", ru: "Хачапури" },
    { ka: "სალათი", en: "Salad", ru: "Салат" },
  ],
  o7: [
    { ka: "ყავა ან ჩაი", en: "Coffee or tea", ru: "Кофе или чай" },
    { ka: "ცომეული", en: "Pastry", ru: "Выпечка" },
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
  return `მიუტანე QR კოდი ${store}-ის კასაზე ${offer.pickupFrom}–${offer.pickupTo}. მოვედი დროულად — პაკეტი მზადდება აღების წინ.`;
}

export function getSimilarOffers(offer: Offer, limit = 4): Offer[] {
  return OFFERS
    .filter((o) => o.id !== offer.id && o.category === offer.category)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
