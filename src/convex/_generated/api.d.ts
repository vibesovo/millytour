/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as admin from "../admin.js";
import type * as aiMemory from "../aiMemory.js";
import type * as aiPlanner from "../aiPlanner.js";
import type * as aiStatus from "../aiStatus.js";
import type * as assignments from "../assignments.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as bookings from "../bookings.js";
import type * as crons from "../crons.js";
import type * as discountCards from "../discountCards.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_bots from "../lib/bots.js";
import type * as lib_telegramCore from "../lib/telegramCore.js";
import type * as market from "../market.js";
import type * as millyChat from "../millyChat.js";
import type * as packages from "../packages.js";
import type * as paymentGateway from "../paymentGateway.js";
import type * as payments from "../payments.js";
import type * as plans from "../plans.js";
import type * as providers from "../providers.js";
import type * as reviews from "../reviews.js";
import type * as stats from "../stats.js";
import type * as telegram from "../telegram.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  admin: typeof admin;
  aiMemory: typeof aiMemory;
  aiPlanner: typeof aiPlanner;
  aiStatus: typeof aiStatus;
  assignments: typeof assignments;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  bookings: typeof bookings;
  crons: typeof crons;
  discountCards: typeof discountCards;
  events: typeof events;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/ai": typeof lib_ai;
  "lib/bots": typeof lib_bots;
  "lib/telegramCore": typeof lib_telegramCore;
  market: typeof market;
  millyChat: typeof millyChat;
  packages: typeof packages;
  paymentGateway: typeof paymentGateway;
  payments: typeof payments;
  plans: typeof plans;
  providers: typeof providers;
  reviews: typeof reviews;
  stats: typeof stats;
  telegram: typeof telegram;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
