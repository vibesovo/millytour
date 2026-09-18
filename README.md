# Millytour — O'zbekiston sayohat platformasi

Millytour — turistlar uchun tur paketlar, shaxsiy AI dasturlar, xizmatlar (gid, transfer, mehmonxona, restoran, tarjimon, fotograf), hunarmandlar bozori va chegirma kartalarini birlashtirgan platforma.

Loyihadagi asosiy qismlar:

| Qism | Tavsif |
| --- | --- |
| **Sayt (frontend)** | Vite + React 19 + Tailwind v4 + shadcn/ui + Framer Motion |
| **Backend** | Convex (funksiyalar, real-time DB) + Convex Auth |
| **Milly AI** | O'ziga xos suhbat yordamchisi — Groq/Gemini/OpenAI modellari bilan ishlaydi, o'z xotirasi va o'rganish tizimi bor |
| **Telegram botlar** | 3 ta: mijozlar (@mtour_by_bot), mutaxassislar (@mtour_auth_bot), statistika (owner uchun) |
| **To'lov** | Dodo Payments shlyuzi (Click/Payme/Visa/Mastercard usullari) |

---

## Ishga tushirish (lokal)

```bash
npm install          # yoki: bun install
npx convex dev       # Convex loyihasini bog'laydi, .env.local yozadi
npm run dev          # ikkinchi terminalda — sayt http://localhost:5173 da
```

`src/convex/_generated/` maxsus git'da saqlanadi — Convex shuni talab qiladi va Vercel build shundan foydalanadi. `src/convex/` ichida nima o'zgarsa, `npx convex dev` (yoki `npx convex codegen`) qayta ishga tushirib, natijani commit qiling.

## Environment o'zgaruvchilari

### Vercel (frontend uchun)

Vercel → Project → **Settings → Environment Variables**:

| O'zgaruvchi | Maqsadi | Majburiy |
| --- | --- | --- |
| `VITE_CONVEX_URL` | Vite build'ga uzatiladi (`src/main.tsx`). Bo'lmasa sayt konfiguratsiya xatosi ko'rsatadi. | ✅ ha |
| `CONVEX_DEPLOY_KEY` | Faqat Vercel build'ida backend ham push qilinsa kerak (quyida). | ❌ yo'q |

### Convex backend (botlar, AI, to'lov uchun)

Barchasi **Convex deployment**da bo'ladi, Vercel'da emas:

```bash
npx convex env set SITE_URL https://<vercel-domeningiz>   # auth + webhook uchun SHART

# Milly AI (kamida bittasi yetarli; tartibli sinab ko'radi)
npx convex env set GROQ_API_KEY gsk_...
npx convex env set GROQ_MODEL qwen/qwen3-32b

# Telegram botlari (3 ta)
npx convex env set TELEGRAM_MAIN_BOT_TOKEN <mijozlar boti tokeni>
npx convex env set TELEGRAM_AUTH_BOT_TOKEN <mutaxassislar boti tokeni>
npx convex env set TELEGRAM_STATS_BOT_TOKEN <statistika boti tokeni>
npx convex env set OWNER_TELEGRAM_ID <sizning Telegram ID>   # statistika bot egasi

# Google orqali kirish (kalitlar bo'lsa avtomatik yoqiladi)
npx convex env set AUTH_GOOGLE_CLIENT_ID <...apps.googleusercontent.com>
npx convex env set AUTH_GOOGLE_CLIENT_SECRET <...>

# To'lov (Dodo Payments)
npx convex env set DODO_API_KEY <...>
npx convex env set DODO_WEBHOOK_SECRET <...>
npx convex env set DODO_PRODUCT_ID <...>
```

`OWNER_TELEGRAM_ID` o'rnatilmasa — statistika botiga birinchi `/start` yuborgan foydalanuvchi egasi deb yozib olinadi (settings jadvalida saqlanadi).

---

## Milly AI

Milly AI — millytour'ning o'z yordamchisi. U **faqat millytour mavzularida** gaplashadi: tur paketlar, bron, to'lov, xizmatlar, Milly Card chegirmalari. Boshqa mavzular muloyimlik bilan qaytariladi: "O'zbekiston bo'ylab sayohat rejalashtiramizmi?"

### Qanday ishlaydi

