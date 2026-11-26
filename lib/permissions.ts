import type { WorkspaceRole } from "./types";

export const roleRank: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function canManageWorkspace(role: WorkspaceRole) {
  return roleRank[role] >= roleRank.admin;
}

/** Admins/owners can always delete; members only when the workspace allows it. */
export function canDeleteContent(
  role: WorkspaceRole,
  membersAllowed: boolean,
) {
  return canManageWorkspace(role) || membersAllowed;
}

export function isOwner(role: WorkspaceRole) {
  return role === "owner";
}
