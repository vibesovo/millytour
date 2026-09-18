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
  Languages,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  Users,
  UtensilsCrossed,
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
import { EventsSection } from "@/components/events";
import { ForYouRow } from "@/components/for-you";
import {
  CITIES,
  DURATIONS,
  PRODUCTS,
  TOUR_CATEGORIES,
  TOUR_PACKAGES,
  partnerBotLink,
  type CategoryId,
} from "@/data/catalog";

const blurFade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

/* ----------------------------------- hero ---------------------------------- */

/** Registon silueti — fotosurat o'rniga nozik vektor fon. */
function SkylineSilhouette() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 220"
      className="absolute inset-x-0 bottom-0 h-40 w-full text-white/10 sm:h-52"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M0 220v-40h120l30-26h60l30 26h150l40-34h90l40 34h170l34-30h80l34 30h160l44-38h96l44 38h120v40" />
      <path d="M180 154c0-30 24-54 54-54s54 24 54 54" />
      <path d="M560 156c0-34 27-62 60-62s60 28 60 62" />
      <path d="M900 150c0-28 22-50 50-50s50 22 50 50" />
      <path d="M234 100V74m0-26v-8m386 78V92m0-30V54" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0B1220] text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220] via-[#12306B] to-[#1E40AF]" />
      <PatternOverlay tone="gold" opacityClass="opacity-[0.05]" />
      <SkylineSilhouette />

      <Container className="relative flex flex-col items-center pt-16 pb-32 text-center sm:pt-20 lg:pb-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-w-3xl flex-col items-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-gold" aria-hidden="true" />
            O'zbekiston — Buyuk Ipak yo'lining yuragi
          </span>
          <h1 className="mt-6 text-[32px] leading-[40px] font-bold tracking-tight sm:text-[46px] sm:leading-[54px]">
            O'zbekiston bo'ylab shaxsiy sayohatingizni yarating
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-6 text-white/75 sm:text-lg sm:leading-7">
            Tasdiqlangan tur paketlar, Milly AI tuzgan shaxsiy dastur va mahalliy mutaxassislar
            (gid, transfer, mehmonxona, tarjimon, fotograf) — bitta joyda.
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" className="px-8" asChild>
              <Link to="/paketlar">Tur paketlarni ko'rish</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/10 px-8 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
              asChild
            >
              <Link to="/xizmatlar">
                Xizmatlarni ko'rish
                <ArrowRight className="size-4" aria-hidden="true" />
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

  return (
    <section id="qidiruv" aria-label="Sayohat qidiruvi">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const params = new URLSearchParams();
          if (category !== "all") {
            params.set("category", category);
          }
          const city = String(form.get("city") ?? "");
          const days = String(form.get("days") ?? "");
          const guests = String(form.get("guests") ?? "");
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
        className="rounded-2xl border bg-card p-3 shadow-lifted sm:p-4"
      >
        <CategoryTabs value={category} onChange={setCategory} className="mb-3" />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
          <SearchField label="Shahar" icon={MapPin}>
            <select name="city" defaultValue={CITIES[1]} className={selectCls}>
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
            <select name="days" defaultValue={DURATIONS[1]} className={selectCls}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </SearchField>
          <SearchField label="Odam soni" icon={Users}>
            <select name="guests" defaultValue="2" className={selectCls}>
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs font-semibold text-muted-foreground">Qo'shimcha xizmatlar:</span>
          {SERVICE_SHORTCUTS.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
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
  "mtour_auth_bot orqali 5 daqiqada ro'yxatdan o'tish",
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
          className="relative overflow-hidden rounded-3xl border bg-[#0B1220] px-6 py-10 text-white sm:px-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220] via-[#12306B] to-[#1E40AF]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_85%_0%,rgba(245,158,11,0.25),transparent_60%)]" />
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
                Millytour hamkorlari mtour_auth_bot orqali ro'yxatdan o'tadi va yo'nalishiga mos bot
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

/* ----------------------------------- page ---------------------------------- */

export default function Landing() {
  return (
    <>
      <Hero />
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
      <PartnerCta />
    </>
  );
}
