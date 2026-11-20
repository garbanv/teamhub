"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocPageListItem } from "@/lib/types";

export function DeleteDocPageDialog({
  page,
  workspaceId,
  workspaceSlug,
  descendantCount,
  open,
  onOpenChange,
  onDeleted,
}: {
  page: Pick<DocPageListItem, "id" | "title"> | null;
  workspaceId: string;
  workspaceSlug: string;
  descendantCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (result: {
    deletedIds: string[];
    pages: DocPageListItem[];
  }) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [deleting, setDeleting] = React.useState(false);

  async function remove() {
    if (!page || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/docs/pages/${page.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as {
        deletedIds?: string[];
        pages?: DocPageListItem[];
        error?: string;
      };
      if (!response.ok || !data.deletedIds || !data.pages) {
        throw new Error(data.error || "Could not delete the page.");
      }

      const currentId = pathname.match(/\/docs\/([^/]+)/)?.[1] ?? null;
      onOpenChange(false);
      onDeleted?.({ deletedIds: data.deletedIds, pages: data.pages });
      toast.success(
        descendantCount && descendantCount > 0
          ? "Page and nested pages deleted."
          : "Page deleted.",
      );

      if (currentId && data.deletedIds.includes(currentId)) {
        router.push(`/w/${workspaceSlug}/docs`);
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete the page.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[410px]">
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="size-4" />
          </div>
          <DialogTitle>Delete “{page?.title || "Untitled"}”?</DialogTitle>
          <DialogDescription>
            This permanently deletes the page
            {descendantCount && descendantCount > 0
              ? ` and ${descendantCount} nested page${descendantCount === 1 ? "" : "s"}`
              : " and any nested pages"}
            . This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={remove}
            disabled={deleting}
          >
            {deleting && <Loader2 className="size-3.5 animate-spin" />}
            Delete page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
