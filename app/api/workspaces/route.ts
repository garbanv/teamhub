import { NextResponse } from "next/server";

import { requireApiUser, routeError } from "@/lib/api";
import { createWorkspace, getWorkspacesForUser } from "@/lib/workspaces";
import { createWorkspaceSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireApiUser();
    const workspaces = await getWorkspacesForUser(user.id);
    return NextResponse.json({ workspaces });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await request.json();
    const input = createWorkspaceSchema.parse(body);
    const workspace = await createWorkspace(user.id, input.name);
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
