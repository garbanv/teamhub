import { betterAuth } from "better-auth";
import { pool } from "./db";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const secret = process.env.BETTER_AUTH_SECRET;

if (
  process.env.NODE_ENV === "production" &&
  (!secret || secret.length < 32)
) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set to at least 32 characters in production.",
  );
}

if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL must be set in production.");
}

const trustedOrigins = Array.from(
  new Set([
    baseURL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]),
);

export const auth = betterAuth({
  appName: "Hub",
  baseURL,
  secret,
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    database: {
      // The image is built without a database. Validation runs at runtime.
      validateSchema:
        process.env.NEXT_PHASE === "phase-production-build" ? false : undefined,
    },
  },
  trustedOrigins,
});

export type HubSession = typeof auth.$Infer.Session;
