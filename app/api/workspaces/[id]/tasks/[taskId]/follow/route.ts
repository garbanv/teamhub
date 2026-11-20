import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { setTaskFollowed } from "@/lib/tasks";

export const runtime = "nodejs";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId } = await params;
    await requireWorkspaceMember(id, user.id);
    await setTaskFollowed({
      workspaceId: id,
      taskId,
      userId: user.id,
      follow: true,
    });
    return NextResponse.json({ following: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId } = await params;
    await requireWorkspaceMember(id, user.id);
    await setTaskFollowed({
      workspaceId: id,
      taskId,
      userId: user.id,
      follow: false,
    });
    return NextResponse.json({ following: false });
  } catch (error) {
    return routeError(error);
  }
}
