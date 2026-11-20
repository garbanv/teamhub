import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { getWorkspaceFile } from "@/lib/docs";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id, fileId } = await params;
    await requireWorkspaceMember(id, user.id);
    const file = await getWorkspaceFile(id, fileId);
    if (!file) throw new AppError("File not found.", 404);

    const download = new URL(request.url).searchParams.has("download");
    const safeInlineImages = new Set([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/avif",
    ]);
    const inline = safeInlineImages.has(file.mimeType) && !download;
    return new Response(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.data.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, max-age=3600",
        "Content-Security-Policy": "sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
