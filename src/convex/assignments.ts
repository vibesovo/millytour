import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/access";
import { DIRECTION_META } from "./lib/bots";

/**
 * Mutaxassis vazifalari: AI Planner dasturi yoki xizmat so'rovi tasdiqlanganda
 * har bir yo'nalish (mehmonxona, gid, transfer, tarjimon, fotograf) uchun
 * eng mos hamkor tanlanadi va unga aniq topshiriq yoziladi.
 */

/** Turist o'z broniga biriktirilgan mutaxassislarni ko'radi. */
export const forBooking = query({
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
      .query("assignments")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
      .collect();
    const withProvider = await Promise.all(
      rows.map(async (row) => {
        const provider = await ctx.db.get(row.providerId);
        return {
          ...row,
          directionLabel: DIRECTION_META[row.direction]?.label ?? row.role,
          provider: provider
            ? {
                businessName: provider.businessName,
                contactName: provider.contactName ?? null,
                phone: provider.phone,
                city: provider.city,
                rating: provider.rating,
                ratingCount: provider.ratingCount,
                completedOrders: provider.completedOrders,
                experienceYears: provider.experienceYears ?? 0,
                about: provider.about ?? null,
                languages: provider.languages ?? [],
                telegramUsername: provider.telegramUsername ?? null,
              }
            : null,
        };
      }),
    );
    return withProvider.sort((a, b) => a.role.localeCompare(b.role));
  },
});

/** Hamkor paneli/boti uchun: menga biriktirilgan vazifalar. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      return [];
    }
    const rows = await ctx.db
      .query("assignments")
      .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
      .collect();
    return rows.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("assignments").withIndex("by_created").order("desc").take(200);
    return rows;
  },
});

/** Botga yuborish uchun vazifa + hamkor ma'lumoti. */
export const detail = internalQuery({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, { assignmentId }) => {
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) {
      return null;
    }
    const provider = await ctx.db.get(assignment.providerId);
    if (!provider) {
      return null;
    }
    return {
      assignment,
      provider: {
        _id: provider._id,
        telegramId: provider.telegramId ?? null,
        businessName: provider.businessName,
        direction: provider.direction,
      },
      directionLabel: DIRECTION_META[assignment.direction]?.label ?? assignment.role,
    };
  },
});

export const markNotified = internalMutation({
  args: {
    assignmentId: v.id("assignments"),
    status: v.union(v.literal("notified"), v.literal("assigned")),
  },
  handler: async (ctx, { assignmentId, status }) => {
    await ctx.db.patch(assignmentId, { status, notifiedAt: Date.now() });
    return { ok: true };
  },
});
