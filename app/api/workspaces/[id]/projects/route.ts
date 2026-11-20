import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { createProject, getProjects } from "@/lib/projects";
import { createProjectSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await requireWorkspaceMember(id, user.id);
    const projects = await getProjects(id);
    return NextResponse.json({ projects });
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
    const input = createProjectSchema.parse(body);
    const project = await createProject({
      workspaceId: id,
      userId: user.id,
      ...input,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
