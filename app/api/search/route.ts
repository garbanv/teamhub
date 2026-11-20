import { NextResponse } from "next/server";

import { requireApiUser, routeError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { searchWorkspace } from "@/lib/search";
import { searchSchema } from "@/lib/validation";
import { getWorkspaceForUser } from "@/lib/workspaces";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const input = searchSchema.parse({
      q: url.searchParams.get("q") ?? "",
      workspace: url.searchParams.get("workspace") ?? "",
    });

    const workspace = await getWorkspaceForUser(input.workspace, user.id);
    if (!workspace) throw new AppError("Workspace not found.", 404);

    const results = await searchWorkspace(workspace.id, workspace.slug, input.q);
    return NextResponse.json({ results });
  } catch (error) {
    return routeError(error);
  }
}
