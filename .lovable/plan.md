## პრობლემა

ინსტალაციის ფანჯარა აღარ იხსნება არც მობილურზე და არც დესკტოპზე იმიტომ, რომ `public/manifest.webmanifest`-ში ხატულების ბილიკები გატეხილია:

- ყველა `src` არის `"../icons/icon-XX.webp"` — რაც `/manifest.webmanifest`-დან იშლება როგორც `/icons/icon-XX.webp`, ეს ფაილები **არ არსებობს** (`public/`-ში გვაქვს `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`).
- `type: "image/png"` მითითებულია `.webp` გაფართოებაზე — ორმაგი შეუსაბამობა.

Chrome/Edge/Samsung Internet აქტიურებენ `beforeinstallprompt`-ს **მხოლოდ მაშინ, თუ ვალიდური ხატულა (მინ. 192px და 512px) ხელმისაწვდომია**. ვინაიდან ვერცერთი icon ვერ იტვირთება, install criteria ვერ სრულდება და ივენთი აღარ ისვრება — ამიტომ `PwaInstall.tsx` `deferred` prompt-ს ვერ იღებს და desktop-ზეც არაფერი გამოდის.

## გამოსავალი

### 1. `public/manifest.webmanifest` — შევასწოროთ icons
- გამოვიყენოთ რეალურად არსებული ფაილები `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` (+ `/apple-touch-icon.png`).
- `type` შევუსაბამოთ გაფართოებას (`image/png`).
- `purpose`-ები გავყოთ სწორად: 192/512 = `"any"`, ცალკე ჩანაწერი `icon-maskable-512.png` = `"maskable"` (გაერთიანებული `"any maskable"` ხშირად ხატულის სივრცის შემცირებას იწვევს — გავყოთ).

### 2. `src/components/PwaInstall.tsx` — მცირე გაუმჯობესებები
- დესკტოპისთვისაც ვაჩვენოთ install ბანერი, როცა `beforeinstallprompt` მოვა (ამჟამად `showAndroid` ლოგიკა მოითხოვს `isMobileBrowser()`, თუ deferred არაა — მაგრამ თუ deferred **არის**, უკვე ჩნდება; მაინც დავამატოთ desktop-friendly სტილი).
- გავასუფთაოთ ძველი dismissed session flag ერთხელ (v3 გასაღები), რომ ისინი, ვინც უკვე დახურეს, ხელახლა ნახონ.

### 3. ვერიფიკაცია
- Preview-ში DevTools → Application → Manifest — შემოწმდეს რომ ხატულები იტვირთება უპრობლემოდ.
- Console → `beforeinstallprompt`-ის დაფიქსირება.
- Publish შემდეგ cheaper.ge-ზე Chrome desktop-ის მისამართის ზოლში install ღილაკი უნდა გამოჩნდეს, ხოლო Android Chrome-ზე ჩვენი ბოტომ ბანერი „Install"-ით.

## რას არ ვცვლი
- `vite.config.ts` PWA workbox კონფიგი — ის სწორად აქვს.
- Service worker რეგისტრაცია — უკვე მუშაობს.
- Native (Capacitor) shell — ეს PWA install პრობლემა მას არ ეხება.