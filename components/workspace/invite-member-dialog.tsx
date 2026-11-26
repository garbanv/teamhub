"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  MailCheck,
  MailPlus,
  MailX,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type InviteResult = {
  id: string;
  email: string;
  role: "admin" | "member";
  expiresAt: string;
  url: string;
  emailStatus: "sent" | "not_configured" | "failed";
};

export function InviteMemberDialog({
  workspaceId,
  workspaceName,
  children,
  defaultOpen = false,
}: {
  workspaceId: string;
  workspaceName: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "member">("member");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<InviteResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  function reset() {
    setEmail("");
    setRole("member");
    setResult(null);
    setCopied(false);
    setLoading(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      const shouldRefresh = Boolean(result);
      window.setTimeout(reset, 180);
      if (shouldRefresh) router.refresh();
    }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = (await response.json()) as {
        invitation?: InviteResult;
        error?: string;
      };
      if (!response.ok || !data.invitation) {
        throw new Error(data.error || "Could not create invitation.");
      }
      setResult(data.invitation);
      toast.success(
        data.invitation.emailStatus === "sent"
          ? "Invitation email sent."
          : "Invite link created.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create invitation.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success("Invite link copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }

  const mailto = result
    ? `mailto:${encodeURIComponent(result.email)}?subject=${encodeURIComponent(
        `Join ${workspaceName} on Hub`,
      )}&body=${encodeURIComponent(
        `You've been invited to join ${workspaceName} on Hub.\n\nAccept the invitation here:\n${result.url}\n\nThis link expires ${new Date(result.expiresAt).toLocaleDateString()}.`,
      )}`
    : "#";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm">
            <UserPlus className="size-3.5" />
            Invite people
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[26.875rem]">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite someone to {workspaceName}</DialogTitle>
              <DialogDescription>
                Create a private invite link, then send it to your teammate.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={invite} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoFocus
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) =>
                    setRole(value as "admin" | "member")
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      Member — work on projects and tasks
                    </SelectItem>
                    <SelectItem value="admin">
                      Admin — manage projects and invite people
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/35 px-3 py-2.5">
                <Link2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[0.7188rem] leading-4 text-muted-foreground">
                  The link is single-use and expires in 7 days. It only works
                  for this email address.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="size-3.5" />
                      Create invite link
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-success/12 text-success">
                {result.emailStatus === "sent" ? (
                  <MailCheck className="size-4" />
                ) : result.emailStatus === "failed" ? (
                  <MailX className="size-4" />
                ) : (
                  <Check className="size-4" strokeWidth={2.5} />
                )}
              </div>
              <DialogTitle className="break-words">
                {result.emailStatus === "sent"
                  ? `Invite emailed to ${result.email}`
                  : `Invite ready for ${result.email}`}
              </DialogTitle>
              <DialogDescription>
                {result.emailStatus === "sent"
                  ? "We sent them a private invitation email. You can also share the link directly."
                  : "Send them this private link. It expires in 7 days and can only be used once."}
              </DialogDescription>
            </DialogHeader>

            <div className="min-w-0 space-y-3">
              <div
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-lg border p-2 pl-2.5 text-[0.6875rem]",
                  result.emailStatus === "sent"
                    ? "border-success/25 bg-success/8 text-success"
                    : result.emailStatus === "failed"
                      ? "border-destructive/25 bg-destructive/8 text-destructive"
                      : "border-border bg-muted/35 text-muted-foreground",
                )}
              >
                {result.emailStatus === "sent" ? (
                  <MailCheck className="size-3.5 shrink-0" />
                ) : result.emailStatus === "failed" ? (
                  <MailX className="size-3.5 shrink-0" />
                ) : (
                  <MailPlus className="size-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  {result.emailStatus === "sent"
                    ? "Email sent"
                    : result.emailStatus === "failed"
                      ? "Email could not be sent. Copy the link instead."
                      : "Email delivery isn’t configured. Copy the link instead."}
                </span>
              </div>

              <div className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/35 p-1 pl-3">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[0.6875rem] text-muted-foreground"
                  title={result.url}
                >
                  {result.url}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={copyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <Button asChild variant="outline" className="w-full">
                <a href={mailto}>
                  <MailPlus className="size-3.5" />
                  Compose email with link
                </a>
              </Button>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setEmail("");
                }}
              >
                Invite another
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
