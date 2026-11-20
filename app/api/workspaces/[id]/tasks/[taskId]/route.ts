import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getTaskById, updateTask } from "@/lib/tasks";
import { updateTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId } = await params;
    await requireWorkspaceMember(id, user.id);
    const task = await getTaskById(id, taskId);
    if (!task) throw new AppError("Task not found.", 404);
    return NextResponse.json({ task });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId } = await params;
    await requireWorkspaceMember(id, user.id);
    const body = await request.json();
    const input = updateTaskSchema.parse(body);
    const task = await updateTask({
      workspaceId: id,
      taskId,
      actorId: user.id,
      ...input,
    });
    return NextResponse.json({ task });
  } catch (error) {
    return routeError(error);
  }
}
