"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  MoreHorizontal,
  Settings2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectSummary } from "@/lib/types";

export function ProjectActionsMenu({
  project,
  workspaceId,
  workspaceSlug,
}: {
  project: ProjectSummary;
  workspaceId: string;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const archived = Boolean(project.archivedAt);

  async function toggleArchive() {
    setWorking(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/projects/${project.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: !archived }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not update the project.");
      }
      toast.success(archived ? "Project restored." : "Project archived.");
      setConfirmOpen(false);
      router.refresh();

      if (
        !archived &&
        pathname.startsWith(`/w/${workspaceSlug}/projects/${project.key}`)
      ) {
        router.push(`/w/${workspaceSlug}/projects`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the project.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={`Actions for ${project.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[190px]">
          <DropdownMenuItem asChild>
            <Link
              href={`/w/${workspaceSlug}/projects/${project.key}/settings`}
              className="gap-2"
            >
              <Settings2 className="size-3.5" />
              Project settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => setConfirmOpen(true)}
          >
            {archived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
            {archived ? "Restore project" : "Archive project"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {archived ? "Restore" : "Archive"} {project.name}?
            </DialogTitle>
            <DialogDescription>
              {archived
                ? "This project will return to the active project list."
                : "The project will leave the sidebar and active project list. Tasks and workflow are kept, and you can restore it later."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={working}
            >
              Cancel
            </Button>
            <Button onClick={toggleArchive} disabled={working}>
              {working && <Loader2 className="size-3.5 animate-spin" />}
              {archived ? "Restore project" : "Archive project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
