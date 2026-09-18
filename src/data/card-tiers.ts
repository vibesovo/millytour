import { Gem, Sparkles, Zap } from "lucide-react";

/**
 * Milly Card tariflari — klient tomonidagi ma'lumotlar.
 *
 * Backend (`src/convex/discountCards.ts`) haqiqiy manba, lekin Convex
 * ulanmagan/sekin bo'lsa ham sahifa bo'sh qolmasligi uchun shu ro'yxat
 * zaxira sifatida ishlatiladi. Ikkala ro'yxat bir xil narx va foizlarga
 * ega — o'zgartirsangiz ikkalasini birga yangilang.
 */

export type TierId = "3" | "6" | "12";

export type CardTier = {
  id: TierId;
  months: number;
  label: string;
  discountPercent: number;
  priceUsd: number;
  perks: string[];
  highlight?: boolean;
};

export const CARD_TIERS: CardTier[] = [
  {
    id: "3",
    months: 3,
    label: "3 oylik karta",
    discountPercent: 7,
    priceUsd: 19,
    perks: [
      "Barcha bronlarga 7% chegirma",
      "Milly AI dasturlari — cheksiz",
      "Hamkorlardan ustuvor javob",
    ],
  },
  {
    id: "6",
    months: 6,
    label: "6 oylik karta",
    discountPercent: 12,
    priceUsd: 34,
    perks: [
      "Barcha bronlarga 12% chegirma",
      "Milly AI dasturlari — cheksiz",
      "Ustuvor mutaxassis tanlash",
      "Bepul bekor qilish 48 soatgacha",
    ],
    highlight: true,
  },
  {
    id: "12",
    months: 12,
    label: "12 oylik karta",
    discountPercent: 18,
    priceUsd: 59,
    perks: [
      "Barcha bronlarga 18% chegirma",
      "Milly AI dasturlari — cheksiz",
      "Yiliga 1 kun bepul gid",
      "Hunarmandlar bozoridan yetkazish bepul",
      "Shaxsiy sayohat menejeri",
    ],
  },
];

/** Karta darajasining nomi, shiori va rangi. */
export const TIER_META: Record<
  TierId,
  { name: string; badge: string; tagline: string; icon: typeof Zap; accent: string }
> = {
  "3": {
    name: "Silver",
    badge: "7% chegirma",
    tagline: "Sinab ko'rish uchun",
    icon: Zap,
    accent: "text-slate-500 dark:text-slate-300",
  },
  "6": {
    name: "Gold",
    badge: "12% chegirma · ommabop",
    tagline: "Eng ko'p tanlanadi",
    icon: Gem,
    accent: "text-amber-500 dark:text-amber-400",
  },
  "12": {
    name: "Platinum",
    badge: "18% chegirma",
    tagline: "Doimiy sayohatchilar uchun",
    icon: Sparkles,
    accent: "text-violet-500 dark:text-violet-400",
  },
};

export const TIER_IDS: TierId[] = ["3", "6", "12"];

export const PAYMENT_METHODS = [
  { id: "visa", label: "Visa", hint: "Xalqaro karta" },
  { id: "mastercard", label: "Mastercard", hint: "Xalqaro karta" },
  { id: "click", label: "Click", hint: "So'mda tez to'lov" },
  { id: "payme", label: "Payme", hint: "So'mda tez to'lov" },
] as const;

/** Oyiga o'rtacha narx — tariflarni solishtirish uchun (hisoblanadi, o'ylab topilmaydi). */
export function perMonth(priceUsd: number, months: number) {
  if (!months) return priceUsd;
  return Math.round((priceUsd / months) * 10) / 10;
}
