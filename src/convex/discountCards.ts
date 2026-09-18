import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { reference, requireAdmin, requireUser } from "./lib/access";

/**
 * Sayohat chegirma kartalari — 3/6/12 oylik obuna.
 *
 * Karta bir marta xarid qilinadi va muddati ichida har bir bron (tur paket,
 * xizmat, Milly AI dasturi) narxidan foizli chegirma beradi:
 *   3 oy — 7% · 6 oy — 12% (eng ommabop) · 12 oy — 18%
 */

export type CardTierId = "3" | "6" | "12";

export const CARD_TIERS: {
  id: CardTierId;
  months: number;
  label: string;
  discountPercent: number;
  priceUsd: number;
  perks: string[];
  highlight?: boolean;
}[] = [
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

export function tierById(id: string) {
  return CARD_TIERS.find((t) => t.id === id) ?? null;
}

/**
 * Foydalanuvchining hozirgi faol kartasi — bron narxini hisoblashda ishlatiladi
 * (server tomonda, ctx.db bilan; klient uchun `active` query'si bor).
 */
export async function activeCardForUser(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
): Promise<Doc<"discountCards"> | null> {
  const rows: Doc<"discountCards">[] = await ctx.db
    .query("discountCards")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const now = Date.now();
  return (
    rows
      .filter((c) => c.status === "active" && c.expiresAt > now)
      .sort((a, b) => b.discountPercent - a.discountPercent)[0] ?? null
  );
}

const tierValidator = v.union(v.literal("3"), v.literal("6"), v.literal("12"));

/**
 * Karta vizual uslublari (klient bilan bir xil ro'yxat — `src/components/milly-card.tsx`).
 *
 * Format:
 *   - Shahar (rasmlik): "samarqand" | "buxoro" | "xiva" | "toshkent"
 *   - Rangli:           "pattern:<rang>" | "plain:<rang>" (masalan "pattern:firuza")
 *   - Eski id'lar ham qabul qilinadi (eski kartalar saqlanib qolishi uchun).
 */
export const DESIGN_IDS = [
  "samarqand",
  "buxoro",
  "xiva",
  "toshkent",
  "pattern:midnight",
  "pattern:firuza",
  "pattern:oltin",
  "pattern:neon",
  "pattern:mova",
  "plain:midnight",
  "plain:firuza",
  "plain:oltin",
  "plain:neon",
  "plain:mova",
  "plain:oq",
  // eski format — geri muvofiqlik uchun (eski kartalar saqlanib qoladi)
  "registon",
  "silk",
  "modern",
];

/** Foydalanuvchining barcha kartalari (yangilari birinchi). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return [];
    }
    const rows = await ctx.db
      .query("discountCards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Hozir faol karta — bronlarda chegirma shu yerdan olinadi. */
export const active = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return null;
    }
    const rows = await ctx.db
      .query("discountCards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const now = Date.now();
    return (
      rows
        .filter((c) => c.status === "active" && c.expiresAt > now)
        .sort((a, b) => b.discountPercent - a.discountPercent)[0] ?? null
    );
  },
});

/** Xarid sahifasi uchun tier ro'yxati. */
export const tiers = query({
  args: {},
  handler: async () => CARD_TIERS,
});

/**
 * Karta xaridi: pending to'lov yaratiladi. To'lov shlyuz webhook'i yoki
 * administrator tasdiqlagach karta faollashadi (activateInternal).
 */
