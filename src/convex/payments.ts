import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireAdmin, requireUser, reference } from "./lib/access";
import { directionForKind } from "./bookings";
import { paymentStatusValidator, paymentValidator } from "./schema";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * To'lov oqimi:
 *   1. start() — tranzaksiya yaratiladi (pending) va to'lov havolasi so'raladi.
 *   2. createCheckout() — shlyuz (gateway) hosted checkout havolasini qaytaradi.
 *   3. settle() — shlyuz webhook'i yoki administrator to'lovni tasdiqlaydi.
 * Shlyuz kalitlari bo'lmasa bron va mutaxassis biriktirish baribir ishlaydi,
 * faqat to'lov administrator tasdig'ini kutadi.
 */

/** To'lovni "to'langan" holatiga o'tkazish — yagona joy. */
async function settlePayment(
  ctx: MutationCtx,
  payment: Doc<"payments">,
  gatewayRef?: string,
): Promise<{ ok: true; alreadyPaid: boolean }> {
  if (payment.status === "paid") {
    return { ok: true, alreadyPaid: true };
  }

  await ctx.db.patch(payment._id, {
    status: "paid",
    paidAt: Date.now(),
    gatewayRef: gatewayRef ?? payment.gatewayRef,
  });

  if (payment.bookingId) {
    await ctx.db.patch(payment.bookingId, {
      paymentStatus: "paid",
      status: "confirmed",
      updatedAt: Date.now(),
    });
    const booking = await ctx.db.get(payment.bookingId);
    if (booking) {
      await ctx.scheduler.runAfter(0, internal.telegram.notifyBooking, {
        title: booking.title,
        city: booking.city,
        startDate: booking.startDate,
        guests: booking.guests,
        totalPrice: booking.totalPrice,
        direction: directionForKind(booking.kind),
        providerId: booking.providerId ?? null,
      });
    }
  }

  if (payment.purpose === "discount") {
    // Chegirma karta to'lovi: payUser bo'yicha karta faollashadi.
    if (payment.userId) {
      await ctx.scheduler.runAfter(0, internal.discountCards.activateInternal, {
        paymentReference: payment.reference,
        gatewayRef,
      });
    }
    return { ok: true, alreadyPaid: false };
  }

  if (payment.providerId && payment.purpose === "subscription") {
    const provider = await ctx.db.get(payment.providerId);
    if (provider) {
      const base =
        provider.paidUntil && provider.paidUntil > Date.now() ? provider.paidUntil : Date.now();
      await ctx.db.patch(provider._id, {
        subscription: "active",
        paidUntil: base + MONTH_MS,
      });
      await ctx.db.insert("botEvents", {
        bot: "auth",
        direction: provider.direction,
        providerId: provider._id,
        kind: "subscription",
        text: `Oylik obuna to'landi: $${payment.amount} (${payment.method})`,
        status: "sent",
        createdAt: Date.now(),
      });
    }
  }

  return { ok: true, alreadyPaid: false };
}

/** Bron uchun to'lovni boshlash (yoki mavjud pending to'lovni qaytarish). */
export const start = mutation({
  args: { bookingId: v.id("bookings"), method: paymentValidator },
  handler: async (ctx, { bookingId, method }) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Buyurtma topilmadi.");
    }
    if (booking.userId !== user._id && user.role !== "admin") {
      throw new Error("Bu buyurtma uchun to'lov qilish huquqi yo'q.");
    }
    if (booking.paymentStatus === "paid") {
      return { paid: true, paymentId: null, reference: null, amount: booking.totalPrice };
    }

    const existing = (
      await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
        .collect()
    ).find((p) => p.status === "pending");
    if (existing) {
      await ctx.db.patch(bookingId, { paymentMethod: method, updatedAt: Date.now() });
      await ctx.db.patch(existing._id, { method });
      return {
        paid: false,
        paymentId: existing._id,
        reference: existing.reference,
        amount: existing.amount,
      };
    }

    const ref = `PAY-${reference().slice(4)}`;
    const paymentId = await ctx.db.insert("payments", {
      userId: user._id,
      bookingId,
      purpose:
        booking.kind === "marketplace"
          ? "marketplace"
          : booking.kind === "package" || booking.kind === "custom"
            ? "package"
            : "service",
      reference: ref,
      amount: booking.totalPrice,
      currency: "USD",
      method,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.patch(bookingId, { paymentMethod: method, updatedAt: Date.now() });
    return { paid: false, paymentId, reference: ref, amount: booking.totalPrice };
  },
});

