import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  DIRECTION_META,
  DIRECTION_SCREENS,
  TOURIST_SCREENS,
  mainMenuRows,
  type BotButton,
} from "./lib/bots";
import {
  BOT_ENV_KEYS,
  inlineKeyboard,
  resolveToken,
  storedTokens,
  tgCall,
  type BotName,
} from "./lib/telegramCore";
import { requireAdmin, requireUser } from "./lib/access";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./users";
import { MONTHLY_FEE } from "./providers";
import { directionValidator, type Direction } from "./schema";
import { MAIN_BOT_USERNAME, PARTNER_BOT_USERNAME } from "../data/catalog";

const botValidator = v.union(v.literal("main"), v.literal("auth"), v.literal("stats"));

/**
 * Owner identifikatori — statistika botiga faqat loyiha egasi kiradi.
 * OWNER_TELEGRAM_ID env o'rnatilgan bo'lsa — faqat shu Telegram ID;
 * o'rnatilmagan bo'lsa — birinchi /start yuborgan foydalanuvchi owner
 * bo'lib qoladi va uning ID'si settings'ga yoziladi.
 */
const OWNER_SETTING_KEY = "statsBotOwner";

const CITIES = ["Toshkent", "Samarqand", "Buxoro", "Xiva", "Farg'ona", "Nurota"];

const DIRECTION_BUTTONS: BotButton[][] = [
  [
    { label: "🧭 Gid", action: "reg:guide" },
    { label: "🚐 Transfer", action: "reg:transfer" },
  ],
  [
    { label: "🏨 Mehmonxona", action: "reg:hotel" },
    { label: "🍽️ Restoran", action: "reg:restaurant" },
  ],
  [
    { label: "🗣️ Tarjimon", action: "reg:translator" },
    { label: "📷 Fotograf", action: "reg:photographer" },
  ],
  [
    { label: "🏺 Hunarmand", action: "reg:artisan" },
    { label: "🎫 Boshqa xizmat", action: "reg:other" },
  ],
];

/**
 * Auth bot suhbati: har yo'nalish uchun hajm/sig'im savoli va tez javoblar.
 * Javoblar bilan birga tarif (Start/Pro/Business) tavsiya etiladi.
 */
const DIRECTION_INTERVIEW: Record<
  Direction,
  { question: string; options: string[]; unit: string }
> = {
  guide: {
    question: "Kuniga nechta guruhni olib bora olasiz?",
    options: ["1 guruh", "2 guruh", "3+ guruh"],
    unit: "guruh",
  },
  transfer: {
    question: "Mashinangizda nechta o'rin bor?",
    options: ["3 o'rin", "7 o'rin", "14+ o'rin"],
    unit: "o'rin",
  },
  hotel: {
    question: "Nechta xonangiz bor?",
    options: ["1-5 xona", "6-15 xona", "16+ xona"],
    unit: "xona",
  },
  restaurant: {
    question: "Bir vaqtda nechta mehmonni qabul qila olasiz?",
    options: ["20 o'rin", "60 o'rin", "120+ o'rin"],
    unit: "o'rin",
  },
  translator: {
    question: "Qaysi tillarda xizmat ko'rsatasiz?",
    options: ["UZ / RU", "UZ / RU / EN", "3+ til"],
    unit: "til",
  },
  photographer: {
    question: "Haftada nechta sessiya qabul qilasiz?",
    options: ["1-2 sessiya", "3-5 sessiya", "6+ sessiya"],
    unit: "sessiya",
  },
  artisan: {
    question: "Bir vaqtda qancha mahsulot tayyorlay olasiz?",
    options: ["10 tagacha", "10-50 ta", "50+ ta"],
    unit: "mahsulot",
  },
  other: {
    question: "Xizmat turini tanlang yoki yozib yuboring.",
    options: ["Sug'urta", "Chipta / konsulxizmat", "Boshqa xizmat"],
    unit: "xizmat",
  },
};

const PLAN_INFO: Record<"start" | "pro" | "business", { label: string; perks: string }> = {
  start: {
    label: "Start",
    perks: "Buyurtmalar botga, kalendar, reyting va asosiy hisobotlar",
  },
  pro: {
    label: "Pro",
    perks: "Start + saytda ustuvor ko'rinish, past komissiya, kunlik ko'proq vazifa",
  },
  business: {
    label: "Business",
    perks: "Pro + ajratilgan menejer, \"Top hamkor\" belgisi va to'liq hisobotlar",
  },
};

/** Tajriba va hajm asosida tavsiya etiladigan tarif. */
function recommendPlan(
  direction: Direction,
  years: number,
  capacity: string,
): { plan: "start" | "pro" | "business"; reason: string; monthlyFee: number } {
  const options = DIRECTION_INTERVIEW[direction].options;
  const index = options.indexOf(capacity);
  const capacityScore = index <= 0 ? 0 : index === 1 ? 1 : 2;
  const experienceScore = years >= 5 ? 2 : years >= 2 ? 1 : 0;
  const score = capacityScore + experienceScore;
  const plan = score >= 3 ? "business" : score >= 1 ? "pro" : "start";
  const base = MONTHLY_FEE[direction];
  const monthlyFee =
    plan === "business" ? Math.round(base * 2.2) : plan === "pro" ? Math.round(base * 1.5) : base;
  const reason = [
    years > 0 ? `${years} yil tajriba` : "yangi boshlovchi",
    capacity ? `${capacity} hajm` : "hajm ko'rsatilmagan",
  ].join(" · ");
  return { plan, reason, monthlyFee };
}

function maskToken(token?: string) {
  if (!token) {
    return null;
  }
  return `••••${token.slice(-4)}`;
}

async function botMeta(ctx: Parameters<typeof storedTokens>[0]) {
  return (await storedTokens(ctx)) as { main?: string; auth?: string };
}

