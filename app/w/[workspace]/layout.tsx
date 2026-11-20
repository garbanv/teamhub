import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getDocPages } from "@/lib/docs";
import { getCurrentUser } from "@/lib/session";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import {
  getProjectNavItems,
  getWorkspaceForUser,
  getWorkspaceMembers,
  getWorkspacesForUser,
} from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string }>;
}): Promise<Metadata> {
  const { workspace } = await params;
  const user = await getCurrentUser();
  if (!user) return {};
  const current = await getWorkspaceForUser(workspace, user.id);
  return { title: current?.name ?? "Workspace" };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { workspace: slug } = await params;
  const workspace = await getWorkspaceForUser(slug, user.id);
  if (!workspace) notFound();

  const [workspaces, projects, members, docs, notifications, unreadCount] =
    await Promise.all([
      getWorkspacesForUser(user.id),
      getProjectNavItems(workspace.id),
      getWorkspaceMembers(workspace.id),
      getDocPages(workspace.id, user.id),
      getRecentNotifications(workspace.id, user.id),
      getUnreadNotificationCount(workspace.id, user.id),
    ]);

  return (
    <WorkspaceShell
      workspace={workspace}
      workspaces={workspaces}
      user={user}
      projects={projects}
      members={members}
      docs={docs}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </WorkspaceShell>
  );
}
