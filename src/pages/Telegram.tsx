import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { Bot, Loader2, Send, ShieldCheck, Sparkles, Smartphone } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container, PageHero } from "@/components/site";
import { AiAssistant } from "@/components/AiAssistant";
import { useAuth } from "@/hooks/use-auth";

type TelegramWebApp = {
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string; username?: string } };
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
};

/**
 * Telegram mini app kirish nuqtasi. Ilova Telegram ichida ochilganda
 * foydalanuvchi ma'lumotlari ko'rsatiladi va sayt hisobi bir bosishda ulanadi.
 */
export default function Telegram() {
  const config = useQuery(api.telegram.config);
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(() =>
    typeof window === "undefined"
      ? null
      : ((window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ??
        null),
  );
  const [joining, setJoining] = useState(false);

  /** Mini app rejimi: ?miniapp=1 — sahifa faqat Milly AI'ni markazda ko'rsatadi. */
  const isMiniApp =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("miniapp") === "1";

  useEffect(() => {
    if (webApp) {
      webApp.ready?.();
      webApp.expand?.();
      webApp.setHeaderColor?.("#0B1220");
      return;
    }
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => {
      const app = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
        ?.WebApp;
      if (app) {
        app.ready?.();
        setWebApp(app);
      }
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [webApp]);

  const telegramUser = webApp?.initDataUnsafe?.user;

  if (isMiniApp) {
    return <AiAssistant />;
  }

  const continueInTelegram = async () => {
    setJoining(true);
    try {
      if (!isAuthenticated) {
        await signIn("anonymous");
      }
      toast.success("Mini app hisobi ulandi");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kirish amalga oshmadi");
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Telegram mini app"
        title="Millytour'ga Telegram orqali kiring"
        description="Ilovani ochish uchun telefon kerak emas: bot ichidagi mini app orqali buyurtmalar, vaucherlar va AI dasturlar bir bosishda ochiladi."
      >
        <div className="flex flex-wrap gap-2">
          {[
            { icon: Smartphone, label: "Mini app" },
            { icon: ShieldCheck, label: "Xavfsiz kirish" },
            { icon: Sparkles, label: "AI Planner ichida" },
          ].map((b) => (
            <span
              key={b.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90"
            >
              <b.icon className="size-3.5 text-gold" aria-hidden="true" />
              {b.label}
            </span>
          ))}
        </div>
      </PageHero>

      <Container className="py-12 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="border-border/70">
            <CardContent className="py-6">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <Bot className="size-4 text-primary" aria-hidden="true" />
                {telegramUser ? "Telegram akkaunt aniqlandi" : "Telegram ichida oching"}
              </p>
              {telegramUser ? (
                <>
                  <p className="mt-3 text-[15px] font-semibold text-foreground">
                    {telegramUser.first_name} {telegramUser.last_name}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {telegramUser.username ? `@${telegramUser.username}` : "username yo'q"}
                  </p>
                  <Button
                    className="mt-5"
                    size="lg"
                    disabled={joining}
                    onClick={continueInTelegram}
                  >
                    {joining ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      "Kabinetga o'tish"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
                    Bu sahifa Telegram mini app sifatida ishlaydi. Botni oching va «Kabinet» tugmasini
                    bosing — hisob avtomatik ulanadi. Sayt orqali kirish uchun email manzilingiz
                    yetarli.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild>
                      <a
                        href={config?.mainDeepLink ?? "https://t.me/millytour_bot"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Send className="size-4" aria-hidden="true" />
                        Asosiy botni ochish
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/auth">Sayt orqali kirish</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border-border/70">
              <CardContent className="py-6">
                <p className="text-sm font-semibold text-foreground">Bot ichidagi imkoniyatlar</p>
                <ul className="mt-3 flex flex-col gap-2 text-[13px] text-muted-foreground">
                  <li>• Tur paketlarni turkum bo'yicha ko'rish va bron qilish</li>
                  <li>• AI Planner bilan 30 soniyada dastur tuzish</li>
                  <li>• Buyurtma holati, elektron vaucher va to'lov tarixi</li>
                  <li>• Interfeys tili: UZ / RU / EN</li>
                  <li>• Hamkorlar uchun buyurtmalar, kalendar va reyting</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardContent className="py-6">
                <p className="text-sm font-semibold text-foreground">Ikkita bot</p>
                <ul className="mt-3 flex flex-col gap-3 text-[13px]">
                  <li className="rounded-xl border bg-background p-3">
                    <p className="font-semibold text-foreground">Asosiy bot — turistlar uchun</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Katalog, AI Planner, buyurtmalar va mini app kirish.
                    </p>
                  </li>
                  <li className="rounded-xl border bg-background p-3">
                    <p className="font-semibold text-foreground">Auth bot — hamkorlar uchun</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Gid, transfer, hunarmand va mehmonxona egalari shu yerda ro'yxatdan o'tadi va
                      o'z panelini boshqaradi.
                    </p>
                  </li>
                </ul>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/hamkorlar">Hamkorlik haqida</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}
