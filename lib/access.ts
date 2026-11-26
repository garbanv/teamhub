import { AppError } from "./errors";
import { canDeleteContent, canManageWorkspace } from "./permissions";
import type { WorkspaceRole } from "./types";
import { getProjectForWorkspace } from "./projects";
import { getDeleteSettings, getWorkspaceRole } from "./workspaces";

export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole> {
  const role = await getWorkspaceRole(workspaceId, userId);
  if (!role) throw new AppError("Workspace not found.", 404);
  return role;
}

export async function requireWorkspaceManager(
  workspaceId: string,
  userId: string,
  message = "Only workspace admins can manage project workflows.",
): Promise<WorkspaceRole> {
  const role = await requireWorkspaceMember(workspaceId, userId);
  if (!canManageWorkspace(role)) {
    throw new AppError(message, 403);
  }
  return role;
}

/** Throws 403 unless the user may delete this kind of content in the workspace. */
export async function requireDeletePermission(
  workspaceId: string,
  userId: string,
  kind: "task" | "docs",
): Promise<WorkspaceRole> {
  const role = await requireWorkspaceMember(workspaceId, userId);
  if (canManageWorkspace(role)) return role;

  const settings = await getDeleteSettings(workspaceId);
  const allowed =
    kind === "task"
      ? settings?.membersCanDeleteTasks
      : settings?.membersCanDeleteDocs;
  if (!canDeleteContent(role, allowed ?? false)) {
    throw new AppError(
      kind === "task"
        ? "Only workspace admins can delete tasks in this workspace."
        : "Only workspace admins can delete docs pages in this workspace.",
      403,
    );
  }
  return role;
}

export async function requireProjectAccess(
  workspaceId: string,
  projectId: string,
  userId: string,
) {
  const role = await requireWorkspaceMember(workspaceId, userId);
  const project = await getProjectForWorkspace(workspaceId, projectId);
  if (!project) throw new AppError("Project not found.", 404);
  return { role, project };
}

export async function requireProjectManager(
  workspaceId: string,
  projectId: string,
  userId: string,
) {
  const role = await requireWorkspaceManager(workspaceId, userId);
  const project = await getProjectForWorkspace(workspaceId, projectId);
  if (!project) throw new AppError("Project not found.", 404);
  return { role, project };
}
