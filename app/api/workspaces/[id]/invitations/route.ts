import { NextResponse } from "next/server";

import { requireApiUser, routeError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { inviteUrl } from "@/lib/invitations";
import { canManageWorkspace } from "@/lib/permissions";
import { createInvitationSchema } from "@/lib/validation";
import {
  createInvitation,
  getPendingInvitations,
  getWorkspaceRole,
} from "@/lib/workspaces";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const role = await getWorkspaceRole(id, user.id);
    if (!role) throw new AppError("Workspace not found.", 404);
    if (!canManageWorkspace(role)) {
      throw new AppError("Only admins can view invitations.", 403);
    }

    const invitations = await getPendingInvitations(id);
    return NextResponse.json({ invitations });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const role = await getWorkspaceRole(id, user.id);
    if (!role) throw new AppError("Workspace not found.", 404);
    if (!canManageWorkspace(role)) {
      throw new AppError("Only admins can invite people.", 403);
    }

    const body = await request.json();
    const input = createInvitationSchema.parse(body);
    const invitation = await createInvitation({
      workspaceId: id,
      email: input.email,
      role: input.role,
      invitedBy: user.id,
    });

    const origin = new URL(request.url).origin;
    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: input.email,
          role: input.role,
          expiresAt: invitation.expiresAt,
          url: inviteUrl(invitation.token, origin),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return routeError(error);
  }
}
