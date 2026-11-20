import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import {
  createTaskComment,
  getTaskComments,
  taskBelongsToWorkspace,
} from "@/lib/comments";
import { AppError } from "@/lib/errors";
import { createCommentSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId } = await params;
    await requireWorkspaceMember(id, user.id);
    if (!(await taskBelongsToWorkspace(taskId, id))) {
      throw new AppError("Task not found.", 404);
    }
    const comments = await getTaskComments(taskId);
    return NextResponse.json({ comments });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId } = await params;
    await requireWorkspaceMember(id, user.id);
    const body = await request.json();
    const input = createCommentSchema.parse(body);
    const comment = await createTaskComment({
      workspaceId: id,
      taskId,
      actorId: user.id,
      text: input.text,
      mentionIds: input.mentionIds,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
