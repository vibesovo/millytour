import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Milly AI kunlik o'rganish jadvali: har kuni soat 03:00 da (UTC) oxirgi
 * 24 soatdagi yuqori ball olgan javoblardan yangi namunalar to'planadi.
 * Shu tarzda Milly AI o'z suhbatlaridan «o'qiydi» va takomilashadi.
 */
const crons = cronJobs();

crons.daily(
  "milly-ai-daily-learning",
  { hourUTC: 3, minuteUTC: 0 },
  internal.aiMemory.learnCron,
  {},
);

export default crons;
