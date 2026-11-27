import { requireWorkspaceMember } from "@/lib/access";
import { requireApiUser, routeError } from "@/lib/api";
import { getWorkspaceFile } from "@/lib/docs";
import { AppError } from "@/lib/errors";
import { getObjectStream } from "@/lib/storage";

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
    const headers = {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, max-age=3600",
      "Content-Security-Policy": "sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    };

    // Files in object storage are streamed through the app so the same access
    // check and security headers apply as for files stored in the database.
    if (file.storageKey) {
      const object = await getObjectStream(file.storageKey);
      if (!object) throw new AppError("File not found.", 404);
      return new Response(object.stream, { headers });
    }

    if (!file.data) throw new AppError("File not found.", 404);
    return new Response(new Uint8Array(file.data), { headers });
  } catch (error) {
    return routeError(error);
  }
}
