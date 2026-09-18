import type { Direction } from "../schema";

/**
 * Har bir xizmat yo'nalishi uchun bot funksiyalari.
 * Bu ro'yxat ham Telegram menyusini, ham hamkor panelidagi "Bot" bo'limini
 * bir xil manbadan oziqlantiradi — ikki joyda ajralib ketmasligi uchun.
 */

export type BotButton = { label: string; action: string };

export type BotScreen = {
  key: string;
  title: string;
  body: string;
  buttons: BotButton[];
};

export const DIRECTION_META: Record<
  Direction,
  { label: string; emoji: string; inboxLabel: string; hint: string }
> = {
  guide: {
    label: "Gid",
    emoji: "🧭",
    inboxLabel: "Yangi ekskursiya so'rovlari",
    hint: "Marshrut, kalendar va tillaringiz bo'yicha buyurtmalar.",
  },
  transfer: {
    label: "Transfer",
    emoji: "🚐",
    inboxLabel: "Yangi transfer buyurtmalari",
    hint: "Aeroport va shaharlararo yo'nalishlar, kunlik mashina nazorati.",
  },
  artisan: {
    label: "Hunarmand",
    emoji: "🏺",
    inboxLabel: "Marketplace buyurtmalari",
    hint: "Mahsulot joylash, narx boshqaruvi va yetkazish holati.",
  },
  hotel: {
    label: "Mehmonxona",
    emoji: "🏨",
    inboxLabel: "Bronlar va so'rovlar",
    hint: "Xona fondi, kelish/ketish kalendari va to'g'ridan-to'g'ri bronlar.",
  },
  translator: {
    label: "Tarjimon",
    emoji: "🗣️",
    inboxLabel: "Tarjimonlik so'rovlari",
    hint: "Til, ish vaqti va kunma-kun biriktirilgan vazifalar.",
  },
  photographer: {
    label: "Fotograf",
    emoji: "📷",
    inboxLabel: "Fotosessiya buyurtmalari",
    hint: "Sessiya kunlari, lokatsiyalar va topshirilgan suratlar.",
  },
  restaurant: {
    label: "Restoran / oshxona",
    emoji: "🍽️",
    inboxLabel: "Stol bronlari va gastro kechalar",
    hint: "Guruh stollari, menyu va gastronomik kechalar.",
  },
  other: {
    label: "Boshqa xizmat",
    emoji: "🎫",
    inboxLabel: "Xizmat so'rovlari",
    hint: "Sug'urta, chipta, konsulxizmat va boshqa turizm xizmatlari.",
  },
};

