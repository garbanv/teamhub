"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectColorChoices, statusCategoryMeta } from "@/lib/colors";
import {
  statusCategoryLabels,
  statusCategoryOrder,
} from "@/lib/project-constants";
import type {
  ProjectStatusCategory,
  ProjectStatusItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function sortStatuses(statuses: ProjectStatusItem[]) {
  return [...statuses].sort((a, b) => {
    const categoryDelta =
      statusCategoryOrder.indexOf(a.category) -
      statusCategoryOrder.indexOf(b.category);
    if (categoryDelta !== 0) return categoryDelta;
    return a.position - b.position;
  });
}

export function WorkflowManager({
  workspaceId,
  projectId,
  statuses: incoming,
  canManage,
}: {
  workspaceId: string;
  projectId: string;
  statuses: ProjectStatusItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = React.useState(sortStatuses(incoming));
  const [movingId, setMovingId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProjectStatusItem | null>(null);
  const [name, setName] = React.useState("");
  const [category, setCategory] =
    React.useState<ProjectStatusCategory>("todo");
  const [color, setColor] = React.useState("#94a3b8");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setStatuses(sortStatuses(incoming));
  }, [incoming]);

  function openAdd(nextCategory: ProjectStatusCategory) {
    setEditing(null);
    setName("");
    setCategory(nextCategory);
    setColor("#94a3b8");
    setDialogOpen(true);
  }

  function openEdit(status: ProjectStatusItem) {
    setEditing(status);
    setName(status.name);
    setCategory(status.category);
    setColor(status.color);
    setDialogOpen(true);
  }

  async function saveStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const endpoint = editing
        ? `/api/workspaces/${workspaceId}/projects/${projectId}/statuses/${editing.id}`
        : `/api/workspaces/${workspaceId}/projects/${projectId}/statuses`;
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category, color }),
      });
      const data = (await response.json()) as {
        status?: ProjectStatusItem;
        error?: string;
      };
      if (!response.ok || !data.status) {
        throw new Error(data.error || "Could not save the status.");
      }

      setStatuses((current) =>
        sortStatuses(
          editing
            ? current.map((item) =>
                item.id === data.status!.id ? data.status! : item,
              )
            : [...current, data.status!],
        ),
      );
      setDialogOpen(false);
      toast.success(editing ? "Status updated." : "Status added.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the status.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveStatus(
    status: ProjectStatusItem,
    direction: "up" | "down",
  ) {
    if (movingId) return;
    const group = statuses
      .filter((item) => item.category === status.category)
      .sort((a, b) => a.position - b.position);
    const index = group.findIndex((item) => item.id === status.id);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= group.length) return;

    const reordered = [...group];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved!);
    const previous = statuses;
    setMovingId(status.id);
    setStatuses((current) =>
      sortStatuses(
        current.map((item) => {
          const nextPosition = reordered.findIndex(
            (entry) => entry.id === item.id,
          );
          return nextPosition >= 0
            ? { ...item, position: nextPosition }
            : item;
        }),
      ),
    );

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/projects/${projectId}/statuses/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: status.category,
            statusIds: reordered.map((item) => item.id),
          }),
        },
      );
      const data = (await response.json()) as {
        statuses?: ProjectStatusItem[];
        error?: string;
      };
      if (!response.ok || !data.statuses) {
        throw new Error(data.error || "Could not reorder statuses.");
      }
      setStatuses(sortStatuses(data.statuses));
      router.refresh();
    } catch (error) {
      setStatuses(previous);
      toast.error(
        error instanceof Error ? error.message : "Could not reorder statuses.",
      );
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[12.5px] font-medium">Workflow statuses</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
            {canManage
              ? "Grouped into five fixed categories. Move statuses within a category to set their order."
              : "Grouped into five fixed categories. Ask an admin to make changes."}
          </p>
        </div>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAdd("todo")}
          >
            <Plus className="size-3.5" />
            Add status
          </Button>
        )}
      </div>

      <div className="divide-y divide-border/60">
        {statusCategoryOrder.map((groupCategory) => {
          const group = statuses
            .filter((status) => status.category === groupCategory)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={groupCategory} className="px-4 py-3 sm:px-5">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    backgroundColor: statusCategoryMeta[groupCategory].color,
                  }}
                />
                <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/65 uppercase">
                  {statusCategoryLabels[groupCategory]}
                </p>
                <span className="text-[9.5px] text-muted-foreground/40">
                  {group.length}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => openAdd(groupCategory)}
                    className="ml-auto flex size-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={`Add status to ${statusCategoryLabels[groupCategory]}`}
                  >
                    <Plus className="size-3" />
                  </button>
                )}
              </div>

              {group.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/80 px-3 py-2 text-[10.5px] text-muted-foreground/55">
                  No statuses in this category.
                </div>
              ) : (
                <div className="space-y-1">
                  {group.map((status, index) => (
                    <div
                      key={status.id}
                      className="group flex h-8 items-center gap-2 rounded-md border border-transparent px-2 transition-colors hover:border-border/70 hover:bg-muted/30"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px]">
                        {status.name}
                      </span>
                      {canManage && (
                        <>
                          <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                            <button
                              type="button"
                              className="flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                              onClick={() => moveStatus(status, "up")}
                              disabled={index === 0 || movingId === status.id}
                              aria-label={`Move ${status.name} up`}
                            >
                              {movingId === status.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <ArrowUp className="size-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                              onClick={() => moveStatus(status, "down")}
                              disabled={
                                index === group.length - 1 ||
                                movingId === status.id
                              }
                              aria-label={`Move ${status.name} down`}
                            >
                              <ArrowDown className="size-3" />
                            </button>
                            <button
                              type="button"
                              className="flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                              onClick={() => openEdit(status)}
                              aria-label={`Edit ${status.name}`}
                            >
                              <Pencil className="size-3" />
                            </button>
                          </div>
                          <span className="text-[9px] text-muted-foreground/30">
                            {index + 1}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "Add a status"}
            </DialogTitle>
            <DialogDescription>
              Statuses belong to one of the five workflow categories.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveStatus} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="status-name">Name</Label>
              <Input
                id="status-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="In review"
                required
                maxLength={40}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as ProjectStatusCategory)
                }
                disabled={saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusCategoryOrder.map((item) => (
                    <SelectItem key={item} value={item}>
                      {statusCategoryLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {projectColorChoices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setColor(choice)}
                    aria-label={`Use color ${choice}`}
                    aria-pressed={color === choice}
                    className={cn(
                      "size-6 rounded-full border-2 transition-transform hover:scale-110",
                      color === choice
                        ? "border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: choice }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {editing ? "Save status" : "Add status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
