import { createVlyIntegrations } from "@vly-ai/integrations";

/**
 * Yagona AI ko'prigi — butun loyiha (Milly AI chat, tur dasturi generatori)
 * shu funksiya orqali modelga murojaat qiladi.
 *
 * Provayder zanjiri (birinchi mavjud kalit ishlatiladi):
 *   1. GOOGLE_API_KEY   — Google AI Studio / Gemini (bepul tarif, kuchli ko'p tilli)
 *   2. GROQ_API_KEY     — Groq Cloud (bepul tarif, juda tez)
 *   3. OPENAI_API_KEY   — OpenAI yoki OPENAI_BASE_URL bilan ISTALGAN
 *                         OpenAI-mos bepul model (OpenRouter, Cerebras, Ollama...)
 *   4. VLY_INTEGRATION_KEY — platformaning boshqariladigan AI'si
 * Hech biri sozlanmagan bo'lsa `ok: false` qaytadi va chaqiruvchi tomon
 * qoidaga asoslangan zaxira javobni ishlatadi.
 *
 * Bepul modelni ulashning eng qisqa yo'li (Convex env):
 *   OPENAI_BASE_URL=https://api.groq.com/openai/v1
 *   OPENAI_API_KEY=<bepul Groq kaliti>
 *   OPENAI_MODEL=llama-3.3-70b-versatile
 *
 * yoki OpenRouter'ning bepul modellari bilan:
 *   OPENAI_BASE_URL=https://openrouter.ai/api/v1
 *   OPENAI_MODEL=meta-llama/llama-3.3-70b-instruct:free
 *
 * Bitta provayderni majburlash: AI_PROVIDER=gemini | groq | openai | vly
 */

export type AiProvider = "gemini" | "groq" | "openai" | "custom" | "vly" | "none";

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiResult = { ok: boolean; content: string | null; provider: AiProvider };

const geminiModel = () => process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const groqModel = () => process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b";
const openaiModel = () => process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/**
 * OpenAI-mos asosiy manzil. `OPENAI_BASE_URL` berilsa — istalgan bepul
 * provayder shu bitta o'zgaruvchi bilan ulanadi (kod o'zgarmaydi).
 */
function openaiBaseUrl() {
  return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
}

/** Manzil OpenAI'niki bo'lmasa — bu "custom" (masalan Groq/OpenRouter/Ollama) ulanish. */
function isCustomEndpoint() {
  const base = process.env.OPENAI_BASE_URL;
  return Boolean(base && !base.includes("api.openai.com"));
}

/** AI_PROVIDER berilgan bo'lsa faqat shu provayder sinaladi. */
function providerAllowed(name: Exclude<AiProvider, "none" | "custom">) {
  const pin = process.env.AI_PROVIDER;
  return !pin || pin === name;
}

/** Google Gemini (generativelanguage REST). */
async function askGemini(
  key: string,
  system: string,
  messages: AiMessage[],
  temperature: number,
  maxTokens: number,
  json: boolean,
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null;
}

/** OpenAI-mos API (Groq va OpenAI uchun bir xil shakl). */
async function askOpenAiCompatible(
  endpoint: string,
  key: string,
  model: string,
  system: string,
  messages: AiMessage[],
  temperature: number,
  maxTokens: number,
  json: boolean,
): Promise<string | null> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

export async function askAi(opts: {
  system: string;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}): Promise<AiResult> {
  const { system, messages } = opts;
  const temperature = opts.temperature ?? 0.6;
  const maxTokens = opts.maxTokens ?? 900;
  const json = opts.json ?? false;

  const attempts: { provider: AiProvider; run: () => Promise<string | null> }[] = [];

  const google = process.env.GOOGLE_API_KEY;
  if (google && providerAllowed("gemini")) {
    attempts.push({
      provider: "gemini",
      run: () => askGemini(google, system, messages, temperature, maxTokens, json),
    });
  }

  const groq = process.env.GROQ_API_KEY;
  if (groq && providerAllowed("groq")) {
    attempts.push({
      provider: "groq",
      run: () =>
        askOpenAiCompatible(
          "https://api.groq.com/openai/v1/chat/completions",
          groq,
          groqModel(),
          system,
          messages,
          temperature,
          maxTokens,
          json,
        ),
    });
  }

  // OpenAI yoki OPENAI_BASE_URL orqali ulangan istalgan bepul model.
  // Mahalliy (Ollama) manzillar kalit talab qilmaydi — shuning uchun zaxira
  // qiymat ishlatiladi.
  const openai = process.env.OPENAI_API_KEY;
  const hasCustomBase = Boolean(process.env.OPENAI_BASE_URL);
  if ((openai || hasCustomBase) && providerAllowed("openai")) {
    const custom = isCustomEndpoint();
    attempts.push({
      provider: custom ? "custom" : "openai",
      run: () =>
        askOpenAiCompatible(
          `${openaiBaseUrl()}/chat/completions`,
          openai ?? "not-needed",
          openaiModel(),
          system,
          messages,
          temperature,
          maxTokens,
          json,
        ),
    });
  }

  const vlyToken = process.env.VLY_INTEGRATION_KEY;
  if (vlyToken && providerAllowed("vly")) {
    attempts.push({
      provider: "vly",
      run: async () => {
        const vly = createVlyIntegrations({ deploymentToken: vlyToken });
        const response = await vly.ai.completion({
          model: openaiModel(),
          temperature,
          maxTokens,
          messages: [{ role: "system", content: system }, ...messages],
        });
        if (!response.success) {
          return null;
        }
        return response.data?.choices?.[0]?.message?.content ?? null;
      },
    });
  }

  for (const attempt of attempts) {
    try {
      const content = await attempt.run();
      if (content && content.trim()) {
        return { ok: true, content: content.trim(), provider: attempt.provider };
      }
    } catch (error) {
      console.warn(`[ai:${attempt.provider}] javob bermadi:`, error);
    }
  }

  return { ok: false, content: null, provider: "none" };
}

/**
 * Qaysi provayder ishlatilishini aytadi (admin panel, holat ko'rsatkichi va
 * xato xabarlari uchun). `askAi` bilan bir xil tartibda tekshiradi.
 */
export function aiProviderName(): AiProvider {
  if (process.env.GOOGLE_API_KEY && providerAllowed("gemini")) return "gemini";
  if (process.env.GROQ_API_KEY && providerAllowed("groq")) return "groq";
  if ((process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL) && providerAllowed("openai")) {
    return isCustomEndpoint() ? "custom" : "openai";
  }
  if (process.env.VLY_INTEGRATION_KEY && providerAllowed("vly")) return "vly";
  return "none";
}

/** Holat ko'rsatkichi uchun qisqa ma'lumot: provayder, model va tayyorlik. */
export function aiStatus(): { provider: AiProvider; model: string; ready: boolean } {
  const provider = aiProviderName();
  const model =
    provider === "gemini"
      ? geminiModel()
      : provider === "groq"
        ? groqModel()
        : provider === "custom"
          ? `${openaiModel()} @ ${openaiBaseUrl()}`
          : provider === "openai"
            ? openaiModel()
            : provider === "vly"
              ? "vly-managed"
              : "qoidaga asoslangan zaxira";
  return { provider, model, ready: provider !== "none" };
}
