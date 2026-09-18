"use node";

import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { askAi } from "./lib/ai";
import {
  buildRuleBasedPlans,
  normalizeAnswers,
  TOUR_SLUG_HINT,
  type Plan,
} from "../lib/planner";

/**
 * AI Planner: modeldan ikki xil dastur varianti so'raydi (1-variant komfort,
 * 2-variant tejamkor). Model javob bermasa yoki kalit sozlanmagan bo'lsa,
 * qoidaga asoslangan generator ikkita variantni o'zi tuzadi.
 */
export const generate = action({
  args: {
    sessionKey: v.string(),
    answers: v.any(),
  },
  handler: async (
    ctx,
    { answers, sessionKey },
  ): Promise<{ planId: Id<"plans">; options: Plan[]; engine: "ai" | "rule-based" }> => {
    const normalized = normalizeAnswers(answers);
    let options: Plan[] = buildRuleBasedPlans(normalized);
    let engine: "ai" | "rule-based" = "rule-based";

    const ask = await askAi({
      temperature: 0.5,
      maxTokens: 3600,
      json: true,
      system:
        "You are Millytour's senior Uzbekistan travel planner. Answer with STRICT JSON only " +
        "(no markdown, no comments). Currency is USD. Write all human readable text in Uzbek " +
        "(Latin script). Use only real places in Uzbekistan and realistic hour-by-hour timings. " +
        "ALWAYS produce exactly TWO different itinerary options that a traveller can compare: " +
        'option 1 = "comfort" (better hotels, calmer pace), option 2 = "economy" (cheaper lodging, ' +
        "more cities/sights). Titles MUST start with «1-variant: » and «2-variant: » respectively. " +
        "BUDGET RULE (critical): the client gives a total budget (e.g. $800). Option 1 must land " +
        "BETWEEN 80% and 97% of the budget (e.g. $690–775 of $800) so it reads as a great deal " +
        "inside the client's wallet — never above budget, never suspiciously cheap. Option 2 must " +
        "land between 45% and 70% of the budget. Build the breakdown (lodging, food, transport, " +
        "tickets, guide...) so the sum equals estimate.total exactly. The client should feel " +
        '"my whole trip fits my budget with room to spare". Realistic daily costs: hostel/guest ' +
        "house $25–35/night, 3* hotel $45–70/night, 4* hotel $70–110/night, meals $15–30/person/day, " +
        "museum tickets $3–10, intercity transport $15–40, private guide $40–70/day. " +
        'JSON shape: {"options":[{"variant":"comfort","title":string,"summary":string,' +
        '"cities":string[],"days":[{"day":number,"city":string,"title":string,"lodging":string,' +
        '"spend":number,"items":[{"time":string,"title":string,"note":string,"kind":string}]}],' +
        '"estimate":{"total":number,"perPerson":number,"withinBudget":boolean,' +
        '"breakdown":[{"label":string,"amount":number}]},"tips":string[],"pack":string[]},' +
        '{same shape with "variant":"economy"}]}',
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            answers: normalized,
            availableTourSlugs: TOUR_SLUG_HINT,
            noteIfAny: normalized.feedback ?? null,
          }),
        },
      ],
    });

    if (ask.ok && ask.content) {
      const parsed = parseOptions(ask.content, options);
      if (parsed) {
        options = parsed;
        engine = "ai";
      }
    }

    const { planId } = await ctx.runMutation(api.plans.save, {
      sessionKey,
      answers: normalized,
      options,
      engine,
    });

    return { planId, options, engine };
  },
});

function stripFence(text: string) {
  return text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseOptions(raw: string, fallback: Plan[]): Plan[] | null {
  let json: unknown;
  try {
    json = JSON.parse(stripFence(raw));
  } catch {
    return null;
  }

  const list = Array.isArray((json as { options?: unknown })?.options)
    ? ((json as { options: unknown[] }).options as Partial<Plan>[])
    : Array.isArray(json)
      ? (json as Partial<Plan>[])
      : [json as Partial<Plan>];

  const parsed = list
    .map((item, index) => parsePlan(item, fallback[index] ?? fallback[0]))
    .filter((plan): plan is Plan => Boolean(plan));

  if (parsed.length === 0) {
    return null;
  }
  // Har doim ikki variant qaytaramiz.
  return parsed.length === 1 ? [parsed[0], fallback[1] ?? fallback[0]] : parsed.slice(0, 2);
}

function parsePlan(json: Partial<Plan>, fallback: Plan): Plan | null {
  try {
    if (!json || !Array.isArray(json.days) || json.days.length === 0) {
      return null;
    }
    const breakdown = json.estimate?.breakdown;
    const total = Number(json.estimate?.total) || fallback.estimate.total;
    return {
      title: json.title || fallback.title,
      summary: json.summary || fallback.summary,
      cities: Array.isArray(json.cities) && json.cities.length > 0 ? json.cities : fallback.cities,
      days: json.days.map((day, index) => ({
        day: Number(day.day) || index + 1,
        city: day.city || fallback.days[0]?.city || "",
        title: day.title || `Kun ${index + 1}`,
        lodging: day.lodging || fallback.days[index]?.lodging || "Mehmonxona",
        spend: Number(day.spend) || fallback.days[index]?.spend || 0,
        items: Array.isArray(day.items)
          ? day.items.slice(0, 8).map((item) => ({
              time: item.time || "10:00",
              title: item.title || "Erkin vaqt",
              note: item.note || "",
              kind: item.kind || "madaniyat",
            }))
          : [],
      })),
      estimate: {
        total,
        perPerson: Number(json.estimate?.perPerson) || Math.round(total / 2),
        currency: "USD",
        withinBudget:
          typeof json.estimate?.withinBudget === "boolean"
            ? json.estimate.withinBudget
            : total <= fallback.estimate.total,
        breakdown: Array.isArray(breakdown)
          ? breakdown.slice(0, 6).map((row) => ({
              label: row.label || "Xarajat",
              amount: Number(row.amount) || 0,
            }))
          : fallback.estimate.breakdown,
      },
      tips:
        Array.isArray(json.tips) && json.tips.length > 0 ? json.tips.slice(0, 6) : fallback.tips,
      pack:
        Array.isArray(json.pack) && json.pack.length > 0
          ? json.pack.filter((slug) => TOUR_SLUG_HINT.includes(slug)).slice(0, 3)
          : fallback.pack,
    };
  } catch {
    return null;
  }
}