export const purchase = mutation({
  args: { tier: tierValidator, method: v.string(), design: v.optional(v.string()) },
  handler: async (ctx, { tier, method, design }) => {
    const user = await requireUser(ctx);
    const meta = tierById(tier);
    if (!meta) {
      throw new Error("Karta turi topilmadi.");
    }
    const allowed = ["click", "payme", "visa", "mastercard"];
    if (!allowed.includes(method)) {
      throw new Error("To'lov usuli noto'g'ri.");
    }
    const chosenDesign = DESIGN_IDS.includes(design ?? "") ? (design as string) : "registon";

    const existing = await ctx.db
      .query("discountCards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activeCard = existing.find((c) => c.status === "active" && c.expiresAt > Date.now());
    if (activeCard && activeCard.tier === tier) {
      throw new Error("Bu karta sizda allaqachon faol — muddati tugagach yangilaysiz.");
    }

    const now = Date.now();
    const ref = `CARD-${reference().slice(4)}`;
    const paymentId = await ctx.db.insert("payments", {
      userId: user._id,
      purpose: "discount",
      reference: ref,
      amount: meta.priceUsd,
      currency: "USD",
      method: method as "click" | "payme" | "visa" | "mastercard",
      status: "pending",
      design: chosenDesign,
      createdAt: now,
    });

    return { paymentId, reference: ref, amount: meta.priceUsd, tier, design: chosenDesign };
  },
});

/**
 * To'lov yopilgach kartani faollashtirish — settlePayment shuni rejalashtiradi.
 * To'lov allaqachon "paid" bo'ladi; shu bo'yicha kartani yaratamiz (idempotent).
 */
export const activateInternal = internalMutation({
  args: { paymentReference: v.string(), gatewayRef: v.optional(v.string()) },
  handler: async (ctx, { paymentReference }) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", paymentReference))
      .first();
    if (!payment || payment.purpose !== "discount" || payment.status !== "paid" || !payment.userId) {
      return { ok: false, message: "Karta to'lovi topilmadi yoki to'lanmagan." };
    }
    const already = await ctx.db
      .query("discountCards")
      .withIndex("by_reference", (q) => q.eq("reference", payment.reference))
      .first();
    if (already) {
      return { ok: true, message: "Karta allaqachon faol." };
    }
    const userId = payment.userId;

    // payments.amount noyob narxlar bilan tier'ni qayta tiklaymiz.
    const meta = CARD_TIERS.find((t) => t.priceUsd === payment.amount) ?? CARD_TIERS[0];
    const now = Date.now();

    // Bitta faol karta qoladi — eskilari yopiladi.
    const old = await ctx.db
      .query("discountCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const card of old) {
      if (card.status === "active") {
        await ctx.db.patch(card._id, { status: "expired" });
      }
    }

    await ctx.db.insert("discountCards", {
      userId,
      tier: meta.id,
      design: payment.design ?? "registon",
      reference: payment.reference,
      pricePaid: payment.amount,
      discountPercent: meta.discountPercent,
      status: "active",
      startsAt: now,
      expiresAt: now + meta.months * 30 * 24 * 60 * 60 * 1000,
      paymentId: payment._id,
      createdAt: now,
    });

    return { ok: true, message: "Karta faollashtirildi." };
  },
});

/** Administrator to'lovni tasdiqlasa — karta ham faollashadi. */
export const confirmByAdmin = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, { paymentId }) => {
    await requireAdmin(ctx);
    const payment = await ctx.db.get(paymentId);
    if (!payment || payment.purpose !== "discount") {
      throw new Error("Karta to'lovi topilmadi.");
    }
    if (payment.status === "paid") {
      return { ok: true };
    }
    if (!payment.userId) {
      throw new Error("To'lov foydalanuvchisiz.");
    }
    const userId = payment.userId;
    const meta = CARD_TIERS.find((t) => t.priceUsd === payment.amount) ?? CARD_TIERS[0];
    const now = Date.now();
    await ctx.db.patch(payment._id, { status: "paid", paidAt: now });

    const old = await ctx.db
      .query("discountCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const card of old) {
      if (card.status === "active") {
        await ctx.db.patch(card._id, { status: "expired" });
      }
    }
    await ctx.db.insert("discountCards", {
      userId,
      tier: meta.id,
      design: payment.design ?? "registon",
      reference: payment.reference,
      pricePaid: payment.amount,
      discountPercent: meta.discountPercent,
      status: "active",
      startsAt: now,
      expiresAt: now + meta.months * 30 * 24 * 60 * 60 * 1000,
      paymentId: payment._id,
      createdAt: now,
    });
    return { ok: true };
  },
});
