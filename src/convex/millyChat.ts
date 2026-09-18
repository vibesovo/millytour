"use node";

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { askAi } from "./lib/ai";

/**
 * Milly AI erkin chat: sayohat rejimidan tashqari istalgan savolga
 * haqiqiy javob beradi. Xabarning tili avtomatik aniqlanadi va javob
 * xuddi shu tilda qaytariladi (uz/ru/en, boshqalari uchun english).
 *
 * Kalit sozlanmagan bo'lsa yoki AI xato bersa — "tezkor rejim" javoblari
 * ishlatiladi (faqat tarjima + do'stona salomlashuv), ilova hech qachon
 * xato bilan qotib qolmaydi.
 */

export type DetectedLang = "uz" | "ru" | "en" | "other";

/** Kirill va o'zbek lotin alifbosiga xos harflar bo'yicha oddiy va ishonchli aniqlash. */
export function detectLanguage(text: string): DetectedLang {
  const t = text.toLowerCase();
  if (/[а-яё]/.test(t)) {
    // O'zbek kirill alifbosi: ў, қ, ғ, ҳ harflari mavjud bo'lsa — o'zbekcha.
    return /[ўқғҳ]/.test(t) ? "uz" : "ru";
  }
  if (/[a-z]/.test(t)) {
    /*
     * Lotin alifbosidagi tillarni BALL bo'yicha ajratamiz.
     *
     * Ilgari `ng`, `qa`, `osh` qism-satrlari qidirilardi — bu inglizcha
     * so'zlarni ham "o'zbekcha" qilib belgilardi ("boo-ng", "lo-ng").
     * Endi faqat so'z chegarasidagi () mos kelishlar hisoblanadi.
     */
    const UZ_WORDS = [
      "salom", "assalomu", "qanday", "rahmat", "yaxshi", "kerak", "nima", "qancha",
      "yo'q", "o'zbek", "millytour", "tur", "turlar", "sayohat", "bo'ladi", "shahar",
      "bron", "buyurtma", "to'lov", "chegirma", "kuzat", "narx", "qayerda", "bilan",
      "uchun", "bormi", "kerakmi",
    ];
    const EN_WORDS = [
      "the", "and", "you", "hello", "hi", "tour", "tours", "price", "hotel", "want",
      "can", "how", "what", "is", "are", "my", "i", "to", "do", "please", "book",
      "booking", "pay", "payment", "track", "order", "where", "when", "why", "help",
      "thanks", "for", "with", "about", "need", "have", "cancel", "refund", "status",
    ];
    const hits = (list: string[]) =>
      list.filter((w) => new RegExp(`\\b${w}\\b`).test(t)).length;

    const uzHits = hits(UZ_WORDS);
    const enHits = hits(EN_WORDS);
    // O'zbek lotinining kuchli belgisi: o' / g' digraflari (o'zbek, g'oya).
    const uzDigraph = /\b(?:o['’ʼ]|g['’ʼ])/.test(t) ? 2 : 0;

    const scoreUz = uzHits * 2 + uzDigraph;
    const scoreEn = enHits * 2;
    if (scoreUz > scoreEn) return "uz";
    if (scoreEn > scoreUz) return "en";
    return uzHits > 0 ? "uz" : "en";
  }
  return "other";
}

const GREETINGS: Record<DetectedLang, string> = {
  uz: "Assalomu alaykum! Men Milly AI — millytour sayohat yordamchisiman. 👋",
  ru: "Здравствуйте! Я Milly AI — ваш помощник по путешествиям millytour. 👋",
  en: "Hello! I'm Milly AI — your millytour travel assistant. 👋",
  other: "Hello! I'm Milly AI — your millytour travel assistant. 👋",
};

const FALLBACK_HELP: Record<DetectedLang, string> = {
  uz:
    "Hozir to'liq AI javob berish imkoni cheklangan, lekin men doim yordam beraman:\n\n" +
    "• Tur paketlar: /paketlar sahifasida 12+ tayyor marshrut\n" +
    "• Shaxsiy dastur: savollarga javob bering, 2 xil dastur tuzaman\n" +
    "• Gid, transfer, mehmonxona, restoran, tarjimon, fotograf: /xizmatlar\n" +
    "• Hunarmandlar bozori: /hunarmandlar\n" +
    "• Buyurtma va to'lovni kuzatish: /dashboard → «Buyurtmalarim»\n" +
    "• Chegirma kartalari: 3/6/12 oylik — bosh sahifada\n\n" +
    "Savolingizni shu mavzularda yozsangiz, aniq javob beraman.",
  ru:
    "Полный AI-ответ сейчас недоступен, но я всегда помогу:\n\n" +
    "• Туры: страница /paketlar — 12+ готовых маршрутов\n" +
    "• Личный план: ответьте на вопросы — составлю 2 варианта\n" +
    "• Гид, трансфер, отель, ресторан, переводчик, фотограф: /xizmatlar\n" +
    "• Базар ремесленников: /hunarmandlar\n" +
    "• Отслеживание заказа и оплаты: /dashboard → «Buyurtmalarim»\n" +
    "• Скидочные карты: 3/6/12 месяцев — на главной\n\n" +
    "Задайте вопрос по этим темам — отвечу точно.",
  en:
    "Full AI answers are temporarily limited, but I can still help:\n\n" +
    "• Tours: /paketlar — 12+ ready-made routes\n" +
    "• Personal itinerary: answer a few questions and I'll build 2 options\n" +
    "• Guides, transfer, hotels, restaurants, interpreters, photographers: /xizmatlar\n" +
    "• Artisan market: /hunarmandlar\n" +
    "• Track your order and payment: /dashboard → orders\n" +
    "• Discount cards: 3/6/12 months — on the home page\n\n" +
    "Ask about any of these and I'll give exact answers.",
  other:
    "Full AI answers are temporarily limited. Meanwhile:\n\n" +
    "• Tours: /paketlar\n• Personal itinerary via Milly AI planner\n" +
    "• Services: /xizmatlar\n• Artisan market: /hunarmandlar\n" +
    "• Discount cards: on the home page",
};

