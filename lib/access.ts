import { AppError } from "./errors";
import { canManageWorkspace } from "./permissions";
import type { WorkspaceRole } from "./types";
import { getProjectForWorkspace } from "./projects";
import { getWorkspaceRole } from "./workspaces";

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
): Promise<WorkspaceRole> {
  const role = await requireWorkspaceMember(workspaceId, userId);
  if (!canManageWorkspace(role)) {
    throw new AppError("Only workspace admins can manage project workflows.", 403);
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
