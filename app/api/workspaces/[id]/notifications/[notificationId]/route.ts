import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { markNotificationRead } from "@/lib/notifications";
import { notificationReadSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; notificationId: string }>;
  },
) {
  try {
    const user = await requireApiUser();
    const { id, notificationId } = await params;
    await requireWorkspaceMember(id, user.id);
    const body = await request.json();
    const input = notificationReadSchema.parse(body);
    const updated = await markNotificationRead({
      workspaceId: id,
      userId: user.id,
      notificationId,
      read: input.read,
    });
    return NextResponse.json({ ok: updated });
  } catch (error) {
    return routeError(error);
  }
}