/** Bot sozlamalari holati — administrator paneli va hamkor paneli uchun. */
export const config = query({
  args: {},
  handler: async (ctx) => {
    const stored = await botMeta(ctx);
    const usernames = ((
      await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "botUsernames"))
        .first()
    )?.value ?? {}) as { main?: string; auth?: string };

    const envConfigured = {
      main: Boolean(process.env.TELEGRAM_MAIN_BOT_TOKEN),
      auth: Boolean(process.env.TELEGRAM_AUTH_BOT_TOKEN),
    };
    const configured = {
      main: envConfigured.main || Boolean(stored.main),
      auth: envConfigured.auth || Boolean(stored.auth),
    };

    const known = {
      main: usernames.main ?? MAIN_BOT_USERNAME,
      auth: usernames.auth ?? PARTNER_BOT_USERNAME,
    };
    const siteUrl = process.env.CONVEX_SITE_URL ?? "";

    return {
      configured,
      envKeys: BOT_ENV_KEYS,
      masked: { main: maskToken(stored.main), auth: maskToken(stored.auth) },
      usernames: known,
      authDeepLink: `https://t.me/${known.auth}?start=register`,
      mainDeepLink: `https://t.me/${known.main}`,
      /** Mini app havolasi — Milly AI markazda ochiladi. */
      miniAppUrl: siteUrl.startsWith("https://")
        ? `${siteUrl.replace(/\/$/, "")}/telegram?miniapp=1`
        : null,
    };
  },
});

/** Faqat administrator: tokenlarni panel orqali saqlash (KEYS paneliga muqobil). */
export const saveBotTokens = mutation({
  args: { main: v.optional(v.string()), auth: v.optional(v.string()) },
  handler: async (ctx, { main, auth }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "botTokens"))
      .first();
    const value = {
      ...((existing?.value ?? {}) as { main?: string; auth?: string }),
      ...(main ? { main: main.trim() } : {}),
      ...(auth ? { auth: auth.trim() } : {}),
    };
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("settings", { key: "botTokens", value, updatedAt: Date.now() });
    }
    return { ok: true };
  },
});

export const tokenFor = internalQuery({
  args: { bot: botValidator },
  handler: async (ctx, { bot }) => (await resolveToken(ctx, bot)) ?? null,
});

export const providerForTest = internalQuery({
  args: { providerId: v.id("providers") },
  handler: async (ctx, { providerId }) => {
    const provider = await ctx.db.get(providerId);
    if (!provider) {
      return null;
    }
    return {
      telegramId: provider.telegramId ?? null,
      direction: provider.direction,
      businessName: provider.businessName,
      status: provider.status,
    };
  },
});

/** Bot funksiyalari ro'yxati — hamkor panelida va botda bir xil ko'rinadi. */
export const menuPreview = query({
  args: { direction: v.optional(directionValidator) },
  handler: async (_ctx, { direction }) => {
    if (!direction) {
      return { screens: TOURIST_SCREENS, meta: null };
    }
    return {
      screens: DIRECTION_SCREENS[direction],
      meta: DIRECTION_META[direction],
    };
  },
});

/** Hamkor uchun botga ulanish havolasi (bir martalik kod bilan). */
export const linkCode = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const code = Math.random().toString(36).slice(2, 10);
    await ctx.db.insert("linkCodes", {
      code,
      userId: user._id,
      providerId: provider?._id,
      createdAt: Date.now(),
    });
    const usernames = ((
      await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "botUsernames"))
        .first()
    )?.value ?? {}) as { auth?: string; main?: string };
    const auth = usernames.auth ?? PARTNER_BOT_USERNAME;
    const main = usernames.main ?? MAIN_BOT_USERNAME;
    return {
      code,
      deepLink: `https://t.me/${auth}?start=${code}`,
      mainDeepLink: `https://t.me/${main}?start=${code}`,
    };
  },
});

/** Bot jurnali: hamkor o'z hodisalarini, administrator barchasini ko'radi. */
export const events = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }
    const take = limit ?? 20;
    if (user.role === "admin") {
      return await ctx.db.query("botEvents").withIndex("by_created").order("desc").take(take);
    }
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      return [];
    }
    const rows = await ctx.db
      .query("botEvents")
      .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, take);
  },
});

export const storeBotMeta = internalMutation({
  args: { usernames: v.any(), webhook: v.any() },
  handler: async (ctx, { usernames, webhook }) => {
    for (const [key, value] of [
      ["botUsernames", usernames],
      ["botWebhook", webhook],
    ] as const) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("settings", { key, value, updatedAt: Date.now() });
      }
    }
    return { ok: true };
  },
});

/** Marker so'nggi o'qilgan update raqami — polling rejimi uchun. */
export const pollOffset = internalQuery({
  args: { bot: botValidator },
  handler: async (ctx, { bot }) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "botPollOffset"))
      .first();
    const value = (row?.value ?? {}) as { main?: number; auth?: number; stats?: number };
    return value[bot] ?? 0;
  },
});

export const savePollOffset = internalMutation({
  args: { bot: botValidator, offset: v.number() },
  handler: async (ctx, { bot, offset }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "botPollOffset"))
      .first();
    const value = { ...((existing?.value ?? {}) as Record<string, number>), [bot]: offset };
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("settings", { key: "botPollOffset", value, updatedAt: Date.now() });
    }
    return { ok: true };
  },
});

/** Yo'nalish bo'yicha faol hamkorlar (botga xabar yuborish uchun). */
export const providersForDirection = internalQuery({
  args: { direction: directionValidator },
  handler: async (ctx, { direction }) => {
    const rows = await ctx.db
      .query("providers")
      .withIndex("by_direction", (q) => q.eq("direction", direction))
      .collect();
    return rows
      .filter((p) => p.status === "approved" && p.telegramId)
      .map((p) => ({
        providerId: p._id,
        telegramId: p.telegramId as number,
        businessName: p.businessName,
      }));
  },
});

