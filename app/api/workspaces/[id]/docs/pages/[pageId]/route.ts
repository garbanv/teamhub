import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { deleteDocPage, getDocPage, updateDocPage } from "@/lib/docs";
import { AppError } from "@/lib/errors";
import { updateDocPageSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, pageId } = await params;
    await requireWorkspaceMember(id, user.id);
    const page = await getDocPage(id, pageId, user.id);
    if (!page) throw new AppError("Page not found.", 404);
    return NextResponse.json({ page });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, pageId } = await params;
    await requireWorkspaceMember(id, user.id);
    const result = await deleteDocPage({
      workspaceId: id,
      pageId,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, pageId } = await params;
    await requireWorkspaceMember(id, user.id);
    const body = await request.json();
    const input = updateDocPageSchema.parse(body);
    const page = await updateDocPage({
      workspaceId: id,
      pageId,
      userId: user.id,
      ...input,
    });
    return NextResponse.json({ page });
  } catch (error) {
    return routeError(error);
  }
}
