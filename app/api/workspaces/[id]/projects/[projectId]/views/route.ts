import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { createSavedView, getSavedViewsForProject } from "@/lib/saved-views";
import { createSavedViewSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, projectId } = await params;
    const { project } = await requireProjectAccess(id, projectId, user.id);
    const views = await getSavedViewsForProject(project.id, user.id);
    return NextResponse.json({ views });
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
    const { project } = await requireProjectAccess(id, projectId, user.id);
    const body = await request.json();
    const input = createSavedViewSchema.parse(body);
    const view = await createSavedView({
      workspaceId: id,
      projectId: project.id,
      userId: user.id,
      ...input,
    });
    return NextResponse.json({ view }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
