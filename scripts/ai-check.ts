/**
 * Milly AI tekshiruvi — `npm run ai:check`.
 *
 * AI kalitisiz ham ishlaydigan qatlamni sinaydi: til aniqlash (uz/ru/en) va
 * mavzuga oid tayyor javoblar (bron, to'lov, kuzatish, chegirma, bekor qilish).
 * Convex'siz ishlaydi, shu sababli CI'da ham qo'yish mumkin.
 */

import { detectLanguage, intentReply } from "../src/convex/millyChat";

type Case = { text: string; lang: string; topic: string; firstLine: string };

const CASES: Case[] = [
  { text: "Salom, tur paketni qanday bron qilaman?", lang: "uz", topic: "bron", firstLine: "Bron qilish" },
  { text: "Как оплатить заказ?", lang: "ru", topic: "to'lov", firstLine: "Оплата" },
  { text: "How can I track my order?", lang: "en", topic: "kuzatish", firstLine: "orders section" },
  { text: "Milly Card chegirmasi qancha?", lang: "uz", topic: "chegirma", firstLine: "Milly Card" },
  { text: "I want to cancel my booking", lang: "en", topic: "bekor", firstLine: "cancel" },
  { text: "Bookingni qanday kuzataman?", lang: "uz", topic: "kuzatish", firstLine: "/dashboard" },
  { text: "Здравствуйте! Какие есть скидки?", lang: "ru", topic: "chegirma", firstLine: "Milly Card" },
  { text: "Mehmonxonani bron qilsam bo'ladimi?", lang: "uz", topic: "bron", firstLine: "Bron qilish" },
  { text: "Where do I pay for my tour?", lang: "en", topic: "to'lov", firstLine: "Payment" },
  // Platformani birinchi marta ko'rgan sayyoh (onboarding) — 3 tilda ham ishlashi kerak
  { text: "Tushunmadim, platforma qanday ishlaydi?", lang: "uz", topic: "boshlash", firstLine: "4 qadam" },
  { text: "Как начать бронировать?", lang: "ru", topic: "boshlash", firstLine: "4 шага" },
  { text: "How does this work? I'm new", lang: "en", topic: "boshlash", firstLine: "4 steps" },
  // Xizmatlar va turlar — yangi mavzular
  { text: "Gid xizmatini qanday olsam bo'ladi?", lang: "uz", topic: "xizmatlar", firstLine: "/xizmatlar" },
  { text: "Which tours do you have?", lang: "en", topic: "turlar", firstLine: "/paketlar" },
];

let failed = 0;

for (const c of CASES) {
  const lang = detectLanguage(c.text);
  const reply = intentReply(c.text, lang);
  const okLang = lang === c.lang;
  const okTopic = Boolean(reply) && reply!.includes(c.firstLine);
  if (!okLang || !okTopic) failed += 1;

  console.log(
    `${okLang && okTopic ? "OK  " : "FAIL"} til=${lang} (kutilgan ${c.lang}) · mavzu=${c.topic}`,
  );
  if (!okLang || !okTopic) {
    console.log(`      javob: ${(reply ?? "yo'q").split("\n")[0].slice(0, 80)}`);
  }
}

// Mavzuga tushmaydigan savol zaxira javobni ishlatmasligi kerak (AI zanjiriga o'tadi).
const generic = detectLanguage("Bugun Qarshida ob-havo qanday?");
const genericReply = intentReply("Bugun Qarshida ob-havo qanday?", generic);
if (genericReply !== null) failed += 1;
console.log(
  `${genericReply === null ? "OK  " : "FAIL"} umumiy savol tayyor javobga tushmaydi (AI zanjiriga o'tadi)`,
);

console.log(`\n${failed === 0 ? "✔ Hammasi o'tdi" : `✖ ${failed} ta xato`}`);
process.exit(failed === 0 ? 0 : 1);
