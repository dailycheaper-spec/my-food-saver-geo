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
    delivery: true, deliveryFee: 3,
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
    description: "დღის დარჩენილი ცომეული და კაფე ან ჩაი.",
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

export function formatPrice(n: number) {
  return `${n.toFixed(2)} ₾`;
}

export function findOffer(id: string) {
  return OFFERS.find((o) => o.id === id);
}

export function findStore(id: string) {
  return STORES.find((s) => s.id === id);
}
