import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";
import type { SessionUser } from "./types";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };
});

export async function requireUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${next}`);
  }
  return user;
}
