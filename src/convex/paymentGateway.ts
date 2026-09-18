"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

/**
 * To'lov shlyuzi ko'prigi (Convex node action).
 *
 * Dodo Payments (Merchant of Record) qo'llab-quvvatlanadi:
 *   - DODO_API_KEY      — checkout sessiyasi yaratish uchun API kaliti
 *   - DODO_API_BASE_URL — ixtiyoriy; standart: https://test.dodopayments.com
 *
 * Kalitlar Settings → Environment orqali qo'shiladi. Kalit bo'lmasa bron va
 * mutaxassis biriktirish baribir ishlaydi — to'lov administrator panelida
 * (To'lovlar bo'limi) tasdiqlanadi.
 */
export const createCheckout = action({
  args: { paymentId: v.id("payments") },
  handler: async (
    ctx,
    { paymentId },
  ): Promise<{ configured: boolean; url: string | null; message: string }> => {
    const payment = await ctx.runQuery(internal.payments.checkoutContext, { paymentId });
    if (!payment) {
      return { configured: false, url: null, message: "To'lov topilmadi." };
    }
    if (payment.status === "paid") {
      return { configured: true, url: null, message: "To'lov allaqachon tasdiqlangan." };
    }

    const apiKey = process.env.DODO_API_KEY;
    if (!apiKey) {
      return {
        configured: false,
        url: null,
        message:
          "To'lov shlyuzi hali ulanmagan. Administrator panelidagi «To'lovlar» bo'limida tasdiqlanadi yoki DODO_API_KEY qo'shiladi.",
      };
    }

    const base = (process.env.DODO_API_BASE_URL ?? "https://test.dodopayments.com").replace(
      /\/$/,
      "",
    );
    const site = process.env.SITE_URL ?? "https://millytour.uz";

    try {
      const response = await fetch(`${base}/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          product_cart: [
            {
              product_id: process.env.DODO_PRODUCT_ID ?? undefined,
              quantity: 1,
              amount: Math.round(payment.amount * 100),
            },
          ],
          customer: {
            email: payment.customerEmail ?? undefined,
            name: payment.customerName ?? undefined,
          },
          billing: { country: "UZ" },
          payment_link: true,
          return_url: `${site}/dashboard?tab=orders`,
          metadata: {
            payment_reference: payment.reference,
            booking_title: payment.bookingTitle ?? "",
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const url =
        (typeof payload.checkout_url === "string" && payload.checkout_url) ||
        (typeof payload.payment_link === "string" && payload.payment_link) ||
        (typeof payload.url === "string" && payload.url) ||
        null;

      if (!response.ok || !url) {
        return {
          configured: true,
          url: null,
          message:
            (typeof payload.message === "string" && payload.message) ||
            `Shlyuz javob bermadi (HTTP ${response.status}).`,
        };
      }

      await ctx.runMutation(internal.payments.storeCheckout, {
        paymentId,
        url,
        gatewayRef: typeof payload.session_id === "string" ? payload.session_id : undefined,
      });
      return { configured: true, url, message: "To'lov sahifasi tayyor." };
    } catch (error) {
      return {
        configured: true,
        url: null,
        message:
          error instanceof Error
            ? `Shlyuz bilan bog'lanishda xatolik: ${error.message}`
            : "Shlyuz bilan bog'lanishda xatolik.",
      };
    }
  },
});
