import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { moveDocPage } from "@/lib/docs";
import { moveDocPageSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, pageId } = await params;
    await requireWorkspaceMember(id, user.id);
    const body = await request.json();
    const input = moveDocPageSchema.parse(body);
    const pages = await moveDocPage({
      workspaceId: id,
      userId: user.id,
      pageId,
      parentId: input.parentId,
      index: input.index,
    });
    return NextResponse.json({ pages });
  } catch (error) {
    return routeError(error);
  }
}
