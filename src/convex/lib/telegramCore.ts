import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Telegram Bot API bilan ishlash uchun yordamchi qatlam.
 * Tokenlar muhit o'zgaruvchilaridan (KEYS paneli) yoki administrator
 * panelidan saqlangan sozlamalardan olinadi.
 *
 * Botlar:
 *   - main  — turistlar boti (buyurtmalar, Milly AI, kuzatuv)
 *   - auth  — hamkorlar boti (mutaxassis ro'yxatdan o'tishi)
 *   - stats — owner uchun statistika boti (faqat egasi kuzatadi)
 */

export type BotName = "main" | "auth" | "stats";

export type TgButton = { label: string; action: string };

export const BOT_ENV_KEYS: Record<BotName, string> = {
  main: "TELEGRAM_MAIN_BOT_TOKEN",
  auth: "TELEGRAM_AUTH_BOT_TOKEN",
  stats: "TELEGRAM_STATS_BOT_TOKEN",
};

export function envToken(bot: BotName) {
  return bot === "main"
    ? process.env.TELEGRAM_MAIN_BOT_TOKEN
    : bot === "stats"
      ? process.env.TELEGRAM_STATS_BOT_TOKEN
      : process.env.TELEGRAM_AUTH_BOT_TOKEN;
}

export async function storedTokens(ctx: MutationCtx | QueryCtx) {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "botTokens"))
    .first();
  return (row?.value ?? {}) as { main?: string; auth?: string; stats?: string };
}

export async function resolveToken(ctx: MutationCtx | QueryCtx, bot: BotName) {
  const fromEnv = envToken(bot);
  if (fromEnv) {
    return fromEnv;
  }
  const stored = await storedTokens(ctx);
  return bot === "main" ? stored.main : bot === "stats" ? stored.stats : stored.auth;
}

export function inlineKeyboard(rows: TgButton[][]) {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((button) => ({ text: button.label, callback_data: button.action })),
    ),
  };
}

export async function tgCall<T = unknown>(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; result?: T; description?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as { ok: boolean; result?: T; description?: string };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : "network error" };
  }
}

export function money(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}
