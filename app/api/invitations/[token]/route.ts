import { NextResponse } from "next/server";

import { getInvitePreview } from "@/lib/workspaces";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitation = await getInvitePreview(token);
  if (!invitation) {
    return NextResponse.json(
      { error: "This invite link is invalid or has been revoked." },
      { status: 404 },
    );
  }
  return NextResponse.json({ invitation });
}
