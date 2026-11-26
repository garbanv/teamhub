"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlarmClock,
  CalendarDays,
  CircleCheck,
  Clock3,
  FolderKanban,
  Hash,
  Home,
  MessageCircle,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";

import { UserMenu } from "@/components/workspace/user-menu";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { useCommandMenu } from "@/components/workspace/command-palette";
import { DocsSidebar } from "@/components/workspace/docs/docs-sidebar";
import type {
  DocPageListItem,
  ProjectNavItem,
  SessionUser,
  WorkspaceSummary,
} from "@/lib/types";
import { canDeleteContent, canManageWorkspace } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type SidebarContentProps = {
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  user: SessionUser;
  projects: ProjectNavItem[];
  docs: DocPageListItem[];
  onNavigate?: () => void;
  enableDocsShortcut?: boolean;
};

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  trailing,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[0.7812rem] font-medium transition-colors duration-100",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          active
            ? "text-primary"
            : "text-muted-foreground/80 group-hover:text-muted-foreground",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </Link>
  );
}

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-1 flex h-6 items-center justify-between px-2">
      <span className="text-[0.5938rem] font-semibold tracking-[0.13em] text-muted-foreground/60 uppercase">
        {children}
      </span>
      {action}
    </div>
  );
}

export function SidebarContent({
  workspace,
  workspaces,
  user,
  projects,
  docs,
  onNavigate,
  enableDocsShortcut = true,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { open: openCommandMenu } = useCommandMenu();
  const base = `/w/${workspace.slug}`;
  const canManage = canManageWorkspace(workspace.role);

  function isActive(path: string) {
    const href = `${base}${path}`;
    if (path === "") return pathname === base;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="shrink-0 px-3 pt-3">
        <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} />

        <button
          onClick={() => {
            onNavigate?.();
            openCommandMenu();
          }}
          className="mt-2.5 flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-card/40 px-2.5 text-left text-[0.75rem] text-muted-foreground/75 transition-colors hover:border-sidebar-border hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 truncate">Search or jump to…</span>
          <kbd className="rounded border border-border/80 bg-muted/60 px-1 py-0.5 text-[0.5625rem] font-medium text-muted-foreground/70">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="hub-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-4">
        <div className="space-y-0.5">
          <NavItem
            href={base}
            label="Home"
            icon={Home}
            active={isActive("")}
            onNavigate={onNavigate}
          />
          <NavItem
            href={`${base}/my-tasks`}
            label="My Tasks"
            icon={CircleCheck}
            active={isActive("/my-tasks")}
            onNavigate={onNavigate}
          />
        </div>

        <div className="mt-5">
          <SectionLabel>Views</SectionLabel>
          <div className="space-y-0.5">
            <NavItem
              href={`${base}/this-week`}
              label="This Week"
              icon={CalendarDays}
              active={isActive("/this-week")}
              onNavigate={onNavigate}
            />
            <NavItem
              href={`${base}/overdue`}
              label="Overdue"
              icon={AlarmClock}
              active={isActive("/overdue")}
              onNavigate={onNavigate}
            />
            <NavItem
              href={`${base}/due-soon`}
              label="Due Soon"
              icon={Clock3}
              active={isActive("/due-soon")}
              onNavigate={onNavigate}
            />
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel
            action={
              <Link
                href={`${base}/projects?new=1`}
                aria-label="New project"
                className="flex size-5 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </Link>
            }
          >
            Projects
          </SectionLabel>

          <div className="space-y-0.5">
            {projects.length === 0 ? (
              <Link
                href={`${base}/projects`}
                onClick={onNavigate}
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[0.75rem] text-muted-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
              >
                <FolderKanban className="size-3.5" />
                <span className="truncate">No projects yet</span>
              </Link>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`${base}/projects/${project.key}`}
                  onClick={onNavigate}
                  aria-current={
                    pathname.startsWith(`${base}/projects/${project.key}`)
                      ? "page"
                      : undefined
                  }
                  className={cn(
                    "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[0.7812rem] font-medium transition-colors",
                    pathname.startsWith(`${base}/projects/${project.key}`)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {project.name}
                  </span>
                  <span className="text-[0.5625rem] font-normal tracking-wide text-muted-foreground/40 uppercase opacity-0 transition-opacity group-hover:opacity-100">
                    {project.key}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="mt-5">
          <DocsSidebar
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
            pages={docs}
            onNavigate={onNavigate}
            enableShortcut={enableDocsShortcut}
            canDelete={canDeleteContent(
              workspace.role,
              workspace.membersCanDeleteDocs,
            )}
          />
        </div>

        <div className="mt-5">
          <SectionLabel>More</SectionLabel>
          <div className="space-y-0.5">
            <PlaceholderItem icon={MessageCircle} label="Chat" />
          </div>
        </div>

        {canManage && (
          <div className="mt-5">
            <InviteMemberDialog
              workspaceId={workspace.id}
              workspaceName={workspace.name}
            >
              <button className="group flex w-full items-center gap-2.5 rounded-lg border border-dashed border-sidebar-border bg-card/30 px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-card/70">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserPlus className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.7188rem] font-medium">
                    Invite teammates
                  </span>
                  <span className="block text-[0.625rem] text-muted-foreground">
                    Share a private link
                  </span>
                </span>
              </button>
            </InviteMemberDialog>
          </div>
        )}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border/80 p-2.5">
        <UserMenu user={user} workspaceSlug={workspace.slug} />
        <div className="mt-1 flex items-center justify-between px-2">
          <span className="flex items-center gap-1 text-[0.5938rem] text-muted-foreground/40">
            <Hash className="size-2.5" />
            Hub
          </span>
          <span className="text-[0.5625rem] text-muted-foreground/30">v0.1</span>
        </div>
      </div>
    </div>
  );
}

function PlaceholderItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div
      className="flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-[0.7812rem] font-medium text-sidebar-foreground/40"
      title={`${label} is coming in a later step`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1">{label}</span>
      <span className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 text-[0.5rem] font-medium tracking-wide text-muted-foreground/50 uppercase">
        Soon
      </span>
    </div>
  );
}
