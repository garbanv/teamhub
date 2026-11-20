"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { Logo } from "@/components/logo";
import { CommandMenuProvider } from "@/components/workspace/command-palette";
import { SidebarContent } from "@/components/workspace/sidebar";
import { Topbar } from "@/components/workspace/topbar";
import { QuickCreateTaskProvider } from "@/components/workspace/task/quick-create-task";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  DocPageListItem,
  NotificationSummary,
  ProjectNavItem,
  SessionUser,
  WorkspaceMember,
  WorkspaceSummary,
} from "@/lib/types";

export function WorkspaceShell({
  workspace,
  workspaces,
  user,
  projects,
  members,
  docs,
  notifications,
  unreadCount,
  children,
}: {
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  user: SessionUser;
  projects: ProjectNavItem[];
  members: WorkspaceMember[];
  docs: DocPageListItem[];
  notifications: NotificationSummary[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <CommandMenuProvider
      workspace={workspace}
      workspaces={workspaces}
      projects={projects}
      docs={docs}
    >
      <QuickCreateTaskProvider
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        projects={projects}
        members={members}
      >
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-sidebar-border bg-sidebar lg:block">
          <SidebarContent
            workspace={workspace}
            workspaces={workspaces}
            user={user}
            projects={projects}
            docs={docs}
          />
        </aside>

        <div className="lg:pl-[252px]">
          <Topbar
            workspace={workspace}
            projects={projects}
            docs={docs}
            notifications={notifications}
            unreadCount={unreadCount}
            onOpenMobileNav={() => setMobileOpen(true)}
          />
          <main className="min-h-[calc(100vh-52px)]">{children}</main>
        </div>

        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent
            showCloseButton={false}
            className="fixed inset-y-0 left-0 top-0 !flex h-full w-[282px] max-w-[86vw] !translate-x-0 !translate-y-0 flex-col gap-0 rounded-none border-y-0 border-l-0 border-r-border p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          >
            <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
              <Logo />
              <DialogClose asChild>
                <button
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Close navigation"
                >
                  <X className="size-4" />
                </button>
              </DialogClose>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarContent
                workspace={workspace}
                workspaces={workspaces}
                user={user}
                projects={projects}
                docs={docs}
                onNavigate={() => setMobileOpen(false)}
                enableDocsShortcut={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </QuickCreateTaskProvider>
    </CommandMenuProvider>
  );
}
