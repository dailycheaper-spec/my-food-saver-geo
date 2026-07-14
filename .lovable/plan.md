
# SaveBite Partner Dashboard

მოდერნიზაცია პარტნიორის პანელისა Apple-inspired დიზაინით, ძალიან მარტივი ინტერფეისით ნებისმიერი თანამშრომლისთვის. ყველა ცვლილება realtime-ში, refresh-ის გარეშე.

## Architecture

- **Route root:** `/partner` (უკვე არსებული `_authenticated/partner.tsx` გადავანაწილოთ layout-ად `<Outlet />` + child routes)
- **Layout:** ქვედა tab bar მობილურზე, გვერდითი nav დესქტოპზე
- **Backend:** Supabase (auth/db/realtime), FastAPI Backend-ის ნაცვლად ვინარჩუნებთ Supabase-ს (Lovable Cloud-ის ბუნებრივი stack). FastAPI-ს ცალკე გაშვება არ არის საჭირო — ყველა ლოგიკა server functions + Supabase-ით.

## Routes

```
/partner              → Home (4 დიდი ღილაკი)
/partner/new          → New Offer (სრული ფორმა)
/partner/quick        → Quick Offer (saved products)
/partner/ai           → AI Mode (ტექსტი/ხმა → auto-fill)
/partner/offers       → Active Offers
/partner/orders       → Orders (realtime)
/partner/stats        → Statistics
/partner/balance      → Balance/Earnings
/partner/profile      → Business Profile
```

## Database additions

- `saved_products` (partner-ის შენახული პროდუქტები Quick Offer-ისთვის): store_id, name, category, default_price, photo_url, active
- `payouts` (გადახდები): store_id, amount, status, paid_at
- `offers` ცხრილს დავამატებთ `photo_url` თუ არ არსებობს
- Realtime enable: `orders`, `offers`, `saved_products`

## Features per screen

**Home:** 4 gradient card ღილაკი (glass morphism, დიდი icons, haptic-ready)

**New Offer:** სრული ფორმა photo upload-ით (Supabase Storage bucket `offer-photos`)

**Quick Offer:** grid saved products-ის; tap → quantity + discount % + Publish (3 tap-ში)

**AI Mode:** Lovable AI Gateway (`google/gemini-2.5-flash`) სტრუქტურირებული output-ით → JSON offer draft; Speech-to-text `openai/gpt-4o-mini-transcribe` ხმისთვის

**Active Offers:** realtime cards, inline +/- quantity, edit modal, finish button

**Orders:** მხოლოდ `paid` სტატუსი, realtime insert alerts (ხმა + toast), QR display, Mark Picked Up → `fulfilled`

**Balance:** aggregate SQL views today/week/pending/last payout, 10% platform commission

**Statistics:** today orders/revenue, top product, kg saved (assume 0.4kg per offer)

**Profile:** stores CRUD + working_hours JSON + delivery toggle

**Notifications:** ერთი realtime channel `__root`-ში, Web Notification API + in-app toast + badge

## Design system

- Apple-inspired: SF-like typography (Noto Sans Georgian + Inter fallback), დიდი radius (`--radius: 1.25rem`), soft shadows, subtle gradients
- ერთი primary color: warm green `oklch(0.65 0.18 145)` (food-saving)
- Semantic tokens `src/styles.css`-ში, dark mode support
- ყველა ღილაკი მინიმუმ 56px სიმაღლის (touch-friendly)
- Max 3 taps rule: Home → Quick → Publish

## Technical details

- Login უკვე არსებობს `/auth`-ზე (Email+Password, Google, Phone OTP). დავამატებთ direct Phone OTP tab-ს პარტნიორის მთავარი login-ისთვის.
- FastAPI Backend-ის ნაცვლად ვიყენებთ TanStack `createServerFn` + Supabase (იგივე შედეგი, ერთ სტეკში). თუ FastAPI აუცილებელია, ცალკე repo-დ სჭირდება deploy — არ არის ამ პროექტში.

## Deliverables

1. Migration: `saved_products`, `payouts`, storage bucket, realtime publications, offers.photo_url
2. Partner layout ქვედა tab bar + top header
3. 9 route (home, new, quick, ai, offers, orders, stats, balance, profile)
4. AI parse server function
5. Realtime notification system
6. Design tokens update

## Out of scope

- FastAPI ცალკე backend (Supabase-ით ვცვლით)
- ხმოვანი recording UI-ის სრული polish (basic ჩავრთავთ)
- Real payout integration (mock/UI only)

დავიწყო შესრულება?
