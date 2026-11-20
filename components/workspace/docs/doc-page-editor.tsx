"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Smile,
  Trash2,
  Upload,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";

import { DeleteDocPageDialog } from "@/components/workspace/docs/delete-doc-page-dialog";
import { DocEditor } from "@/components/workspace/docs/doc-editor";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocPageDetail, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const pageEmoji = [
  "📄",
  "📝",
  "📚",
  "🧠",
  "💡",
  "🎯",
  "🚀",
  "⚡",
  "🧭",
  "🗺️",
  "📌",
  "📎",
  "📊",
  "📈",
  "🗂️",
  "📋",
  "✅",
  "🔖",
  "🔍",
  "🛠️",
  "⚙️",
  "🧩",
  "🌱",
  "🔥",
  "✨",
  "🎨",
  "🏗️",
  "🧪",
  "💬",
  "📣",
  "🏆",
  "🌤️",
];

type SaveState = "saved" | "dirty" | "saving" | "error";

export function DocPageEditor({
  initialPage,
  workspaceId,
  workspaceSlug,
  currentUser,
}: {
  initialPage: DocPageDetail;
  workspaceId: string;
  workspaceSlug: string;
  currentUser: SessionUser;
}) {
  const router = useRouter();
  const [page, setPage] = React.useState(initialPage);
  const [title, setTitle] = React.useState(initialPage.title);
  const [icon, setIcon] = React.useState<string | null>(initialPage.icon);
  const [coverUrl, setCoverUrl] = React.useState<string | null>(
    initialPage.coverUrl,
  );
  const [saveState, setSaveState] = React.useState<SaveState>("saved");
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [iconPickerOpen, setIconPickerOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const latestContentRef = React.useRef<unknown>(initialPage.content);
  const dirtyRef = React.useRef(false);
  const saveTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setPage(initialPage);
    setTitle(initialPage.title);
    setIcon(initialPage.icon);
    setCoverUrl(initialPage.coverUrl);
  }, [initialPage]);

  async function patchPage(payload: Record<string, unknown>) {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/docs/pages/${page.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await response.json()) as {
      page?: DocPageDetail;
      error?: string;
    };
    if (!response.ok || !data.page) {
      throw new Error(data.error || "Could not save the page.");
    }
    setPage(data.page);
    return data.page;
  }

  async function saveTitle() {
    const next = title.trim() || "Untitled";
    if (next === page.title) {
      setTitle(page.title);
      return;
    }
    setSaveState("saving");
    try {
      const updated = await patchPage({ title: next });
      setTitle(updated.title);
      setSaveState("saved");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      toast.error(
        error instanceof Error ? error.message : "Could not save the title.",
      );
    }
  }

  async function saveIcon(next: string | null) {
    setIcon(next);
    try {
      await patchPage({ icon: next });
      router.refresh();
    } catch (error) {
      setIcon(icon);
      toast.error(
        error instanceof Error ? error.message : "Could not update the icon.",
      );
    }
  }

  const flushContent = React.useCallback(async () => {
    if (!dirtyRef.current) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSaveState("saving");
    try {
      await patchPage({ content: latestContentRef.current });
      dirtyRef.current = false;
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      toast.error(
        error instanceof Error ? error.message : "Could not save the page.",
      );
    }
  }, [page.id, workspaceId]);

  function handleContentChange(json: unknown) {
    latestContentRef.current = json;
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void flushContent();
    }, 750);
  }

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(
        `/api/workspaces/${workspaceId}/docs/upload`,
        { method: "POST", body: form },
      );
      const data = (await response.json()) as {
        file?: { url: string };
        error?: string;
      };
      if (!response.ok || !data.file) {
        throw new Error(data.error || "Could not upload the cover.");
      }
      setCoverUrl(data.file.url);
      await patchPage({ coverUrl: data.file.url });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload the cover.",
      );
    } finally {
      setUploadingCover(false);
    }
  }

  async function removeCover() {
    setCoverUrl(null);
    try {
      await patchPage({ coverUrl: null });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the cover.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 pb-20 sm:px-7 lg:px-10">
      <div className="relative">
        {coverUrl ? (
          <div className="group relative -mx-4 h-40 overflow-hidden border-b border-border/60 sm:-mx-7 sm:h-48 lg:-mx-10 lg:rounded-b-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt=""
              className="size-full object-cover"
            />
            <div className="absolute right-3 bottom-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
              >
                {uploadingCover ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Change
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                onClick={removeCover}
                aria-label="Remove cover"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-10 items-center justify-end">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-muted-foreground/45 transition-colors hover:bg-accent hover:text-foreground"
            >
              {uploadingCover ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ImagePlus className="size-3" />
              )}
              Add cover
            </button>
          </div>
        )}
      </div>

      <div className={cn("relative", coverUrl ? "-mt-8" : "mt-1")}>
        <div className="flex items-end gap-2">
          <DropdownMenu open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-14 items-center justify-center rounded-xl border border-transparent text-[38px] leading-none transition-colors hover:border-border hover:bg-card"
                aria-label="Change page icon"
              >
                {icon || <Smile className="size-6 text-muted-foreground/40" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[292px] p-2">
              <div className="grid grid-cols-8 gap-0.5">
                {pageEmoji.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setIconPickerOpen(false);
                      void saveIcon(emoji);
                    }}
                    className="flex size-7 items-center justify-center rounded text-[17px] transition-colors hover:bg-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {icon && (
                <>
                  <div className="my-1.5 h-px bg-border/70" />
                  <DropdownMenuItem
                    onSelect={() => void saveIcon(null)}
                    className="gap-2 text-muted-foreground"
                  >
                    <Trash2 className="size-3.5" />
                    Remove icon
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mb-1.5 ml-auto flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 text-[9.5px] transition-colors",
                saveState === "saved"
                  ? "text-muted-foreground/45"
                  : saveState === "error"
                    ? "text-destructive"
                    : "text-muted-foreground/70",
              )}
            >
              {saveState === "saving" && (
                <Loader2 className="size-2.5 animate-spin" />
              )}
              {saveState === "dirty" && "Unsaved changes"}
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Save failed"}
            </span>
            <UserAvatar
              name={currentUser.name}
              image={currentUser.image}
              className="size-5 border-0 [&_[data-slot=avatar-fallback]]:text-[6px]"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label="Page actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="size-3.5" />
                  Delete page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          placeholder="Untitled"
          maxLength={200}
          aria-label="Page title"
          className="mt-2 w-full bg-transparent text-[34px] leading-tight font-semibold tracking-[-0.04em] outline-none placeholder:text-muted-foreground/25 sm:text-[40px]"
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/55">
          <span>
            Last edited{" "}
            {page.lastEditedByName
              ? `by ${page.lastEditedByName} `
              : ""}
            {formatDistanceToNowStrict(new Date(page.updatedAt), {
              addSuffix: true,
            })}
          </span>
          <span className="text-muted-foreground/25">·</span>
          <span>Created by {page.createdByName}</span>
        </div>

        <div className="mt-7">
          <DocEditor
            workspaceId={workspaceId}
            initialContent={page.content}
            onChange={handleContentChange}
            onBlur={() => void flushContent()}
          />
        </div>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/40">
          <Upload className="size-2.5" />
          Type / to insert blocks, images, and file attachments.
        </p>
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void uploadCover(file);
        }}
      />

      <DeleteDocPageDialog
        page={page}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