export const DIRECTION_SCREENS: Record<Direction, BotScreen[]> = {
  guide: [
    {
      key: "orders",
      title: "Yangi buyurtmalar",
      body: "Tasdiqlanmagan so'rovlar ro'yxati. Har bir so'rovda sana, guruh hajmi va til ko'rsatiladi.",
      buttons: [
        { label: "Qabul qilish", action: "order:accept" },
        { label: "Rad etish", action: "order:decline" },
      ],
    },
    {
      key: "calendar",
      title: "Kalendarim",
      body: "Band kunlarni belgilang — tizim shu kunlarga yangi so'rov yubormaydi.",
      buttons: [{ label: "Kunni bloklash", action: "calendar:block" }],
    },
    {
      key: "rates",
      title: "Narxlar va tillar",
      body: "Guruh uchun soatlik va kunlik tarif, xizmat ko'rsatadigan tillar.",
      buttons: [{ label: "Tarifni yangilash", action: "rates:update" }],
    },
    {
      key: "rating",
      title: "Reyting va sharhlar",
      body: "Bajarilgan buyurtmalar bo'yicha o'rtacha baho va oxirgi sharhlar.",
      buttons: [{ label: "Barcha sharhlar", action: "rating:list" }],
    },
    {
      key: "docs",
      title: "Hujjatlar",
      body: "Litsenziya va malaka hujjatlarini yuklang — tasdiqlangan gid belgisi shundan keladi.",
      buttons: [{ label: "Hujjat yuborish", action: "docs:upload" }],
    },
  ],
  transfer: [
    {
      key: "orders",
      title: "Transfer buyurtmalari",
      body: "Yo'nalish, vaqt, yo'lovchi soni va mashina sinfi bo'yicha so'rovlar.",
      buttons: [
        { label: "Qabul qilish", action: "order:accept" },
        { label: "Marshrutni ko'rish", action: "order:route" },
      ],
    },
    {
      key: "vehicle",
      title: "Mashina holati",
      body: "Har kuni ertalab bot holatni so'raydi: texnik xizmat kerakmi yoki yo'q.",
      buttons: [
        { label: "Yaxshi", action: "vehicle:ok" },
        { label: "Texnik xizmat", action: "vehicle:service" },
        { label: "Ta'mirda", action: "vehicle:repair" },
      ],
    },
    {
      key: "tariff",
      title: "Tariflar",
      body: "Yo'nalish bo'yicha narx, kutish vaqti va qo'shimcha to'lovlar.",
      buttons: [{ label: "Tarifni yangilash", action: "tariff:update" }],
    },
    {
      key: "docs",
      title: "Haydovchi hujjatlari",
      body: "Guvohnoma, texnik ko'rik va sug'urta muddatlarini kuzatib boradi.",
      buttons: [{ label: "Hujjat yuborish", action: "docs:upload" }],
    },
    {
      key: "rating",
      title: "Reyting",
      body: "O'z vaqtida yetib borish va mijoz bahosi ko'rsatkichlari.",
      buttons: [{ label: "Batafsil", action: "rating:list" }],
    },
  ],
  artisan: [
    {
      key: "add",
      title: "Mahsulot qo'shish",
      body: "Botga «nomi | narxi | kategoriya» ko'rinishida yuboring — moderatsiyadan so'ng do'konda chiqadi.",
      buttons: [{ label: "Namuna", action: "product:sample" }],
    },
    {
      key: "products",
      title: "Mahsulotlarim",
      body: "Faol, moderatsiyada va tugagan mahsulotlar ro'yxati.",
      buttons: [{ label: "Narxni yangilash", action: "product:price" }],
    },
    {
      key: "orders",
      title: "Buyurtmalar",
      body: "To'lov holati, yetkazish manzili va kuryer biriktirilishi.",
      buttons: [{ label: "Yetkazishni belgilash", action: "order:ship" }],
    },
    {
      key: "shop",
      title: "Do'kon statistikasi",
      body: "Ko'rishlar, savatga qo'shishlar va eng ko'p sotilgan buyumlar.",
      buttons: [{ label: "Hisobot", action: "shop:report" }],
    },
    {
      key: "fees",
      title: "Oylik to'lov va eksport",
      body: "Obuna holati, komissiya hisobi va eksport uchun hujjatlar.",
      buttons: [{ label: "To'lov qilish", action: "fees:pay" }],
    },
  ],
  translator: [
    {
      key: "orders",
      title: "Vazifalarim",
      body: "Turi, sana, shahar va guruh hajmi bo'yicha biriktirilgan tarjimonlik vazifalari.",
      buttons: [
        { label: "Vazifalarni olish", action: "tasks:list" },
        { label: "Qabul qilish", action: "order:accept" },
      ],
    },
    {
      key: "rates",
      title: "Tillar va tarif",
      body: "Xizmat ko'rsatadigan tillaringiz va kunlik tarifni yangilang.",
      buttons: [{ label: "Tarifni yangilash", action: "rates:update" }],
    },
    {
      key: "calendar",
      title: "Ish kalendari",
      body: "Band kunlarni belgilang — tizim shu kunlarga vazifa biriktirmaydi.",
      buttons: [{ label: "Kunni bloklash", action: "calendar:block" }],
    },
    {
      key: "rating",
      title: "Reyting",
      body: "Bajarilgan vazifalar, mijoz bahosi va millytour reytingi.",
      buttons: [{ label: "Batafsil", action: "rating:list" }],
    },
  ],
  photographer: [
    {
      key: "orders",
      title: "Fotosessiyalar",
      body: "Sana, shahar, necha kun va qancha kishi uchun suratga olish kerakligi.",
      buttons: [
        { label: "Vazifalarni olish", action: "tasks:list" },
        { label: "Qabul qilish", action: "order:accept" },
      ],
    },
    {
      key: "portfolio",
      title: "Portfolio",
      body: "Yaxshi ishlangan suratlar namunalarini yuboring — mijozlar shu yerdan tanlaydi.",
      buttons: [{ label: "Namuna yuborish", action: "product:sample" }],
    },
    {
      key: "rates",
      title: "Paketlar va narx",
      body: "Yarim kun, to'liq kun va reportaj paketlari narxini boshqaring.",
      buttons: [{ label: "Narxni yangilash", action: "rates:update" }],
    },
    {
      key: "calendar",
      title: "Sessiya kalendari",
      body: "Band kunlar nazorati va zaxira sanalar.",
      buttons: [{ label: "Kunni bloklash", action: "calendar:block" }],
    },
  ],
  hotel: [
    {
      key: "rooms",
      title: "Xonalar va narxlar",
      body: "Xona turlari, sig'imi va mavsumiy narxlarni boshqarish.",
      buttons: [{ label: "Narxni yangilash", action: "rooms:price" }],
    },
    {
      key: "bookings",
      title: "Bronlar",
      body: "Kelish va ketish sanalari, to'lov holati, mehmonlar soni.",
      buttons: [
        { label: "Tasdiqlash", action: "booking:confirm" },
        { label: "Bekor qilish", action: "booking:cancel" },
      ],
    },
    {
      key: "calendar",
      title: "Bandlik kalendari",
      body: "Bo'sh xonalar soni va bandlik foizi kunlar bo'yicha.",
      buttons: [{ label: "Kalendarni ko'rish", action: "calendar:view" }],
    },
    {
      key: "reviews",
      title: "Sharhlar",
      body: "Mehmonlar bahosi va xizmat bo'yicha tez-tez uchraydigan izohlar.",
      buttons: [{ label: "Barcha sharhlar", action: "rating:list" }],
    },
    {
      key: "payouts",
      title: "To'lovlar",
      body: "Komissiya, oylik obuna va hisobga tushgan mablag'lar.",
      buttons: [{ label: "Hisobot", action: "payouts:report" }],
    },
  ],
  restaurant: [
    {
      key: "orders",
      title: "Stol bronlari",
      body: "Sana, vaqt, kishi soni va menyu bo'yicha guruh so'rovlari.",
      buttons: [
        { label: "Tasdiqlash", action: "booking:confirm" },
        { label: "Rad etish", action: "booking:cancel" },
      ],
    },
    {
      key: "menu",
      title: "Menyu va set-narxlar",
      body: "Milliy taomlar menyusi, guruh uchun set-narx va mavsumiy takliflar.",
      buttons: [{ label: "Narxni yangilash", action: "rates:update" }],
    },
    {
      key: "events",
      title: "Gastro kechalar",
      body: "Tadbir e'lonlari: degustatsiya, choy marosimi va ustoz-bilan kechki ovqat.",
      buttons: [{ label: "E'lon qo'shish", action: "product:sample" }],
    },
    {
      key: "reviews",
      title: "Sharhlar",
      body: "Mehmonlar bahosi, xizmat sifati va takroriy so'rovlar.",
      buttons: [{ label: "Barcha sharhlar", action: "rating:list" }],
    },
  ],
  other: [
    {
      key: "orders",
      title: "Xizmat so'rovlari",
      body: "Mijozlar so'ragan xizmatlar: sug'urta, chipta, konsulxizmat, kruiz.",
      buttons: [
        { label: "Qabul qilish", action: "order:accept" },
        { label: "Rad etish", action: "order:decline" },
      ],
    },
    {
      key: "offer",
      title: "Xizmat kartochkasi",
      body: "Xizmat nomi, narxi va muddatini yuboring — saytda kartochka bo'lib chiqadi.",
      buttons: [{ label: "Namuna", action: "product:sample" }],
    },
    {
      key: "docs",
      title: "Hujjatlar va shartnoma",
      body: "Litsenziya, sug'urta shartnomasi va vakolat hujjatlari.",
      buttons: [{ label: "Hujjat yuborish", action: "docs:upload" }],
    },
    {
      key: "rating",
      title: "Reyting",
      body: "Bajarilgan so'rovlar va mijoz bahosi.",
      buttons: [{ label: "Batafsil", action: "rating:list" }],
    },
  ],
};

