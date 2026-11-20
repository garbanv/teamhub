import type { WorkspaceRole } from "./types";

export const roleRank: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function canManageWorkspace(role: WorkspaceRole) {
  return roleRank[role] >= roleRank.admin;
}

export function isOwner(role: WorkspaceRole) {
  return role === "owner";
}
