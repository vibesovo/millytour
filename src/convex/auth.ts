// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance with the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";
import { emailOtp } from "./auth/emailOtp";


export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    emailOtp,
    Anonymous,
    // Google orqali kirish — AUTH_GOOGLE_CLIENT_ID / AUTH_GOOGLE_CLIENT_SECRET
    // env o'zgaruvchilari Convex deployment'da sozlangan bo'lishi kerak.
    // Redirect URI: <CONVEX_SITE_URL>/api/auth/callback/google
    ...(process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET
      ? [Google]
      : []),
  ],
});
