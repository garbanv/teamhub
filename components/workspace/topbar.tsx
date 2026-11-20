"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Menu,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";

import { WorkspaceGlyph } from "@/components/logo";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { NotificationsMenu } from "@/components/workspace/notifications-menu";
import { ThemeToggle } from "@/components/workspace/theme-toggle";
import { useCommandMenu } from "@/components/workspace/command-palette";
import {
  NewTaskButton,
  useQuickCreateTask,
} from "@/components/workspace/task/quick-create-task";
import { Button } from "@/components/ui/button";
import type {
  DocPageListItem,
  NotificationSummary,
  ProjectNavItem,
  WorkspaceSummary,
} from "@/lib/types";
import { canManageWorkspace } from "@/lib/permissions";

export function Topbar({
  workspace,
  projects,
  docs,
  notifications,
  unreadCount,
  onOpenMobileNav,
}: {
  workspace: WorkspaceSummary;
  projects: ProjectNavItem[];
  docs: DocPageListItem[];
  notifications: NotificationSummary[];
  unreadCount: number;
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();
  const { open: openCommandMenu } = useCommandMenu();
  const { open: openQuickCreate } = useQuickCreateTask();
  const canManage = canManageWorkspace(workspace.role);
  const title = pageTitle(pathname, workspace.slug, projects, docs);

  return (
    <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-border/75 bg-background/85 px-4 backdrop-blur-xl lg:px-6">
      <button
        onClick={onOpenMobileNav}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <WorkspaceGlyph
          name={workspace.name}
          color={workspace.logoColor}
          className="size-6 rounded-md text-[9px] lg:hidden"
        />
        <div className="hidden items-center gap-1.5 text-[12.5px] text-muted-foreground lg:flex">
          <span className="max-w-[160px] truncate">{workspace.name}</span>
          <ChevronRight className="size-3 text-muted-foreground/40" />
        </div>
        <span className="truncate text-[13px] font-medium tracking-[-0.01em]">
          {title}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={openCommandMenu}
          className="hidden h-8 items-center gap-2 rounded-md border border-border/80 bg-card/60 px-2.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:flex"
        >
          <Search className="size-3.5" />
          <span className="hidden md:inline">Search</span>
          <kbd className="ml-2 rounded border border-border/80 bg-muted/60 px-1 py-0.5 text-[9px] font-medium text-muted-foreground/60">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground sm:hidden"
          onClick={openCommandMenu}
          aria-label="Search"
        >
          <Search className="size-4" />
        </Button>

        <NewTaskButton
          variant="outline"
          size="sm"
          showShortcut
          className="hidden sm:inline-flex"
        />
        <Button
          variant="outline"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => openQuickCreate()}
          aria-label="New task"
        >
          <Plus className="size-3.5" />
        </Button>

        {canManage && (
          <InviteMemberDialog
            workspaceId={workspace.id}
            workspaceName={workspace.name}
          >
            <Button variant="outline" size="sm" className="hidden md:inline-flex">
              <UserPlus className="size-3.5" />
              Invite
            </Button>
          </InviteMemberDialog>
        )}

        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

        <NotificationsMenu
          workspaceId={workspace.id}
          workspaceSlug={workspace.slug}
          notifications={notifications}
          unreadCount={unreadCount}
        />
        <ThemeToggle compact />
      </div>
    </header>
  );
}

function pageTitle(
  pathname: string,
  workspaceSlug: string,
  projects: ProjectNavItem[],
  docs: DocPageListItem[],
) {
  const base = `/w/${workspaceSlug}`;
  const path = pathname.slice(base.length).replace(/^\//, "");

  if (!path) return "Home";
  if (path === "my-tasks") return "My Tasks";
  if (path === "this-week") return "This Week";
  if (path === "overdue") return "Overdue";
  if (path === "due-soon") return "Due Soon";
  if (path === "settings") return "Settings";
  if (path === "projects") return "Projects";
  if (path === "docs") return "Docs";
  if (path.startsWith("docs/")) {
    const pageId = path.split("/")[1];
    return docs.find((page) => page.id === pageId)?.title ?? "Page";
  }
  if (path.startsWith("tasks/")) return "Task";

  if (path.startsWith("projects/")) {
    const [, key, section] = path.split("/");
    const project = projects.find((item) => item.key === key);
    const name = project?.name ?? key ?? "Project";
    return section === "settings" ? `${name} settings` : name;
  }

  return "Hub";
}
