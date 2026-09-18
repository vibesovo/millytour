import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import {
  BedDouble,
  ChevronDown,
  Compass,
  Home,
  MapPin,
  Menu,
  Send,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  UtensilsCrossed,
  Camera,
  CarFront,
  Languages,
  UserRoundCheck,
} from "lucide-react";
import { partnerBotLink } from "@/data/catalog";
import { CurrencySwitcher } from "@/lib/currency";
import { LangSwitcher, useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MillytourLogo, PatternOverlay } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AuthChoiceDialog } from "@/components/AuthChoiceDialog";

/* ---------------------------------- layout --------------------------------- */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>
  );
}

export const NAV = [
  { label: "Bosh sahifa", to: "/" },
  { label: "Tur paketlar", to: "/paketlar" },
  { label: "Xizmatlar", to: "/xizmatlar" },
  { label: "Hunarmandlar", to: "/hunarmandlar" },
];

/** Dropdown'da ko'rinadigan xizmatlar — har biri alohida sahifa/filtrlarga olib boradi. */
/**
 * Har bir yozuv o'z xizmatining to'liq sahifasini ochadi
 * (`/xizmatlar/mehmonxona`, `/xizmatlar/gid`, ...).
 */
const SERVICE_LINKS = [
  { label: "Mehmonxona", desc: "3* dan milliy hovligacha", icon: BedDouble, to: "/xizmatlar/mehmonxona" },
  { label: "Restoran", desc: "Milliy taomlar va guruh stollari", icon: UtensilsCrossed, to: "/xizmatlar/restoran" },
  { label: "Gid", desc: "Litsenziyali, tillarni biladigan gidlar", icon: UserRoundCheck, to: "/xizmatlar/gid" },
  { label: "Transfer", desc: "Aeroport, shaharlararo tashish", icon: CarFront, to: "/xizmatlar/transfer" },
  { label: "Tarjimon", desc: "Guruh tili bo'yicha tarjimon", icon: Languages, to: "/xizmatlar/tarjimon" },
  { label: "Fotograf", desc: "Professional fotosessiya", icon: Camera, to: "/xizmatlar/fotograf" },
  { label: "Sug'urta, chipta, konsulxizmat", desc: "Qo'shimcha turizm xizmatlari", icon: Ticket, to: "/xizmatlar/boshqa" },
  { label: "Hunarmandlar bozori", desc: "Kulolchilik, atlas, zargarlik", icon: Store, to: "/hunarmandlar" },
];

