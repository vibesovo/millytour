import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DIRECTION_META } from "./lib/bots";
import { requireAdmin, requireUser } from "./lib/access";
import { getCurrentUser } from "./users";
import {
  directionValidator,
  providerStatusValidator,
  subscriptionValidator,
  type Direction,
} from "./schema";

export const MONTHLY_FEE: Record<Direction, number> = {
  guide: 29,
  transfer: 39,
  artisan: 19,
  hotel: 49,
  translator: 25,
  photographer: 25,
  restaurant: 29,
  other: 15,
};

function kindForDirection(direction: Direction) {
  return direction === "artisan" ? "marketplace" : direction;
}

/** Joriy foydalanuvchining hamkor profili (bo'lmasa null). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return null;
    }
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, provider };
  },
});

/** Saytdagi hamkor bo'lish formasi — so'rov administratorga tushadi. */
export const submitLead = mutation({
  args: {
    direction: directionValidator,
    businessName: v.string(),
    contactName: v.string(),
    phone: v.string(),
    city: v.string(),
    telegramUsername: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("partnerLeads", {
      ...args,
      handled: false,
      createdAt: Date.now(),
    });
    return { ok: true, message: "So'rov qabul qilindi" };
  },
});

/**
 * Hamkor profilini yaratish. Rasmiy ro'yxatdan o'tish auth bot orqali bo'ladi,
 * sayt forma esa zaxira yo'l: profil "pending" holatda yaratiladi va
 * administrator tasdiqlagach buyurtmalar tusha boshlaydi.
 */
export const register = mutation({
  args: {
    direction: directionValidator,
    businessName: v.string(),
    contactName: v.optional(v.string()),
    city: v.string(),
    phone: v.string(),
    telegramUsername: v.optional(v.string()),
    about: v.optional(v.string()),
    languages: v.optional(v.array(v.string())),
    licenseNumber: v.optional(v.string()),
    rooms: v.optional(v.number()),
    vehicleModel: v.optional(v.string()),
    vehicleYear: v.optional(v.number()),
    vehicleSeats: v.optional(v.number()),
    vehiclePlate: v.optional(v.string()),
    experienceYears: v.optional(v.number()),
    capacity: v.optional(v.string()),
    workingHours: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      return { providerId: existing._id, created: false };
    }

    const providerId = await ctx.db.insert("providers", {
      userId: user._id,
      direction: args.direction,
      businessName: args.businessName,
      contactName: args.contactName ?? user.name,
      city: args.city,
      phone: args.phone,
      telegramUsername: args.telegramUsername,
      about: args.about,
      languages: args.languages ?? ["UZ", "RU"],
      status: "pending",
      monthlyFee: MONTHLY_FEE[args.direction],
      subscription: "trial",
      rating: 0,
      ratingCount: 0,
      completedOrders: 0,
      walletBalance: 0,
      licenseNumber: args.licenseNumber,
      rooms: args.rooms,
      experienceYears: args.experienceYears,
      capacity: args.capacity,
      workingHours: args.workingHours,
      vehicle:
        args.direction === "transfer"
          ? {
              model: args.vehicleModel ?? "Ko'rsatilmagan",
              year: args.vehicleYear ?? new Date().getFullYear(),
              seats: args.vehicleSeats ?? 4,
              plate: args.vehiclePlate ?? "—",
            }
          : undefined,
      source: "site",
      createdAt: Date.now(),
    });

    await ctx.db.insert("botEvents", {
      bot: "auth",
      direction: args.direction,
      providerId,
      kind: "registration",
      text: `${DIRECTION_META[args.direction].label} yo'nalishi bo'yicha ro'yxatdan o'tish so'rovi qabul qilindi`,
      status: "sent",
      createdAt: Date.now(),
    });

    return { providerId, created: true };
  },
});