1. **Suhbat** — model `src/convex/lib/ai.ts` orqali chaqiriladi: Groq → Gemini → OpenAI tartibida birinchi topilgan kalit ishlatiladi. Bepul variant: [console.groq.com](https://console.groq.com) dan `GROQ_API_KEY` olib, `GROQ_MODEL=qwen/qwen3-32b` qo'yish (tez va o'zbekchani yaxshi biladi).
2. **Til** — xabar tili avtomatik aniqlanadi (uz/ru/en), javob aynan shu tilda qaytadi.
3. **Dastur (offer)** — mijoz shahar + kun/kishi/byudjet aytganda AI javob oxirida maxsus `OFFER:` satrini qaytaradi; saytda bu xizmat tanlash kartasiga aylanadi (mehmonxona, gid, transfer... narxlari byudjetdan taqsimlanadi).
4. **Bron** — «Bron qilish» bosilganda `millyChat.bookTour` → `bookings.serviceBooking` ishlaydi:
   - Narx **serverda** qayta hisoblanadi (klientdan kelmagan summa qabul qilinmaydi).
   - Millytour **10% xizmat to'lovi yashirin** holda summaning ichida yig'iladi — mijozga ko'rsatilmaydi, mutaxassislar ulushidan ko'proq ko'rmaydi.
   - Tanlangan xizmatlar bo'yicha eng yaxshi hamkorlar reyting bo'yicha tanlanadi, vazifalar bot orqali birinchi bo'lib o'sha mutaxassislarga yetib boradi.

### O'rganish tizimi (AI «o'qiydi»)

Milly AI har bir suhbatni `chatLogs` jadvalida saqlaydi. Mijoz javobga 👍/👎 bosishi mumkin — bu ball `aiMemory` jadvaliga yoziladi:

- 👍 olgan javoblar — namuna sifatida saqlanadi va kelgusi suhbatlarda prompt'ga qo'shiladi (AI shunga tayanadi).
- 👎 olgan javoblar — namunadan chiqariladi.
- Kunlik `learnCron` (cron job) — yuqori ball olgan javoblardan umumiy qoidalar chiqaradi.

Shu tarzda Milly AI qanday suhbat qilishni o'zi o'rganib boradi — modelni o'zimiz «millytour mijozlari bilan gaplashadigan qilib» tarbiyalaymiz.

### AI model qo'shish

`src/convex/lib/ai.ts` faylida provayderlar ro'yxati bor. Yangi model qo'shish uchun shu faylga provayder qatori qo'shish kifoya (env kalitini o'qib, OpenAI-mos API ga murojaat qiladi). Kod o'zgartirilmasdan ham `GROQ_MODEL`, `GEMINI_MODEL`, `OPENAI_MODEL` env orqali model almashtiriladi.

---

## Telegram botlari

| Bot | Token env | Vazifasi |
| --- | --- | --- |
| **Mijozlar boti** (`@mtour_by_bot`) | `TELEGRAM_MAIN_BOT_TOKEN` | OTP tasdiqlash, buyurtma va to'lovni kuzatish, Milly AI bilan suhbat (erkin matn → AI javob) |
| **Mutaxassislar boti** (`@mtour_auth_bot`) | `TELEGRAM_AUTH_BOT_TOKEN` | Gid/transfer/mehmonxona/restoran/tarjimon/fotograf ro'yxatdan o'tishi, o'z yo'nalishi bo'yicha buyurtmalar, profil, kalendarni boshqarish |
| **Statistika boti** (owner) | `TELEGRAM_STATS_BOT_TOKEN` | Faqat egaga: foydalanuvchilar, davlatlar, tillar, buyurtmalar, tushum, talab shaharlari, 7 kunlik dinamika |

Webhook'larni ulash: sayt deploy bo'lgach administrator hisobida **«Webhook'larni ulash»** amalini bajaring — u 3 ta bot uchun ham `https://<SITE_URL>/telegram/main|auth|stats` webhook'larini o'rnatadi. Webhook'siz muhitda (lokal) paneldagi **«Xabarlarni olish»** tugmasi `getUpdates` orqali ishlaydi.

---

## Deploy: Vercel

### 1. Convex backendni yaratish (bir marta, lokalda)

```bash
npx convex dev   # yangi deployment yaratadi, .env.local ga VITE_CONVEX_URL yozadi
```

