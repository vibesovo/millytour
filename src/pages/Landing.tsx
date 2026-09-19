import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { DiscountCardsSection } from "@/components/discount-cards";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  Camera,
  CarFront,
  Check,
  Clock,
  CreditCard,
  Languages,
  MapPin,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Ticket,
  UserRound,
  Users,
  UtensilsCrossed,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PatternOverlay, SectionHeading } from "@/components/brand";
import { CategoryTabs, TourCard } from "@/components/tour";
import { Container } from "@/components/site";
import { AiSection } from "@/components/ai-section";
import { openMillyAi } from "@/components/AiAssistant";
import { TourDetailModal } from "@/components/TourDetailModal";
import { EventsSection } from "@/components/events";
import { ForYouRow } from "@/components/for-you";
import {
  CITIES,
  DURATIONS,
  PRODUCTS,
  TOUR_CATEGORIES,
  TOUR_PACKAGES,
  TESTIMONIALS,
  partnerBotLink,
  type CategoryId,
} from "@/data/catalog";
import { cn } from "@/lib/utils";

const blurFade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

/* ----------------------------------- hero ---------------------------------- */

function Hero() {
  return (
    <section className="relative min-h-[600px] overflow-hidden bg-gradient-to-br from-[#0F1B3D] via-[#1F5BFF] to-[#2563EB] text-white">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F1B3D]/70 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/50 via-transparent to-transparent" />
      <PatternOverlay tone="gold" opacityClass="opacity-[0.05]" />

      <Container className="relative flex min-h-[600px] items-center pb-36 pt-16 sm:pt-20 lg:pb-44">
        <div className="flex max-w-xl flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-gold" aria-hidden="true" />
              O'zbekiston — Buyuk Ipak yo'lining yuragi
            </span>
            <h1 className="mt-6 max-w-2xl text-[38px] leading-[42px] font-extrabold tracking-tight sm:text-[58px] sm:leading-[60px]">
              O'zbekistonni kashf eting,
              <span className="block script-accent text-3xl font-normal italic sm:text-5xl"> xotiralar yarating</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-6 text-white/85 sm:text-lg sm:leading-7">
              Tasdiqlangan tur paketlar, Milly AI tuzgan shaxsiy dastur va mahalliy mutaxassislar
              (gid, transfer, mehmonxona, tarjimon, fotograf) — bitta joyda.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                <Link to="/paketlar">
                  Tur paketlarni ko'rish
                  <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                asChild
              >
                <Link to="/xizmatlar">
                  Xizmatlarni ko'rish
                  <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/70">
              {["Tasdiqlangan hamkorlar", "Aniq narx", "Xavfsiz to'lov"].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-gold" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="absolute right-6 top-1/2 hidden -translate-y-1/2 rounded-[22px] border border-white/30 bg-white/10 p-5 shadow-float backdrop-blur-xl lg:block xl:right-14"
        >
          <p className="text-xs font-bold tracking-wide text-accent uppercase">Maxsus taklif</p>
          <p className="mt-2 text-3xl font-extrabold text-white">30% OFF</p>
          <p className="mt-1 max-w-[150px] text-xs leading-5 text-white/70">Milly Card bilan barcha bronlarda tejang</p>
          <Link to="/paketlar" className="mt-4 inline-flex text-xs font-bold text-white hover:text-gold">
            Takliflarni ko'rish <ArrowRight className="ml-1 size-3.5" />
          </Link>
        </motion.div>

        <div aria-hidden="true" className="absolute bottom-20 right-[28%] hidden opacity-25 lg:block">
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <path d="M10 90 L90 50 L10 90 Z" fill="white" opacity="0.6" />
            <path d="M10 90 L50 45 L90 50" stroke="white" strokeWidth="2" opacity="0.4" />
          </svg>
        </div>
        <div aria-hidden="true" className="absolute top-16 right-[15%] hidden opacity-20 lg:block">
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
            <ellipse cx="25" cy="25" rx="22" ry="8" stroke="white" strokeWidth="1.5" opacity="0.5" />
            <ellipse cx="25" cy="25" rx="22" ry="8" stroke="white" strokeWidth="1.5" opacity="0.3" transform="rotate(30 25 25)" />
            <ellipse cx="25" cy="25" rx="22" ry="8" stroke="white" strokeWidth="1.5" opacity="0.2" transform="rotate(60 25 25)" />
          </svg>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------ qidiruv paneli ------------------------------ */

const SERVICE_SHORTCUTS = [
  { label: "Gid xizmati", icon: UserRound, to: "/paketlar?service=guide" },
  { label: "Transfer", icon: CarFront, to: "/paketlar?service=transfer" },
  { label: "Mehmonxona", icon: BedDouble, to: "/paketlar?service=hotel" },
  { label: "Tarjimon", icon: Languages, to: "/paketlar?service=translator" },
  { label: "Fotograf", icon: Camera, to: "/paketlar?service=photographer" },
  { label: "Hunarmandlar", icon: Store, to: "/hunarmandlar" },
];

function SearchField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-xl bg-muted/60 px-3 py-2 transition-shadow focus-within:bg-card focus-within:ring-[3px] focus-within:ring-ring/40">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </span>
      {children}
    </label>
  );
}

