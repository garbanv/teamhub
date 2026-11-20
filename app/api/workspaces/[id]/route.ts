import { NextResponse } from "next/server";

import { requireApiUser, routeError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { canManageWorkspace } from "@/lib/permissions";
import { updateWorkspaceSchema } from "@/lib/validation";
import { getWorkspaceRole, renameWorkspace } from "@/lib/workspaces";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const role = await getWorkspaceRole(id, user.id);
    if (!role) throw new AppError("Workspace not found.", 404);
    if (!canManageWorkspace(role)) {
      throw new AppError("Only admins can update workspace settings.", 403);
    }

    const body = await request.json();
    const input = updateWorkspaceSchema.parse(body);
    const workspace = await renameWorkspace(id, input.name);
    return NextResponse.json({ workspace });
  } catch (error) {
    return routeError(error);
  }
}
