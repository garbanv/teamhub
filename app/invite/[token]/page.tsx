import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail } from "lucide-react";

import { AcceptInvitationButton } from "@/components/invite/accept-invitation-button";
import { Logo, WorkspaceGlyph } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { roleLabel } from "@/lib/utils";
import { getInvitePreview } from "@/lib/workspaces";

export const metadata: Metadata = {
  title: "Join workspace",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([
    getInvitePreview(token),
    getCurrentUser(),
  ]);

  if (!invitation) {
    return (
      <InviteFrame>
        <div className="text-center">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
            Invite not found
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">
            This link is no longer valid
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-5 text-muted-foreground">
            It may have been revoked or replaced. Ask a workspace admin for a
            fresh invite.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href={user ? "/" : "/login"}>Go to Hub</Link>
          </Button>
        </div>
      </InviteFrame>
    );
  }

  const emailMatches =
    user?.email.toLowerCase() === invitation.email.toLowerCase();
  const unavailable = invitation.accepted || invitation.expired;

  return (
    <InviteFrame>
      <div className="flex flex-col items-center text-center">
        <WorkspaceGlyph
          name={invitation.workspaceName}
          color={invitation.workspaceLogoColor}
          className="size-12 rounded-xl text-[16px]"
        />
        <p className="mt-5 text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
          You&apos;re invited
        </p>
        <h1 className="mt-2 text-[25px] font-semibold tracking-[-0.035em]">
          Join {invitation.workspaceName}
        </h1>
        <p className="mt-2 max-w-sm text-[13px] leading-5 text-muted-foreground">
          {invitation.inviterName} invited you to collaborate on projects and
          tasks in Hub.
        </p>

        <div className="mt-6 w-full space-y-2.5 rounded-xl border border-border bg-card p-3.5 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">Workspace</span>
            <span className="text-[12.5px] font-medium">
              {invitation.workspaceName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">Invited email</span>
            <span className="truncate text-[12.5px] font-medium">
              {invitation.email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">Your role</span>
            <Badge variant="secondary">{roleLabel(invitation.role)}</Badge>
          </div>
        </div>

        {invitation.expired && (
          <div className="mt-4 flex w-full items-start gap-2.5 rounded-lg border border-warning/20 bg-warning/8 px-3 py-2.5 text-left">
            <Clock className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <p className="text-[11.5px] leading-4 text-muted-foreground">
              This invite expired. Ask {invitation.inviterName} to send a new
              one.
            </p>
          </div>
        )}

        {invitation.accepted && (
          <div className="mt-4 flex w-full items-start gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-left">
            <Mail className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <p className="text-[11.5px] leading-4 text-muted-foreground">
              This invite has already been accepted.
            </p>
          </div>
        )}

        <div className="mt-6 w-full">
          {!user ? (
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
                  Sign in to accept
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link
                  href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Create an account
                </Link>
              </Button>
            </div>
          ) : emailMatches ? (
            <AcceptInvitationButton token={token} disabled={unavailable} />
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-left">
                <p className="text-[11.5px] font-medium text-foreground/85">
                  You&apos;re signed in as {user.email}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  This invite was sent to {invitation.email}. Switch accounts to
                  accept it.
                </p>
              </div>
              <AcceptInvitationButton
                token={token}
                disabled={unavailable}
                allowAccept={false}
              />
            </div>
          )}
        </div>

        <p className="mt-6 text-[10.5px] text-muted-foreground/60">
          Invite expires{" "}
          {new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
          }).format(new Date(invitation.expiresAt))}
        </p>
      </div>
    </InviteFrame>
  );
}

function InviteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <div className="pointer-events-none absolute top-[-20%] left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_66%)] blur-2xl" />
      <header className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" aria-label="Hub home">
          <Logo />
        </Link>
        <span className="text-[11px] text-muted-foreground/60">
          Team workspace
        </span>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-[410px] rounded-2xl border border-border/80 bg-popover/90 p-7 shadow-[0_30px_90px_-40px_rgba(16,16,24,0.4)] backdrop-blur sm:p-8">
          {children}
        </div>
      </main>
      <footer className="relative z-10 pb-6 text-center text-[10.5px] text-muted-foreground/50">
        Hub · A calmer place for team work
      </footer>
    </div>
  );
}