/** Hamkor oylik obunasini to'lash. */
export const startSubscription = mutation({
  args: { method: paymentValidator },
  handler: async (ctx, { method }) => {
    const user = await requireUser(ctx);
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      throw new Error("Hamkor profili topilmadi.");
    }
    const ref = `SUB-${reference().slice(4)}`;
    const paymentId = await ctx.db.insert("payments", {
      userId: user._id,
      providerId: provider._id,
      purpose: "subscription",
      reference: ref,
      amount: provider.monthlyFee,
      currency: "USD",
      method,
      status: "pending",
      createdAt: Date.now(),
    });
    return { paymentId, reference: ref, amount: provider.monthlyFee };
  },
});

/**
 * Administrator to'lovni tasdiqlaydi (shlyuz ulanmagan paytda) — yoki
 * shlyuz webhook'i shu mutation orqali to'lovni yopadi.
 */
export const confirm = mutation({
  args: { paymentId: v.id("payments"), gatewayRef: v.optional(v.string()) },
  handler: async (ctx, { paymentId, gatewayRef }) => {
    await requireAdmin(ctx);
    const payment = await ctx.db.get(paymentId);
    if (!payment) {
      throw new Error("To'lov topilmadi.");
    }
    return await settlePayment(ctx, payment, gatewayRef);
  },
});

/** Shlyuz webhook'i uchun: reference bo'yicha to'lovni yopish. */
export const settle = internalMutation({
  args: {
    reference: v.string(),
    gatewayRef: v.optional(v.string()),
    failed: v.optional(v.boolean()),
  },
  handler: async (ctx, { reference: ref, gatewayRef, failed }) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) => q.eq("reference", ref))
      .first();
    if (!payment) {
      return { ok: false, message: "To'lov topilmadi" };
    }
    if (failed) {
      await ctx.db.patch(payment._id, { status: "failed" });
      return { ok: false, message: "To'lov muvaffaqiyatsiz deb belgilandi" };
    }
    const result = await settlePayment(ctx, payment, gatewayRef);
    return { ok: true, alreadyPaid: result.alreadyPaid };
  },
});

export const refund = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, { paymentId }) => {
    await requireAdmin(ctx);
    const payment = await ctx.db.get(paymentId);
    if (!payment) {
      throw new Error("To'lov topilmadi.");
    }
    await ctx.db.patch(paymentId, { status: "refunded" });
    if (payment.bookingId) {
      await ctx.db.patch(payment.bookingId, {
        paymentStatus: "refunded",
        status: "cancelled",
        updatedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return [];
    }
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const byBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      return [];
    }
    if (booking.userId !== user._id && user.role !== "admin") {
      throw new Error("Bu buyurtma sizga tegishli emas.");
    }
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Shlyuz checkout yaratishi uchun minimal ma'lumot (node action o'qiydi). */
export const checkoutContext = internalQuery({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, { paymentId }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) {
      return null;
    }
    const user = payment.userId ? await ctx.db.get(payment.userId) : null;
    const booking = payment.bookingId ? await ctx.db.get(payment.bookingId) : null;
    return {
      _id: payment._id,
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      customerEmail: user?.email ?? null,
      customerName: user?.name ?? booking?.customerName ?? null,
      bookingTitle: booking?.title ?? null,
    };
  },
});

/** Shlyuz qaytargan checkout havolasini saqlash. */
export const storeCheckout = internalMutation({
  args: {
    paymentId: v.id("payments"),
    url: v.string(),
    gatewayRef: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, url, gatewayRef }) => {
    await ctx.db.patch(paymentId, { gatewayRef: gatewayRef ?? url });
    return { ok: true };
  },
});

export const adminList = query({
  args: { status: v.optional(paymentStatusValidator) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const rows = status
      ? await ctx.db
          .query("payments")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("payments").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
  },
});

export type PaymentId = Id<"payments">;
