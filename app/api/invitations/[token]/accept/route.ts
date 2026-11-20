import { NextResponse } from "next/server";

import { requireApiUser, routeError } from "@/lib/api";
import { acceptInvitation } from "@/lib/workspaces";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const user = await requireApiUser();
    const { token } = await params;
    const workspace = await acceptInvitation({
      token,
      userId: user.id,
      userEmail: user.email,
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    return routeError(error);
  }
}
