import { NextResponse } from "next/server";

import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { storeWorkspaceFile } from "@/lib/docs";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await requireWorkspaceMember(id, user.id);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("Choose a file to upload.", 400);
    }
    if (file.size === 0) throw new AppError("That file is empty.", 400);
    if (file.size > MAX_SIZE) {
      throw new AppError("Files must be 10 MB or smaller.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = await storeWorkspaceFile({
      workspaceId: id,
      userId: user.id,
      name: file.name.slice(0, 200) || "file",
      mimeType: file.type || "application/octet-stream",
      data: buffer,
    });

    const base = `/api/workspaces/${id}/docs/files/${fileId}`;
    return NextResponse.json({
      file: {
        id: fileId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        url: base,
        downloadUrl: `${base}?download=1`,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
