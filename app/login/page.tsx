import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <AuthShell footer="New here? It takes about a minute.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