export const logEvent = internalMutation({
  args: {
    bot: botValidator,
    direction: v.optional(directionValidator),
    providerId: v.optional(v.id("providers")),
    telegramId: v.optional(v.number()),
    kind: v.string(),
    text: v.string(),
    status: v.union(v.literal("sent"), v.literal("skipped"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("botEvents", { ...args, createdAt: Date.now() });
    return { ok: true };
  },
});

/** Bitta hamkorga bot xabari (token bo'lmasa jurnalga yoziladi). */
export const pushMessage = internalAction({
  args: {
    telegramId: v.number(),
    text: v.string(),
    kind: v.string(),
    direction: v.optional(directionValidator),
    providerId: v.optional(v.id("providers")),
  },
  handler: async (ctx, { telegramId, text, kind, direction, providerId }): Promise<{ ok: boolean }> => {
    const token = await ctx.runQuery(internal.telegram.tokenFor, { bot: "main" });
    if (!token) {
      await ctx.runMutation(internal.telegram.logEvent, {
        bot: "main",
        direction,
        providerId,
        telegramId,
        kind,
        text,
        status: "skipped",
      });
      return { ok: false };
    }
    const sent = await tgCall(token, "sendMessage", {
      chat_id: telegramId,
      text,
      reply_markup: inlineKeyboard(mainMenuRows(direction)),
    });
    await ctx.runMutation(internal.telegram.logEvent, {
      bot: "main",
      direction,
      providerId,
      telegramId,
      kind,
      text: sent.ok ? text : `${text}\n(xabar yuborilmadi: ${sent.description ?? "xato"})`,
      status: sent.ok ? "sent" : "failed",
    });
    return { ok: sent.ok };
  },
});

/** Yangi so'rovni yo'nalishdagi barcha hamkorlarga yuborish. */
export const broadcastToDirection = internalAction({
  args: { direction: directionValidator, text: v.string(), kind: v.string() },
  handler: async (ctx, { direction, text, kind }): Promise<{ sent: number }> => {
    const targets = await ctx.runQuery(internal.telegram.providersForDirection, { direction });
    let sent = 0;
    for (const target of targets) {
      const result = await ctx.runMutation(internal.telegram.logEvent, {
        bot: "main",
        direction,
        providerId: target.providerId,
        telegramId: target.telegramId,
        kind,
        text,
        status: "sent",
      });
      void result;
      sent += 1;
    }
    const token = await ctx.runQuery(internal.telegram.tokenFor, { bot: "main" });
    if (token) {
      for (const target of targets) {
        await tgCall(token, "sendMessage", {
          chat_id: target.telegramId,
          text,
          reply_markup: inlineKeyboard(mainMenuRows(direction)),
        });
      }
    }
    return { sent };
  },
});

/**
 * AI Planner dasturi uchun tanlangan mutaxassisga aniq vazifa yuborish.
 * Xabar borishi bilan vazifa "notified" holatiga o'tadi.
 */
export const notifyAssignment = internalAction({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, { assignmentId }): Promise<{ ok: boolean }> => {
    const detail = await ctx.runQuery(internal.assignments.detail, { assignmentId });
    if (!detail) {
      return { ok: false };
    }
    const { assignment, provider, directionLabel } = detail;
    const text =
      `🧰 Yangi vazifa: ${directionLabel}\n\n` +
      `${assignment.task}\n\n` +
      `📅 ${assignment.scheduledFor} · ${assignment.days} kun · ${assignment.guests} kishi\n` +
      `📍 ${assignment.city}\n💵 Sizga to'lov: $${assignment.amount}\n` +
      `Bron: ${assignment.bookingReference}`;

    const token = await ctx.runQuery(internal.telegram.tokenFor, { bot: "main" });
    if (provider.telegramId && token) {
      const sent = await tgCall(token, "sendMessage", {
        chat_id: provider.telegramId,
        text,
        reply_markup: inlineKeyboard([
          [
            { label: "✅ Vazifani qabul qilaman", action: `task:accept:${assignmentId}` },
            { label: "❌ Rad etaman", action: `task:decline:${assignmentId}` },
          ],
        ]),
      });
      await ctx.runMutation(internal.assignments.markNotified, {
        assignmentId,
        status: sent.ok ? "notified" : "assigned",
      });
      await ctx.runMutation(internal.telegram.logEvent, {
        bot: "main",
        direction: assignment.direction,
        providerId: provider._id,
        telegramId: provider.telegramId,
        kind: "assignment",
        text:
          sent.ok
            ? `${assignment.bookingReference} — ${assignment.role} vazifasi yuborildi`
            : `${assignment.bookingReference} — vazifa yuborilmadi: ${sent.description ?? "xato"}`,
        status: sent.ok ? "sent" : "failed",
      });
      return { ok: sent.ok };
    }

    await ctx.runMutation(internal.telegram.logEvent, {
      bot: "main",
      direction: assignment.direction,
      providerId: provider._id,
      telegramId: provider.telegramId ?? undefined,
      kind: "assignment",
      text,
      status: "skipped",
    });
    return { ok: false };
  },
});

/** Tasdiqlangan buyurtma haqida hamkorga xabar. */
export const notifyBooking = internalAction({
  args: {
    title: v.string(),
    city: v.string(),
    startDate: v.string(),
    guests: v.number(),
    totalPrice: v.number(),
    direction: directionValidator,
    providerId: v.optional(v.union(v.id("providers"), v.null())),
  },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const text = `✅ To'lov tasdiqlandi\n\n${args.title}\n${args.startDate} · ${
      args.guests
    } kishi · $${args.totalPrice}\n${DIRECTION_META[args.direction].inboxLabel}: «${
      DIRECTION_META[args.direction].label
    }» panelini ochib qabul qiling.`;

    const providerId = args.providerId ?? undefined;
    if (providerId) {
      const provider = await ctx.runQuery(internal.telegram.providerForTest, { providerId });
      if (provider?.telegramId) {
        const result = await ctx.runQuery(internal.telegram.tokenFor, { bot: "main" });
        if (result) {
          await tgCall(result, "sendMessage", {
            chat_id: provider.telegramId,
            text,
            reply_markup: inlineKeyboard(mainMenuRows(provider.direction)),
          });
          await ctx.runMutation(internal.telegram.logEvent, {
            bot: "main",
            direction: provider.direction,
            providerId,
            telegramId: provider.telegramId,
            kind: "booking-confirmed",
            text,
            status: "sent",
          });
          return { ok: true };
        }
      }
      await ctx.runMutation(internal.telegram.logEvent, {
        bot: "main",
        direction: args.direction,
        providerId,
        kind: "booking-confirmed",
        text,
        status: "skipped",
      });
      return { ok: false };
    }

    const result = await ctx.runAction(internal.telegram.broadcastToDirection, {
      direction: args.direction,
      text,
      kind: "booking-confirmed",
    });
    return { ok: result.sent > 0 };
  },
});

