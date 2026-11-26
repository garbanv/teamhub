"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  CalendarRange,
  Check,
  Columns3,
  Filter,
  LayoutList,
  Loader2,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { priorityMeta } from "@/lib/colors";
import {
  countTaskFilters,
  dueFilterLabels,
  dueFilterOptions,
  hasTaskFilters,
  projectViewHref,
  taskSortLabels,
  taskSortOptions,
  type ProjectTaskView,
  type TaskDueFilter,
  type TaskFilterState,
  type TaskSortOption,
} from "@/lib/task-view";
import type {
  ProjectStatusItem,
  SavedProjectView,
  TaskLabel,
  TaskPriority,
  WorkspaceMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const viewOptions: Array<{
  value: ProjectTaskView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "list", label: "List", icon: LayoutList },
  { value: "board", label: "Board", icon: Columns3 },
  { value: "timeline", label: "Timeline", icon: CalendarRange },
];

function viewIcon(view: ProjectTaskView) {
  return viewOptions.find((item) => item.value === view)?.icon ?? LayoutList;
}

export function ProjectViewControls({
  basePath,
  workspaceId,
  projectId,
  view,
  filters,
  sort,
  savedId,
  taskCount,
  statuses,
  members,
  labels,
  savedViews,
  currentUserId,
}: {
  basePath: string;
  workspaceId: string;
  projectId: string;
  view: ProjectTaskView;
  filters: TaskFilterState;
  sort: TaskSortOption;
  savedId: string | null;
  taskCount: number;
  statuses: ProjectStatusItem[];
  members: WorkspaceMember[];
  labels: TaskLabel[];
  savedViews: SavedProjectView[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState(filters);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [viewName, setViewName] = React.useState("");
  const [shared, setShared] = React.useState(false);

  const activeSaved = savedViews.find((saved) => saved.id === savedId) ?? null;
  const activeFilterCount = countTaskFilters(filters);
  const activeFilters = hasTaskFilters(filters);
  const myViews = savedViews.filter((saved) => saved.ownerId === currentUserId);
  const sharedViews = savedViews.filter(
    (saved) => saved.ownerId !== currentUserId,
  );

  React.useEffect(() => {
    if (filterOpen) setDraftFilters(filters);
  }, [filterOpen, filters]);

  function navigate(input: {
    nextView?: ProjectTaskView;
    nextFilters?: TaskFilterState;
    nextSort?: TaskSortOption;
    savedId?: string | null;
  }) {
    router.push(
      projectViewHref(basePath, {
        view: input.nextView ?? view,
        filters: input.nextFilters ?? filters,
        sort: input.nextSort ?? sort,
        savedId: input.savedId ?? null,
      }),
    );
  }

  function applyFilters() {
    setFilterOpen(false);
    navigate({ nextFilters: draftFilters });
  }

  function clearFilters() {
    setDraftFilters({});
    setFilterOpen(false);
    navigate({ nextFilters: {} });
  }

  function removeFilter(key: keyof TaskFilterState) {
    const next = { ...filters };
    delete next[key];
    navigate({ nextFilters: next });
  }

  async function saveView(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewName.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/projects/${projectId}/views`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: viewName.trim(),
            layout: view,
            filters,
            sort,
            shared,
          }),
        },
      );
      const data = (await response.json()) as {
        view?: SavedProjectView;
        error?: string;
      };
      if (!response.ok || !data.view) {
        throw new Error(data.error || "Could not save the view.");
      }
      setSaveOpen(false);
      setViewName("");
      setShared(false);
      toast.success("View saved.");
      router.push(
        `${basePath}?saved=${encodeURIComponent(data.view.id)}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the view.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteActiveView() {
    if (!activeSaved || activeSaved.ownerId !== currentUserId) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/projects/${projectId}/views/${activeSaved.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Could not delete the view.");
      }
      toast.success("View deleted.");
      router.push(basePath);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete the view.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const chips: Array<{
    key: keyof TaskFilterState;
    label: string;
    color?: string;
  }> = [];

  if (filters.assignee) {
    chips.push({
      key: "assignee",
      label:
        filters.assignee === "unassigned"
          ? "Unassigned"
          : (members.find((member) => member.userId === filters.assignee)?.name ??
            "Unknown assignee"),
    });
  }
  if (filters.status) {
    chips.push({
      key: "status",
      label:
        statuses.find((status) => status.id === filters.status)?.name ??
        "Unknown status",
      color: statuses.find((status) => status.id === filters.status)?.color,
    });
  }
  if (filters.priority) {
    chips.push({
      key: "priority",
      label: priorityMeta[filters.priority].label,
      color: priorityMeta[filters.priority].color,
    });
  }
  if (filters.label) {
    chips.push({
      key: "label",
      label:
        labels.find((label) => label.id === filters.label)?.name ??
        "Unknown label",
      color: labels.find((label) => label.id === filters.label)?.color,
    });
  }
  if (filters.due) {
    chips.push({
      key: "due",
      label: dueFilterLabels[filters.due],
    });
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-8 items-center rounded-md border border-border/80 bg-card p-0.5">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => navigate({ nextView: option.value })}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded px-2.5 text-[0.6875rem] font-medium transition-colors",
                view === option.value
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={view === option.value}
            >
              <option.icon className="size-3.5" />
              {option.label}
            </button>
          ))}
        </div>

        <span className="text-[0.625rem] text-muted-foreground/55">
          {taskCount} task{taskCount === 1 ? "" : "s"}
          {activeFilters ? " matching" : ""}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(true)}
            className={cn(
              "h-8",
              activeFilterCount > 0 && "border-primary/30 bg-primary/5",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary/15 text-[0.5625rem] text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {view === "timeline" ? (
            <span className="flex h-8 items-center gap-1.5 rounded-md border border-border/80 bg-card px-2.5 text-[0.625rem] text-muted-foreground/60">
              <CalendarRange className="size-3" />
              By due date
            </span>
          ) : (
            <Select
              value={sort}
              onValueChange={(value) =>
                navigate({ nextSort: value as TaskSortOption })
              }
            >
              <SelectTrigger size="sm" className="h-8 w-[10.5rem] text-[0.6875rem]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="text-[0.5625rem] font-normal text-muted-foreground/45">
                    Sort
                  </span>
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {taskSortOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {taskSortLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Bookmark className="size-3.5" />
                <span className="max-w-[7.375rem] truncate">
                  {activeSaved ? activeSaved.name : "Saved views"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[16.25rem]">
              {savedViews.length === 0 ? (
                <div className="px-2 py-4 text-center">
                  <p className="text-[0.7188rem] font-medium">No saved views</p>
                  <p className="mt-1 text-[0.625rem] text-muted-foreground">
                    Set filters and save the view for next time.
                  </p>
                </div>
              ) : (
                <>
                  {myViews.length > 0 && (
                    <>
                      <DropdownMenuLabel>My views</DropdownMenuLabel>
                      {myViews.map((saved) => {
                        const Icon = viewIcon(saved.layout);
                        return (
                          <DropdownMenuItem
                            key={saved.id}
                            onSelect={() =>
                              router.push(`${basePath}?saved=${saved.id}`)
                            }
                            className="gap-2"
                          >
                            <Icon className="size-3.5" />
                            <span className="min-w-0 flex-1 truncate">
                              {saved.name}
                            </span>
                            {savedId === saved.id && (
                              <Check className="size-3.5" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  )}
                  {sharedViews.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Shared with you</DropdownMenuLabel>
                      {sharedViews.map((saved) => {
                        const Icon = viewIcon(saved.layout);
                        return (
                          <DropdownMenuItem
                            key={saved.id}
                            onSelect={() =>
                              router.push(`${basePath}?saved=${saved.id}`)
                            }
                            className="gap-2"
                          >
                            <Icon className="size-3.5" />
                            <span className="min-w-0 flex-1 truncate">
                              {saved.name}
                            </span>
                            <span className="text-[0.5625rem] text-muted-foreground">
                              {saved.ownerName}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  )}
                  {activeSaved?.ownerId === currentUserId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={deleteActiveView}
                        disabled={deleting}
                        className="gap-2"
                      >
                        {deleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Delete “{activeSaved.name}”
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              setViewName(
                activeSaved
                  ? `${activeSaved.name} copy`
                  : `${taskSortLabels[sort]} view`,
              );
              setSaveOpen(true);
            }}
          >
            <Save className="size-3.5" />
            Save view
          </Button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeFilter(chip.key)}
              className="flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-1 text-[0.625rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              {chip.color && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: chip.color }}
                />
              )}
              {chip.label}
              <X className="size-2.5 opacity-50" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate({ nextFilters: {} })}
            className="ml-0.5 text-[0.625rem] text-muted-foreground/55 underline decoration-border underline-offset-4 hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-[29.375rem]">
          <DialogHeader>
            <DialogTitle>Filter tasks</DialogTitle>
            <DialogDescription>
              Narrow the project view by people, workflow, priority, labels, or
              due date.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select
                value={draftFilters.assignee ?? "any"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    assignee: value === "any" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Anyone</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={draftFilters.status ?? "any"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: value === "any" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any status</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={draftFilters.priority ?? "any"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    priority:
                      value === "any" ? undefined : (value as TaskPriority),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any priority</SelectItem>
                  {(Object.keys(priorityMeta) as TaskPriority[]).map(
                    (priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priorityMeta[priority].label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Label</Label>
              <Select
                value={draftFilters.label ?? "any"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    label: value === "any" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any label</SelectItem>
                  {labels.map((label) => (
                    <SelectItem key={label.id} value={label.id}>
                      {label.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Due date</Label>
              <Select
                value={draftFilters.due ?? "any"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    due: value === "any" ? undefined : (value as TaskDueFilter),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any due date</SelectItem>
                  {dueFilterOptions.map((due) => (
                    <SelectItem key={due} value={due}>
                      {dueFilterLabels[due]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              Clear filters
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFilterOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={applyFilters}>
                <Filter className="size-3.5" />
                Apply filters
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-[25rem]">
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              Keep the current {view} layout, filters, and sort order.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveView} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="saved-view-name">View name</Label>
              <Input
                id="saved-view-name"
                autoFocus
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                maxLength={60}
                required
                disabled={saving}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
              <input
                type="checkbox"
                checked={shared}
                onChange={(event) => setShared(event.target.checked)}
                className="mt-0.5 size-3.5 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-[0.7188rem] font-medium">
                  Share with the workspace
                </span>
                <span className="block text-[0.625rem] text-muted-foreground">
                  Everyone with project access can apply this view.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md border border-border bg-muted/25 px-2 py-1 text-[0.5938rem] text-muted-foreground capitalize">
                {view}
              </span>
              <span className="rounded-md border border-border bg-muted/25 px-2 py-1 text-[0.5938rem] text-muted-foreground">
                {taskSortLabels[sort]}
              </span>
              <span className="rounded-md border border-border bg-muted/25 px-2 py-1 text-[0.5938rem] text-muted-foreground">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSaveOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !viewName.trim()}>
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Save view
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