export const updateProfile = mutation({
  args: {
    businessName: v.optional(v.string()),
    about: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    languages: v.optional(v.array(v.string())),
    telegramUsername: v.optional(v.string()),
    rooms: v.optional(v.number()),
    vehicleModel: v.optional(v.string()),
    vehicleYear: v.optional(v.number()),
    vehicleSeats: v.optional(v.number()),
    vehiclePlate: v.optional(v.string()),
    experienceYears: v.optional(v.number()),
    capacity: v.optional(v.string()),
    workingHours: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      throw new Error("Hamkor profili topilmadi.");
    }

    const { vehicleModel, vehicleYear, vehicleSeats, vehiclePlate, ...rest } = args;
    const patch: Record<string, unknown> = { ...rest };
    if (vehicleModel || vehicleYear || vehicleSeats || vehiclePlate) {
      patch.vehicle = {
        model: vehicleModel ?? provider.vehicle?.model ?? "Ko'rsatilmagan",
        year: vehicleYear ?? provider.vehicle?.year ?? new Date().getFullYear(),
        seats: vehicleSeats ?? provider.vehicle?.seats ?? 4,
        plate: vehiclePlate ?? provider.vehicle?.plate ?? "—",
        conditionCheckedAt: provider.vehicle?.conditionCheckedAt,
        condition: provider.vehicle?.condition,
      };
    }
    await ctx.db.patch(provider._id, patch);
    return { ok: true };
  },
});

/** Transfer uchun kunlik mashina holati nazorati. */
export const reportVehicle = mutation({
  args: {
    condition: v.union(v.literal("ok"), v.literal("service"), v.literal("repair")),
  },
  handler: async (ctx, { condition }) => {
    const user = await requireUser(ctx);
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider || provider.direction !== "transfer") {
      throw new Error("Bu amal faqat transfer hamkorlari uchun.");
    }
    const vehicle = provider.vehicle ?? {
      model: "Ko'rsatilmagan",
      year: new Date().getFullYear(),
      seats: 4,
      plate: "—",
    };
    await ctx.db.patch(provider._id, {
      vehicle: { ...vehicle, condition, conditionCheckedAt: Date.now() },
    });
    await ctx.db.insert("botEvents", {
      bot: "main",
      direction: "transfer",
      providerId: provider._id,
      kind: "vehicle-condition",
      text: `Mashina holati yangilandi: ${condition}`,
      status: "sent",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Gid/transfer uchun kalendar: kunni band yoki bo'sh qilish. */
export const toggleUnavailableDate = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireUser(ctx);
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      throw new Error("Hamkor profili topilmadi.");
    }
    const current = provider.unavailableDates ?? [];
    const next = current.includes(date)
      ? current.filter((d) => d !== date)
      : [...current, date].sort();
    await ctx.db.patch(provider._id, { unavailableDates: next });
    return { unavailableDates: next };
  },
});

/** Administrator uchun hamkorlar ro'yxati. */
export const list = query({
  args: {
    status: v.optional(providerStatusValidator),
    direction: v.optional(directionValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let rows = args.direction
      ? await ctx.db
          .query("providers")
          .withIndex("by_direction", (q) => q.eq("direction", args.direction!))
          .collect()
      : args.status
        ? await ctx.db
            .query("providers")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .collect()
        : await ctx.db.query("providers").collect();

    if (args.direction && args.status) {
      rows = rows.filter((r) => r.status === args.status);
    }

    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Sayt uchun tasdiqlangan xizmat ko'rsatuvchilar ro'yxati.
 * "Xizmatlar" bo'limi shu ro'yxatdan mutaxassislarni ko'rsatadi va ularni
 * alohida (tur dasturidan tashqari) bron qilish imkonini beradi.
 */
export const publicList = query({
  args: {
    direction: v.optional(directionValidator),
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx).catch(() => null);
    const rows = args.direction
      ? await ctx.db
          .query("providers")
          .withIndex("by_direction", (q) => q.eq("direction", args.direction!))
          .collect()
      : await ctx.db.query("providers").collect();

    const approved = rows.filter((p) => p.status === "approved" && p.direction !== "artisan");
    const filtered = args.city
      ? approved.filter((p) => p.city.toLowerCase().includes(args.city!.toLowerCase()))
      : approved;

    const sorted = filtered.sort(
      (a, b) =>
        b.rating - a.rating ||
        b.completedOrders - a.completedOrders ||
        (b.experienceYears ?? 0) - (a.experienceYears ?? 0),
    );

    return sorted.slice(0, args.limit ?? 40).map((p) => ({
      _id: p._id,
      direction: p.direction,
      businessName: p.businessName,
      contactName: p.contactName ?? null,
      city: p.city,
      about: p.about ?? null,
      languages: p.languages ?? [],
      experienceYears: p.experienceYears ?? null,
      capacity: p.capacity ?? null,
      workingHours: p.workingHours ?? null,
      rating: p.rating,
      ratingCount: p.ratingCount,
      completedOrders: p.completedOrders,
      rooms: p.rooms ?? null,
      vehicle: p.vehicle ? { model: p.vehicle.model, seats: p.vehicle.seats } : null,
      /** Aloqa ma'lumotlari faqat tizimga kirgan mijozga ko'rinadi. */
      contact: user ? { phone: p.phone, telegramUsername: p.telegramUsername ?? null } : null,
    }));
  },
});

/** Saytdan kelgan hamkorlik so'rovlari (administrator). */
export const listLeads = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("partnerLeads").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  },
});

