## მიზანი

ავაწყოთ დელივერის სისტემა Cheaper-ისთვის ისე, რომ **ერთი და იგივე კოდი** მუშაობდეს:
- **მაღაზიის საკუთარ კურიერზე** (in-house)
- **Cheaper-ის კურიერების აპზე** (მოგვიანებით)
- **გარე პროვაიდერებზე** — Wolt Drive, Bolt Food, Glovo Courier, GT-Taxi, ლოკალური კურიერული სამსახურები

გასაღები: **Provider Adapter Pattern** — ყველა კურიერი (საკუთარიც და გარეც) იმალება ერთი interface-ის უკან. მაღაზია/მომხმარებელი არაფერს გრძნობს.

---

## არქიტექტურა (მარტივი დიაგრამა)

```text
[Order created]
      │
      ▼
┌────────────────────────┐
│  Delivery Router       │  ← წესები: მანძილი, ფასი, ხელმისაწვდომობა
│  (გადაწყვეტს ვინ იტანს) │
└─────────┬──────────────┘
          │
   ┌──────┼──────┬────────┬────────┐
   ▼      ▼      ▼        ▼        ▼
[in-house][Cheaper][Wolt][Bolt][Manual/Store]
   │      │      │        │        │
   └──────┴──────┴────┬───┴────────┘
                     ▼
            [Delivery Adapter Interface]
   create() • status() • cancel() • webhook()
                     ▼
              [deliveries table]
                     ▼
        [Realtime → მომხმარებელი + პარტნიორი + ადმინი]
```

---

## რას ვაშენებ

### 1. Database schema (მიგრაცია)

**ახალი ცხრილი: `deliveries`**
- `id`, `order_id` (FK), `store_id`
- `provider` — enum: `in_house` | `cheaper_fleet` | `wolt` | `bolt` | `glovo` | `manual` | `external_generic`
- `provider_delivery_id` — გარე სისტემის ID (tracking-ისთვის)
- `status` — enum: `pending` | `assigned` | `picked_up` | `on_the_way` | `delivered` | `failed` | `cancelled`
- `courier_name`, `courier_phone`, `courier_lat`, `courier_lng` — realtime location
- `pickup_address`, `dropoff_address`, `dropoff_lat`, `dropoff_lng`
- `fee` (ლარი), `paid_by` — `customer` | `store` | `cheaper`
- `estimated_pickup_at`, `estimated_delivery_at`, `delivered_at`
- `provider_payload` (jsonb) — გარე API-ს raw response
- `notes`, `created_at`, `updated_at`

RLS: მომხმარებელი ხედავს თავისს, პარტნიორი — თავისი მაღაზიის, ადმინი — ყველას.
Realtime: enabled → live tracking.

**`stores`-ს ვამატებ:**
- `delivery_enabled` (bool)
- `delivery_radius_km`, `delivery_fee_base`, `delivery_fee_per_km`
- `delivery_providers` (text[]) — რომელი პროვაიდერები აქვს ჩართული
- `min_order_for_delivery`

**`orders`-ს ვამატებ:** `delivery_id` (FK → deliveries, nullable).

### 2. Provider Adapter Interface (კოდი)

`src/lib/delivery/types.ts` — ერთი TypeScript interface:

```ts
interface DeliveryProvider {
  id: 'in_house' | 'cheaper_fleet' | 'wolt' | 'bolt' | 'glovo' | 'manual'
  createDelivery(input): Promise<{ providerDeliveryId, fee, eta }>
  getStatus(providerDeliveryId): Promise<DeliveryStatus>
  cancelDelivery(providerDeliveryId): Promise<void>
  handleWebhook?(payload): Promise<void>
}
```

`src/lib/delivery/providers/`:
- `in-house.ts` — მაღაზიის კურიერი (მარტივი: მხოლოდ status update-ები)
- `manual.ts` — მაღაზია თვითონ არკვევს (ტელეფონით უწოდებს კურიერს)
- `wolt.ts`, `bolt.ts`, `glovo.ts` — **stub** ფაილები TODO-ებით, ინტერფეისის სრული იმპლემენტაცია, `throw new Error('Not configured')`-ით. მოგვიანებით რომ ხელშეკრულება იყოს, მხოლოდ 1 ფაილს ვავსებთ და ვმატებთ API key-ს secrets-ში.
- `cheaper-fleet.ts` — მოამზადებს ჩვენი კურიერების აპისთვის (როცა გავაკეთებთ)

`src/lib/delivery/registry.ts` — რეესტრი: provider ID → adapter. მაღაზია არჩევს რომელს რთავს.

### 3. Delivery Router (Server Function)

`src/lib/delivery/dispatch.functions.ts` — `createServerFn` რომელიც:
1. კითხულობს `store.delivery_providers` (რომელი პროვაიდერები აქვს ჩართული)
2. თანმიმდევრობით ცდის: **პრიორიტეტი** = in_house → cheaper_fleet → wolt → bolt → manual
3. პირველი წარმატებული = winner. ქმნის `deliveries` row-ს.
4. თუ ყველა ვერ მოახერხა → order → `delivery_failed`, ადმინს notification.

### 4. Webhook route-ები (გარე პროვაიდერების სტატუსების მისაღებად)

`src/routes/api/public/delivery/wolt.ts`
`src/routes/api/public/delivery/bolt.ts`
`src/routes/api/public/delivery/glovo.ts`

თითოეული:
- HMAC signature verification (secret env var-იდან)
- ვპოულობთ `deliveries` row-ს `provider_delivery_id`-თ
- ვანახლებთ სტატუსს + courier location
- Realtime ავტომატურად ეცნობება მომხმარებელს

