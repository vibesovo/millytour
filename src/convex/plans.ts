import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/access";
import { getCurrentUser } from "./users";

/** AI Planner natijasini saqlash (2 xil taklif varianti bilan). */
export const save = mutation({
  args: {
    sessionKey: v.string(),
    answers: v.any(),
    options: v.array(v.any()),
    engine: v.union(v.literal("ai"), v.literal("rule-based")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const planId = await ctx.db.insert("plans", {
      sessionKey: args.sessionKey,
      answers: args.answers,
      options: args.options,
      plan: args.options[0],
      engine: args.engine,
      userId: user?._id,
      createdAt: Date.now(),
    });
    return { planId };
  },
});

/** Foydalanuvchi 1- yoki 2-variantni tanladi. */
export const choose = mutation({
  args: { planId: v.id("plans"), chosenIndex: v.number() },
  handler: async (ctx, { planId, chosenIndex }) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(planId);
    if (!plan) {
      throw new Error("Dastur topilmadi.");
    }
    if (plan.userId && plan.userId !== user._id) {
      throw new Error("Bu dastur boshqa foydalanuvchiga tegishli.");
    }
    const options = (plan.options ?? []) as unknown[];
    const index = Math.min(Math.max(0, Math.round(chosenIndex)), Math.max(0, options.length - 1));
    await ctx.db.patch(planId, { chosenIndex: index, userId: user._id });
    return { ok: true, chosenIndex: index };
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }
    const rows = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);
  },
});

/** Anonim chatni yangilaganda oxirgi dasturni tiklash uchun. */
export const latestBySession = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, { sessionKey }) => {
    const rows = await ctx.db
      .query("plans")
      .withIndex("by_session", (q) => q.eq("sessionKey", sessionKey))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },
});
