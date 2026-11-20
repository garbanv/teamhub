import { NextResponse } from "next/server";

import { requireProjectManager } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { updateProjectStatus } from "@/lib/projects";
import { updateProjectStatusSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; projectId: string; statusId: string }>;
  },
) {
  try {
    const user = await requireApiUser();
    const { id, projectId, statusId } = await params;
    const { project } = await requireProjectManager(id, projectId, user.id);
    const body = await request.json();
    const input = updateProjectStatusSchema.parse(body);
    const status = await updateProjectStatus({
      projectId: project.id,
      statusId,
      ...input,
    });
    return NextResponse.json({ status });
  } catch (error) {
    return routeError(error);
  }
}
