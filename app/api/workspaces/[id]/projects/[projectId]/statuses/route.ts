import { NextResponse } from "next/server";

import {
  requireProjectAccess,
  requireProjectManager,
} from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import {
  createProjectStatus,
  getProjectStatuses,
} from "@/lib/projects";
import { createProjectStatusSchema } from "@/lib/validation";

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
    return NextResponse.json({ statuses });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, projectId } = await params;
    const { project } = await requireProjectManager(id, projectId, user.id);
    const body = await request.json();
    const input = createProjectStatusSchema.parse(body);
    const status = await createProjectStatus({
      projectId: project.id,
      ...input,
    });
    return NextResponse.json({ status }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