/** Webhook'larni Telegram'ga ro'yxatdan o'tkazish (administrator). */
export const registerWebhooks = action({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.runQuery(api.admin.status);
    if (!admin.isAdmin) {
      throw new Error("Bu amal uchun administrator huquqi kerak.");
    }
    const siteUrl = process.env.CONVEX_SITE_URL ?? process.env.CONVEX_CLOUD_URL ?? "";
    const results: Record<string, string> = {};
    const usernames: Record<string, string> = {};

    for (const bot of ["main", "auth", "stats"] as BotName[]) {
      const token = await ctx.runQuery(internal.telegram.tokenFor, { bot });
      if (!token) {
        results[bot] = `Token topilmadi (${BOT_ENV_KEYS[bot]})`;
        continue;
      }
      const me = await tgCall<{ username?: string }>(token, "getMe", {});
      if (me.ok && me.result?.username) {
        usernames[bot] = me.result.username;
      }
      if (!siteUrl.startsWith("https://")) {
        results[bot] =
          "Ochiq HTTPS manzil yo'q — lokal muhitda \"Xabarlarni olish\" tugmasidan foydalaning.";
        continue;
      }
      const hook = await tgCall(token, "setWebhook", {
        url: `${siteUrl}/telegram/${bot}`,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      });
      results[bot] = hook.ok ? `Webhook o'rnatildi (@${usernames[bot] ?? "?"})` : hook.description ?? "xato";
    }

    await ctx.runMutation(internal.telegram.storeBotMeta, {
      usernames,
      webhook: { ...results, at: Date.now() },
    });

    return { results, usernames, siteUrl };
  },
});

/**
 * Webhook o'rnatilmagan muhitlarda botni ishlatish: Telegram'dan yangi
 * xabarlar `getUpdates` orqali olinadi va xuddi webhook kabi qayta ishlanadi.
 * Administrator "Xabarlarni olish" tugmasi bilan chaqiradi.
 */
export const pollUpdates = action({
  args: { bot: v.optional(botValidator) },
  handler: async (
    ctx,
    { bot = "auth" },
  ): Promise<{ ok: boolean; message: string; handled: number }> => {
    const admin = await ctx.runQuery(api.admin.status);
    if (!admin.isAdmin) {
      throw new Error("Bu amal uchun administrator huquqi kerak.");
    }
    const token = await ctx.runQuery(internal.telegram.tokenFor, { bot });
    if (!token) {
      return { ok: false, message: `Token topilmadi (${BOT_ENV_KEYS[bot]})`, handled: 0 };
    }

    const hookInfo = await tgCall<{ url?: string }>(token, "getWebhookInfo", {});
    if (hookInfo.ok && hookInfo.result?.url) {
      return {
        ok: false,
        message: `Webhook o'rnatilgan (${hookInfo.result.url}) — xabarlar avtomatik keladi.`,
        handled: 0,
      };
    }

    const offset = await ctx.runQuery(internal.telegram.pollOffset, { bot });
    const res = await tgCall<Array<{ update_id: number }>>(token, "getUpdates", {
      offset: offset + 1,
      limit: 20,
      allowed_updates: ["message", "callback_query"],
    });
    if (!res.ok || !res.result) {
      return { ok: false, message: res.description ?? "getUpdates xatosi", handled: 0 };
    }

    let last = offset;
    let handled = 0;
    for (const update of res.result) {
      last = Math.max(last, update.update_id);
      const reply = await ctx.runMutation(internal.telegram.processUpdate, { bot, update });
      if (reply) {
        if (reply.aiPrompt) {
          /* Erkin matn → Milly AI (action ichida tarmoq mavjud). */
          try {
            const ai = await ctx.runAction(api.millyChat.chat, {
              message: reply.aiPrompt,
            });
            if (ai.reply) {
              await tgCall(token, "sendMessage", { chat_id: reply.chatId, text: ai.reply });
              handled += 1;
              continue;
            }
          } catch {
            /* zaxira javobga o'tish */
          }
          await tgCall(
            token,
            "sendMessage",
            {
              chat_id: reply.chatId,
              text:
                "Milly AI hozir javob bera olmaydi, lekin menyu orqali hamma bo'lim ochiq. " +
                "Buyurtma va to'lovlar /dashboard kabinetida ko'rinadi.",
            },
          );
          handled += 1;
          continue;
        }
        await tgCall(token, "sendMessage", {
          chat_id: reply.chatId,
          text: reply.text,
          ...(reply.keyboard ? { reply_markup: inlineKeyboard(reply.keyboard) } : {}),
        });
        handled += 1;
      }
    }
    await ctx.runMutation(internal.telegram.savePollOffset, { bot, offset: last });

    return {
      ok: true,
      message: handled ? `${handled} ta xabar qayta ishlandi.` : "Yangi xabar yo'q.",
      handled,
    };
  },
});

/** Administrator botdan sinov xabari yuboradi. */
export const sendTestMessage = action({
  args: { providerId: v.id("providers"), text: v.optional(v.string()) },
  handler: async (
    ctx,
    { providerId, text },
  ): Promise<{ ok: boolean; message: string }> => {
    const admin = await ctx.runQuery(api.admin.status);
    if (!admin.isAdmin) {
      throw new Error("Bu amal uchun administrator huquqi kerak.");
    }
    const target = await ctx.runQuery(internal.telegram.providerForTest, { providerId });
    const token = await ctx.runQuery(internal.telegram.tokenFor, { bot: "main" });
    if (!target || !target.telegramId) {
      return { ok: false, message: "Hamkor Telegram akkauntini ulamagan." };
    }
    if (!token) {
      return { ok: false, message: "Asosiy bot tokeni sozlanmagan." };
    }
    const sent = await tgCall(token, "sendMessage", {
      chat_id: target.telegramId,
      text:
        text ??
        `millytour: ${target.businessName} uchun boshqaruv paneli tayyor. Buyurtmalar va reyting shu yerda ko'rinadi.`,
      reply_markup: inlineKeyboard(mainMenuRows(target.direction)),
    });
    return { ok: sent.ok, message: sent.ok ? "Xabar yuborildi." : sent.description ?? "xato" };
  },
});

