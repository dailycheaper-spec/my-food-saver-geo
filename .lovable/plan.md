## მიზანი
მობილურ ვერსიაში მომხმარებელი სწრაფად ხედავდეს „გასვლა" ღილაკს, არა მხოლოდ Profile გვერდის ბოლოში.

## მიმდინარე მდგომარეობა
- `src/routes/profile.tsx` — გასვლის ღილაკი უკვე არსებობს (ხაზი 171-176), მაგრამ მხოლოდ პროფილის შიგნით ჩანს.
- `partner.tsx` / `admin.tsx` პანელებში გასვლა უკვე ჩანს header-ში.
- მთავარ (customer) მობილურ ხედში, top header-ში გასვლის ღილაკი არ არის — მომხმარებელი ვერ პოულობს.

## რას გავაკეთებ

1. **ახალი `UserMenu` კომპონენტი** (`src/components/UserMenu.tsx`):
   - პატარა avatar/icon ღილაკი (44px tap-target) — მიმდინარე user-ის ინიციალით ან ავატარით.
   - დაჭერით იხსნება მცირე dropdown/sheet:
     - პროფილი
     - შეკვეთები
     - რჩეულები
     - **გასვლა** (წითელი, `signOut()` + navigate `/`).
   - თუ user არაა → ღილაკი აჩვენებს „შესვლა" და მიდის `/auth`.
   - სრული i18n (`t("signOut")`, `t("profile")` და ა.შ. — უკვე არსებობს).

2. **ჩასმა mobile top header-ში** (`__root.tsx` ან შესაბამის header კომპონენტში, არსებული `CitySelector` / `LanguageSwitcher`-ის გვერდით), მარჯვენა კუთხეში. მხოლოდ customer routes-ზე (partner/admin უკვე აქვთ საკუთარი).

3. **Tap target & safe area** — 44px მინიმუმი, `pt-safe` მოქმედი.

## რას არ ვცვლი
- პროფილის გვერდზე არსებული გასვლის entry რჩება.
- Partner/Admin header-ის გასვლა უცვლელი.
- ლოგიკა/DB — არავითარი ცვლილება (მხოლოდ UI).

## ვერიფიკაცია
- Typecheck.
- Mobile viewport preview: header-ში ჩანს user icon → dropdown-ში „გასვლა" → click → წარმატებით deauth + redirect `/`.

## შენიშვნა
ცვლილება preview-ში მაშინვე გამოჩნდება, მაგრამ **native/PWA აპში მხოლოდ publish-ის შემდეგ** (server.url → cheaper.ge).
