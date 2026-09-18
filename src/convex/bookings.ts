import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { activeCardForUser } from "./discountCards";
import { reference, requireAdmin, requireUser } from "./lib/access";
import {
  assignmentStatusValidator,
  bookingStatusValidator,
  directionValidator,
  paymentValidator,
  type Direction,
} from "./schema";

/**
 * Xizmat narxlari. Sayt ham, bot ham shu yagona jadvaldan foydalanadi —
 * narx har doim serverda hisoblanadi (klientdan olinmaydi).
 */
export const SERVICE_META: Record<
  "guide" | "transfer" | "hotel" | "translator" | "photographer" | "restaurant" | "other",
  { label: string; unit: number; per: "day" | "night"; perGuests: boolean }
> = {
  guide: { label: "Gid xizmati", unit: 60, per: "day", perGuests: false },
  transfer: { label: "Transfer", unit: 45, per: "day", perGuests: true },
  hotel: { label: "Mehmonxona", unit: 80, per: "night", perGuests: true },
  translator: { label: "Tarjimon", unit: 40, per: "day", perGuests: false },
  photographer: { label: "Fotograf", unit: 55, per: "day", perGuests: false },
  restaurant: { label: "Restoran", unit: 35, per: "day", perGuests: true },
  other: { label: "Boshqa xizmat", unit: 50, per: "day", perGuests: false },
};

export function directionForKind(kind: string): Direction {
  if (
    kind === "guide" ||
    kind === "transfer" ||
    kind === "hotel" ||
    kind === "artisan" ||
    kind === "translator" ||
    kind === "photographer" ||
    kind === "restaurant" ||
    kind === "other"
  ) {
    return kind;
  }
  return kind === "marketplace" ? "artisan" : "guide";
}

const kindValidator = v.union(
  v.literal("package"),
  v.literal("guide"),
  v.literal("transfer"),
  v.literal("hotel"),
  v.literal("marketplace"),
  v.literal("translator"),
  v.literal("photographer"),
  v.literal("restaurant"),
  v.literal("other"),
  v.literal("custom"),
);

const serviceValidator = v.union(
  v.literal("guide"),
  v.literal("transfer"),
  v.literal("hotel"),
  v.literal("translator"),
  v.literal("photographer"),
  v.literal("restaurant"),
  v.literal("other"),
);

/** Biriktirish algoritmi qaysi rollarni qamrab oladi va ulushlari. */
const ROLE_PLAN: {
  direction: Direction;
  role: string;
  share: number;
  task: (ctx: { city: string; startDate: string; days: number; guests: number }) => string;
}[] = [
  {
    direction: "hotel",
    role: "Mehmonxona",
    share: 0.3,
    task: (c) =>
      `${c.startDate} kuni ${c.city} shahrida ${c.guests} kishi uchun xona tayyorlansin (${c.days} kunlik dastur).`,
  },
  {
    direction: "guide",
    role: "Gid",
    share: 0.12,
    task: (c) =>
      `${c.startDate} dan ${c.days} kun ${c.city} bo'ylab guruhga gidlik: marshrut va kirish chiptalari tasdiqlansin.`,
  },
  {
    direction: "transfer",
    role: "Transfer",
    share: 0.08,
    task: (c) =>
      `${c.startDate} kuni ${c.city} aeroport/mehmonxona transferi: ${c.guests} kishi uchun mashina va haydovchi belgilansin.`,
  },
  {
    direction: "translator",
    role: "Tarjimon",
    share: 0.06,
    task: (c) =>
      `${c.startDate} dan ${c.days} kun ${c.city} bo'ylab tarjimonlik: guruh tili bo'yicha hamrohlik.`,
  },
  {
    direction: "photographer",
    role: "Fotograf",
    share: 0.06,
    task: (c) =>
      `${c.startDate} kuni ${c.city} shahrida ${c.guests} kishi uchun fotosessiya: lokatsiya va vaqt tasdiqlansin.`,
  },
  {
    direction: "restaurant",
    role: "Restoran",
    share: 0.1,
    task: (c) =>
      `${c.startDate} kuni ${c.city} shahrida ${c.guests} kishi uchun milliy taomlar kechasi: stol va menyu tasdiqlansin.`,
  },
];

