import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** Xizmat ko'rsatuvchi yo'nalishlari — har biri uchun bot va panel moslashadi. */
export const DIRECTION = {
  GUIDE: "guide",
  TRANSFER: "transfer",
  ARTISAN: "artisan",
  HOTEL: "hotel",
  TRANSLATOR: "translator",
  PHOTOGRAPHER: "photographer",
  RESTAURANT: "restaurant",
  OTHER: "other",
} as const;

export const directionValidator = v.union(
  v.literal(DIRECTION.GUIDE),
  v.literal(DIRECTION.TRANSFER),
  v.literal(DIRECTION.ARTISAN),
  v.literal(DIRECTION.HOTEL),
  v.literal(DIRECTION.TRANSLATOR),
  v.literal(DIRECTION.PHOTOGRAPHER),
  v.literal(DIRECTION.RESTAURANT),
  v.literal(DIRECTION.OTHER),
);
export type Direction = Infer<typeof directionValidator>;

/** Buyurtma tarkibiga biriktirilgan mutaxassis vazifasi. */
export const assignmentStatusValidator = v.union(
  v.literal("assigned"),
  v.literal("notified"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("done"),
);
export type AssignmentStatus = Infer<typeof assignmentStatusValidator>;

export const providerStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("paused"),
);
export type ProviderStatus = Infer<typeof providerStatusValidator>;

export const subscriptionValidator = v.union(
  v.literal("trial"),
  v.literal("active"),
  v.literal("overdue"),
);
export type SubscriptionStatus = Infer<typeof subscriptionValidator>;

export const bookingStatusValidator = v.union(
  v.literal("new"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled"),
);
export type BookingStatus = Infer<typeof bookingStatusValidator>;

export const paymentValidator = v.union(
  v.literal("click"),
  v.literal("payme"),
  v.literal("visa"),
  v.literal("mastercard"),
);

export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("refunded"),
);
export type PaymentStatus = Infer<typeof paymentStatusValidator>;

/** Tur paket turkumi (src/data/catalog.ts TOUR_CATEGORIES bilan mos). */
export const packageCategoryValidator = v.union(
  v.literal("historical"),
  v.literal("eco"),
  v.literal("craft"),
  v.literal("pilgrimage"),
  v.literal("adventure"),
);
export type PackageCategory = Infer<typeof packageCategoryValidator>;

export const packageBadgeValidator = v.union(
  v.literal("Best Seller"),
  v.literal("Hot Deal"),
  v.literal("New"),
);
export type PackageBadge = Infer<typeof packageBadgeValidator>;

