import { NextResponse } from "next/server";

import { requireApiUser, routeError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { isOwner } from "@/lib/permissions";
import { updateMemberSchema } from "@/lib/validation";
import {
  getWorkspaceRole,
  removeMember,
  updateMemberRole,
} from "@/lib/workspaces";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, membershipId } = await params;
    const callerRole = await getWorkspaceRole(id, user.id);
    if (!callerRole) throw new AppError("Workspace not found.", 404);
    if (!isOwner(callerRole)) {
      throw new AppError("Only the workspace owner can change roles.", 403);
    }

    const body = await request.json();
    const input = updateMemberSchema.parse(body);
    const member = await updateMemberRole({
      workspaceId: id,
      membershipId,
      role: input.role,
    });
    return NextResponse.json({ member });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, membershipId } = await params;
    const callerRole = await getWorkspaceRole(id, user.id);
    if (!callerRole) throw new AppError("Workspace not found.", 404);
    if (!isOwner(callerRole)) {
      throw new AppError("Only the workspace owner can remove members.", 403);
    }

    const member = await removeMember({
      workspaceId: id,
      membershipId,
    });
    return NextResponse.json({ member });
  } catch (error) {
    return routeError(error);
  }
}
