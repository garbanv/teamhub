"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowUpRight,
  Bell,
  BellOff,
  CheckCheck,
  CircleDot,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotificationsMenu({
  workspaceId,
  workspaceSlug,
  notifications,
  unreadCount,
}: {
  workspaceId: string;
  workspaceSlug: string;
  notifications: NotificationSummary[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);

  async function markRead(id: string) {
    try {
      await fetch(
        `/api/workspaces/${workspaceId}/notifications/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
          keepalive: true,
        },
      );
    } catch {
      // Navigation should not be blocked by a read receipt.
    }
  }

  async function openNotification(
    event: React.MouseEvent,
    notification: NotificationSummary,
  ) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      setOpen(false);
      return;
    }
    event.preventDefault();
    if (!notification.readAt) await markRead(notification.id);
    setOpen(false);
    if (notification.taskId) {
      router.push(`/w/${workspaceSlug}/tasks/${notification.taskId}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/notifications/read-all`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Could not mark notifications read.");
      toast.success("All notifications marked as read.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not mark notifications read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-2 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand/50" />
              <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <DropdownMenuLabel className="p-0 text-[12.5px] font-semibold tracking-normal text-foreground normal-case">
            Notifications
          </DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {unreadCount} new
              </span>
            )}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="size-2.5 animate-spin" />
                ) : (
                  <CheckCheck className="size-2.5" />
                )}
                Mark all read
              </button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-9 text-center">
            <span className="flex size-9 items-center justify-center rounded-full border border-border bg-muted/35">
              <BellOff className="size-4 text-muted-foreground" />
            </span>
            <p className="mt-3 text-[12.5px] font-medium">
              You&apos;re all caught up
            </p>
            <p className="mt-1 max-w-[230px] text-[11px] leading-4 text-muted-foreground">
              Assignments, mentions, and updates on tasks you follow will show
              up here.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => {
              const content = (
                <>
                  {notification.actorName ? (
                    <UserAvatar
                      name={notification.actorName}
                      image={notification.actorImage}
                      className="mt-0.5 size-7 shrink-0 border-0"
                    />
                  ) : (
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <CircleDot className="size-3.5 text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] leading-4 font-medium">
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-4 text-muted-foreground">
                        {notification.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[9.5px] text-muted-foreground/55">
                      {formatDistanceToNowStrict(
                        new Date(notification.createdAt),
                        { addSuffix: true },
                      )}
                    </span>
                  </span>
                  {!notification.readAt && (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  {notification.taskId && (
                    <ArrowUpRight className="mt-0.5 size-3 shrink-0 text-muted-foreground/25 transition-colors group-hover/notification:text-muted-foreground/60" />
                  )}
                </>
              );

              const className = cn(
                "group/notification flex w-full gap-2.5 border-b border-border/60 px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40",
                !notification.readAt && "bg-primary/[0.035]",
              );

              return notification.taskId ? (
                <Link
                  key={notification.id}
                  href={`/w/${workspaceSlug}/tasks/${notification.taskId}`}
                  onClick={(event) => void openNotification(event, notification)}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={notification.id}
                  type="button"
                  onClick={(event) => void openNotification(event, notification)}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
        <div className="border-t border-border/70 bg-muted/20 px-3.5 py-2">
          <p className="text-[10px] text-muted-foreground/60">
            Notifications are delivered inside Hub.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
