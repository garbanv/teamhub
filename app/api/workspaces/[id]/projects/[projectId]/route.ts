import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import {
  getProjectStatuses,
  updateProject,
} from "@/lib/projects";
import { updateProjectSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, projectId } = await params;
    const { project } = await requireProjectAccess(id, projectId, user.id);
    const statuses = await getProjectStatuses(project.id);
    return NextResponse.json({ project, statuses });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, projectId } = await params;
    await requireProjectAccess(id, projectId, user.id);
    const body = await request.json();
    const input = updateProjectSchema.parse(body);
    const project = await updateProject({
      workspaceId: id,
      projectId,
      ...input,
    });
    return NextResponse.json({ project });
  } catch (error) {
    return routeError(error);
  }
}
