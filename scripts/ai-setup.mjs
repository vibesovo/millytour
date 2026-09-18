#!/usr/bin/env node
/**
 * Milly AI — bepul hosted model kalitini bitta buyruq bilan ulash.
 *
 *   npm run ai:setup                 # interaktiv: provayder va kalitni so'raydi
 *   npm run ai:setup -- groq gsk_xx  # to'g'ridan-to'g'ri
 *
 * Nega model fayli emas, kalit? Loyiha backend'i Convex serverless'da
 * ishlaydi — u yerda bir necha GB'lik model vaznini saqlab ham, GPU ushlab
 * ham bo'lmaydi. Shuning uchun bepul hosted API ishlatiladi: kod allaqachon
 * tayyor (`src/convex/lib/ai.ts`), faqat kalit kerak.
 */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const PROVIDERS = {
  groq: {
    label: "Groq (bepul tarif, juda tez)",
    url: "https://console.groq.com/keys",
    env: (key) => ({ GROQ_API_KEY: key, GROQ_MODEL: "qwen/qwen3.8-27b" }),
  },
  gemini: {
    label: "Google Gemini (bepul tarif, kuchli ko'p tilli)",
    url: "https://aistudio.google.com/apikey",
    env: (key) => ({ GOOGLE_API_KEY: key, GEMINI_MODEL: "gemini-2.5-flash" }),
  },
};

/** `npx` Windows'da `npx.cmd` — shell'siz ishga tushirish uchun. */
function run(command, args) {
  const bin = process.platform === "win32" ? `${command}.cmd` : command;
  return spawnSync(bin, args, { stdio: "inherit" });
}

const rl = createInterface({ input: stdin, output: stdout });
let [providerArg, keyArg] = process.argv.slice(2);

if (!providerArg) {
  process.stdout.write("Qaysi bepul modelni ulaymiz?\n\n");
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    process.stdout.write(`  ${id.padEnd(8)} — ${provider.label}\n`);
    process.stdout.write(`             kalit olish: ${provider.url}\n`);
  }
  providerArg = (await rl.question("\nProvayder (groq/gemini): ")).trim().toLowerCase();
}

const provider = PROVIDERS[providerArg];
if (!provider) {
  process.stderr.write(`\nNoma'lum provayder: "${providerArg}". Mavjudlari: groq, gemini.\n`);
  rl.close();
  process.exit(1);
}

if (!keyArg) {
  process.stdout.write(`\nKalit olish: ${provider.url}\n`);
  keyArg = (await rl.question("API kalitni shu yerga qo'ying: ")).trim();
}
rl.close();

if (!keyArg) {
  process.stderr.write("\nKalit kiritilmadi — hech narsa o'zgartirilmadi.\n");
  process.exit(1);
}

process.stdout.write(`\n${provider.label} → Convex deployment'iga yozilmoqda…\n\n`);

let failed = 0;
for (const [name, value] of Object.entries(provider.env(keyArg))) {
  const result = run("npx", ["convex", "env", "set", name, value]);
  if (result.status !== 0) {
    failed += 1;
  }
  process.stdout.write(`  ${result.status === 0 ? "✓" : "✗"} ${name}\n`);
}

if (failed > 0) {
  process.stderr.write(
    "\nXatolik. Convex deployment bog'langanini tekshiring: `npx convex dev` " +
      "bir marta ishlagan bo'lishi kerak.\n",
  );
  process.exit(1);
}

process.stdout.write(
  `\n✔ Tayyor — Milly AI endi ${providerArg} modelida javob beradi.\n` +
    "  Tekshirish: saytni ochib Milly AI'ga yozing, yoki `npx convex env list`.\n",
);