### 2. Backend env'larni to'ldirish

Yuqoridagi «Convex backend» bo'limidagi barcha kalitlarni kiriting. `SITE_URL` albatta Vercel domeningiz bo'lishi shart (auth callback va Telegram webhook'lari shu manzilga ishlaydi).

### 3. Vercel'ga ulash

1. Repozitoriyani [vercel.com/new](https://vercel.com/new) orqali import qiling.
2. **Environment Variables** ga faqat bitta majburiy o'zgaruvchi qo'shiling:
   - `VITE_CONVEX_URL` = `https://<deployment>.convex.cloud`
3. Deploy.

`vercel.json` build buyrug'i va SPA rewrite'ni allaqachon sozlab qo'ygan (`/paketlar` kabi yo'llar to'g'ridan-to'g'ri ochiladi).

### 4. (Ixtiyoriy) backendni ham Vercel'dan push qilish

Har bir deploy'da Convex funksiyalari avtomatik push bo'lishini istasangiz:

1. Convex dashboard → Settings → **Deploy Key** nusxalang.
2. Vercel'da `CONVEX_DEPLOY_KEY` env qo'shing.
3. `vercel.json` dagi build buyrug'ini almashtiring:

```json
"buildCommand": "npx convex deploy --cmd 'npm run build'"
```

`convex deploy` avval backendni push qiladi, so'ng Vite build ishlaydi.

### 5. Deploy'dan keyin tekshirish ro'yxati

- [ ] Sayt ochilyapti, `VITE_CONVEX_URL` to'g'ri
- [ ] Ro'yxatdan o'tish (email + Telegram OTP) ishlayapti
- [ ] Google tugmasi ko'rinyapti (kalitlar kiritilgan bo'lsa)
- [ ] Milly AI javob berayapti (Groq kaliti faol)
- [ ] 3 ta bot webhook'i ulangan (admin panel → «Webhook'larni ulash»)
- [ ] Statistika botiga `/start` yuborilib owner tasdiqlandi
- [ ] Bron qilib ko'rilgan — MLT-XXXXX kod va to'lov shlyuzi ochilyapti

---

## Milly Card (chegirma kartalari)

Bosh sahifada 3/6/12 oylik kartalar: 7% / 12% / 18% chegirma. Xarid qilinganda dizayn tanlanadi (naqshli / oddiy / shahar rasmi), to'lov tasdiqlangach karta avtomatik faollashadi va **har bir bron**ga chegirma sifatida qo'llanadi (`bookings.ts`da server tomonidan hisoblanadi).

---

## Auth

Convex Auth sozlangan: email + Telegram OTP, Google OAuth (kalit bo'lsa avtomatik) va anonim kirish. Himoyalangan sahifalar (`/dashboard`, `/partner`, `/admin`) auth-gate orqali `/auth` ga yo'naltiradi. Rollar: `admin`, `user`, `member` (`src/convex/schema.ts`).

---

## Frontend konvensiyalari

- **Sahifalar** `src/pages/` da, **komponentlar** `src/components/` da.
- Router: React Router v7 (`react-router` dan import qilinadi).
- Styling: Tailwind v4 + shadcn/ui. Ranglar `src/index.css` dagi CSS o'zgaruvchilardan (`--primary`, `--gold`, `--eco`...).
- **Apple-stil UI**: radius shkalasi (`--radius-xs` 8px → `--radius-4xl` 36px), `glass-card` (mat nurli panel), `shadow-lifted` / `shadow-soft` (qatlamli soyalar), `press` (bosilganda kichrayish), `scroll-soft` (nozik scrollbar). Fontlar: SF Pro → Manrope zaxirasi.
- Animatsiyalar: Framer Motion (`initial/animate/exit`), sahifa o'tishlariga `fade-up`.
- Ikona: Lucide (`lucide-react`).
- Valyuta: `PriceInline` (`src/lib/currency.tsx`) — USD asos, UZS/EUR/AED konvertor.

## Foydali buyruqlar

```bash
npm run dev          # Vite dev server (lokal)
npm run build        # produksiya build
npx tsc -b           # tip tekshiruvi
npx convex dev       # backend dev + push
npm run ai:check     # Milly AI til aniqlash testlari
```
