"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceInvitation } from "@/lib/types";
import { formatDate, roleLabel } from "@/lib/utils";

export function InvitationsList({
  workspaceId,
  invitations,
}: {
  workspaceId: string;
  invitations: WorkspaceInvitation[];
}) {
  const router = useRouter();
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  async function revoke(invitation: WorkspaceInvitation) {
    setRevokingId(invitation.id);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/invitations/${invitation.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not revoke invite.");
      toast.success("Invitation revoked.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not revoke invite.",
      );
    } finally {
      setRevokingId(null);
    }
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-9 text-center">
        <span className="flex size-9 items-center justify-center rounded-full border border-border bg-muted/35 text-muted-foreground">
          <Mail className="size-4" />
        </span>
        <p className="mt-2.5 text-[12px] font-medium">No pending invitations</p>
        <p className="mt-0.5 text-[10.5px] text-muted-foreground">
          Invite someone above and their link will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center gap-3 px-4 py-3 sm:px-5"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
            <Mail className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{invitation.email}</p>
            <p className="text-[10px] text-muted-foreground">
              Invited by {invitation.invitedByName} ·{" "}
              {invitation.expired ? (
                <span className="text-warning">Expired</span>
              ) : (
                <>Expires {formatDate(invitation.expiresAt)}</>
              )}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {roleLabel(invitation.role)}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => revoke(invitation)}
            disabled={revokingId === invitation.id}
            aria-label={`Revoke invite for ${invitation.email}`}
          >
            {revokingId === invitation.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
