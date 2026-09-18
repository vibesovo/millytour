import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

/**
 * Milly AI xotira va o'rganish moduli (default runtime — DB'ga to'g'ridan-
 * to'g'ri kiradi; "use node" fayldagi action'lar shuni chaqiradi).
 *
 * - chatLogs — har bir suhbat yozuvi (sessiya tarixi + baholar).
 * - aiMemory — yuqori ball olgan javob namunalari; Milly AI kelgusi
 *   suhbatlarda shunga tayanadi va shu tarzda «o'qiydi».
 */

/** Suhbat yozuvini saqlash (chat action'idan chaqiriladi). */
export const logChat = internalMutation({
  args: {
    sessionKey: v.string(),
    userId: v.optional(v.id("users")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    lang: v.optional(v.string()),
    engine: v.optional(v.union(v.literal("ai"), v.literal("rule-based"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatLogs", { ...args, createdAt: Date.now() });
  },
});

/** Javobga ball berish (chatdagi 👍/👎). AI o'rganish uchun yig'iladi. */
export const rateReply = mutation({
  args: { sessionKey: v.string(), score: v.number() },
  handler: async (ctx, { score, sessionKey }) => {
    const row = await ctx.db
      .query("chatLogs")
      .withIndex("by_session", (q) => q.eq("sessionKey", sessionKey))
      .order("desc")
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .first();
    if (!row) {
      return { ok: false };
    }
    await ctx.db.patch(row._id, { score: Math.max(-1, Math.min(1, score)) });

    const key = row.content.slice(0, 400);
    const existing = await ctx.db
      .query("aiMemory")
      .withIndex("by_kind", (q) => q.eq("kind", "lesson"))
      .filter((q) => q.eq(q.field("content"), key))
      .first();

    if (score > 0) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          weight: Math.min(5, existing.weight + 1),
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("aiMemory", {
          kind: "lesson",
          content: key,
          weight: 1,
          source: `chat:${sessionKey}`,
          updatedAt: Date.now(),
        });
      }
    } else if (existing) {
      // Salbiy baho — namuna kuchi pasayadi va 0 bo'lsa o'chiriladi.
      const next = existing.weight - 1;
      if (next <= 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, { weight: next, updatedAt: Date.now() });
      }
    }
    return { ok: true };
  },
});

/** Eng muhim o'rganilgan qoidalar (weight bo'yicha). */
export const topMemories = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("aiMemory")
      .withIndex("by_kind", (q) => q.eq("kind", "lesson"))
      .collect();
    return rows
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 12)
      .map((r) => r.content);
  },
});

/**
 * Kunlik o'rganish: chatLogs'dagi yuqori ball olgan javoblardan namunalar
 * to'planadi (cron'dan chaqiriladi). Bu Milly AI'ning «o'qish» jarayoni.
 */
export const learnCron = internalMutation({
  args: {},
  handler: async (ctx) => {
    const since = Date.now() - 24 * 3600 * 1000;
    const logs = await ctx.db
      .query("chatLogs")
      .withIndex("by_created", (q) => q.gte("createdAt", since))
      .collect();
    const good = logs.filter((l) => l.role === "assistant" && (l.score ?? 0) > 0);
    let added = 0;
    for (const g of good.slice(0, 20)) {
      const key = g.content.slice(0, 400);
      const exists = await ctx.db
        .query("aiMemory")
        .withIndex("by_kind", (q) => q.eq("kind", "lesson"))
        .filter((q) => q.eq(q.field("content"), key))
        .first();
      if (!exists) {
        await ctx.db.insert("aiMemory", {
          kind: "lesson",
          content: key,
          weight: 1,
          source: "cron",
          updatedAt: Date.now(),
        });
        added += 1;
      }
    }
    return { added };
  },
});