ახლა ეს webhook-ები **მზადაა და მიდის 501** — მაგრამ URL-ები სტაბილურია, პროვაიდერს ერთადერთი რაც სჭირდება. ხელშეკრულების შემდეგ: secret-ს ვამატებთ + provider adapter-ს ვავსებთ. **კოდი აღარ იცვლება.**

### 5. UI — მინიმალური, მაგრამ სრული

**პარტნიორის პანელი** (`/partner/store` → Delivery Settings ტაბი):
- ჩართე/გამორთე მიტანა
- აირჩიე პროვაიდერები (checkbox: In-house, Cheaper Fleet [coming soon], Wolt [beta], Bolt [beta])
- რადიუსი, ბაზისური ფასი, ფასი/კმ, მინიმალური შეკვეთა

**პარტნიორის Orders გვერდი**:
- delivery order-ს ეწერება badge: "🚴 Wolt • ETA 20 წთ" ან "🏠 თქვენი კურიერი"
- In-house-ისთვის: ღილაკები (Assigned → Picked up → Delivered)
- გარე პროვაიდერისთვის: read-only tracking (მათ webhook-ები აახლებენ სტატუსს ავტომატურად)

**მომხმარებელი** (`/orders/$id`):
- Live delivery card: სტატუსი, ETA, კურიერის სახელი+ტელეფონი, რუკაზე მარკერი (თუ lat/lng გვაქვს)
- Realtime subscription `deliveries` table-ზე

**ადმინის პანელი** (`/admin` → ახალი ტაბი "Deliveries"):
- ყველა აქტიური delivery, პროვაიდერის მიხედვით ფილტრი
- Failed deliveries → manual reassign
- პროვაიდერის კონფიგურაცია (რომელი პროვაიდერი გლობალურად ჩართულია, API keys status)

### 6. i18n

ყველა ახალი label — KA/EN/RU სამივე ენაზე (`src/lib/i18n.tsx`).
ვალუტა უკვე დინამიური.

---

## რას **არ** ვაკეთებ ახლა (მოგვიანებით, კონტრაქტის შემდეგ)

- რეალური Wolt/Bolt/Glovo API calls — მხოლოდ stub-ები. როცა ხელშეკრულებას გააფორმებ, ვამატებთ API key-ს (`add_secret`) და ვავსებთ ერთ adapter ფაილს (~50 ხაზი კოდი, 30 წუთი).
- Cheaper-ის საკუთარი კურიერების მობილური აპი — ცალკე პროექტი. ახლა schema მზადდება (`cheaper_fleet` provider ID), მაგრამ UI არ იშენება.
- Live courier GPS tracking WebSocket — მონაცემები ბაზაში მოდის webhook-ებით (5-10 წამში ერთხელ ახლდება), რაც სავსებით საკმარისია. Real-time GPS მოგვიანებით.

---

## რატომ ეს არქიტექტურა?

1. **მარტივი გაფართოება** — ახალი პროვაიდერი = 1 ახალი ფაილი `providers/`-ში + 1 webhook route. სხვა კოდი უცვლელი.
2. **Fallback logic** — თუ Wolt დაკავებულია, ავტომატურად ცდის Bolt-ს, თუ ისიც — მაღაზიის კურიერს.
3. **Vendor lock-in ნულოვანია** — ხვალ თუ Wolt ფასს გაზრდის, გამორთავ checkbox-ს და Bolt-ს ჩართავ.
4. **მაღაზიისთვის უცვლელი გამოცდილება** — არ ადარდებს ვინ იტანს, ხედავს ერთ UI-ს.
5. **მომხმარებელი ერთსა და იმავე tracking-ს ხედავს** ყველა პროვაიდერისთვის.

---

## ტექნიკური ცხრილი (developer-ისთვის)

| ფაილი | დანიშნულება |
|---|---|
| `supabase/migrations/*_deliveries.sql` | schema + RLS + GRANTs + realtime |
| `src/lib/delivery/types.ts` | Interface + enum-ები |
| `src/lib/delivery/registry.ts` | Provider registry (Map) |
| `src/lib/delivery/providers/in-house.ts` | სრული იმპლემენტაცია |
| `src/lib/delivery/providers/manual.ts` | სრული იმპლემენტაცია |
| `src/lib/delivery/providers/{wolt,bolt,glovo,cheaper-fleet}.ts` | Stub-ები, TODO markers |
| `src/lib/delivery/dispatch.functions.ts` | `createServerFn` + `requireSupabaseAuth` |
| `src/lib/delivery/hooks.ts` | `useDelivery(orderId)`, `useStoreDeliveries(storeId)` |
| `src/routes/api/public/delivery/{wolt,bolt,glovo}.ts` | Webhook endpoints (signature-verified) |
| `src/routes/_authenticated/partner.delivery.tsx` | Settings UI |
| `src/routes/_authenticated/admin.deliveries.tsx` | ადმინის overview |
| `src/components/DeliveryTracker.tsx` | მომხმარებლის live tracking card |

**შეფასებული სამუშაო**: ~2-3 საათი მთელი infrastructure + UI. გარე პროვაიდერების **რეალური** ინტეგრაცია მოგვიანებით: ~30 წუთი თითოეულზე კონტრაქტის შემდეგ.

---

## შეკითხვა დაწყებამდე

უნდა დავიწყო ახლავე მთელი ეს scope-ით (schema + adapter framework + UI + stub-webhook-ები), თუ ჯერ მხოლოდ **ბირთვი** ავაწყო (schema + in-house adapter + partner settings + tracking UI), ხოლო Wolt/Bolt stub-ები მოგვიანებით დავამატო?
