"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "./password-input";

export function SignupForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const joiningWorkspace = Boolean(next?.startsWith("/invite/"));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || "We couldn't create your account.");
      }

      if (joiningWorkspace) {
        router.push(next!);
        router.refresh();
        return;
      }

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName.trim() || `${name.trim()}'s workspace`,
        }),
      });

      if (!response.ok) {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      const data = (await response.json()) as {
        workspace: { slug: string };
      };
      router.push(`/w/${data.workspace.slug}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create account.",
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
          {joiningWorkspace ? "You're invited" : "Get started"}
        </p>
        <h1 className="text-[27px] font-semibold tracking-[-0.03em]">
          {joiningWorkspace ? "Create your account" : "Create your workspace"}
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
          {joiningWorkspace
            ? "Use the email address your invite was sent to."
            : "A home for your team's projects, tasks, and momentum."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            autoFocus
            placeholder="Alex Morgan"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <span className="text-[11px] text-muted-foreground/60">
              8+ characters
            </span>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
        </div>

        {!joiningWorkspace && (
          <div className="space-y-1.5 border-t border-border/70 pt-4">
            <Label htmlFor="workspace">Workspace name</Label>
            <Input
              id="workspace"
              name="workspace"
              placeholder="Acme Studio"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              maxLength={60}
              disabled={loading}
            />
            <p className="text-[11px] leading-4 text-muted-foreground/65">
              You can invite your team once it&apos;s created.
            </p>
          </div>
        )}

        <Button type="submit" className="mt-1 w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {joiningWorkspace ? "Continue to invite" : "Create workspace"}
              <ArrowRight className="size-3.5 opacity-80" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-7 text-center text-[12.5px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-8 text-center text-[10.5px] leading-4 text-muted-foreground/55">
        By continuing, you agree to keep your workspace a kind and focused place.
      </p>
    </div>
  );
}
