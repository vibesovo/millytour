import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { inlineKeyboard, tgCall, type BotName } from "./lib/telegramCore";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Telegram webhook:  https://<deployment>.convex.site/telegram/main
 *                    https://<deployment>.convex.site/telegram/auth
 *                    https://<deployment>.convex.site/telegram/stats
 * Update qayta ishlanadi (mutation), javob esa tarmoq orqali yuboriladi (action).
 */
function webhook(bot: BotName) {
  return httpAction(async (ctx, request) => {
    let update: unknown;
    try {
      update = await request.json();
    } catch {
      return new Response("bad request", { status: 400 });
    }

    const reply = await ctx.runMutation(internal.telegram.processUpdate, { bot, update });
    if (!reply) {
      return new Response("ok");
    }

    const token = await ctx.runQuery(internal.telegram.tokenFor, { bot });

    /* Erkin matn → Milly AI: haqiqiy suhbat javobi qaytariladi. */
    if (reply.aiPrompt) {
      if (!token) {
        return new Response("ok");
      }
      try {
        const ai = await ctx.runAction(api.millyChat.chat, {
          message: reply.aiPrompt,
        });
        if (ai.reply) {
          await tgCall(token, "sendMessage", {
            chat_id: reply.chatId,
            text: ai.reply,
          });
          return new Response("ok");
        }
      } catch {
        /* AI javob bermadi — quyidagi zaxira javob yuboriladi. */
      }
      await tgCall(token, "sendMessage", {
        chat_id: reply.chatId,
        text:
          "Milly AI hozir javob bera olmaydi, lekin menyu orqali hamma bo'lim ochiq. " +
          "Buyurtma va to'lovlar /dashboard kabinetida ko'rinadi.",
      });
      return new Response("ok");
    }

    if (token) {
      await tgCall(token, "sendMessage", {
        chat_id: reply.chatId,
        text: reply.text,
        ...(reply.keyboard ? { reply_markup: inlineKeyboard(reply.keyboard) } : {}),
      });
    }

    return new Response("ok");
  });
}

http.route({ path: "/telegram/main", method: "POST", handler: webhook("main") });
http.route({ path: "/telegram/auth", method: "POST", handler: webhook("auth") });
http.route({ path: "/telegram/stats", method: "POST", handler: webhook("stats") });

/** HMAC-SHA256 imzo tekshiruvi (Web Crypto — default runtime). */
async function signatureMatches(raw: string, header: string | null, secret: string) {
  if (!header) {
    return false;
  }
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
    const hex = Array.from(mac)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const base64 = btoa(String.fromCharCode(...mac));
    return header.includes(hex) || header.includes(base64);
  } catch {
    return false;
  }
}

/**
 * To'lov shlyuzi webhook'i:  https://<deployment>.convex.site/payments/webhook
 * Imzo DODO_WEBHOOK_SECRET bilan tekshiriladi, so'ng to'lov va bron yopiladi.
 */
http.route({
  path: "/payments/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const raw = await request.text();
    const secret = process.env.DODO_WEBHOOK_SECRET;
    if (secret) {
      const header =
        request.headers.get("x-dodo-signature") ??
        request.headers.get("x-webhook-signature") ??
        request.headers.get("x-signature");
      if (!(await signatureMatches(raw, header, secret))) {
        return new Response("invalid signature", { status: 401 });
      }
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return new Response("bad request", { status: 400 });
    }

    const data = (payload.data ?? payload) as Record<string, unknown>;
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const reference =
      (typeof meta.payment_reference === "string" && meta.payment_reference) ||
      (typeof data.reference === "string" && data.reference) ||
      null;
    if (!reference) {
      return new Response("ok");
    }

    const status = String(data.status ?? "");
    const failed = ["failed", "cancelled", "requires_payment_method"].includes(status);
    const gatewayRef =
      (typeof data.payment_id === "string" && data.payment_id) ||
      (typeof data.id === "string" && data.id) ||
      undefined;

    await ctx.runMutation(internal.payments.settle, {
      reference,
      gatewayRef,
      failed: failed || undefined,
    });
    return new Response("ok");
  }),
});

export default http;
