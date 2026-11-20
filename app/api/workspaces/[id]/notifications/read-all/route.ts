import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { markAllNotificationsRead } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await requireWorkspaceMember(id, user.id);
    const count = await markAllNotificationsRead(id, user.id);
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    return routeError(error);
  }
}
