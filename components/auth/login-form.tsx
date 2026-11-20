"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "./password-input";

const DEMO_EMAIL = "demo@hub.so";
const DEMO_PASSWORD = "hubdemo123";

export function LoginForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);

  async function signInWith(emailValue: string, passwordValue: string) {
    const { error } = await authClient.signIn.email({
      email: emailValue,
      password: passwordValue,
    });
    if (error) {
      throw new Error(error.message || "We couldn't sign you in.");
    }
    router.push(next || "/");
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await signInWith(email, password);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
      setLoading(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    try {
      await signInWith(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Demo sign in failed. Have you seeded the database?",
      );
      setDemoLoading(false);
    }
  }

  const busy = loading || demoLoading;

  return (
    <div>
      <div className="mb-8">
        <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
          Welcome back
        </p>
        <h1 className="text-[27px] font-semibold tracking-[-0.03em]">
          Sign in to Hub
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
          Pick up where your team left off.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <span className="text-[11px] text-muted-foreground/60">
              At least 8 characters
            </span>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            disabled={busy}
          />
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={busy}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="size-3.5 opacity-80" />
            </>
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground/50 uppercase">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleDemo}
        disabled={busy}
      >
        {demoLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="size-3.5 text-brand" />
            Explore the demo workspace
          </>
        )}
      </Button>

      <p className="mt-8 text-center text-[12.5px] text-muted-foreground">
        New to Hub?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
