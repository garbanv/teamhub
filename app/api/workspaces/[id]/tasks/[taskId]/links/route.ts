import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { createTaskLink } from "@/lib/tasks";
import { createTaskLinkSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, taskId } = await params;
    await requireWorkspaceMember(id, user.id);
    const body = await request.json();
    const input = createTaskLinkSchema.parse(body);
    const link = await createTaskLink({
      workspaceId: id,
      taskId,
      relatedTaskId: input.relatedTaskId,
      actorId: user.id,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
