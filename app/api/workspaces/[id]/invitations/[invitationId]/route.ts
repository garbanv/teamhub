import { NextResponse } from "next/server";

import { requireApiUser, routeError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { canManageWorkspace } from "@/lib/permissions";
import { getWorkspaceRole, revokeInvitation } from "@/lib/workspaces";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, invitationId } = await params;
    const role = await getWorkspaceRole(id, user.id);
    if (!role) throw new AppError("Workspace not found.", 404);
    if (!canManageWorkspace(role)) {
      throw new AppError("Only admins can revoke invitations.", 403);
    }

    const revoked = await revokeInvitation(id, invitationId);
    if (!revoked) throw new AppError("Invitation not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
