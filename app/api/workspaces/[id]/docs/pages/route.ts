import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { createDocPage, getDocPages } from "@/lib/docs";
import { createDocPageSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await requireWorkspaceMember(id, user.id);
    const pages = await getDocPages(id, user.id);
    return NextResponse.json({ pages });
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
    const input = createDocPageSchema.parse(body);
    const page = await createDocPage({
      workspaceId: id,
      userId: user.id,
      ...input,
    });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