function ServiceNavDropdown() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 220);
  };

  // Sahifa almashganda yoki komponent olib tashlanganda taymer qolib ketmasin.
  useEffect(() => cancelClose, []);

  return (
    /*
     * `modal={false}` muhim: Radix sukut bo'yicha modal rejimda `body`ga
     * scroll-lock qo'yadi — sichqoncha menyu ustiga borganda scrollbar
     * yo'qolib, sahifa «qayta yuklanayotgandek» siljib ketadi. Shu bilan
     * birga, `onCloseAutoFocus` bekor qilingan — aks holda menyu yopilganda
     * fokus trigger'ga qaytib, sahifa sakraydi.
     */
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        className={cn(
          "group inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors",
          "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted",
          "data-[state=open]:bg-muted data-[state=open]:text-foreground",
        )}
      >
        {t("nav_services")}
        <ChevronDown
          className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-[360px] rounded-2xl border-border/80 p-2"
      >
        <DropdownMenuLabel className="px-2.5 py-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          {t("menu_label")}
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1 sm:max-lg:grid-cols-1">
          {SERVICE_LINKS.map((s) => (
            <DropdownMenuItem key={s.label} asChild>
              <Link
                to={s.to}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-foreground">{s.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s.desc}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem asChild>
          <Link
            to="/xizmatlar"
            className="flex items-center justify-between rounded-lg px-2.5 py-2.5 text-[13px] font-semibold text-primary outline-none transition-colors hover:bg-primary/8 focus-visible:bg-primary/8"
          >
            {t("menu_all")}
            <Sparkles className="size-3.5" aria-hidden="true" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { t } = useLang();
  const cabinet = user?.role === "admin" ? "/admin" : "/dashboard";

  const navLinks = [
    { label: t("nav_home"), to: "/" },
    { label: t("nav_packages"), to: "/paketlar" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link to="/" aria-label="millytour — bosh sahifa" className="shrink-0">
          <MillytourLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Asosiy menyu">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <ServiceNavDropdown />
          <NavLink
            to="/hunarmandlar"
            className={({ isActive }) =>
              cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/8 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            {t("nav_market")}
          </NavLink>
        </nav>

        <div className="flex items-center gap-1.5">
          <CurrencySwitcher className="hidden sm:inline-flex" />
          <LangSwitcher />
          {isAuthenticated ? (
            <Button size="sm" className="hidden sm:inline-flex" asChild>
              <Link to={cabinet}>{user?.role === "admin" ? t("nav_admin") : t("nav_account")}</Link>
            </Button>
          ) : (
            <>
              <AuthChoiceDialog
                trigger={<Button variant="ghost" size="sm" className="hidden sm:inline-flex">{t("nav_signin")}</Button>}
              />
              <Button size="sm" className="hidden sm:inline-flex" asChild>
                <a href={partnerBotLink()} target="_blank" rel="noreferrer">
                  {t("nav_partners")}
                </a>
              </Button>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Menyuni ochish"
              >
                <Menu className="size-4" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <MillytourLogo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 overflow-y-auto px-4" aria-label="Mobil menyu">
                {[...navLinks, { label: t("nav_market"), to: "/hunarmandlar" }].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-2.5 text-[15px] font-medium",
                        isActive ? "bg-primary/8 text-primary" : "hover:bg-muted",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <p className="mt-3 px-3 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  {t("nav_services")}
                </p>
                {SERVICE_LINKS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={s.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-medium hover:bg-muted"
                  >
                    <s.icon className="size-4 text-primary" aria-hidden="true" />
                    {s.label}
                  </NavLink>
                ))}
                <NavLink
                  to="/xizmatlar"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-primary hover:bg-primary/8"
                >
                  {t("menu_all")}
                </NavLink>
                <p className="mt-3 px-3 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Boshqa
                </p>
                <NavLink
                  to="/hamkorlar"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2.5 text-[15px] font-medium",
                      isActive ? "bg-primary/8 text-primary" : "hover:bg-muted",
                    )
                  }
                >
                  Hamkorlik
                </NavLink>
              </nav>
              <div className="mt-auto flex flex-col gap-2 p-4">
                {isAuthenticated ? (
                  <Button size="lg" asChild onClick={() => setOpen(false)}>
                    <Link to={cabinet}>{user?.role === "admin" ? "Admin panel" : "Kabinetim"}</Link>
                  </Button>
                ) : (
                  <>
                    <AuthChoiceDialog
                      trigger={<Button size="lg" onClick={() => setOpen(false)}>{t("cta_login_register")}</Button>}
                    />
                    <Button size="lg" variant="outline" asChild onClick={() => setOpen(false)}>
                      <a href={partnerBotLink()} target="_blank" rel="noreferrer">
                        Hamkorlik — mtour_auth_bot
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}

/**
 * Mobilda ilovaga o'xshash pastki navigatsiya (App Store/Play uchun
 * tayyorlanayotgan versiyada ham shu tuzilma ishlatiladi).
 */
export function BottomNav() {
  const { isAuthenticated, user } = useAuth();
  const cabinet = user?.role === "admin" ? "/admin" : "/dashboard";

  const items: { to: string; label: string; icon: React.ElementType; primary?: boolean }[] = [
    { to: "/", label: "Asosiy", icon: Home },
    { to: "/paketlar", label: "Paketlar", icon: Compass },
    { to: "/xizmatlar", label: "Xizmatlar", icon: Sparkles, primary: true },
    { to: "/hunarmandlar", label: "Bozor", icon: Store },
    {
      to: isAuthenticated ? cabinet : "/auth",
      label: isAuthenticated ? "Kabinet" : "Kirish",
      icon: UserRound,
    },
  ];

  return (
    <nav
      aria-label="Ilova menyusi"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl transition-colors",
                    item.primary
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/10"
                        : "bg-transparent",
                  )}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

const FOOTER_COLS = [
  {
    title: "Sayohat",
    links: [
      { label: "Tur paketlar", to: "/paketlar" },
      { label: "Hunarmandlar", to: "/hunarmandlar" },
      { label: "Kabinetim", to: "/dashboard" },
    ],
  },
  {
    title: "Xizmatlar",
    links: [
      { label: "Mehmonxona", to: "/xizmatlar/mehmonxona" },
      { label: "Restoran", to: "/xizmatlar/restoran" },
      { label: "Gid", to: "/xizmatlar/gid" },
      { label: "Transfer", to: "/xizmatlar/transfer" },
      { label: "Tarjimon", to: "/xizmatlar/tarjimon" },
      { label: "Fotograf", to: "/xizmatlar/fotograf" },
      { label: "Boshqa xizmatlar", to: "/xizmatlar/boshqa" },
    ],
  },
  {
    title: "Hamkorlarga",
    links: [
      { label: "Hamkorlik shartlari", to: "/hamkorlar" },
      { label: "Hamkor paneli", to: "/partner" },
    ],
  },
];

const PAYMENTS = ["Click", "Payme", "UZCARD", "VISA"];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#0B1220] text-white/70">
      <PatternOverlay opacityClass="opacity-[0.04]" />
      <Container className="relative py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <MillytourLogo mono />
            <p className="mt-3 max-w-xs text-[13px] leading-5 text-white/60">
              O'zbekiston bo'ylab sayohat: paketlar, xizmatlar va hunarmandchilik — bitta
              platformada.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[13px] transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="text-sm font-semibold text-white">Aloqa</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-white/50" aria-hidden="true" />
                Toshkent, Amir Temur shoh ko'chasi 108
              </li>
              <li>
                <a href="tel:+998712007070" className="hover:text-white">
                  +998 71 200 70 70
                </a>
              </li>
              <li>
                <a href="mailto:salam@millytour.uz" className="hover:text-white">
                  salam@millytour.uz
                </a>
              </li>
              <li className="flex items-center gap-1.5 text-white/50">
                <Send className="size-3.5" aria-hidden="true" />
                Telegram: @mtour_auth_bot
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row">
          <p className="text-xs text-white/50">© 2026 millytour. Barcha huquqlar himoyalangan.</p>
          <div className="flex items-center gap-2">
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/80"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main key={location.pathname} className="page-enter flex-1 pb-20 lg:pb-0">
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}

/* -------------------------------- page hero -------------------------------- */

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#0B1220] text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220] via-[#12306B] to-[#1E40AF]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_-10%,rgba(245,158,11,0.24),transparent_60%)]" />
      <PatternOverlay tone="gold" opacityClass="opacity-[0.06]" />
      <Container className="relative py-8 lg:py-12">
        {eyebrow && (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 max-w-3xl text-[23px] leading-8 font-bold tracking-tight sm:text-[30px] sm:leading-9">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-white/75">
            {description}
          </p>
        )}
        {children && <div className="mt-5">{children}</div>}
      </Container>
    </section>
  );
}