/** Xulq-atvor qoidalari: salomlashuv, rahmat, hayr — AI'ga to'g'ridan-to'g'ri murojaat qilmasdan javoblanadi. */
const RULES: { pattern: RegExp; reply: Record<DetectedLang, string> }[] = [
  {
    // Faqat xabar TO'LIQ salomlashuvdan iborat bo'lsa ishlaydi — aks holda
    // "Salom, bron qilaman" kabi savol yo'qolib qolardi.
    pattern: /^\s*(salom|assalomu alaykum|assalom|hello|hi|hey|привет|салом|здравствуйте|здравствуй)\s*[!.,?]*$/i,
    reply: {
      uz: "Salom! Sizga qanday yordam bera olaman? Tur paketlar, shaxsiy dastur, xizmatlar yoki chegirma kartalari haqida so'rashingiz mumkin.",
      ru: "Здравствуйте! Чем могу помочь? Могу рассказать о турах, личном плане, услугах или скидочных картах.",
      en: "Hi! How can I help? Ask me about tours, a personal itinerary, services, or discount cards.",
      other: "Hi! How can I help? Ask me about tours, a personal itinerary, services, or discount cards.",
    },
  },
  {
    pattern: /^\s*(rahmat|katta rahmat|спасибо|thank you|thanks)\s*[!.,?]*$/i,
    reply: {
      uz: "Arzimaydi! Yana savol bo'lsa, bemalol yozing. 😊",
      ru: "Пожалуйста! Если будут вопросы — пишите. 😊",
      en: "You're welcome! Feel free to ask anything else. 😊",
      other: "You're welcome! Feel free to ask anything else. 😊",
    },
  },
];

/** Model nomlarini to'g'ri tilga moslash uchun. */
const LANG_NAME: Record<DetectedLang, string> = {
  uz: "Uzbek (Latin script)",
  ru: "Russian",
  en: "English",
  other: "the same language as the user's message (English if unsure)",
};

/**
 * Platforma bilimi — Milly AI shu faktlarga tayanadi. Bron, to'lov, kuzatish va
 * chegirma bo'yicha javoblar shu yerga asoslanadi (o'ylab topilmaydi).
 */
const PLATFORM_KNOWLEDGE = `
Millytour — O'zbekiston bo'ylab sayohat platformasi (millytour).

BOSHLASH (yangi foydalanuvchi uchun 4 qadam):
1. Tur paketni /paketlar sahifasida tanlash yoki Milly AI orqali shaxsiy dastur tuzish.
2. "Bron qilish" tugmasi — hisob 30 soniyada ochiladi (email + Telegram bir martalik kod).
3. Sana, kishi soni kiritiladi va to'lov usuli tanlanadi.
4. Buyurtma MLT-XXXXX kodini oladi va /dashboard → "Buyurtmalarim"da kuzatiladi.

BO'LIMLAR (havolalarni javobda aytishingiz mumkin):
- Tur paketlar: /paketlar (har bir paketning alohida sahifasi bor)
- Xizmatlar: /xizmatlar (mehmonxona, restoran, gid, transfer, tarjimon, fotograf, boshqa)
- Hunarmandlar bozori: /hunarmandlar
- Shaxsiy kabinet: /dashboard (buyurtmalar, tarix, AI dasturlar, profil)
- Telegram botlar: @mtour_bot (turistlar) va @mtour_auth_bot (hamkorlar)

BRON QILISH QADAMLARI:
1. Paket yoki xizmat sahifasida "Bron qilish" tugmasi bosiladi.
2. Hisobga kirmagan bo'lsa — ekranda hisob yaratish oynasi chiqadi (email/telefon + Telegram bir martalik kod).
3. Sana, kishi soni va qo'shimcha izoh kiritiladi.
4. Yuborilgach buyurtma kod oladi: MLT-XXXXX.

TO'LOV:
- Usullar: Click, Payme (so'mda tez to'lov), Visa, Mastercard (xalqaro kartalar).
- Buyurtma avval "new" holatida turadi; to'lov tasdiqlangach "paid" bo'ladi.
- To'lov yozuvlari kabinetdagi to'lovlar bo'limida ko'rinadi.

BUYURTMANI KUZATISH:
- /dashboard → "Buyurtmalarim": kod, sana, summa, to'lov holati va holat (new → confirmed → completed / cancelled).
- "Tarix va pasport" va "AI dasturlar" bo'limlari ham shu kabinetda.
- Telegram botga ulangan hisobda holat o'zgarishi botga ham xabar qilinadi.

BEKOR QILISH VA QAYTARISH:
- Buyurtmani kabinetdan bekor qilish mumkin; to'lov 3 ish kuni ichida qaytariladi.
- Gold va Platinum kartada 48 soatgacha bekor qilish bepul.

MILLY CARD (chegirma kartasi, bosh sahifada):
- 3 oy — 7% chegirma, 6 oy — 12% chegirma, 12 oy — 18% chegirma.
- Chegirma HAR BIR bronda (tur paket, xizmat, Milly AI dasturi) avtomatik qo'llanadi.
- To'lov tasdiqlangach karta avtomatik faollashadi va kabinetda ko'rinadi.

MILLY AI PLANNER:
- Bir necha savolga javob berib 2 xil shaxsiy sayohat dasturi olinadi.
- Dasturni tanlab, ichidagi xizmatlarni alohida bron qilish mumkin.

YORDAM: @mtour_bot yoki saytdagi aloqa. To'lov muammosida buyurtma kodini (MLT-...) yozing.
Narxlar UZS'da ko'rsatiladi, USD/EUR/AED ekvivalenti bilan.`.trim();