/* ------------------------------- update oqimi ------------------------------- */

type TgUpdate = {
  message?: {
    chat?: { id?: number };
    from?: { id?: number; username?: string; first_name?: string };
    text?: string;
    contact?: { phone_number?: string };
  };
  callback_query?: {
    data?: string;
    from?: { id?: number; username?: string; first_name?: string };
    message?: { chat?: { id?: number } };
  };
};

/**
 * Bot javobi. `aiPrompt` berilgan bo'lsa — matn Milly AI'ga yuboriladi va
 * javob httpAction/action tomonda yuboriladi (mutation ichida tarmoq yo'q).
 */
type Reply = {
  chatId: number;
  text: string;
  keyboard?: BotButton[][];
  aiPrompt?: string;
} | null;

/**
 * Telegram update'ini qayta ishlaydi va javob matnini qaytaradi.
 * Tarmoq chaqiruvlari httpAction ichida bajariladi (mutation ichida fetch yo'q).
 */
export const processUpdate = internalMutation({
  args: { bot: botValidator, update: v.any() },
  handler: async (ctx, { bot, update: raw }): Promise<Reply> => {
    const update = raw as TgUpdate;
    const from = update.message?.from ?? update.callback_query?.from;
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (!from?.id || !chatId) {
      return null;
    }
    const telegramId = from.id;
    const text = (update.message?.text ?? "").trim();
    const data = update.callback_query?.data ?? "";
    const phone = update.message?.contact?.phone_number;
    const now = Date.now();

    /* ═══════════════════ Owner statistika bot (@mtour_stats_bot) ════════ */
    if (bot === "stats") {
      return await statsBotFlow(ctx, { telegramId, username: from.username, text, data, chatId });
    }

    let session = await ctx.db
      .query("botSessions")
      .withIndex("by_telegram", (q) => q.eq("bot", bot).eq("telegramId", telegramId))
      .first();
    let provider = await ctx.db
      .query("providers")
      .withIndex("by_telegram", (q) => q.eq("telegramId", telegramId))
      .first();

    const remember = async (state: string, draft?: unknown, providerId?: Id<"providers">) => {
      if (session) {
        await ctx.db.patch(session._id, {
          state,
          draft: draft ?? session.draft,
          providerId: providerId ?? session.providerId,
          username: from.username,
          firstName: from.first_name,
          updatedAt: now,
        });
        session = await ctx.db.get(session._id);
      } else {
        const id = await ctx.db.insert("botSessions", {
          bot,
          telegramId,
          username: from.username,
          firstName: from.first_name,
          providerId,
          state,
          draft: draft ?? {},
          updatedAt: now,
        });
        session = await ctx.db.get(id);
      }
    };

    const log = async (kind: string, message: string, direction?: Direction, providerId?: Id<"providers">) => {
      await ctx.db.insert("botEvents", {
        bot,
        direction,
        providerId,
        telegramId,
        kind,
        text: message,
        status: "sent",
        createdAt: Date.now(),
      });
    };

    const reply = (message: string, keyboard?: BotButton[][]): Reply => ({
      chatId,
      text: message,
      keyboard,
    });

    const draft = (session?.draft ?? {}) as {
      direction?: Direction;
      businessName?: string;
      city?: string;
      phone?: string;
      experienceYears?: number;
      language?: string;
    };

    /* -------------------------------- /start -------------------------------- */
    if (text.startsWith("/start")) {
      const payload = text.split(/\s+/)[1];
      if (payload) {
        const code = await ctx.db
          .query("linkCodes")
          .withIndex("by_code", (q) => q.eq("code", payload))
          .first();
        if (code && !code.usedAt) {
          await ctx.db.patch(code._id, { usedAt: now });
          if (code.providerId) {
            await ctx.db.patch(code.providerId, {
              telegramId,
              telegramUsername: from.username,
            });
            provider = await ctx.db.get(code.providerId);
          }
          if (code.userId) {
            await ctx.db.patch(code.userId, { telegramId, telegramUsername: from.username });
          }
          await remember("menu", draft, code.providerId);
          await log("link", "Hisob Telegram akkauntiga bog'landi", provider?.direction, code.providerId);
          return reply(
            "✅ Hisob bog'landi. Endi buyurtmalar va reyting shu botda ko'rinadi.",
            mainMenuRows(provider?.direction),
          );
        }
      }

      await remember("menu", draft);
      if (provider) {
        return reply(
          `${DIRECTION_META[provider.direction].emoji} ${
            provider.businessName
          }\n\nBoshqaruv paneli: buyurtmalar, reyting, profil va to'lovlar.\n${
            DIRECTION_META[provider.direction].hint
          }`,
          mainMenuRows(provider.direction),
        );
      }
      if (bot === "auth") {
        return reply(
          "Assalomu alaykum! Bu millytour hamkorlari uchun auth bot.\n\nYo'nalishingizni tanlang — bir necha savolga javob berasiz (nom, shahar, aloqa, tajriba, hajm), so'ng sizga mos tarifni (Start / Pro / Business) tavsiya qilaman. Tasdiqlangach buyurtmalar avtomatik shu botga tushadi.",
          DIRECTION_BUTTONS,
        );
      }
      return reply(
        "Assalomu alaykum! millytour botiga xush kelibsiz.\n\nTur paketlar, AI Planner va buyurtmalaringiz shu yerda.",
        mainMenuRows(),
      );
    }

    /* ------------------------------- callbacklar ------------------------------ */
    if (data.startsWith("reg:")) {
      const direction = data.slice(4) as Direction;
      await remember("ask_name", { ...draft, direction });
      return reply(
        `${DIRECTION_META[direction].label} yo'nalishi tanlandi.\n\n1/5 — Biznes yoki ustaxona nomini yozib yuboring.`,
      );
    }

    if (data.startsWith("cap:")) {
      const direction = (draft.direction ?? "guide") as Direction;
      const option = DIRECTION_INTERVIEW[direction].options[Number(data.slice(4))];
      return finishRegistration(option ?? "");
    }

    if (data.startsWith("city:")) {
      const city = data.slice(5);
      await remember("ask_phone", { ...draft, city });
      return reply(`3/5 — ${city} uchun aloqa telefon raqamini yuboring (yoki kontaktni ulashing).`);
    }

    if (data.startsWith("menu:")) {
      const key = data.slice(5);
      const screens = provider ? DIRECTION_SCREENS[provider.direction] : TOURIST_SCREENS;
      const screen = screens.find((s) => s.key === key);
      if (screen) {
        await log("menu-open", `"${screen.title}" bo'limi ochildi`, provider?.direction, provider?._id);
        return reply(`${screen.title}\n\n${screen.body}`, [
          screen.buttons,
          [{ label: "⬅️ Bosh menyu", action: "menu:home" }],
        ]);
      }
      return reply("Bo'lim topilmadi.", mainMenuRows(provider?.direction));
    }

    if (data === "menu:home") {
      return reply(
        provider ? "Boshqaruv paneli" : "Asosiy menyu",
        mainMenuRows(provider?.direction),
      );
    }

    /* --------------------------- mutaxassis vazifalari -------------------------- */
    if (data === "tasks:list") {
      const activeProvider = provider;
      if (!activeProvider) {
        return reply("Bu bo'lim hamkorlar uchun.", mainMenuRows());
      }
      const rows = await ctx.db
        .query("assignments")
        .withIndex("by_provider", (q) => q.eq("providerId", activeProvider._id))
        .collect();
      const upcoming = rows
        .filter((r) => r.status !== "done" && r.status !== "declined")
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
        .slice(0, 5);
      await log(
        "tasks",
        `${upcoming.length} vazifa ko'rsatildi`,
        activeProvider.direction,
        activeProvider._id,
      );
      if (upcoming.length === 0) {
        return reply(
          "Hozircha biriktirilgan vazifa yo'q. Yangi buyurtma tushsa darhol shu yerga keladi.",
          mainMenuRows(activeProvider.direction),
        );
      }
      const body = upcoming
        .map(
          (r, i) =>
            `${i + 1}. ${r.role} — ${r.scheduledFor}\n${r.task}\n📍 ${r.city} · ${r.guests} kishi · 💵 $${r.amount}`,
        )
        .join("\n\n");
      return reply(`📋 Vazifalarim\n\n${body}`, [
        upcoming
          .slice(0, 4)
          .map((r) => ({ label: `✅ ${r.role} qabul qilish`, action: `task:accept:${r._id}` })),
        [{ label: "⬅️ Bosh menyu", action: "menu:home" }],
      ]);
    }

    if (data.startsWith("task:accept:") || data.startsWith("task:decline:")) {
      const accepted = data.startsWith("task:accept:");
      const assignmentId = data.slice(
        accepted ? "task:accept:".length : "task:decline:".length,
      ) as Id<"assignments">;
      const assignment = await ctx.db.get(assignmentId);
      if (!assignment) {
        return reply("Vazifa topilmadi.", mainMenuRows(provider?.direction));
      }
      if (!provider || assignment.providerId !== provider._id) {
        return reply("Bu vazifa sizga biriktirilmagan.", mainMenuRows(provider?.direction));
      }
      await ctx.db.patch(assignmentId, {
        status: accepted ? "accepted" : "declined",
        answeredAt: now,
      });
      await log(
        "assignment-answer",
        `${assignment.role} vazifasi ${accepted ? "qabul qilindi" : "rad etildi"} (${assignment.bookingReference})`,
        assignment.direction,
        assignment.providerId,
      );
      if (accepted) {
        const booking = await ctx.db.get(assignment.bookingId);
        const tourist = booking?.userId ? await ctx.db.get(booking.userId) : null;
        await ctx.db.insert("botEvents", {
          bot: "main",
          direction: assignment.direction,
          providerId: assignment.providerId,
          telegramId: tourist?.telegramId,
          kind: "assignment-accepted",
          text: `${provider.businessName} ${assignment.scheduledFor} kuni ${assignment.role.toLowerCase()} vazifasini tasdiqladi.`,
          status: tourist?.telegramId ? "sent" : "skipped",
          createdAt: Date.now(),
        });
        return reply(
          `✅ Qabul qilindi.\n\n${assignment.scheduledFor} kuni ${assignment.city} shahrida tayyor bo'ling.\n💰 Kutilyotgan to'lov: $${assignment.amount}\n\nBron: ${assignment.bookingReference}`,
          mainMenuRows(provider.direction),
        );
      }
      return reply(
        "❌ Rad etildi. Administrator boshqa mutaxassisni biriktiradi.",
        mainMenuRows(provider.direction),
      );
    }

    if (data.startsWith("cat:")) {
      const category = data.slice(4);
      return reply(
        category === "eco"
          ? "Ekoturizm: Zomin archazorlari, Aydar-Arnasoy yurtalari va Chatqol trekkingi mavjud."
          : "Tarixiy shaharlar: Samarqand, Buxoro, Xiva va Shahrisabz bo'ylab paketlar mavjud.",
        [
          [{ label: "🌐 Saytda ko'rish", action: "link:site" }],
          [{ label: "⬅️ Bosh menyu", action: "menu:home" }],
        ],
      );
    }

    if (data.startsWith("lang:")) {
      const language = data.slice(5).toUpperCase();
      await remember("menu", { ...draft, language });
      return reply(`Til ${language} ga o'zgartirildi.`, mainMenuRows(provider?.direction));
    }

    if (data.startsWith("vehicle:")) {
      const condition = data.slice(8) as "ok" | "service" | "repair";
      if (provider?.vehicle) {
        await ctx.db.patch(provider._id, {
          vehicle: { ...provider.vehicle, condition, conditionCheckedAt: now },
        });
        await log(
          "vehicle-condition",
          `Mashina holati: ${condition} (${provider.vehicle.plate})`,
          provider.direction,
          provider._id,
        );
      }
      return reply(
        "Rahmat! Mashina holati yangilandi — tizim bandlikni shunga moslab hisoblaydi.",
        mainMenuRows(provider?.direction),
      );
    }

    if (data.startsWith("order:") || data.startsWith("booking:") || data.startsWith("product:")) {
      await log(
        "action",
        `Bot amali bajarildi: ${data}`,
        provider?.direction,
        provider?._id,
      );
      return reply("Amal bajarildi ✅", mainMenuRows(provider?.direction));
    }

    if (data === "link:site") {
      return reply("Sayt: https://millytour.uz — paketlarni shu yerda band qilishingiz mumkin.");
    }

    if (data === "link:miniapp") {
      const siteUrl = process.env.CONVEX_SITE_URL ?? "";
      if (!siteUrl.startsWith("https://")) {
        return reply(
          "Mini app hozircha faqat production manzilida ochiladi. Saytda Milly AI har sahifa pastida ham ishlaydi.",
        );
      }
      return reply(
        `Milly AI mini app (markazda ochiladi): ${siteUrl.replace(/\/$/, "")}/telegram?miniapp=1`,
      );
    }

    if (data === "ai:start") {
      return reply(
        "Milly AI: saytni oching — har sahifa pastidagi ✨ Milly AI tugmasini bosing yoki «Mini app — markazda» tugmasini tanlang. Savollarga javob berasiz, 2 xil dastur chiqadi.",
      );
    }

    if (
      data.startsWith("docs:") ||
      data.startsWith("rates:") ||
      data.startsWith("tariff:") ||
      data.startsWith("calendar:") ||
      data.startsWith("shop:") ||
      data.startsWith("fees:") ||
      data.startsWith("payouts:") ||
      data.startsWith("rating:") ||
      data.startsWith("rooms:")
    ) {
      await log("panel-action", `Panel amali: ${data}`, provider?.direction, provider?._id);
      return reply("Ma'lumot saqlandi ✅", mainMenuRows(provider?.direction));
    }

    /* ------------------------------ matnli holatlar ----------------------------- */
    const state = session?.state ?? "menu";

    /**
     * Suhbat yakuni: profil yaratiladi va javoblarga qarab tarif tavsiya etiladi.
     * Auth bot shu bilan "qanday xizmat ko'rsatasiz → qaysi tarif" oqimini yopadi.
     */
    async function finishRegistration(capacity: string) {
      const direction = (draft.direction ?? "guide") as Direction;
      const years = Math.min(Math.max(draft.experienceYears ?? 0, 0), 60);
      const { plan, reason, monthlyFee } = recommendPlan(direction, years, capacity);
      const info = PLAN_INFO[plan];
      const providerId = await ctx.db.insert("providers", {
        direction,
        businessName: draft.businessName ?? `${from?.first_name ?? "Hamkor"} xizmati`,
        contactName: from?.first_name,
        city: draft.city ?? "Toshkent",
        phone: draft.phone ?? text ?? "—",
        telegramUsername: from?.username,
        telegramId,
        experienceYears: years || undefined,
        capacity: capacity || undefined,
        languages: ["UZ", "RU"],
        status: "pending",
        plan,
        monthlyFee,
        subscription: "trial",
        rating: 0,
        ratingCount: 0,
        completedOrders: 0,
        walletBalance: 0,
        source: "bot",
        createdAt: now,
      });
      await remember("menu", draft, providerId);
      provider = await ctx.db.get(providerId);
      await log(
        "registration",
        `${DIRECTION_META[direction].label} sifatida ro'yxatdan o'tdi: ${
          draft.businessName ?? "—"
        } · ${info.label} tarifi (${reason})`,
        direction,
        providerId,
      );
      return reply(
        `Arizangiz qabul qilindi ✅\n\nTavsiya etilgan tarif: ${info.label} — $${monthlyFee}/oy\nSabab: ${reason}.\n${info.perks}.\n\nAdministrator tasdiqlagach buyurtmalar avtomatik shu botga tushadi, to'lov ham shu yerda bo'ladi.`,
        mainMenuRows(direction),
      );
    }

    if (state === "ask_name" && text) {
      await remember("ask_city", { ...draft, businessName: text });
      return reply("2/5 — Qaysi shaharda ishlaysiz?", [
        CITIES.slice(0, 4).map((c) => ({ label: c, action: `city:${c}` })),
        CITIES.slice(4).map((c) => ({ label: c, action: `city:${c}` })),
      ]);
    }

    if (state === "ask_city" && text) {
      await remember("ask_phone", { ...draft, city: text });
      return reply(`3/5 — ${text} uchun aloqa telefon raqamini yuboring.`);
    }

    if (state === "ask_phone" && (text || phone)) {
      await remember("ask_exp", { ...draft, phone: phone ?? text });
      return reply(
        "4/5 — Necha yildan beri shu yo'nalishda ishlaysiz? Faqat raqam yozing (masalan 5).",
      );
    }

    if (state === "ask_exp") {
      const direction = (draft.direction ?? "guide") as Direction;
      const years = Number.parseInt((text ?? "").replace(/[^0-9]/g, ""), 10);
      const interview = DIRECTION_INTERVIEW[direction];
      await remember("ask_capacity", {
        ...draft,
        experienceYears: Number.isFinite(years) ? Math.min(Math.max(years, 0), 60) : 0,
      });
      return reply(`5/5 — ${interview.question}`, [
        interview.options.map((o, i) => ({ label: o, action: `cap:${i}` })),
      ]);
    }

    if (state === "ask_capacity") {
      return finishRegistration(text ?? "");
    }

    /* ------------------------------ Milly AI chat ----------------------------- */
    /*
     * Hech qanday tugma, buyruq yoki ro'yxatdan o'tish holatiga mos kelmaydigan
     * erkin matn — Milly AI'ga yuboriladi. Bot haqiqiy suhbatdosh kabi javob
 * beradi (til avtomatik aniqlanadi). Matn bo'sh bo'lsa (media, stiker) —
     * oddiy menyu qaytadi.
     */
    if (text) {
      return { chatId, text: "", aiPrompt: text };
    }

    return reply(
      provider ? "Boshqaruv paneli" : "Asosiy menyu",
      mainMenuRows(provider?.direction),
    );
  },
});

