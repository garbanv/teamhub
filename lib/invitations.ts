import { createHash, randomBytes } from "node:crypto";

export function createInviteToken() {
  return randomBytes(24).toString("base64url");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteUrl(token: string, origin?: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    origin ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}