const selectCls =
  "w-full border-0 bg-transparent p-0 pt-0.5 text-sm font-semibold text-foreground outline-none";

function SearchPanel() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId>("all");
  const [city, setCity] = useState<string>(CITIES[1]);
  const [days, setDays] = useState<string>(DURATIONS[1]);
  const [guests, setGuests] = useState<string>("2");

  const searchWithAi = () => {
    const params = { city, days, guests, category: category !== "all" ? category : undefined };
    sessionStorage.setItem("millytour.ai.search", JSON.stringify(params));
    openMillyAi();
  };

  return (
    <section id="qidiruv" aria-label="Sayohat qidiruvi">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams();
          if (category !== "all") {
            params.set("category", category);
          }
          if (city) {
            params.set("city", city);
          }
          if (days) {
            params.set("days", days);
          }
          if (guests) {
            params.set("guests", guests);
          }
          navigate(`/paketlar?${params.toString()}`);
        }}
        className="rounded-2xl border border-white/40 bg-white/80 p-3 shadow-lifted backdrop-blur-xl sm:p-4"
      >
        <CategoryTabs value={category} onChange={setCategory} className="mb-3" />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
          <SearchField label="Shahar" icon={MapPin}>
            <select name="city" value={city} onChange={(e) => setCity(e.target.value)} className={selectCls}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </SearchField>
          <SearchField label="Sana" icon={CalendarDays}>
            <Input
              type="date"
              name="date"
              defaultValue="2026-10-03"
              className="h-auto border-0 bg-transparent p-0 pt-0.5 text-sm font-semibold shadow-none"
            />
          </SearchField>
          <SearchField label="Kunlar soni" icon={Clock}>
            <select name="days" value={days} onChange={(e) => setDays(e.target.value)} className={selectCls}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </SearchField>
          <SearchField label="Odam soni" icon={Users}>
            <select name="guests" value={guests} onChange={(e) => setGuests(e.target.value)} className={selectCls}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} kishi
                </option>
              ))}
            </select>
          </SearchField>
          <Button type="submit" size="lg" className="lg:h-full lg:px-8">
            <Search className="size-4" aria-hidden="true" />
            Qidirish
          </Button>
          <Button type="button" size="lg" variant="secondary" className="lg:h-full lg:px-8 bg-eco hover:bg-eco/90 text-white" onClick={searchWithAi}>
            <Sparkles className="size-4" aria-hidden="true" />
            AI bilan qidirish
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200/60 pt-3">
          <span className="text-xs font-semibold text-muted-foreground">Qo'shimcha xizmatlar:</span>
          {SERVICE_SHORTCUTS.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <s.icon className="size-3.5" aria-hidden="true" />
              {s.label}
            </Link>
          ))}
        </div>
      </form>
    </section>
  );
}

/* ------------------------------ qanday ishlaydi ------------------------------ */