type LangReplies = Record<DetectedLang, string>;

/** Brend nomini har til uchun bir xil qoldirib, oddiy qisqartma. */
function reply(r: { uz: string; ru: string; en: string }): LangReplies {
  return { uz: r.uz, ru: r.ru, en: r.en, other: r.en };
}

/**
 * Mavzu bo'yicha aniq javoblar — AI kaliti sozlanmagan bo'lsa ham platforma
 * o'z ishini tushuntira oladi (bron, to'lov, kuzatish, chegirma).
 */
const INTENTS: { pattern: RegExp; reply: LangReplies }[] = [
  {
    pattern: /(to'?lov|to‘lov|tolov|payme|click|visa|mastercard|payment|pay\b|оплат|платеж|карта)/i,
    // "chegirma kartasi" kabi iboralar chegirma mavzusiga tegishli — shuning
    // uchun bu yerda faqat to'lov turlari qidiriladi.
    reply: reply({
      uz:
        "To'lov 4 usulda amalga oshiriladi:\n\n" +
        "• Click va Payme — so'mda, bir necha soniyada.\n" +
        "• Visa va Mastercard — xalqaro kartalar.\n\n" +
        "Buyurtma avval «new» holatida turadi, to'lov tasdiqlangach «paid» bo'ladi. " +
        "Barcha to'lov yozuvlarini /dashboard kabinetida ko'rasiz. " +
        "To'lovda muammo bo'lsa, buyurtma kodini (MLT-...) yozib yuboring — tekshiramiz.",
      ru:
        "Оплата проходит 4 способами:\n\n" +
        "• Click и Payme — в сумах, за секунды.\n" +
        "• Visa и Mastercard — международные карты.\n\n" +
        "Сначала заказ в статусе «new», после подтверждения оплаты — «paid». " +
        "Все платежи видны в кабинете /dashboard. " +
        "Если возникла проблема с оплатой, пришлите код заказа (MLT-...) — проверим.",
      en:
        "Payment works in 4 ways:\n\n" +
        "• Click and Payme — in UZS, instant.\n" +
        "• Visa and Mastercard — international cards.\n\n" +
        "The order starts as «new» and becomes «paid» once the payment is confirmed. " +
        "All payments are listed in your /dashboard. " +
        "If a payment fails, send me your order code (MLT-...) and we'll check it.",
    }),
  },
  {
    pattern: /(kuzat|holati|status|статус|отслеж|vaucher|voucher|buyurtmam|my order|чек)/i,
    reply: reply({
      uz:
        "/dashboard sahifasida «Buyurtmalarim» bo'limi bor:\n\n" +
        "• Buyurtma kodi (MLT-XXXXX), sana, summa va to'lov holati\n" +
        "• Holat: new → confirmed → completed (yoki cancelled)\n" +
        "• Biriktirilgan gid/transfer/mehmonxona mutaxassislari\n\n" +
        "Shu kabinetda «Tarix va pasport» hamda «AI dasturlar» bo'limlari ham bor. " +
        "Telegram (@mtour_bot) ulangan bo'lsa, holat o'zgarishi botga ham keladi.",
      ru:
        "В /dashboard есть раздел «Buyurtmalarim»:\n\n" +
        "• Код заказа (MLT-XXXXX), дата, сумма и статус оплаты\n" +
        "• Статус: new → confirmed → completed (или cancelled)\n" +
        "• Закреплённые гид/трансфер/отель\n\n" +
        "Там же разделы «Tarix va pasport» и «AI dasturlar». " +
        "Если подключён Telegram (@mtour_bot), изменения статуса приходят и туда.",
      en:
        "Your /dashboard has an orders section:\n\n" +
        "• Order code (MLT-XXXXX), date, amount and payment status\n" +
        "• Status: new → confirmed → completed (or cancelled)\n" +
        "• Assigned guide/transfer/hotel providers\n\n" +
        "The same dashboard holds «Tarix va pasport» and «AI dasturlar». " +
        "If Telegram (@mtour_bot) is linked, status changes arrive there too.",
    }),
  },
  {
    pattern: /(milly card|chegirma|скидк|discount)/i,
    reply: reply({
      uz:
        "Milly Card — chegirma kartasi (bosh sahifada):\n\n" +
        "• 3 oy — 7% chegirma\n• 6 oy — 12% chegirma (ommabop)\n• 12 oy — 18% chegirma\n\n" +
        "Karta to'lovi tasdiqlangach avtomatik faollashadi va HAR BIR broningizda chegirma " +
        "qo'llanadi. Kartani kabinetingizda ko'rasiz. Dizaynni o'zingiz tanlaysiz — " +
        "Registon, Buxoro, Xiva yoki Zamonaviy.",
      ru:
        "Milly Card — скидочная карта (на главной):\n\n" +
        "• 3 месяца — 7%\n• 6 месяцев — 12% (популярный)\n• 12 месяцев — 18%\n\n" +
        "После оплаты карта активируется автоматически и скидка применяется к КАЖДОМУ " +
        "бронированию. Карта видна в кабинете. Дизайн выбираете сами — " +
        "Registon, Buxoro, Xiva или Zamonaviy.",
      en:
        "Milly Card is our discount card (on the home page):\n\n" +
        "• 3 months — 7% off\n• 6 months — 12% off (most popular)\n• 12 months — 18% off\n\n" +
        "It activates automatically after payment and the discount applies to EVERY booking. " +
        "The card appears in your dashboard. You pick the design — " +
        "Registon, Buxoro, Xiva or Zamonaviy.",
    }),
  },
  {
    pattern: /(bekor|отмен|cancel|refund|qaytar|возврат)/i,
    reply: reply({
      uz:
        "Buyurtmani bekor qilish mumkin — buni /dashboard → «Buyurtmalarim» bo'limida qilasiz.\n\n" +
        "• To'langan summa 3 ish kuni ichida qaytariladi.\n" +
        "• Gold va Platinum kartada 48 soatgacha bekor qilish bepul.\n\n" +
        "Bekor qilishdan oldin sana yaqin bo'lsa, mutaxassisga xabar borishini hisobga oling.",
      ru:
        "Заказ можно отменить в /dashboard → «Buyurtmalarim».\n\n" +
        "• Оплаченная сумма возвращается в течение 3 рабочих дней.\n" +
        "• С картой Gold и Platinum отмена до 48 часов бесплатна.\n\n" +
        "Если дата уже близко, предупредите — исполнителю нужно время.",
      en:
        "You can cancel from /dashboard → orders.\n\n" +
        "• Paid amounts are refunded within 3 business days.\n" +
        "• With Gold or Platinum cards, cancellation up to 48 hours is free.\n\n" +
        "If the date is close, keep in mind the provider needs notice.",
    }),
  },
  {
    // Platformani birinchi marta ochgan sayyoh: "qanday ishlaydi?" — to'liq
    // qo'llanma. Bu javob "boshlanishida tushunmaydi" degan holatni yopadi.
    pattern:
      /(tushunmadim|tushunmayapman|tushunmayman|qanday ishlaydi|nima qilaman|qayerdan boshlash|qanday boshlayman|nima qilsam bo'ladi|how (?:does|do) (?:this|it|i)|get started|how to start|помогите|как (?:это|этот|начать|работает))/i,
    reply: reply({
      uz:
        "millytour — 4 qadamdan iborat, hammasi shu tartibda ishlaydi:\n\n" +
        "1. Tur paketni /paketlar sahifasida tanlaysiz — yoki menga yozasiz, men shaxsiy dastur tuzaman.\n" +
        "2. «Bron qilish»ni bosasiz: hisob 30 soniyada ochiladi (email + Telegram kod).\n" +
        "3. Sanani, kishi sonini kiritasiz va to'lovni tanlaysiz: Click, Payme, Visa yoki Mastercard.\n" +
        "4. Buyurtma MLT-XXXXX kodini oladi — holatini /dashboard → «Buyurtmalarim»da kuzatasiz.\n\n" +
        "Nimadan boshlashni bilmasangiz — menga byudjet, kunlar soni va qiziqishlaringizni yozing, " +
        "men dasturni tuzib, bron qilishgacha olib boraman. Xohlagan tilda yozishingiz mumkin.",
      ru:
        "millytour yadroviy 4 шага, всё работает именно в таком порядке:\n\n" +
        "1. Выбираете тур на /paketlar — или пишете мне, и я составлю личный маршрут.\n" +
        "2. Нажимаете «Bron qilish»: аккаунт открывается за 30 секунд (email + код в Telegram).\n" +
        "3. Указываете дату, число гостей и способ оплаты: Click, Payme, Visa или Mastercard.\n" +
        "4. Заказ получает код MLT-XXXXX — статус виден в /dashboard → «Buyurtmalarim».\n\n" +
        "Не знаете с чего начать — напишите бюджет, число дней и интересы, " +
        "я составлю маршрут и доведу до брони. Пишите на любом языке.",
      en:
        "millytour is 4 steps, in this exact order:\n\n" +
        "1. Pick a tour on /paketlar — or message me and I'll build a personal itinerary.\n" +
        "2. Press «Bron qilish»: an account opens in 30 seconds (email + Telegram code).\n" +
        "3. Enter the date, number of guests and pick payment: Click, Payme, Visa or Mastercard.\n" +
        "4. Your order gets an MLT-XXXXX code — track it in /dashboard → «Buyurtmalarim».\n\n" +
        "Not sure where to start — tell me your budget, number of days and interests, " +
        "and I'll build the itinerary and take it all the way to booking. Write in any language.",
    }),
  },
  // Eng keng naqsh ENG OXIRIDA turadi: "bronni bekor qilish" — bekor qilish
  // mavzusi, "buyurtmani kuzatish" — kuzatish mavzusi bo'lishi kerak.
  {
    pattern: /(bron|book(?:ing)?|order|buyurtma|заказ|бронир|band qil)/i,
    reply: reply({
      uz:
        "Bron qilish juda oson:\n\n" +
        "1. Tur paketni /paketlar yoki xizmatni /xizmatlar sahifasida tanlang.\n" +
        "2. «Bron qilish»ni bosing — hisobingiz bo'lmasa, ro'yxatdan o'tish oynasi chiqadi.\n" +
        "3. Sana, kishi soni va izohni kiriting.\n" +
        "4. Buyurtma kod oladi (MLT-XXXXX) va to'lovga o'tadi.\n\n" +
        "To'lov tasdiqlangach buyurtma kabinetingizda (/dashboard → «Buyurtmalarim») ko'rinadi.",
      ru:
        "Забронировать просто:\n\n" +
        "1. Выберите тур на /paketlar или услугу на /xizmatlar.\n" +
        "2. Нажмите «Bron qilish» — если нет аккаунта, откроется окно регистрации.\n" +
        "3. Укажите дату, число гостей и комментарий.\n" +
        "4. Заказ получит код (MLT-XXXXX) и перейдёт к оплате.\n\n" +
        "После подтверждения оплаты заказ виден в кабинете (/dashboard → «Buyurtmalarim»).",
      en:
        "Booking is easy:\n\n" +
        "1. Pick a tour on /paketlar or a service on /xizmatlar.\n" +
        "2. Press «Bron qilish» — if you don't have an account, a sign-up dialog appears.\n" +
        "3. Enter the date, number of guests and any note.\n" +
        "4. Your order gets a code (MLT-XXXXX) and goes to payment.\n\n" +
        "Once the payment is confirmed the order shows up in your dashboard (/dashboard → orders).",
    }),
  },
  // Xizmatlar ham bron'dan keyin: "mehmonxonani bron qilsam bo'ladimi?"
  // savoliga bron javobi berilishi kerak, "xizmatlar haqida ma'lumot" esa shu.
  {
    pattern:
      /(xizmatlar?|\bgid|transfer|mehmonxona|restoran|tarjimon|fotograf|hunarmand|service|\bguide|\bhotel|restaurant|translator|photographer|artisan|услуг|\bгид|трансфер|\bотель|ресторан|переводчик|фотограф)/i,
    reply: reply({
      uz:
        "Qo'shimcha xizmatlarni /xizmatlar sahifasida alohida bron qilasiz:\n\n" +
        "• Mehmonxona va restoran\n• Gid va transfer\n• Tarjimon va fotograf\n\n" +
        "Hunarmandlar bozori (/hunarmandlar) — milliy buyumlar to'g'ridan-to'g'ri ustadan. " +
        "Har bir xizmat tur paketdan alohida ham, Milly AI dasturi ichida ham olinadi; " +
        "chegirma kartangiz bo'lsa chegirma avtomatik qo'llanadi.",
      ru:
        "Дополнительные услуги бронируются на /xizmatlar:\n\n" +
        "• Отель и ресторан\n• Гид и трансфер\n• Переводчик и фотограф\n\n" +
        "Базар ремесленников (/hunarmandlar) — национальные изделия напрямую от мастеров. " +
        "Любую услугу можно взять отдельно или внутри маршрута Milly AI; " +
        "при наличии скидочной карты скидка применяется автоматически.",
      en:
        "Extra services are booked separately on /xizmatlar:\n\n" +
        "• Hotels and restaurants\n• Guides and transfers\n• Interpreters and photographers\n\n" +
        "The artisan market (/hunarmandlar) sells national crafts straight from makers. " +
        "Any service can be booked alone or inside a Milly AI itinerary; " +
        "your discount card applies automatically.",
    }),
  },
  // Turlar haqidagi savol ENG OXIRIDA: "tur paketni qanday bron qilaman?"
  // savoliga bron javobi berilishi kerak, shuning uchun bu naqsh bron'dan keyin.
  {
    pattern:
      /(tur paket|paketlar|turlar?\b|marshrut|\btour\b|\btours\b|package|itinerary|\bтур\b|маршрут|путевк)/i,
    reply: reply({
      uz:
        "/paketlar sahifasida 12+ tayyor marshrut bor: Samarqand, Buxoro, Xiva, Toshkent, " +
        "Farg'ona, Nurota, Termiz va Shahrisabz. Har bir paketda narx, kunlar soni, " +
        "guruh hajmi va keyingi chiqish sanasi ko'rsatilgan.\n\n" +
        "O'zingizga mosini topish uchun turkumni tanlang (tarixiy, ekoturizm, hunarmandchilik, " +
        "ziyorat, sarguzasht) yoki menga byudjet va kunlar sonini aytib bering — " +
        "shu paketlardan 2 xil dastur tuzib beraman.",
      ru:
        "На странице /paketlar более 12 готовых маршрутов: Самарканд, Бухара, Хива, Ташкент, " +
        "Фергана, Нурата, Термез и Шахрисабз. В каждом указаны цена, количество дней, " +
        "размер группы и ближайшая дата выезда.\n\n" +
        "Выберите категорию (историческая, экотуризм, ремесленничество, паломничество, " +
        "приключения) — или назовите бюджет и число дней, и я составлю 2 варианта маршрута.",
      en:
        "/paketlar lists 12+ ready-made routes: Samarkand, Bukhara, Khiva, Tashkent, " +
        "Fergana, Nurota, Termez and Shahrisabz. Each shows price, days, " +
        "group size and the next departure date.\n\n" +
        "Filter by category (historical, eco, crafts, pilgrimage, adventure) — " +
        "or tell me your budget and number of days and I'll build 2 itinerary options.",
    }),
  },
];

/**
 * Milly AI holati — interfeys "Onlayn" yoki "Tezkor rejim" yozuvini shu
 * javobga qarab ko'rsatadi (yolg'on "onlayn" yozuvi qolmasin).
 */
/**
 * Savol mavzusiga mos tayyor javob (bron, to'lov, kuzatish, chegirma, bekor
 * qilish). AI javob bermaganda ishlatiladi — shu sababli AI kalitisiz ham
 * platforma o'z ishini tushuntira oladi.
 */
export function intentReply(text: string, lang: DetectedLang): string | null {
  return INTENTS.find((i) => i.pattern.test(text))?.reply[lang] ?? null;
}

/**
 * Milly AI holati `aiStatus.ts`ga ko'chirildi — Convex'da `query` funksiyalar
 * "use node" faylida bo'lolmaydi (faqat action'lar bo'ladi).
 */

/**
 * BOSHQARILADIGAN TUR BRONI — Milly AI chatidagi dasturdan to'g'ridan-to'g'ri
 * buyurtma.
 *
 * `chat` action'i nomzod dasturning xizmatlarini (gid, transfer, mehmonxona,
 * restoran...) `offer` maydonida qaytaradi; mijoz paneldan xizmatlarni
 * belgilab «Bron qilish»ni bosganda shu action chaqiriladi:
 *   1. Narx serverda qayta hisoblanadi (klientdan kelmagan summa yozilmaydi).
 *   2. Millytour 10% xizmat to'lovi YASHIRIN holda summaning ichida yig'iladi
 *      (alohida qator ko'rsatilmaydi, mutaxassislar ulushidan ko'proq ko'rmaydi).
 *   3. Tanlangan xizmatlar bo'yicha mutaxassislar avtomatik biriktiriladi va
 *      vazifalar bot orqali ularga yetib boradi.
 *
 * requireUser: bron faqat hisobli foydalanuvchi uchun — kirmagan bo'lsa
 * frontend avval /auth sahifasiga yo'naltiradi.
 */
type DirectionId =
  | "guide"
  | "transfer"
  | "artisan"
  | "hotel"
  | "translator"
  | "photographer"
  | "restaurant"
  | "other";

type BookTourSpecialist = {
  assignmentId: string;
  providerId: string;
  direction: string;
  role: string;
  task: string;
  amount: number;
  businessName: string;
  contactName?: string;
  phone: string;
  city: string;
  rating: number;
  ratingCount: number;
  completedOrders: number;
  experienceYears: number;
  languages: string[];
  about?: string;
  telegramUsername?: string;
  notified: boolean;
};

type BookTourResult = {
  bookingId: string;
  reference: string;
  paymentId: string;
  paymentReference: string;
  totalPrice: number;
  startDate: string;
  days: number;
  guests: number;
  specialists: BookTourSpecialist[];
};

export const bookTour = action({
  args: {
    city: v.string(),
    startDate: v.string(),
    days: v.number(),
    guests: v.number(),
    services: v.array(
      v.object({ direction: v.string(), label: v.string(), days: v.optional(v.number()) }),
    ),
    totalPrice: v.number(),
    paymentMethod: v.union(
      v.literal("click"),
      v.literal("payme"),
      v.literal("visa"),
      v.literal("mastercard"),
    ),
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    planId: v.optional(v.id("plans")),
    planTitle: v.optional(v.string()),
    planSummary: v.optional(v.string()),
    itinerary: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args): Promise<BookTourResult> => {
    const total = Math.max(1, Math.round(args.totalPrice));
    // Yashirin platforma to'lovi: mijozning byudjeti ichida qoladi (10% ajratiladi).
    const platformFee = Math.round(total * 0.1);
    void platformFee; // ko'rsatilmaydi — faqat hisobda.

    return (await ctx.runMutation(api.bookings.serviceBooking, {
      city: args.city,
      startDate: args.startDate,
      days: args.days,
      guests: args.guests,
      services: args.services.map((s) => ({
        direction: s.direction as DirectionId,
        days: s.days,
      })),
      totalPrice: total,
      paymentMethod: args.paymentMethod,
      customerPhone: args.customerPhone,
      specialRequests: args.specialRequests,
      planId: args.planId,
      planTitle: args.planTitle,
      planSummary: args.planSummary,
      itinerary: args.itinerary,
    })) as BookTourResult;
  },
});

/**
 * Milly AI erkin chat: istalgan savolga haqiqiy javob; dastur konteksti
 * to'planganda `offer` maydonida tanlanadigan xizmatlar qaytariladi.
 */
/**
 * Xotira funksiyalari `aiMemory.ts`da (default runtime — DB kirish uchun).
 * Bu fayl ("use node") ularga internal API orqali murojaat qiladi.
 */

export const chat = action({
  args: {
    message: v.string(),
    /** Sessiya kaliti — xotira (chatLogs) va o'rganish uchun. */
    sessionKey: v.optional(v.string()),
    history: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        }),
      ),
    ),
  },
  returns: v.object({
    reply: v.string(),
    lang: v.string(),
    engine: v.union(v.literal("ai"), v.literal("rule-based")),
    /** Dastur tayyor bo'lsa — tanlov kartasidagi xizmatlar (bron panelida ko'rinadi). */
    offer: v.optional(
      v.object({
        city: v.string(),
        startDate: v.string(),
        days: v.number(),
        guests: v.number(),
        services: v.array(
          v.object({
            direction: v.string(),
            label: v.string(),
            emoji: v.string(),
            amount: v.number(),
          }),
        ),
        total: v.number(),
        summary: v.string(),
      }),
    ),
  }),
  handler: async (ctx, { message, history, sessionKey }) => {
    const text = message.trim().slice(0, 1200);
    if (!text) {
      return { reply: "", lang: "uz" as DetectedLang, engine: "rule-based" as const };
    }

    const lang = detectLanguage(text);
    const sess = sessionKey ?? "anon";
    void ctx.runMutation(internal.aiMemory.logChat, {
      sessionKey: sess,
      role: "user",
      content: text,
      lang,
    });

    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        void ctx.runMutation(internal.aiMemory.logChat, {
          sessionKey: sess,
          role: "assistant",
          content: rule.reply[lang],
          lang,
          engine: "rule-based",
        });
        return { reply: rule.reply[lang], lang, engine: "rule-based" as const };
      }
    }

    // O'rganilgan qoidalar va namunalar — AI shunga tayanib «o'qigan» bo'ladi.
    let memoryBlock = "";
    try {
      const memories = await ctx.runQuery(internal.aiMemory.topMemories, {});
      if (memories.length > 0) {
        memoryBlock =
          "\n\nLEARNED STYLE (from past successful chats with millytour clients — follow these):\n" +
          memories.map((m) => `- ${m}`).join("\n");
      }
    } catch {
      /* xotira bo'sh — muammo emas */
    }

    const answer = await askAi({
      system:
        "You are Milly AI — the assistant of millytour, a travel platform for Uzbekistan " +
        "(website millytour, brand: Millytour). You ONLY serve millytour clients: every topic " +
        "you discuss must lead back to Uzbekistan travel, tours on the platform, services " +
        "(guides, transfer, hotels, restaurants, translators, photographers), Milly Card " +
        "discounts, booking or payments. If asked about unrelated topics (politics, code, " +
        "other agencies), politely steer back: offer to plan an Uzbekistan trip instead.\n\n" +
        "You chat like a real person in a modern messenger: warm, curious, a little playful, " +
        "never robotic.\n\n" +
        "CONVERSATION STYLE (like real AI chats):\n" +
        "- Match the user's energy and length: short casual message → short casual reply.\n" +
        "- Use emojis sparingly (1–2) when the tone is light; none for serious topics.\n" +
        "- Ask follow-up questions like a curious friend would — but ONE question per message.\n" +
        "- Never lecture, never write walls of text. 1–4 sentences is the sweet spot; a compact " +
        "list only for step-by-step processes (booking, payment, tracking).\n\n" +
        "ITINERARY DETECTION (important): when the user's message (or chat history) contains a " +
        "complete-enough travel request — destination city in Uzbekistan + number of days OR " +
        "number of travellers OR a budget in USD/som (e.g. «Samarqandga 3 kun, 2 kishi, byudjet " +
        "800$») — THEN additionally return ONE line at the very end in exactly this format:\n" +
        "OFFER: {\"city\":\"Samarqand\",\"days\":3,\"guests\":2,\"total\":690,\"services\":[\"hotel\",\"guide\",\"transfer\"]}\n" +
        "Rules for OFFER: total must be 80–97% of the stated budget (if no budget given, " +
        "estimate realistically: hotel $45–70/night, guide $50/day, transfer $35/day, restaurant " +
        "$25/person/day); services may include hotel, guide, transfer, restaurant, translator, " +
        "photographer; city must be a real Uzbek city name in Uzbek latin. Never put OFFER line " +
        "when the message is just a question, greeting or small talk.\n\n" +
        `LANGUAGE RULE: the user's detected language is ${LANG_NAME[lang]}. Reply strictly in ` +
        "that language and script (Russian → Cyrillic, Uzbek → latin). Never switch languages.\n\n" +
        "FACTS: rely ONLY on the platform facts below for anything about millytour — never invent " +
        "prices, availability or statuses. If something is unknown, say so honestly.\n\n" +
        "PLATFORM FACTS:\n" +
        PLATFORM_KNOWLEDGE +
        memoryBlock,
      temperature: 0.85,
      maxTokens: 700,
      messages: [
        ...(history ?? []).slice(-12).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content.slice(0, 800),
        })),
        { role: "user" as const, content: text },
      ],
    });

    if (answer.ok && answer.content) {
      // OFFER satrini ajratib olib, javobdan tozalaymiz.
      const { clean, offer } = extractOffer(answer.content);
      void ctx.runMutation(internal.aiMemory.logChat, {
        sessionKey: sess,
        role: "assistant",
        content: clean,
        lang,
        engine: "ai",
      });
      if (offer) {
        return { reply: clean, lang, engine: "ai" as const, offer };
      }
      return { reply: clean, lang, engine: "ai" as const };
    }

    // AI javob bermadi — savol mavzusi bo'yicha aniq javob berishga harakat qilamiz.
    const intent = intentReply(text, lang);
    if (intent) {
      void ctx.runMutation(internal.aiMemory.logChat, {
        sessionKey: sess,
        role: "assistant",
        content: intent,
        lang,
        engine: "rule-based",
      });
      return { reply: intent, lang, engine: "rule-based" as const };
    }

    // Umumiy savol — salomlashuv + bo'limlar bo'yicha yo'naltiruvchi javob.
    const fallback = `${GREETINGS[lang]}\n\n${FALLBACK_HELP[lang]}`;
    void ctx.runMutation(internal.aiMemory.logChat, {
      sessionKey: sess,
      role: "assistant",
      content: fallback,
      lang,
      engine: "rule-based",
    });
    return {
      reply: fallback,
      lang,
      engine: "rule-based" as const,
    };
  },
});