export type AssignedSpecialist = {
  assignmentId: Id<"assignments">;
  providerId: Id<"providers">;
  direction: Direction;
  role: string;
  task: string;
  amount: number;
  businessName: string;
  contactName?: string;
  phone: string;
  city: string;
  rating: number;
  ratingCount: number;
  completedOrders: number;
  experienceYears: number;
  languages: string[];
  about?: string;
  telegramUsername?: string;
  notified: boolean;
};

/**
 * Dastur uchun mutaxassislarni tanlaydi: tasdiqlangan hamkorlar orasidan
 * reyting, bajarilgan buyurtmalar, tajriba va shahar mosligi bo'yicha eng
 * yaxshisini oladi, vazifa yozadi va botga xabar rejalashtiradi.
 */
async function assignSpecialists(
  ctx: MutationCtx,
  booking: {
    _id: Id<"bookings">;
    reference: string;
    title: string;
    city: string;
    startDate: string;
    days: number;
    guests: number;
    userId?: Id<"users">;
    totalPrice: number;
  },
  directions: Direction[] = ROLE_PLAN.map((r) => r.direction),
): Promise<AssignedSpecialist[]> {
  const assigned: AssignedSpecialist[] = [];

  for (const plan of ROLE_PLAN) {
    if (!directions.includes(plan.direction)) {
      continue;
    }
    const candidates = await ctx.db
      .query("providers")
      .withIndex("by_direction", (q) => q.eq("direction", plan.direction))
      .collect();

    const blockedDate = booking.startDate;
    const best = candidates
      .filter(
        (p) =>
          p.status === "approved" &&
          p.subscription !== "overdue" &&
          !(p.unavailableDates ?? []).includes(blockedDate),
      )
      .map((p) => ({
        provider: p,
        score:
          p.rating * 8 +
          Math.min(p.ratingCount, 60) / 6 +
          Math.min(p.completedOrders, 120) / 20 +
          (p.experienceYears ?? 0) * 0.6 +
          (p.city.toLowerCase() === booking.city.toLowerCase() ? 6 : 0) +
          (p.subscription === "active" ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)[0]?.provider;

    if (!best) {
      continue;
    }

    const task = plan.task({
      city: booking.city,
      startDate: booking.startDate,
      days: booking.days,
      guests: booking.guests,
    });
    const amount = Math.max(20, Math.round(booking.totalPrice * plan.share));

    const assignmentId = await ctx.db.insert("assignments", {
      bookingId: booking._id,
      providerId: best._id,
      userId: booking.userId,
      direction: plan.direction,
      role: plan.role,
      task,
      city: booking.city,
      scheduledFor: booking.startDate,
      days: booking.days,
      guests: booking.guests,
      amount,
      status: "assigned",
      bookingReference: booking.reference,
      bookingTitle: booking.title,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.telegram.notifyAssignment, { assignmentId });

    assigned.push({
      assignmentId,
      providerId: best._id,
      direction: plan.direction,
      role: plan.role,
      task,
      amount,
      businessName: best.businessName,
      contactName: best.contactName,
      phone: best.phone,
      city: best.city,
      rating: best.rating,
      ratingCount: best.ratingCount,
      completedOrders: best.completedOrders,
      experienceYears: best.experienceYears ?? 0,
      languages: best.languages ?? [],
      about: best.about,
      telegramUsername: best.telegramUsername,
      notified: Boolean(best.telegramId),
    });
  }

  return assigned;
}

export const create = mutation({
  args: {
    kind: kindValidator,
    title: v.string(),
    city: v.string(),
    startDate: v.string(),
    days: v.number(),
    guests: v.number(),
    totalPrice: v.number(),
    paymentMethod: paymentValidator,
    packageSlug: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.guests < 1 || args.days < 1 || args.totalPrice <= 0) {
      throw new Error("Buyurtma ma'lumotlari noto'g'ri: kunlar, kishi soni va summa musbat bo'lishi kerak.");
    }
    const now = Date.now();
    const ref = reference();
    const card = await activeCardForUser(ctx, user._id);
    const base = Math.max(1, args.totalPrice);
    const total = card ? Math.round(base * (1 - card.discountPercent / 100)) : base;
    const bookingId = await ctx.db.insert("bookings", {
      ...args,
      totalPrice: total,
      startDate: args.startDate || new Date(now + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      userId: user._id,
      reference: ref,
      currency: "USD",
      status: "new",
      paymentStatus: "unpaid",
      discountPercent: card ? card.discountPercent : undefined,
      discountRef: card ? card._id : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Yo'nalish bo'yicha hamkorlarga bot orqali xabar (buyurtmalar botga tushadi).
    if (args.kind !== "package") {
      await ctx.scheduler.runAfter(0, internal.telegram.broadcastToDirection, {
        direction: directionForKind(args.kind),
        kind: "new-request",
        text:
          `🔔 Yangi so'rov\n\n${args.title}\n${args.startDate} · ${args.guests} kishi · ${
            args.city
          }\nTaxminiy summa: $${args.totalPrice}\n\nPanelda qabul qiling.`,
      });
    }

    return { bookingId, reference: ref, total: args.totalPrice };
  },
});

/** Gid / transfer / mehmonxona / tarjimon / fotograf uchun to'g'ridan-to'g'ri so'rov. */
export const requestService = mutation({
  args: {
    service: serviceValidator,
    city: v.string(),
    startDate: v.string(),
    days: v.number(),
    guests: v.number(),
    note: v.optional(v.string()),
    method: v.optional(paymentValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.days < 1 || args.guests < 1) {
      throw new Error("Kunlar va kishi soni musbat bo'lishi kerak.");
    }
    const meta = SERVICE_META[args.service];
    const units = meta.per === "night" ? Math.max(1, args.days - 1) : Math.max(1, args.days);
    const unitsCount = meta.perGuests ? Math.max(1, Math.ceil(args.guests / 3)) : 1;
    const card = await activeCardForUser(ctx, user._id);
    const base = Math.round(meta.unit * units * unitsCount);
    const totalPrice = card ? Math.round(base * (1 - card.discountPercent / 100)) : base;
    const now = Date.now();
    const ref = reference();

    const bookingId = await ctx.db.insert("bookings", {
      userId: user._id,
      reference: ref,
      kind: args.service,
      title: `${meta.label} — ${args.city}, ${args.days} kun`,
      city: args.city,
      startDate: args.startDate,
      days: args.days,
      guests: args.guests,
      totalPrice,
      currency: "USD",
      status: "new",
      paymentMethod: args.method ?? "click",
      paymentStatus: "unpaid",
      discountPercent: card ? card.discountPercent : undefined,
      discountRef: card ? card._id : undefined,
      customerName: user.name,
      customerPhone: user.phone,
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.telegram.broadcastToDirection, {
      direction: args.service,
      kind: "new-request",
      text:
        `🔔 Yangi ${meta.label.toLowerCase()} so'rovi\n\n${args.city} · ${args.startDate}\n` +
        `${args.days} kun · ${args.guests} kishi · $${totalPrice}\n\nPanelda qabul qiling.`,
    });

    return { bookingId, reference: ref, totalPrice };
  },
});

/**
 * AI Planner dasturini bron qilish: narx serverdagi dasturdan olinadi,
 * mutaxassislar (mehmonxona, gid, transfer, tarjimon, fotograf) avtomatik
 * biriktiriladi va ularga bot orqali vazifa yuboriladi.
 */
export const createFromPlan = mutation({
  args: {
    planId: v.id("plans"),
    optionIndex: v.number(),
    startDate: v.string(),
    paymentMethod: paymentValidator,
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Dastur topilmadi — AI Plannerni qaytadan ishga tushiring.");
    }
    const options = (plan.options ?? (plan.plan ? [plan.plan] : [])) as {
      title?: string;
      summary?: string;
      cities?: string[];
      days?: unknown[];
      estimate?: { total?: number; perPerson?: number };
    }[];
    if (options.length === 0) {
      throw new Error("Dastur varianti topilmadi.");
    }
    const index = Math.min(Math.max(0, Math.round(args.optionIndex)), options.length - 1);
    const option = options[index];
    const answers = (plan.answers ?? {}) as { travelers?: number };

    const startDate =
      args.startDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const days = Math.max(1, Array.isArray(option.days) ? option.days.length : 3);
    const guests = Math.max(1, Math.round(Number(answers.travelers) || 2));
    const cities = Array.isArray(option.cities) && option.cities.length > 0 ? option.cities : ["Samarqand"];
    const baseTotal = Math.max(0, Math.round(Number(option.estimate?.total) || 0));
    if (baseTotal <= 0) {
      throw new Error("Dastur narxi hisoblanmadi — AI Plannerni qaytadan ishga tushiring.");
    }
    const card = await activeCardForUser(ctx, user._id);
    const totalPrice = card ? Math.round(baseTotal * (1 - card.discountPercent / 100)) : baseTotal;

    const now = Date.now();
    const ref = reference();
    const title = option.title ?? `Shaxsiy dastur — ${cities.join(" va ")}`;

    const bookingId = await ctx.db.insert("bookings", {
      userId: user._id,
      reference: ref,
      kind: "custom",
      planId: args.planId,
      planTitle: title,
      planSummary: option.summary,
      itinerary: Array.isArray(option.days) ? (option.days as unknown[]) : [],
      title,
      city: cities[0],
      startDate,
      days,
      guests,
      totalPrice,
      currency: "USD",
      status: "confirmed",
      paymentMethod: args.paymentMethod,
      paymentStatus: "unpaid",
      discountPercent: card ? card.discountPercent : undefined,
      discountRef: card ? card._id : undefined,
      customerName: user.name,
      customerPhone: args.customerPhone ?? user.phone,
      specialRequests: args.specialRequests,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.planId, { userId: user._id, chosenIndex: index });

    const specialists = await assignSpecialists(ctx, {
      _id: bookingId,
      reference: ref,
      title,
      city: cities[0],
      startDate,
      days,
      guests,
      userId: user._id,
      totalPrice,
    });

    const paymentRef = `PAY-${ref.slice(4)}`;
    const paymentId = await ctx.db.insert("payments", {
      userId: user._id,
      bookingId,
      purpose: "package",
      reference: paymentRef,
      amount: totalPrice,
      currency: "USD",
      method: args.paymentMethod,
      status: "pending",
      createdAt: now,
    });

    return {
      bookingId,
      reference: ref,
      paymentId,
      paymentReference: paymentRef,
      totalPrice,
      startDate,
      days,
      guests,
      specialists,
    };
  },
});

/**
 * Byudjet → xizmat taqsimoti: mijoz kirmoqchi bo'lgan summa (AI dasturi
 * taklif qilgan narx) xizmatlar orasida shu ulushlarda bo'linadi. Foizlar
 * ROLE_PLAN ulushlari bilan bir xil — biriktirilgan mutaxassisning amount'i
 * narxdagi ulushi bilan uyg'un bo'ladi.
 */
const BUDGET_SPLIT: Partial<Record<Direction, number>> = {
  hotel: 0.3,
  guide: 0.12,
  transfer: 0.08,
  restaurant: 0.1,
  translator: 0.06,
  photographer: 0.06,
  other: 0.06,
};

/**
 * Milly AI dasturidan to'g'ridan-to'g'ri buyurtma (AI chat oqimidan).
 *
 * Narx faqat serverda hisoblanadi: mijoz ko'rgan summa — AI dasturining
 * byudjet ichidagi taklifi (masalan $800 byudjetga $690 dastur). Millytour
 * xizmat to'lovi (10%) YASHIRIN holda shu summaning ichida yutiladi:
 * mijozga alohida qator ko'rsatilmaydi va mutaxassislar o'z ulushidan
 * ko'proq ko'rmaydi (narxni pasaytirish yo'q).
 *
 * Tanlangan xizmatlar (gid, transfer, mehmonxona, restoran...) bo'yicha
 * tasdiqlangan hamkorlar reyting bo'yicha tanlanadi, vazifa yoziladi va
 * bot orqali birinchi bo'lib o'sha mutaxassislarga yetib boradi.
 */
export const serviceBooking = mutation({
  args: {
    city: v.string(),
    startDate: v.string(),
    days: v.number(),
    guests: v.number(),
    services: v.array(
      v.object({ direction: directionValidator, days: v.optional(v.number()) }),
    ),
    totalPrice: v.number(),
    paymentMethod: paymentValidator,
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    planId: v.optional(v.id("plans")),
    planTitle: v.optional(v.string()),
    planSummary: v.optional(v.string()),
    itinerary: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.days < 1 || args.guests < 1) {
      throw new Error("Kunlar va kishi soni musbat bo'lishi kerak.");
    }
    if (args.totalPrice <= 0 || args.totalPrice > 100_000) {
      throw new Error("Buyurtma summasi noto'g'ri.");
    }
    const directions = args.services.map((s) => s.direction);
    if (directions.length === 0) {
      throw new Error("Kamida bitta xizmat tanlanishi kerak.");
    }

    const now = Date.now();
    const ref = reference();

    // Milly Card chegirmasi — boshqa bronlar bilan bir xil qoida.
    const card = await activeCardForUser(ctx, user._id);
    const total = card
      ? Math.round(args.totalPrice * (1 - card.discountPercent / 100))
      : args.totalPrice;

    const cities = [args.city];
    const title = args.planTitle ?? `Shaxsiy dastur — ${args.city}, ${args.days} kun`;

    const bookingId = await ctx.db.insert("bookings", {
      userId: user._id,
      reference: ref,
      kind: "custom",
      planId: args.planId,
      planTitle: title,
      planSummary: args.planSummary,
      itinerary: args.itinerary ?? [],
      title,
      city: args.city,
      startDate: args.startDate,
      days: args.days,
      guests: args.guests,
      totalPrice: total,
      currency: "USD",
      status: "confirmed",
      paymentMethod: args.paymentMethod,
      paymentStatus: "unpaid",
      discountPercent: card ? card.discountPercent : undefined,
      discountRef: card ? card._id : undefined,
      customerName: user.name,
      customerPhone: args.customerPhone ?? user.phone,
      specialRequests: args.specialRequests,
      createdAt: now,
      updatedAt: now,
    });

    // Mutaxassislar: tanlangan yo'nalishlar bo'yicha eng yaxshi hamkorlar.
    // Bot xabari birinchi navbatda o'sha mutaxassislarga boradi.
    const specialists = await assignSpecialists(
      ctx,
      {
        _id: bookingId,
        reference: ref,
        title,
        city: args.city,
        startDate: args.startDate,
        days: args.days,
        guests: args.guests,
        userId: user._id,
        totalPrice: total,
      },
      directions,
    );

    // Biriktiriladigan hamkor topilmagan yo'nalishlar bo'ylab ochiq so'rov
    // tarqatiladi — botdagi mutaxassislar panelda qabul qila oladi.
    const covered = new Set(specialists.map((s) => s.direction));
    for (const direction of directions) {
      if (covered.has(direction)) {
        continue;
      }
      await ctx.scheduler.runAfter(0, internal.telegram.broadcastToDirection, {
        direction,
        kind: "new-request",
        text:
          `🔔 Yangi so'rov (Milly AI dasturi)\n\n${title}\n${args.startDate} · ` +
          `${args.days} kun · ${args.guests} kishi · ${args.city}\n` +
          `Ulush: $${Math.max(20, Math.round(total * (BUDGET_SPLIT[direction] ?? 0.06)))}\n\n` +
          `Panelda qabul qiling.`,
      });
    }

    const paymentRef = `PAY-${ref.slice(4)}`;
    const paymentId = await ctx.db.insert("payments", {
      userId: user._id,
      bookingId,
      purpose: "package",
      reference: paymentRef,
      amount: total,
      currency: "USD",
      method: args.paymentMethod,
      status: "pending",
      createdAt: now,
    });

    return {
      bookingId,
      reference: ref,
      paymentId,
      paymentReference: paymentRef,
      totalPrice: total,
      startDate: args.startDate,
      days: args.days,
      guests: args.guests,
      specialists,
    };
  },
});

/** Turist kabineti: mening buyurtmalarim. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx).catch(() => null);
    if (!user) {
      return { bookings: [], stats: null };
    }
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    const paid = sorted.filter((b) => b.paymentStatus === "paid");
    return {
      bookings: sorted,
      stats: {
        total: sorted.length,
        upcoming: sorted.filter((b) => b.status === "new" || b.status === "confirmed").length,
        completed: sorted.filter((b) => b.status === "completed").length,
        spent: paid.reduce((sum, b) => sum + b.totalPrice, 0),
        countries: 1,
        loyaltyPoints: Math.round(paid.reduce((sum, b) => sum + b.totalPrice, 0) * 2),
        unpaid: sorted.filter((b) => b.paymentStatus === "unpaid" && b.status !== "cancelled")
          .length,
      },
    };
  },
});

/** Hamkor o'ziga tushgan buyurtmani qabul qiladi. */
export const claim = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await requireUser(ctx);
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!provider) {
      throw new Error("Hamkor profili topilmadi.");
    }
    if (provider.status !== "approved") {
      throw new Error("Profil administrator tasdiqini kutmoqda.");
    }
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Buyurtma topilmadi.");
    }
    if (booking.providerId) {
      throw new Error("Bu buyurtma allaqachon boshqa hamkorga biriktirilgan.");
    }
    if (booking.kind === "custom") {
      throw new Error(
        "AI Planner dasturi bo'yicha vazifa tizim tomonidan biriktiriladi — «Vazifalarim» bo'limini kuzating.",
      );
    }
    if ((provider.unavailableDates ?? []).includes(booking.startDate)) {
      throw new Error("Bu sana kalendarda band — kalendardan kunni bo'shating.");
    }
    // Yo'nalish mosligi: hamkor faqat o'z yo'nalishidagi buyurtmani oladi.
    if (directionForKind(booking.kind) !== provider.direction) {
      throw new Error("Bu buyurtma boshqa yo'nalishga tegishli.");
    }
    await ctx.db.patch(bookingId, {
      providerId: provider._id,
      status: "confirmed",
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const setStatus = mutation({
  args: { bookingId: v.id("bookings"), status: bookingStatusValidator },
  handler: async (ctx, { bookingId, status }) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Buyurtma topilmadi.");
    }

    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const isOwner = provider && booking.providerId === provider._id;
    const isCustomer = booking.userId === user._id;
    const isAdmin = user.role === "admin";
    if (!isAdmin && !isOwner && !isCustomer) {
      throw new Error("Bu buyurtmani o'zgartirish huquqi yo'q.");
    }
    // Mijoz faqat bekor qilishi mumkin, "completed" ni hamkor yoki admin qo'yadi.
    if (isCustomer && !isAdmin && !isOwner && status !== "cancelled") {
      throw new Error("Mijoz buyurtmani faqat bekor qilishi mumkin.");
    }
    if (booking.status === status) {
      return { ok: true, unchanged: true };
    }

    await ctx.db.patch(bookingId, { status, updatedAt: Date.now() });

    // Balans faqat bir marta, "new/confirmed" → "completed" o'tishida qo'shiladi.
    if (
      provider &&
      isOwner &&
      status === "completed" &&
      booking.status !== "completed" &&
      booking.paymentStatus === "paid"
    ) {
      await ctx.db.patch(provider._id, {
        completedOrders: provider.completedOrders + 1,
        walletBalance: provider.walletBalance + Math.round(booking.totalPrice * 0.88),
      });
    }
    return { ok: true, unchanged: false };
  },
});

/** Mutaxassis vazifasini bajarildi/qabul qilindi deb belgilash. */
export const setAssignmentStatus = mutation({
  args: {
    assignmentId: v.id("assignments"),
    status: assignmentStatusValidator,
  },
  handler: async (ctx, { assignmentId, status }) => {
    const user = await requireUser(ctx);
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) {
      throw new Error("Vazifa topilmadi.");
    }
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const isOwner = provider && assignment.providerId === provider._id;
    if (!isOwner && user.role !== "admin") {
      throw new Error("Bu vazifa sizga biriktirilmagan.");
    }
    await ctx.db.patch(assignmentId, { status, answeredAt: Date.now() });
    if (provider && isOwner && status === "done") {
      const booking = await ctx.db.get(assignment.bookingId);
      if (booking && booking.paymentStatus === "paid") {
        await ctx.db.patch(provider._id, {
          walletBalance: provider.walletBalance + assignment.amount,
        });
      }
    }
    return { ok: true };
  },
});

/** Millytour administratori uchun barcha buyurtmalar. */
export const adminList = query({
  args: { status: v.optional(bookingStatusValidator) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const rows = status
      ? await ctx.db
          .query("bookings")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("bookings").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
  },
});

export const adminSetStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.optional(bookingStatusValidator),
    paymentStatus: v.optional(
      v.union(v.literal("unpaid"), v.literal("paid"), v.literal("refunded")),
    ),
    providerId: v.optional(v.union(v.id("providers"), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Buyurtma topilmadi.");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status) {
      patch.status = args.status;
    }
    if (args.paymentStatus) {
      patch.paymentStatus = args.paymentStatus;
    }
    if (args.providerId !== undefined) {
      patch.providerId = args.providerId ?? undefined;
    }
    await ctx.db.patch(args.bookingId, patch);
    return { ok: true };
  },
});