const STEPS = [
  {
    icon: Search,
    title: "Tanlang",
    text: "Shahar, sana va byudjetni belgilang — tasdiqlangan paketlar va mahalliy mutaxassislar orasidan.",
  },
  {
    icon: Sparkles,
    title: "Rejalashtiring",
    text: "Milly AI savollaringizga qarab 30 soniyada ikki xil tur dasturini tuzadi, tasdiqlaganingizda mutaxassislarni biriktiradi.",
  },
  {
    icon: ShieldCheck,
    title: "Band qiling",
    text: "Click, Payme yoki Visa/Mastercard bilan xavfsiz to'lang — elektron vaucher va QR chipta darhol qo'lingizda.",
  },
];

function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-14 lg:py-20">
      <Container className="relative">
        <motion.div {...blurFade}>
          <SectionHeading
            align="center"
            eyebrow="Qanday ishlaydi"
            title="Uch qadamda sayohatga tayyor"
            description="Murakkab rejalarni bizga qoldiring — sizga tanlashgina qoladi."
          />
        </motion.div>
        <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          <div
            aria-hidden="true"
            className="absolute top-9 right-[16%] left-[16%] hidden border-t-2 border-dashed md:block"
          />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              {...blurFade}
              transition={{ ...blurFade.transition, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative">
                <span className="grid size-[72px] place-items-center rounded-2xl border border-primary/15 bg-card shadow-xs">
                  <s.icon className="size-7 text-primary" aria-hidden="true" />
                </span>
                <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-gold text-[11px] font-bold text-gold-foreground">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 max-w-xs text-[15px] leading-6 text-muted-foreground">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------- tur paketlar ------------------------------- */

function PopularTours() {
  const [category, setCategory] = useState<CategoryId>("all");
  const counts = useMemo(() => {
    const result: Partial<Record<CategoryId, number>> = { all: TOUR_PACKAGES.length };
    for (const cat of TOUR_CATEGORIES) {
      if (cat.id === "all") {
        continue;
      }
      result[cat.id] = TOUR_PACKAGES.filter((t) => t.category === cat.id).length;
    }
    return result;
  }, []);

  const tours = useMemo(
    () =>
      (category === "all"
        ? TOUR_PACKAGES
        : TOUR_PACKAGES.filter((t) => t.category === category)
      ).slice(0, 6),
    [category],
  );

  return (
    <section id="turlar" className="scroll-mt-24 py-14 lg:py-20">
      <Container>
        <motion.div {...blurFade} className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Tur turkumlari"
            title="Yo'nalish bo'yicha barcha tur paketlar"
            description="Tarixiy shaharlar, ekoturizm, hunarmandchilik, ziyorat va sarguzasht turlari — narxlar to'liq kiritilgan, yashirin to'lov yo'q."
          />
          <Button variant="outline" className="shrink-0" asChild>
            <Link to="/paketlar">
              Barcha paketlar
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>

        <motion.div {...blurFade} className="mt-8">
          <CategoryTabs value={category} onChange={setCategory} counts={counts} />
        </motion.div>

        <Carousel className="mt-8 w-full">
          <CarouselContent className="-ml-4 lg:-ml-6">
            {tours.map((tour) => (
              <CarouselItem
                key={tour.id}
                className="basis-full pl-4 sm:basis-1/2 lg:basis-1/3 lg:pl-6"
              >
                <TourCard tour={tour} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-6 flex justify-center gap-2 sm:justify-end">
            <CarouselPrevious className="static size-11 left-auto translate-y-0 rounded-xl" />
            <CarouselNext className="static size-11 right-auto translate-y-0 rounded-xl" />
          </div>
        </Carousel>
      </Container>
    </section>
  );
}

/* ---------------------------------- xizmatlar ------------------------------- */

const SERVICES = [
  {
    icon: BedDouble,
    title: "Mehmonxona",
    text: "3* dan butik mehmonxonalargacha — bronlar to'g'ridan-to'g'ri egasidan.",
    to: "/xizmatlar?direction=hotel",
  },
  {
    icon: UtensilsCrossed,
    title: "Restoran",
    text: "Milliy taomlar, guruh uchun stol va gastronomik kechalar.",
    to: "/xizmatlar?direction=restaurant",
  },
  {
    icon: UserRound,
    title: "Gid",
    text: "Litsenziyali, tillarni biladigan gidlar — kunlik yoki marshrut bo'yicha.",
    to: "/xizmatlar?direction=guide",
  },
  {
    icon: CarFront,
    title: "Transfer",
    text: "Aeroport, shaharlararo va shahar ichida tashish. Mashina holati kunlik nazoratda.",
    to: "/xizmatlar?direction=transfer",
  },
  {
    icon: Languages,
    title: "Tarjimon",
    text: "Guruh tili bo'yicha tarjimon — kunma-kun vazifa va aniq mas'ul mutaxassis.",
    to: "/xizmatlar?direction=translator",
  },
  {
    icon: Camera,
    title: "Fotograf",
    text: "Professional fotosessiya: lokatsiya, vaqt va tayyor suratlar paketi.",
    to: "/xizmatlar?direction=photographer",
  },
  {
    icon: Ticket,
    title: "Boshqa xizmatlar",
    text: "Sug'urta, chipta, konsulxizmat va turizm sohasidagi boshqa xizmatlar.",
    to: "/xizmatlar?direction=other",
  },
  {
    icon: Store,
    title: "Hunarmandlar bozori",
    text: "Kulolchilik, atlas va zargarlik buyumlari — ustaxonadan to'g'ridan-to'g'ri.",
    to: "/hunarmandlar",
  },
];

function ServicesBand() {
  return (
    <section className="py-14 lg:py-20" aria-label="Xizmat ko'rsatuvchilar">
      <Container>
        <motion.div {...blurFade} className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Xizmatlar"
            title="Sayohatni to'liq jamoa bilan yakunlang"
            description="Mehmonxona, restoran, gid, transfer, tarjimon, fotograf va boshqa turizm xizmatlari — har biri o'z reytingi va tajribasi bilan alohida ko'rsatilgan. Tur dasturiga qo'shish ham, alohida bron qilish ham mumkin."
          />
          <Button variant="outline" className="shrink-0" asChild>
            <Link to="/xizmatlar">
              Barcha mutaxassislar
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.title}
              {...blurFade}
              transition={{ ...blurFade.transition, delay: i * 0.07 }}
            >
              <Link
                to={s.to}
                className="group flex h-full flex-col rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-5 text-muted-foreground">{s.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                  Ko'rish
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* -------------------------------- hunarmandlar ------------------------------- */

function ArtisansTeaser() {
  return (
    <section id="hunarmandlar" className="scroll-mt-24 border-y bg-muted/40 py-14 lg:py-20">
      <Container>
        <motion.div {...blurFade} className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Hunarmandlar bozori"
            title="Ustaxonadan to'g'ridan-to'g'ri sizga"
            description="Rishton likopchasidan Marg'ilon atlasigacha — har bir buyum muallifi ma'lum va eksport hujjatlari bilan yuboriladi."
          />
          <Button variant="outline" className="shrink-0" asChild>
            <Link to="/hunarmandlar">
              Barchasini ko'rish
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {PRODUCTS.slice(0, 4).map((p, i) => (
            <motion.div
              key={p.id}
              {...blurFade}
              transition={{ ...blurFade.transition, delay: i * 0.08 }}
            >
              <Link
                to="/hunarmandlar"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-soft"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={p.image}
                    alt={p.alt}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-[11px] font-semibold tracking-wider text-gold uppercase">
                    {p.category}
                  </p>
                  <h3 className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 font-semibold">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.seller} · {p.city}
                  </p>
                  <p className="mt-auto pt-2.5 text-base font-bold">${p.price}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------- hamkor CTA ------------------------------- */

const PARTNER_PERKS = [
  "millytour_bot orqali 5 daqiqada ro'yxatdan o'tish",
  "Buyurtmalar yo'nalishingizga moslab botga tushadi",
  "Reyting, kalendar va to'lovlar bitta panelda",
  "Oylik obuna: $19 dan boshlab",
];

function PartnerCta() {
  return (
    <section className="py-14 lg:py-20">
      <Container>
        <motion.div
          {...blurFade}
          className="relative overflow-hidden rounded-3xl border bg-primary px-6 py-10 text-white sm:px-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#2563EB] to-[#1F5BFF]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_85%_0%,rgba(255,106,26,0.3),transparent_60%)]" />
          <PatternOverlay tone="gold" opacityClass="opacity-[0.05]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold">
                <BadgeCheck className="size-3.5 text-gold" aria-hidden="true" />
                Gid · Transfer · Tarjimon · Fotograf · Hunarmand · Mehmonxona
              </span>
              <h2 className="mt-5 text-[26px] leading-9 font-bold tracking-tight sm:text-[32px] sm:leading-10">
                Xizmat ko'rsatuvchimisiz? O'z boshqaruv panelingizni oling
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-6 text-white/75">
                Millytour hamkorlari millytour_bot orqali ro'yxatdan o'tadi va yo'nalishiga mos bot
                paneliga ega bo'ladi: buyurtmalar, Milly AI biriktirgan vazifalar, kalendar, reyting
                va to'lovlar — hammasi bitta joyda.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90" asChild>
                  <a href={partnerBotLink()} target="_blank" rel="noreferrer">
                    Hamkor bo'lish
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  asChild
                >
                  <Link to="/partner">Hamkor paneli</Link>
                </Button>
              </div>
            </div>
            <ul className="flex flex-col gap-3">
              {PARTNER_PERKS.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 text-sm"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-eco/20">
                    <Check className="size-3 text-eco" aria-hidden="true" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

function TestimonialsBand() {
  return (
    <section className="border-y bg-[#f7f9fc] py-14 lg:py-20" aria-label="Mijozlar fikri">
      <Container>
        <motion.div {...blurFade} className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Mijozlar fikri"
            title="Safaringizni biz bilan boshlaganlar nima deydi?"
            description="Har bir fikr real tur, real mutaxassis va real taassurotga bog'langan. Sizning sayohatingiz ham shu yerda boshlanadi."
          />
          <div className="inline-flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3">
            <Star className="size-5 fill-gold text-gold" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">4.9 / 5</span>
            <span className="text-xs text-muted-foreground">mijozlar bahosi</span>
          </div>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.slice(0, 3).map((review, index) => (
            <motion.article
              key={review.id}
              {...blurFade}
              transition={{ ...blurFade.transition, delay: index * 0.08 }}
              className="relative flex h-full flex-col rounded-[24px] border border-border/70 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
            >
              <span className="absolute top-4 right-5 text-4xl leading-none font-serif text-primary/15">“</span>
              <div className="flex items-center gap-1" aria-label={`${review.rating} yulduzdan ${review.rating}`}>
                {Array.from({ length: 5 }).map((_, star) => (
                  <Star key={star} className="size-3.5 fill-gold text-gold" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-4 flex-1 text-[14px] leading-6 text-foreground">{review.text}</p>
              <div className="mt-5 flex items-center gap-3 border-t border-border/70 pt-4">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {review.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{review.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{review.country} · {review.tour}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ----------------------------------- page ---------------------------------- */

export default function Landing() {
  return (
    <>
      <Hero />
      {/* Trusted bar */}
      <section className="bg-card py-4">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10"
          >
            {[
              { icon: Sparkles, label: "Samarqand" },
              { icon: Compass, label: "Buxoro" },
              { icon: Star, label: "Xiva" },
              { icon: MapPin, label: "Toshkent" },
              { icon: Ticket, label: "Farg'ona" },
            ].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <item.icon className="size-4 text-primary" aria-hidden="true" />
                {item.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary">
              <Star className="size-4 fill-gold text-gold" aria-hidden="true" />
              4.9 / 5
            </span>
          </motion.div>
        </Container>
      </section>
      <div className="relative z-20 mx-auto -mt-24 w-full max-w-6xl px-4 sm:px-6">
        <SearchPanel />
      </div>
      <div className="h-10 lg:h-14" aria-hidden="true" />
      <Container>
        <ForYouRow />
      </Container>
      <HowItWorks />
      <PopularTours />
      <EventsSection />
      <ServicesBand />
      <ArtisansTeaser />
      <DiscountCardsSection id="chegirma-kartalar" />
      <AiSection />
      <TestimonialsBand />
      <TopDeals />
      <Newsletter />
      <PartnerCta />
    </>
  );
}

/* ------------------------------- Top Deals ------------------------------- */

const DEALS = [TOUR_PACKAGES[0], TOUR_PACKAGES[1], TOUR_PACKAGES[5]];

function TopDeals() {
  return (
    <section className="py-14 lg:py-20" aria-label="TopDeals">
      <Container>
        <motion.div {...blurFade} className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Left banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#2563EB] to-[#1F5BFF] px-8 py-10 text-white sm:px-12">
            <div className="absolute right-0 top-0 h-full w-1/2 opacity-20">
              <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
                <circle cx="140" cy="60" r="30" stroke="white" strokeWidth="2" opacity="0.5" />
                <ellipse cx="140" cy="60" rx="50" ry="14" stroke="white" strokeWidth="1" opacity="0.3" />
                <ellipse cx="140" cy="60" rx="50" ry="14" stroke="white" strokeWidth="1" opacity="0.3" transform="rotate(30 140 60)" />
                <ellipse cx="140" cy="60" rx="50" ry="14" stroke="white" strokeWidth="1" opacity="0.3" transform="rotate(60 140 60)" />
                <path d="M20 180 L100 120 L160 140" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                <path d="M160 140 L180 100 L140 110" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              </svg>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="size-3.5 text-gold" aria-hidden="true" />
              eng arzon
            </span>
            <h2 className="mt-5 max-w-md text-[26px] leading-9 font-extrabold tracking-tight sm:text-[32px] sm:leading-10">
              Top Deals — bugun uchun eng yaxshi takliflar
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-6 text-white/75">
              Samarkand, Bukhara, Xiva va Istanbul — qisqa muddatda, to'liq tarif bilan.
            </p>
            <Button size="lg" className="mt-7 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
              <Link to="/paketlar">
                Barcha takliflar
                <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {/* Right cards */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {DEALS.map((tour, i) => (
              <motion.div
                key={tour.id}
                {...blurFade}
                transition={{ ...blurFade.transition, delay: 0.1 + i * 0.08 }}
              >
                <Link
                  to={`/paketlar/${tour.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-0 transition-all hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={tour.image}
                      alt={tour.alt}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    {tour.badge && (
                      <span className={cn(
                        "absolute top-3 left-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase text-white",
                        tour.badge === "Best Seller" && "bg-primary",
                        tour.badge === "Hot Deal" && "bg-accent",
                        tour.badge === "New" && "bg-[#10B981]",
                      )}>
                        {tour.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {tour.city}
                    </p>
                    <h3 className="mt-1 line-clamp-1 text-[14px] leading-5 font-semibold text-foreground">
                      {tour.title}
                    </h3>
                    <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
                      <div>
                        <p className="text-[15px] font-bold text-primary">${tour.priceFrom}</p>
                        {tour.oldPrice && (
                          <p className="text-[11px] text-muted-foreground line-through">${tour.oldPrice}</p>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-gold">{'★'.repeat(Math.round(tour.rating))}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

/* ------------------------------ Newsletter ------------------------------- */

function Newsletter() {
  return (
    <section className="py-14 lg:py-20" aria-label="Obuna">
      <Container>
        <motion.div
          {...blurFade}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-[#2563EB] px-6 py-12 text-white sm:px-14"
        >
          <div className="absolute right-0 top-0 h-full w-2/5 opacity-20">
            <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
              <path d="M100 180 C80 140 60 100 80 60 C100 20 140 30 160 60 C180 90 160 140 100 180Z" fill="white" opacity="0.3" />
              <path d="M100 180 C120 140 140 100 120 60" stroke="white" strokeWidth="3" opacity="0.3" />
              <path d="M100 60 L100 20" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
              <ellipse cx="100" cy="20" rx="15" ry="8" stroke="white" strokeWidth="2" opacity="0.3" />
            </svg>
          </div>
          <div className="relative max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="size-3.5 text-gold" aria-hidden="true" />
              Yangiliklar
            </span>
            <h2 className="mt-5 text-[26px] leading-9 font-extrabold tracking-tight sm:text-[32px] sm:leading-10">
              Sayohat anburlarining oldini oling
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-white/75">
              To'lov oldindan, maxsus takliflar va yangi yo'nalishlar — faqat emailingizga.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-7 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                placeholder="Sizning emailingiz"
                className="flex-1 rounded-full border-0 bg-white px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <Button type="submit" size="lg" className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
                Obuna bo'lish
              </Button>
            </form>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
