import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { removeTaskLink } from "@/lib/tasks";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; taskId: string; linkId: string }>;
  },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId, linkId } = await params;
    await requireWorkspaceMember(id, user.id);
    await removeTaskLink({
      workspaceId: id,
      taskId,
      linkId,
      actorId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
