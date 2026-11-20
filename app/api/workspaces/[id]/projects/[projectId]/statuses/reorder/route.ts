import { NextResponse } from "next/server";

import { requireProjectManager } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { reorderProjectStatuses } from "@/lib/projects";
import { reorderProjectStatusesSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; projectId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, projectId } = await params;
    const { project } = await requireProjectManager(id, projectId, user.id);
    const body = await request.json();
    const input = reorderProjectStatusesSchema.parse(body);
    const statuses = await reorderProjectStatuses({
      projectId: project.id,
      category: input.category,
      statusIds: input.statusIds,
    });
    return NextResponse.json({ statuses });
  } catch (error) {
    return routeError(error);
  }
}