/** Sayohatchi uchun asosiy bot menyusi. */
export const TOURIST_SCREENS: BotScreen[] = [
  {
    key: "packages",
    title: "Tur paketlar",
    body: "Tarixiy shaharlar, ekoturizm, hunarmandchilik va ziyorat turlari.",
    buttons: [
      { label: "Tarixiy shaharlar", action: "cat:historical" },
      { label: "Ekoturizm", action: "cat:eco" },
      { label: "Barchasi saytda", action: "link:site" },
    ],
  },
  {
    key: "ai",
    title: "Milly AI",
    body: "Savollarga javob bering — 2 xil tur dasturi tayyor bo'ladi: komfort va tejamkor. Tasdiqlasangiz mutaxassislar biriktirilib bron va to'lov boshlanadi.",
    buttons: [
      { label: "✨ Milly AI'ni ochish", action: "ai:start" },
      { label: "Mini app — markazda", action: "link:miniapp" },
    ],
  },
  {
    key: "orders",
    title: "Mening buyurtmalarim",
    body: "Bronlar, to'lov holati va elektron vaucherlar.",
    buttons: [{ label: "Vaucherni olish", action: "orders:voucher" }],
  },
  {
    key: "language",
    title: "Til",
    body: "Interfeys va bot javoblari tilini tanlang: UZ, RU, EN.",
    buttons: [
      { label: "UZ", action: "lang:uz" },
      { label: "RU", action: "lang:ru" },
      { label: "EN", action: "lang:en" },
    ],
  },
];

export function screensFor(direction: Direction) {
  return DIRECTION_SCREENS[direction];
}

export function mainMenuRows(direction?: Direction) {
  if (!direction) {
    return TOURIST_SCREENS.map((s) => [{ label: s.title, action: `menu:${s.key}` }]);
  }
  return [
    [
      {
        label: `${DIRECTION_META[direction].emoji} Vazifalarim`,
        action: "tasks:list",
      },
    ],
    ...DIRECTION_SCREENS[direction].map((s) => [
      { label: `${DIRECTION_META[direction].emoji} ${s.title}`, action: `menu:${s.key}` },
    ]),
  ];
}
