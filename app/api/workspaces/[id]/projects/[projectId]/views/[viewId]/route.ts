import { NextResponse } from "next/server";

import {
  requireProjectAccess,
} from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { deleteSavedView } from "@/lib/saved-views";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; projectId: string; viewId: string }>;
  },
) {
  try {
    const user = await requireApiUser();
    const { id, projectId, viewId } = await params;
    const { project } = await requireProjectAccess(id, projectId, user.id);
    await deleteSavedView({
      workspaceId: id,
      projectId: project.id,
      viewId,
      userId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
