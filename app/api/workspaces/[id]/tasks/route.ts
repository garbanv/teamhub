import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getProjectForWorkspace } from "@/lib/projects";
import {
  createTask,
  getTasksForProject,
  getTasksForUser,
  type PersonalTaskView,
} from "@/lib/tasks";
import { createTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

const personalViews: PersonalTaskView[] = [
  "my-tasks",
  "this-week",
  "overdue",
  "due-soon",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await requireWorkspaceMember(id, user.id);

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const view = url.searchParams.get("view") ?? "my-tasks";

    if (projectId) {
      const project = await getProjectForWorkspace(id, projectId);
      if (!project) throw new AppError("Project not found.", 404);
      const tasks = await getTasksForProject(project.id);
      return NextResponse.json({ tasks });
    }

    if (!personalViews.includes(view as PersonalTaskView)) {
      throw new AppError("Unknown task view.", 400);
    }

    const tasks = await getTasksForUser(id, user.id, view as PersonalTaskView);
    return NextResponse.json({ tasks });
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
    await requireWorkspaceMember(id, user.id);
    const body = await request.json();
    const input = createTaskSchema.parse(body);
    const task = await createTask({
      workspaceId: id,
      actorId: user.id,
      ...input,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