/**
 * AI javobining oxiridan OFFER satrini ajratib oladi va toza matn qaytaradi.
 * Format: OFFER: {"city":"Samarqand","days":3,"guests":2,"total":690,"services":["hotel",...]}
 */
export function extractOffer(raw: string): {
  clean: string;
  offer?: {
    city: string;
    startDate: string;
    days: number;
    guests: number;
    services: { direction: string; label: string; emoji: string; amount: number }[];
    total: number;
    summary: string;
  };
} {
  const match = raw.match(/OFFER:\s*(\{.*\})\s*$/i);
  if (!match) {
    return { clean: raw.trim() };
  }
  try {
    const parsed = JSON.parse(match[1]) as {
      city?: string;
      days?: number;
      guests?: number;
      total?: number;
      services?: string[];
      startDate?: string;
    };
    const labels: Record<string, { label: string; emoji: string; share: number }> = {
      hotel: { label: "Mehmonxona", emoji: "🏨", share: 0.3 },
      guide: { label: "Gid", emoji: "🧭", share: 0.12 },
      transfer: { label: "Transfer", emoji: "🚐", share: 0.08 },
      restaurant: { label: "Ovqatlanish", emoji: "🍽️", share: 0.1 },
      translator: { label: "Tarjimon", emoji: "🗣️", share: 0.06 },
      photographer: { label: "Fotograf", emoji: "📷", share: 0.06 },
    };
    const services = (parsed.services ?? ["hotel", "guide", "transfer"])
      .filter((s) => labels[s])
      .map((s) => ({
        direction: s,
        label: labels[s].label,
        emoji: labels[s].emoji,
        amount: Math.round((parsed.total ?? 0) * labels[s].share),
      }));
    if (!parsed.city || !parsed.total || services.length === 0) {
      return { clean: raw.trim() };
    }
    return {
      clean: raw.replace(match[0], "").trim(),
      offer: {
        city: parsed.city,
        startDate:
          parsed.startDate ??
          new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        days: Math.max(1, Math.round(parsed.days ?? 3)),
        guests: Math.max(1, Math.round(parsed.guests ?? 2)),
        services,
        total: Math.round(parsed.total),
        summary: raw.replace(match[0], "").trim().slice(0, 240),
      },
    };
  } catch {
    return { clean: raw.trim() };
  }
}