export const packageStatusValidator = v.union(
  v.literal("published"),
  v.literal("draft"),
  v.literal("archived"),
);
export type PackageStatus = Infer<typeof packageStatusValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove
      role: v.optional(roleValidator), // role of the user. do not remove
      phone: v.optional(v.string()),
      country: v.optional(v.string()),
      language: v.optional(v.string()),
      telegramId: v.optional(v.number()),
      telegramUsername: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
      onboardedAt: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /** Xizmat ko'rsatuvchilar (gid, transfer, hunarmand, mehmonxona). */
    providers: defineTable({
      userId: v.optional(v.id("users")),
      direction: directionValidator,
      businessName: v.string(),
      contactName: v.optional(v.string()),
      city: v.string(),
      phone: v.string(),
      telegramUsername: v.optional(v.string()),
      telegramId: v.optional(v.number()),
      about: v.optional(v.string()),
      languages: v.optional(v.array(v.string())),
      status: providerStatusValidator,
      plan: v.optional(v.union(v.literal("start"), v.literal("pro"), v.literal("business"))),
      monthlyFee: v.number(),
      subscription: subscriptionValidator,
      paidUntil: v.optional(v.number()),
      rating: v.number(),
      ratingCount: v.number(),
      completedOrders: v.number(),
      walletBalance: v.number(),
      /** Mutaxassis tajribasi (yil) — biriktirish algoritmi shuni hisobga oladi. */
      experienceYears: v.optional(v.number()),
      /** Sig'im/hajm: restoran uchun "60 o'rin", transfer uchun "7 o'rin" va h.k. */
      capacity: v.optional(v.string()),
      /** Kunning qaysi vaqtida ishlay oladi (masalan "09:00-21:00"). */
      workingHours: v.optional(v.string()),
      /** transfer uchun: mashina holati kunlik so'raladi */
      vehicle: v.optional(
        v.object({
          model: v.string(),
          year: v.number(),
          seats: v.number(),
          plate: v.string(),
          conditionCheckedAt: v.optional(v.number()),
          condition: v.optional(v.union(v.literal("ok"), v.literal("service"), v.literal("repair"))),
        }),
      ),
      /** mehmonxona uchun: xona fondi */
      rooms: v.optional(v.number()),
      /** band kunlar (YYYY-MM-DD) — shu kunlarga yangi buyurtma tushmaydi */
      unavailableDates: v.optional(v.array(v.string())),
      /** gid uchun: litsenziya raqami */
      licenseNumber: v.optional(v.string()),
      source: v.union(v.literal("bot"), v.literal("site"), v.literal("admin")),
      createdAt: v.number(),
      approvedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_direction", ["direction"])
      .index("by_status", ["status"])
      .index("by_telegram", ["telegramId"]),

    /** Turist buyurtmalari (tur paket, gid, transfer, mehmonxona). */
    bookings: defineTable({
      userId: v.optional(v.id("users")),
      reference: v.string(),
      kind: v.union(
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
      ),
      packageSlug: v.optional(v.string()),
      /** AI Planner dasturidan kelgan bron bo'lsa — dastur havolasi. */
      planId: v.optional(v.id("plans")),
      planTitle: v.optional(v.string()),
      planSummary: v.optional(v.string()),
      /** Kunma-kun dastur (AI Planner bronlari uchun). */
      itinerary: v.optional(v.array(v.any())),
      specialRequests: v.optional(v.string()),
      title: v.string(),
      city: v.string(),
      startDate: v.string(),
      days: v.number(),
      guests: v.number(),
      totalPrice: v.number(),
      /** Milly Card chegirmasi: foiz va karta havolasi (bo'lmasa narx to'liq). */
      discountPercent: v.optional(v.number()),
      discountRef: v.optional(v.id("discountCards")),
      currency: v.string(),
      status: bookingStatusValidator,
      paymentMethod: paymentValidator,
      paymentStatus: v.union(v.literal("unpaid"), v.literal("paid"), v.literal("refunded")),
      customerName: v.optional(v.string()),
      customerPhone: v.optional(v.string()),
      note: v.optional(v.string()),
      providerId: v.optional(v.id("providers")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_provider", ["providerId"])
      .index("by_status", ["status"])
      .index("by_kind", ["kind"])
      .index("by_reference", ["reference"]),

    /** Har bir mutaxassisga tushadigan aniq vazifa (gid, transfer, mehmonxona...). */
    assignments: defineTable({
      bookingId: v.id("bookings"),
      providerId: v.id("providers"),
      userId: v.optional(v.id("users")),
      direction: directionValidator,
      /** Vazifa turi: "Gid", "Transfer", "Mehmonxona", "Tarjimon", "Fotograf". */
      role: v.string(),
      /** Botga yuboriladigan topshiriq matni. */
      task: v.string(),
      city: v.string(),
      scheduledFor: v.string(),
      days: v.number(),
      guests: v.number(),
      /** Mutaxassisga to'lanadigan summa. */
      amount: v.number(),
      status: assignmentStatusValidator,
      bookingReference: v.string(),
      bookingTitle: v.string(),
      createdAt: v.number(),
      notifiedAt: v.optional(v.number()),
      answeredAt: v.optional(v.number()),
    })
      .index("by_provider", ["providerId"])
      .index("by_booking", ["bookingId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),

    /** AI Planner sessiyalari va natijalari (har safar 2 xil taklif). */
    plans: defineTable({
      userId: v.optional(v.id("users")),
      sessionKey: v.string(),
      answers: v.any(),
      /** Orqaga moslik: tanlangan dastur. */
      plan: v.any(),
      /** Bir nechta taklif varianti. */
      options: v.optional(v.array(v.any())),
      chosenIndex: v.optional(v.number()),
      engine: v.union(v.literal("ai"), v.literal("rule-based")),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_session", ["sessionKey"]),

    /** Hamkor bo'lish uchun saytdan yuborilgan so'rovlar. */
    partnerLeads: defineTable({
      direction: directionValidator,
      businessName: v.string(),
      contactName: v.string(),
      phone: v.string(),
      city: v.string(),
      telegramUsername: v.optional(v.string()),
      note: v.optional(v.string()),
      handled: v.boolean(),
      createdAt: v.number(),
    }).index("by_direction", ["direction"]),

    /** Telegram botlari bilan bog'langan hisoblar va suhbat holati. */
    botSessions: defineTable({
      bot: v.union(v.literal("main"), v.literal("auth"), v.literal("stats")),
      telegramId: v.number(),
      username: v.optional(v.string()),
      firstName: v.optional(v.string()),
      providerId: v.optional(v.id("providers")),
      state: v.string(),
      draft: v.any(),
      updatedAt: v.number(),
    })
      .index("by_telegram", ["bot", "telegramId"])
      .index("by_provider", ["providerId"]),

    /** Bot hodisalari — hamkor panelidagi "Bot jurnali" shu yerdan o'qiladi. */
    botEvents: defineTable({
      bot: v.union(v.literal("main"), v.literal("auth"), v.literal("stats")),
      direction: v.optional(directionValidator),
      providerId: v.optional(v.id("providers")),
      telegramId: v.optional(v.number()),
      kind: v.string(),
      text: v.string(),
      status: v.union(v.literal("sent"), v.literal("skipped"), v.literal("failed")),
      createdAt: v.number(),
    })
      .index("by_provider", ["providerId"])
      .index("by_created", ["createdAt"]),

    /** Hunarmandlar marketplace'iga bot yoki paneldan qo'shilgan mahsulotlar. */
    marketItems: defineTable({
      providerId: v.optional(v.id("providers")),
      title: v.string(),
      category: v.string(),
      city: v.string(),
      price: v.number(),
      seller: v.string(),
      handmadeDays: v.number(),
      status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
      source: v.union(v.literal("bot"), v.literal("panel")),
      createdAt: v.number(),
    })
      .index("by_provider", ["providerId"])
      .index("by_status", ["status"]),

    /** Saytdan botga o'tish uchun bir martalik havola kodlari. */
    linkCodes: defineTable({
      code: v.string(),
      userId: v.optional(v.id("users")),
      providerId: v.optional(v.id("providers")),
      createdAt: v.number(),
      usedAt: v.optional(v.number()),
    }).index("by_code", ["code"]),

    /** Tur paketlar katalogi — administrator tomonidan boshqariladi. */
    packages: defineTable({
      slug: v.string(),
      title: v.string(),
      summary: v.string(),
      category: packageCategoryValidator,
      city: v.string(),
      region: v.string(),
      days: v.number(),
      nights: v.number(),
      priceFrom: v.number(),
      oldPrice: v.optional(v.number()),
      rating: v.number(),
      reviews: v.number(),
      groupSize: v.string(),
      nextDeparture: v.string(),
      languages: v.array(v.string()),
      includes: v.array(v.string()),
      highlights: v.array(v.string()),
      image: v.string(),
      alt: v.string(),
      badge: v.optional(packageBadgeValidator),
      status: packageStatusValidator,
      featured: v.boolean(),
      source: v.union(v.literal("catalog"), v.literal("admin")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_status", ["status"])
      .index("by_category", ["category"]),

    /** To'lov tranzaksiyalari (bron, xizmat va hamkor obunasi). */
    payments: defineTable({
      userId: v.optional(v.id("users")),
      bookingId: v.optional(v.id("bookings")),
      providerId: v.optional(v.id("providers")),
      purpose: v.union(
        v.literal("package"),
        v.literal("service"),
        v.literal("marketplace"),
        v.literal("subscription"),
        v.literal("discount"),
      ),
      reference: v.string(),
      amount: v.number(),
      currency: v.string(),
      method: paymentValidator,
      status: paymentStatusValidator,
      /** Karta xaridida tanlangan dizayn (registon | buxoro | xiva | modern). */
      design: v.optional(v.string()),
      gatewayRef: v.optional(v.string()),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_booking", ["bookingId"])
      .index("by_provider", ["providerId"])
      .index("by_status", ["status"])
      .index("by_reference", ["reference"]),

    /** Sayohatchilar sharhlari — reyting shu yerdan qayta hisoblanadi. */
    reviews: defineTable({
      userId: v.id("users"),
      bookingId: v.id("bookings"),
      packageSlug: v.optional(v.string()),
      providerId: v.optional(v.id("providers")),
      authorName: v.string(),
      rating: v.number(),
      text: v.string(),
      visible: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_package", ["packageSlug"])
      .index("by_provider", ["providerId"])
      .index("by_user", ["userId"])
      .index("by_booking", ["bookingId"]),

    /** Har oy takrorlanadigan turistik tadbirlar va festivallar. */
    events: defineTable({
      slug: v.string(),
      title: v.string(),
      city: v.string(),
      /** 1-12 */
      month: v.number(),
      /** Masalan "20–26-mart" */
      dates: v.string(),
      kind: v.union(
        v.literal("festival"),
        v.literal("hunarmandchilik"),
        v.literal("gastro"),
        v.literal("musiqa"),
        v.literal("sport"),
        v.literal("ilmiy"),
      ),
      summary: v.string(),
      /** Tadbir bilan bog'lanadigan tur paketlari (slug'lar). */
      packageSlugs: v.array(v.string()),
      /** Shu oyda mashhur yo'nalishlar — tavsiya uchun. */
      directions: v.array(directionValidator),
      price: v.number(),
      status: v.union(v.literal("published"), v.literal("draft")),
      source: v.union(v.literal("catalog"), v.literal("admin")),
      createdAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_month", ["month"])
      .index("by_status", ["status"]),

    /** Bir martalik sozlamalar (bot username'lari, webhook holati). */
    settings: defineTable({
      key: v.string(),
      value: v.any(),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    /**
     * Sayohat chegirma kartalari (3/6/12 oy). Xarid qilinganda faol bo'ladi,
     * bronlarda narxdan avtomatik chegirma sifatida qo'llanadi.
     */
    discountCards: defineTable({
      userId: v.id("users"),
      /** 3 / 6 / 12 oylik karta. */
      tier: v.union(v.literal("3"), v.literal("6"), v.literal("12")),
      /** Kartaning vizual uslubi: registon | buxoro | xiva | modern. */
      design: v.optional(v.string()),
      reference: v.string(),
      /** Xarid narxi (USD). */
      pricePaid: v.number(),
      /** Har bron beriladigan chegirma foizi. */
      discountPercent: v.number(),
      status: v.union(v.literal("active"), v.literal("expired"), v.literal("cancelled")),
      startsAt: v.number(),
      expiresAt: v.number(),
      paymentId: v.optional(v.id("payments")),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_reference", ["reference"]),

    /**
     * Milly AI chat jurnali — sessiya tarixi shakllanadi va AI o'z javoblari
     * uchun ball (feedback) yig'adi. Bu jurnal asosida AI «qanday suhbat
     * qilishni o'rganib» boradi (aiMemory).
     */
    chatLogs: defineTable({
      sessionKey: v.string(),
      userId: v.optional(v.id("users")),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      lang: v.optional(v.string()),
      engine: v.optional(v.union(v.literal("ai"), v.literal("rule-based"))),
      score: v.optional(v.number()), // −1 .. 1 (foydalanuvchi fikri/ishoralar)
      createdAt: v.number(),
    })
      .index("by_session", ["sessionKey"])
      .index("by_created", ["createdAt"]),

    /**
      * Milly AI o'z xotirasi: muvaffaqiyatli javoblar namunalari (lessons) va
      * mijozlar bilan muloqot qoidalari (style). Cron (learnCron) har kuni
      * eng yuqori ball olgan javoblardan umumiy qoida-namunalar chiqaradi —
      * AI keyingi suhbatlarda shunga tayanadi va shu tarzda «o'qiydi».
      */
    aiMemory: defineTable({
      kind: v.union(v.literal("style"), v.literal("lesson")),
      content: v.string(),
      weight: v.number(),
      source: v.optional(v.string()),
      updatedAt: v.number(),
    }).index("by_kind", ["kind"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
