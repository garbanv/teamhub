"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

export function DeleteTaskDialog({
  task,
  workspaceId,
  workspaceSlug,
  open,
  onOpenChange,
}: {
  task: {
    id: string;
    identifier: string;
    title: string;
    projectKey: string;
    subtaskCount: number;
  };
  workspaceId: string;
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as {
        deleted?: { id: string; projectKey: string };
        error?: string;
      };
      if (!response.ok || !data.deleted) {
        throw new Error(data.error || "Could not delete the task.");
      }
      onOpenChange(false);
      toast.success(`${task.identifier} deleted.`);
      router.push(
        `/w/${workspaceSlug}/projects/${data.deleted.projectKey}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete the task.",
      );
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26.875rem]">
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="size-4" />
          </div>
          <DialogTitle className="break-words">
            Delete {task.identifier}?
          </DialogTitle>
          <DialogDescription>
            “{task.title}” will be permanently deleted
            {task.subtaskCount > 0
              ? ` along with ${task.subtaskCount} subtask${task.subtaskCount === 1 ? "" : "s"}`
              : ""}
            , its comments, activity, links, and notifications. This cannot be
            undone.
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
          <Button variant="destructive" onClick={remove} disabled={deleting}>
            {deleting && <Loader2 className="size-3.5 animate-spin" />}
            Delete task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