/** So'rovni ko'rib chiqilgan deb belgilash. */
export const handleLead = mutation({
  args: { leadId: v.id("partnerLeads"), handled: v.boolean() },
  handler: async (ctx, { leadId, handled }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(leadId, { handled });
    return { ok: true };
  },
});

export const setStatus = mutation({
  args: { providerId: v.id("providers"), status: providerStatusValidator },
  handler: async (ctx, { providerId, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(providerId, {
      status,
      approvedAt: status === "approved" ? Date.now() : undefined,
    });
    return { ok: true };
  },
});

export const setSubscription = mutation({
  args: {
    providerId: v.id("providers"),
    subscription: subscriptionValidator,
    months: v.optional(v.number()),
  },
  handler: async (ctx, { providerId, months, subscription }) => {
    await requireAdmin(ctx);
    const add = (months ?? 1) * 30 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(providerId, {
      subscription,
      paidUntil: subscription === "active" ? Date.now() + add : undefined,
    });
    return { ok: true };
  },
});

/** Hamkor panelining asosiy ko'rsatkichlari. */
export const metrics = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return null;
    }
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      return null;
    }

    const mine = await ctx.db
      .query("bookings")
      .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
      .collect();

    const inbox = await ctx.db
      .query("bookings")
      .withIndex("by_kind", (q) => q.eq("kind", kindForDirection(provider.direction)))
      .collect();

    const blocked = provider.unavailableDates ?? [];
    const open = inbox
      .filter(
        (b) => !b.providerId && b.status === "new" && !blocked.includes(b.startDate),
      )
      .sort((a, b) => {
        const aLocal = a.city.toLowerCase() === provider.city.toLowerCase() ? 0 : 1;
        const bLocal = b.city.toLowerCase() === provider.city.toLowerCase() ? 0 : 1;
        return aLocal - bLocal || b.createdAt - a.createdAt;
      });
    const completed = mine.filter((b) => b.status === "completed");
    const revenue = completed.reduce((sum, b) => sum + b.totalPrice, 0);

    // Har bir mutaxassisga biriktirilgan aniq vazifalar (AI Planner va so'rovlardan).
    const tasks = await ctx.db
      .query("assignments")
      .withIndex("by_provider", (q) => q.eq("providerId", provider._id))
      .collect();
    const sortedTasks = tasks
      .filter((t) => t.status !== "declined")
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

    return {
      provider,
      open,
      assigned: mine.sort((a, b) => b.createdAt - a.createdAt),
      completed,
      tasks: sortedTasks,
      upcomingTasks: sortedTasks.filter((t) => t.status !== "done"),
      taskEarnings: sortedTasks
        .filter((t) => t.status === "done")
        .reduce((sum, t) => sum + t.amount, 0),
      revenue,
      commission: Math.round(revenue * 0.12),
      payout: Math.round(revenue * 0.88),
    };
  },
});
