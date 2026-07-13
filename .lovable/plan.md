
# გემო — სრული პლატფორმა (მომხმარებელი + პარტნიორი + ადმინი)

პროექტს უკვე აქვს მომხმარებლის მხარე (რუკა, შეთავაზებები, QR, ავტორიზაცია, პროფილი). აქ ვამატებთ **რეალურ backend-ს Supabase-ით**, **პარტნიორის პანელს** და **ადმინის პანელს**, Realtime სინქრონით.

## რას ვამატებთ

### 1. მონაცემთა ბაზა (Supabase)
ცხრილები:
- `stores` — პარტნიორი მაღაზიები (სახელი, ლოგო, უბანი, კოორდინატები, მიღების საათები, სტატუსი: pending/active/suspended)
- `store_members` — რომელი user-ია რომელი store-ის პარტნიორი (many-to-many)
- `offers` — შეთავაზება (store_id, სათაური, აღწერა, ორიგინალი ფასი, ფასდაკლებული, რაოდენობა, კატეგორია, aღების ფანჯარა, delivery/pickup, სურათი, is_active)
- `orders` — შეკვეთა (user_id, offer_id, store_id, code, qr_payload, status: pending→paid→ready→collected/cancelled/gifted, method, amount, gifted_to)
- `user_roles` — ცალკე ცხრილი როლებისთვის (`app_role` enum: `admin`, `partner`, `user`) + `has_role()` security-definer function

RLS ყველა ცხრილზე:
- მომხმარებელი ხედავს მხოლოდ თავის შეკვეთებს, ყველა `is_active` შეთავაზებას
- პარტნიორი ხედავს/ცვლის მხოლოდ თავისი store-ის offers/orders-ს (`has_role('partner')` + `store_members`)
- ადმინი ხედავს ყველაფერს (`has_role('admin')`)

Realtime ჩართული `offers` და `orders` ცხრილებზე.

### 2. მომხმარებლის აპი (არსებული `/`)
- ცოცხალ Supabase-ის offers-ს ვუერთებთ (mock-data → DB)
- შეკვეთის შექმნა → `orders` insert → Realtime იღებს განახლებას
- QR კოდი შეიცავს რეალურ `order.id`-ს, რომელიც პარტნიორის panel-ში სკანირდება
- notification 1-2 კმ რადიუსში ახალი offer-ის შესახებ Realtime-ის საშუალებით

### 3. პარტნიორის პანელი — `/partner`
- `/partner` — dashboard (დღიური სტატისტიკა, აქტიური შეთავაზებები)
- `/partner/offers` — შეთავაზებების მართვა (CRUD, სურათი, ფასი, რაოდენობა, ვადა)
- `/partner/orders` — შემოსული შეკვეთები, **Realtime-ით** ცოცხლად ჩნდება ახალი გადახდილი
- `/partner/scan` — QR სკანერი (BarcodeDetector API + camera) → status=collected
- `/partner/store` — მაღაზიის პროფილი (მისამართი, საათები, ლოგო)

დაცული `/_authenticated/` ქვე-ხე + `has_role('partner')` beforeLoad-ში.

### 4. ადმინის პანელი — `/admin`
- `/admin` — მთელი პლატფორმის ანალიტიკა (users, orders, GMV, top stores)
- `/admin/partners` — pending პარტნიორების დამტკიცება, suspend/reactivate
- `/admin/stores` — ყველა store-ის ცხრილი
- `/admin/orders` — ყველა შეკვეთა, ფილტრით
- `/admin/users` — users + როლების მიცემა

დაცული `has_role('admin')`-ით.

### 5. როლის მართვა
- რეგისტრაციისას default: `user`
- `/partner/apply` — მომხმარებელი ავსებს ფორმას მაღაზიის შესახებ → `stores` row სტატუსით `pending`
- ადმინი ამტკიცებს → იქმნება `store_members` row + `user_roles` row სტატუსით `partner`

### 6. Realtime სცენარები
- პარტნიორის ეკრანზე ცოცხლად ჩნდება ახალი შეკვეთა (`orders` INSERT)
- მომხმარებელი ხედავს სტატუსის ცვლილებას (`orders` UPDATE) — "დაადასტურა პარტნიორმა"
- ახლომდებარე უბანში ახალი offer გამოჩენისას push (`offers` INSERT + geo filter კლიენტზე)

### 7. დიზაინი
თანამედროვე, მინიმალისტური. მომხმარებლის მხარე უკვე გვაქვს (თბილი მწვანე პალიტრა, Noto Sans Georgian). პარტნიორის/ადმინის პანელი — მკვეთრი, ცხრილებით, sidebar-ით, სწრაფი. იგივე დიზაინ-ტოკენებზე.

## ეტაპები (რიგით)

**ეტაპი A — Backend საფუძველი** (ეს ბიჯი)
1. Migration: enums, `stores`, `offers`, `orders`, `user_roles`, `store_members`, `has_role()`, RLS-ები, GRANT-ები, Realtime publication, სამი test store seed
2. მომხმარებლის მხარის მიგრაცია mock-data-დან DB-ზე (offers, orders)
3. QR კოდი რეალურ `order.id`-ს ინახავს

**ეტაპი B — პარტნიორის პანელი**
1. `/partner/apply` — მაღაზიის განაცხადი
2. `/_authenticated/partner/*` layout + `has_role('partner')` გეიტი
3. Offers CRUD, Orders realtime feed, QR სკანერი

**ეტაპი C — ადმინის პანელი**
1. `/_authenticated/admin/*` layout + `has_role('admin')` გეიტი
2. Partners approval, Stores/Orders/Users მართვა, ანალიტიკა

**ეტაპი D — Realtime notifications & polish**
1. Geo-based ახალი offer notifications
2. Sound alert პარტნიორის ეკრანზე ახალ შეკვეთაზე
3. Push-friendly manifest (PWA installability)

## ტექნიკური დეტალები

- **Auth**: მიმდინარე Supabase auth (email+password, Google, Apple, phone) — უცვლელი
- **RLS**: ყველა ცხრილზე; `has_role()` security-definer function (რეკურსიის თავიდან ასაცილებლად)
- **Server functions**: `createServerFn` privileged action-ებისთვის (მაგ. admin partner approval), თან `requireSupabaseAuth`-ით
- **Realtime**: `supabase.channel().on('postgres_changes', ...)` პარტნიორის orders და მომხმარებლის offers ეკრანებზე
- **QR სკანერი**: browser-native `BarcodeDetector` API სადაც არის, fallback: `@zxing/browser` (მოვამზადებ)
- **პირველი admin**: მიგრაციაში insert `user_roles(user_id, 'admin')` შენი user_id-სთვის (გავარკვევ ვინ ხარ registered users-ში)

## რას ვთხოვ დაუყოვნებლივ

ვიწყებ **ეტაპი A**-ს: მიგრაცია (schema + RLS + seed).
შემდეგ ეტაპებზე ცალკე ვისაუბრებთ, რომ პროგრესი დამტკიცო.

გავაგრძელო ეტაპი A?