/* ═════════════════════════ Owner statistika bot oqimi ═════════════════════ */

/** Owner ID'sini o'qish/yo'q qilish. */
async function readOwnerId(ctx: MutationCtx): Promise<number | null> {
  const envOwner = process.env.OWNER_TELEGRAM_ID;
  if (envOwner) {
    const parsed = Number.parseInt(envOwner, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", OWNER_SETTING_KEY))
    .first();
  return (row?.value as { telegramId?: number } | undefined)?.telegramId ?? null;
}

/** Birinchi /start yuborgan foydalanuvchini owner deb yozib olish. */
async function claimOwnership(ctx: MutationCtx, telegramId: number): Promise<void> {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", OWNER_SETTING_KEY))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { value: { telegramId, updatedAt: Date.now() } });
  } else {
    await ctx.db.insert("settings", {
      key: OWNER_SETTING_KEY,
      value: { telegramId, updatedAt: Date.now() },
      updatedAt: Date.now(),
    });
  }
}

/** Statistika query'sidan bot uchun ixcham hisobot matni yasaydi. */
function formatStats(data: {
  users: { total: number; real: number; guests: number; today: number; countries: { country: string; count: number }[]; languages?: { language: string; count: number }[] };
  bookings: { total: number; today: number; byStatus: { status: string; count: number }[] };
  revenue: { total: number; paidCount: number; avgCheck: number; pending: number };
  demand: {
    cities: { city: string; count: number }[];
    plans: number;
    providers: { total: number; approved: number };
    avgRating: number;
  };
  dailyTrend: { day: string; users: number; bookings: number }[];
}): string {
  const topCountries = data.users.countries
    .slice(0, 6)
    .map((c, i) => `${i + 1}. ${c.country} — ${c.count}`)
    .join("\n");
  const topCities = data.demand.cities
    .slice(0, 5)
    .map((c, i) => `${i + 1}. ${c.city} — ${c.count}`)
    .join("\n");
  const trend = data.dailyTrend
    .map((d) => `${d.day.slice(5)}: +${d.users} 👤 · ${d.bookings} 🧾`)
    .join("\n");
  const statusLine = data.bookings.byStatus.map((s) => `${s.status}: ${s.count}`).join(" · ");
  const langLine = (data.users.languages ?? [])
    .slice(0, 5)
    .map((l) => `${l.language} ${l.count}`)
    .join(" · ");

  return (
    `📊 MILLYTOUR STATISTIKA\n\n` +
    `👤 Foydalanuvchilar: ${data.users.total} (hisobli ${data.users.real} · mehmon ${data.users.guests})\n` +
    `   Bugun: +${data.users.today}\n\n` +
    `🌍 Davlatlar (top):
${topCountries || "  ma'lumot yo'q"}\n\n` +
    (langLine ? `🗣 Tillar: ${langLine}\n\n` : "") +
    `🧾 Buyurtmalar: ${data.bookings.total} (bugun ${data.bookings.today})\n` +
    `   ${statusLine || "—"}\n\n` +
    `💰 Tushum: $${data.revenue.total.toFixed(2)} · to'langan ${data.revenue.paidCount} ta\n` +
    `   O'rtacha chek: $${data.revenue.avgCheck.toFixed(2)} · kutilmoqda: ${data.revenue.pending}\n\n` +
    `🔥 Talab shaharlari:
${topCities || "  ma'lumot yo'q"}\n\n` +
    `🤝 Hamkorlar: ${data.demand.providers.total} (tasdiqlangan ${data.demand.providers.approved})\n` +
    `✨ AI dasturlar: ${data.demand.plans} · ⭐ o'rtacha reyting: ${data.demand.avgRating}\n\n` +
    `📈 7 kun tendensiyasi:
${trend}`
  );
}

/**
 * Stats bot suhbati: faqat owner. `/start` — ownerlikni oladi va statistika
 * ko'rsatadi; "stat" / "📊" tugmasi — yangilangan hisobot; boshqa matn —
 * menyu. Boshqa foydalanuvchilar kirishdan mahrum.
 */
async function statsBotFlow(
  ctx: MutationCtx,
  input: { telegramId: number; username?: string; text: string; data: string; chatId: number },
): Promise<Reply> {
  const { telegramId, username, chatId } = input;
  const ownerId = await readOwnerId(ctx);
  const isOwner = ownerId !== null && telegramId === ownerId;

  // Owner hali belgilanmagan bo'lsa — birinchi /start egani bo'ladi.
  if (ownerId === null && input.text.startsWith("/start")) {
    await claimOwnership(ctx, telegramId);
    const stats = await ctx.runQuery(internal.stats.fullInternal, {});
    return {
      chatId,
      text: `✅ Siz owner deb belgilandingiz (@${username ?? telegramId}).\n\n${formatStats(stats)}`,
      keyboard: [[{ label: "🔄 Yangilash", action: "stats:refresh" }]],
    };
  }

  if (ownerId === null) {
    return { chatId, text: "Iltimos, /start yuboring — ownerlikni tasdiqlash uchun." };
  }

  if (!isOwner) {
    return { chatId, text: "🔒 Bu bot faqat loyiha egasi uchun." };
  }

  // Owner bo'lsa — to'liq hisobot.
  const stats = await ctx.runQuery(internal.stats.fullInternal, {});
  return {
    chatId,
    text: formatStats(stats),
    keyboard: [[{ label: "🔄 Yangilash", action: "stats:refresh" }]],
  };
}
