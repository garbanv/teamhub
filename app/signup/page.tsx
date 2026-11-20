import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <AuthShell footer="Free while you find your rhythm.">
      <SignupForm next={next} />
    </AuthShell>
  );
}
