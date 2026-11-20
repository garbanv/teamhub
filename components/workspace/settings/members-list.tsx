"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkspaceMember, WorkspaceRole } from "@/lib/types";
import { formatDate, roleLabel } from "@/lib/utils";

export function MembersList({
  workspaceId,
  members,
  currentUserId,
  callerRole,
}: {
  workspaceId: string;
  members: WorkspaceMember[];
  currentUserId: string;
  callerRole: WorkspaceRole;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<WorkspaceMember | null>(
    null,
  );
  const [removing, setRemoving] = React.useState(false);
  const isOwner = callerRole === "owner";

  async function changeRole(member: WorkspaceMember, role: WorkspaceRole) {
    setPendingId(member.membershipId);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${member.membershipId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update role.");
      toast.success(`${member.name} is now ${roleLabel(role).toLowerCase()}.`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update role.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function removeMember() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${removeTarget.membershipId}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not remove member.");
      toast.success(`${removeTarget.name} was removed from the workspace.`);
      setRemoveTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove member.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div className="divide-y divide-border/60">
        {members.map((member) => (
          <div
            key={member.membershipId}
            className="flex items-center gap-3 px-4 py-3 sm:px-5"
          >
            <UserAvatar
              name={member.name}
              image={member.image}
              className="size-8 border-0"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-[12.5px] font-medium">
                {member.name}
                {member.userId === currentUserId && (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              <p className="truncate text-[10.5px] text-muted-foreground">
                {member.email}
              </p>
            </div>
            <span className="hidden text-[10px] text-muted-foreground/55 sm:inline">
              Joined {formatDate(member.joinedAt, { year: "numeric" })}
            </span>

            {isOwner ? (
              <div className="flex items-center gap-1">
                <Select
                  value={member.role}
                  onValueChange={(value) =>
                    changeRole(member, value as WorkspaceRole)
                  }
                  disabled={pendingId === member.membershipId}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-7 w-[98px] text-[11px]"
                    aria-label={`Role for ${member.name}`}
                  >
                    {pendingId === member.membershipId ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label={`Actions for ${member.name}`}
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setRemoveTarget(member)}
                    >
                      <UserMinus className="size-3.5" />
                      Remove from workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Badge
                variant={member.role === "owner" ? "default" : "secondary"}
                className="capitalize"
              >
                {roleLabel(member.role)}
              </Badge>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.name}?</DialogTitle>
            <DialogDescription>
              They&apos;ll lose access to this workspace immediately. Their
              assigned tasks will stay in place.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={removeMember}
              disabled={removing}
            >
              {removing && <Loader2 className="size-3.5 animate-spin" />}
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
