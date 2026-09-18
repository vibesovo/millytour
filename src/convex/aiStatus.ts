import { query } from "./_generated/server";

/**
 * Milly AI holati — interfeys "Onlayn" yoki "Tezkor rejim" yozuvini shu
 * javobga qarab ko'rsatadi (yolg'on "onlayn" yozuvi qolmasin).
 *
 * `query` faqat Node.js bo'lmagan kontekstda bo'lishi mumkin, shuning uchun
 * bu funksiya `millyChat.ts` ("use node") dan alohida faylga ko'chirilgan.
 * Provayder aniqlash mantiqi `lib/ai.ts` bilan bir xil — kalit bor-yo'qligini
 * tekshiradi va xuddi shu model nomlarini qaytaradi.
 */

type AiProvider = "gemini" | "groq" | "openai" | "custom" | "vly" | "none";

function aiProviderName(): AiProvider {
  const pin = process.env.AI_PROVIDER;
  const allowed = (name: Exclude<AiProvider, "none">) => !pin || pin === name;
  if (process.env.GOOGLE_API_KEY && allowed("gemini")) return "gemini";
  if (process.env.GROQ_API_KEY && allowed("groq")) return "groq";
  if ((process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL) && allowed("openai")) {
    const base = process.env.OPENAI_BASE_URL;
    return base && !base.includes("api.openai.com") ? "custom" : "openai";
  }
  if (process.env.VLY_INTEGRATION_KEY && allowed("vly")) return "vly";
  return "none";
}

export const status = query({
  args: {},
  handler: () => {
    const provider = aiProviderName();
    const model =
      provider === "gemini"
        ? (process.env.GEMINI_MODEL ?? "gemini-2.5-flash")
        : provider === "groq"
          ? (process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile")
          : provider === "custom"
            ? `${process.env.OPENAI_MODEL ?? "gpt-4o-mini"} @ ${process.env.OPENAI_BASE_URL}`
            : provider === "openai"
              ? (process.env.OPENAI_MODEL ?? "gpt-4o-mini")
              : provider === "vly"
                ? "vly-managed"
                : "qoidaga asoslangan zaxira";
    return {
      provider,
      model,
      ready: provider !== "none",
      languages: ["uz", "ru", "en"],
      abilities: [
        "onboarding",
        "tours",
        "services",
        "booking",
        "payment",
        "tracking",
        "discount",
        "plan",
      ],
    };
  },
});
