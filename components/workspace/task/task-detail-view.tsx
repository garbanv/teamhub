"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  CornerDownLeft,
  Link2,
  ListTree,
  Loader2,
  Plus,
  Search,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/workspace/rich-text-editor";
import { TaskConversation } from "@/components/workspace/task/task-conversation";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { priorityMeta, statusCategoryMeta } from "@/lib/colors";
import { statusCategoryOrder } from "@/lib/project-constants";
import type {
  NavSearchResult,
  ProjectStatusItem,
  SessionUser,
  TaskActivityEntry,
  TaskComment,
  TaskDetail,
  TaskLabel,
  TaskPriority,
  WorkspaceMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function taskHref(workspaceSlug: string, taskId: string) {
  return `/w/${workspaceSlug}/tasks/${taskId}`;
}

export function TaskDetailView({
  initialTask,
  workspaceId,
  workspaceSlug,
  members,
  statuses,
  labels,
  currentUser,
  comments,
  activities,
  initialFollowing,
}: {
  initialTask: TaskDetail;
  workspaceId: string;
  workspaceSlug: string;
  members: WorkspaceMember[];
  statuses: ProjectStatusItem[];
  labels: TaskLabel[];
  currentUser: SessionUser;
  comments: TaskComment[];
  activities: TaskActivityEntry[];
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [task, setTask] = React.useState(initialTask);
  const [title, setTitle] = React.useState(initialTask.title);
  const [savingTitle, setSavingTitle] = React.useState(false);
  const [savingField, setSavingField] = React.useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = React.useState("");
  const [addingSubtask, setAddingSubtask] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkQuery, setLinkQuery] = React.useState("");
  const [linkResults, setLinkResults] = React.useState<NavSearchResult[]>([]);
  const [searchingLinks, setSearchingLinks] = React.useState(false);
  const [linkingId, setLinkingId] = React.useState<string | null>(null);
  const [following, setFollowing] = React.useState(initialFollowing);
  const [togglingFollow, setTogglingFollow] = React.useState(false);

  React.useEffect(() => {
    setTask(initialTask);
    setTitle(initialTask.title);
  }, [initialTask]);

  React.useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  async function patchTask(
    payload: Record<string, unknown>,
    field?: string,
  ): Promise<TaskDetail | null> {
    if (field) setSavingField(field);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        task?: TaskDetail;
        error?: string;
      };
      if (!response.ok || !data.task) {
        throw new Error(data.error || "Could not update the task.");
      }
      setTask(data.task);
      router.refresh();
      return data.task;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the task.",
      );
      return null;
    } finally {
      if (field) setSavingField(null);
    }
  }

  async function reloadTask() {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/tasks/${task.id}`,
    );
    const data = (await response.json()) as { task?: TaskDetail };
    if (response.ok && data.task) setTask(data.task);
    router.refresh();
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next || next === task.title) {
      setTitle(task.title);
      return;
    }
    setSavingTitle(true);
    const updated = await patchTask({ title: next });
    if (updated) {
      setTitle(updated.title);
      router.refresh();
    } else {
      setTitle(task.title);
    }
    setSavingTitle(false);
  }

  async function setStatus(statusId: string) {
    await patchTask({ statusId });
    router.refresh();
  }

  async function setAssignee(value: string) {
    await patchTask({ assigneeId: value === "unassigned" ? null : value });
  }

  async function setPriority(value: TaskPriority) {
    await patchTask({ priority: value });
  }

  async function setDueDate(value: string) {
    await patchTask({ dueDate: value || null });
    router.refresh();
  }

  async function toggleLabel(labelId: string) {
    if (savingField === "labels") return;
    const current = new Set(task.labels.map((label) => label.id));
    if (current.has(labelId)) current.delete(labelId);
    else current.add(labelId);
    await patchTask({ labelIds: [...current] }, "labels");
  }

  async function addSubtask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = subtaskTitle.trim();
    if (!nextTitle || addingSubtask) return;
    setAddingSubtask(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: task.projectId,
          parentTaskId: task.id,
          title: nextTitle,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not add the subtask.");
      }
      setSubtaskTitle("");
      await reloadTask();
      toast.success("Subtask added.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add the subtask.",
      );
    } finally {
      setAddingSubtask(false);
    }
  }

  async function addLink(result: NavSearchResult) {
    setLinkingId(result.id);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}/links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relatedTaskId: result.id }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not link the task.");
      }
      setLinkOpen(false);
      setLinkQuery("");
      setLinkResults([]);
      await reloadTask();
      toast.success("Task linked.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not link the task.",
      );
    } finally {
      setLinkingId(null);
    }
  }

  async function toggleFollow() {
    if (togglingFollow) return;
    setTogglingFollow(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}/follow`,
        { method: following ? "DELETE" : "PUT" },
      );
      const data = (await response.json()) as {
        following?: boolean;
        error?: string;
      };
      if (!response.ok || typeof data.following !== "boolean") {
        throw new Error(data.error || "Could not update follow state.");
      }
      setFollowing(data.following);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update follow state.",
      );
    } finally {
      setTogglingFollow(false);
    }
  }

  async function removeLink(linkId: string) {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}/links/${linkId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Could not remove the link.");
      }
      await reloadTask();
      toast.success("Link removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the link.",
      );
    }
  }

  React.useEffect(() => {
    if (!linkOpen) return;
    const trimmed = linkQuery.trim();
    if (!trimmed) {
      setLinkResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingLinks(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&workspace=${encodeURIComponent(workspaceSlug)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setLinkResults([]);
          return;
        }
        const data = (await response.json()) as { results: NavSearchResult[] };
        const existing = new Set(task.relatedTasks.map((item) => item.id));
        setLinkResults(
          data.results.filter(
            (result) =>
              result.type === "task" &&
              result.id !== task.id &&
              !existing.has(result.id),
          ),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLinkResults([]);
      } finally {
        setSearchingLinks(false);
      }
    }, 160);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [linkQuery, linkOpen, task.id, task.relatedTasks, workspaceSlug]);

  const statusGroups = statusCategoryOrder
    .map((category) => ({
      category,
      statuses: statuses.filter((status) => status.category === category),
    }))
    .filter((group) => group.statuses.length > 0);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
        <Link
          href={`/w/${workspaceSlug}/projects/${task.projectKey}`}
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <span
            className="size-2 rounded-[2px]"
            style={{ backgroundColor: task.projectColor }}
          />
          {task.projectName}
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="font-mono tracking-wide">{task.identifier}</span>
        {task.parentTask && (
          <>
            <span className="text-muted-foreground/30">/</span>
            <Link
              href={taskHref(workspaceSlug, task.parentTask.id)}
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <CornerDownLeft className="size-3" />
              {task.parentTask.identifier}
            </Link>
          </>
        )}
      </div>

      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-background"
          style={{ backgroundColor: task.statusColor }}
          title={task.statusName}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground/60 uppercase">
              {task.identifier}
            </span>
            {savingTitle && (
              <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground/50">
                <Loader2 className="size-2.5 animate-spin" />
                Saving
              </span>
            )}
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
            maxLength={500}
            aria-label="Task title"
            className="w-full rounded-sm border-b border-transparent bg-transparent pb-1 text-[25px] leading-tight font-semibold tracking-[-0.035em] outline-none transition-colors focus:border-border sm:text-[28px]"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFollow}
          disabled={togglingFollow}
          className="mt-1 shrink-0 text-muted-foreground"
          aria-pressed={following}
        >
          {togglingFollow ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : following ? (
            <BellRing className="size-3.5" />
          ) : (
            <Bell className="size-3.5" />
          )}
          <span className="hidden sm:inline">
            {following ? "Following" : "Follow"}
          </span>
        </Button>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_286px]">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground/60 uppercase">
              Description
            </p>
          </div>
          <RichTextEditor
            initialContent={task.description}
            onSave={async (json) => {
              const updated = await patchTask({ description: json }, "description");
              if (!updated) throw new Error("Could not save description.");
            }}
            placeholder="Add context, links, or acceptance criteria…"
          />

          <section className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground/65 uppercase">
                <ListTree className="size-3.5" />
                Subtasks
                <span className="text-[9px] font-normal text-muted-foreground/40">
                  {task.subtasks.length}
                </span>
              </h2>
            </div>

            <div className="overflow-hidden rounded-lg border border-border/80 bg-card">
              {task.subtasks.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-muted-foreground/60">
                  Break this task into smaller steps when it helps.
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {task.subtasks.map((subtask) => (
                    <Link
                      key={subtask.id}
                      href={taskHref(workspaceSlug, subtask.id)}
                      className="flex h-9 items-center gap-2 px-3 text-[11.5px] transition-colors hover:bg-muted/30"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subtask.statusColor }}
                      />
                      <span className="font-mono text-[9px] text-muted-foreground/50">
                        {subtask.identifier}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {subtask.title}
                      </span>
                      {subtask.assigneeName && (
                        <UserAvatar
                          name={subtask.assigneeName}
                          image={subtask.assigneeImage}
                          className="size-4 border-0 [&_[data-slot=avatar-fallback]]:text-[6px]"
                        />
                      )}
                    </Link>
                  ))}
                </div>
              )}
              <form
                onSubmit={addSubtask}
                className="flex items-center gap-1.5 border-t border-border/60 px-2 py-1.5"
              >
                <Plus className="size-3.5 text-muted-foreground/45" />
                <input
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  placeholder="Add a subtask…"
                  maxLength={500}
                  className="h-7 min-w-0 flex-1 bg-transparent px-1 text-[11.5px] outline-none placeholder:text-muted-foreground/45"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  disabled={!subtaskTitle.trim() || addingSubtask}
                  className="h-6 px-2 text-[10px]"
                >
                  {addingSubtask ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </form>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground/65 uppercase">
                <Link2 className="size-3.5" />
                Related tasks
                <span className="text-[9px] font-normal text-muted-foreground/40">
                  {task.relatedTasks.length}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setLinkOpen(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="size-3" />
                Link task
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border/80 bg-card">
              {task.relatedTasks.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-muted-foreground/60">
                  Link tasks that depend on each other or share context.
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {task.relatedTasks.map((related) => (
                    <div
                      key={related.linkId}
                      className="group flex h-9 items-center gap-2 px-3 text-[11.5px] transition-colors hover:bg-muted/30"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: related.statusColor }}
                      />
                      <span className="font-mono text-[9px] text-muted-foreground/50">
                        {related.identifier}
                      </span>
                      <Link
                        href={taskHref(workspaceSlug, related.id)}
                        className="min-w-0 flex-1 truncate hover:underline hover:decoration-border hover:underline-offset-4"
                      >
                        {related.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeLink(related.linkId)}
                        aria-label={`Remove link to ${related.identifier}`}
                        className="flex size-5 items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-opacity hover:bg-accent hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <TaskConversation
            taskId={task.id}
            workspaceId={workspaceId}
            members={members}
            currentUser={currentUser}
            comments={comments}
            activities={activities}
          />
        </div>

        <aside className="order-1 lg:order-2">
          <div className="rounded-xl border border-border/80 bg-card p-3.5 lg:sticky lg:top-[68px]">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <h2 className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/60 uppercase">
                Properties
              </h2>
              {savingField && (
                <Loader2 className="size-3 animate-spin text-muted-foreground/50" />
              )}
            </div>

            <div className="space-y-0.5">
              <PropertyRow label="Status" icon={CircleAlert}>
                <Select value={task.statusId} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 w-full border-transparent bg-transparent px-1.5 text-[11.5px] shadow-none hover:bg-accent focus-visible:ring-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: task.statusColor }}
                      />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {statusGroups.map((group) => (
                      <SelectGroup key={group.category}>
                        <SelectLabel>
                          {statusCategoryMeta[group.category].label}
                        </SelectLabel>
                        {group.statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>

              <PropertyRow label="Assignee" icon={UserRound}>
                <Select
                  value={task.assigneeId ?? "unassigned"}
                  onValueChange={setAssignee}
                >
                  <SelectTrigger className="h-8 w-full border-transparent bg-transparent px-1.5 text-[11.5px] shadow-none hover:bg-accent focus-visible:ring-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {task.assigneeName ? (
                        <UserAvatar
                          name={task.assigneeName}
                          image={task.assigneeImage}
                          className="size-4 border-0 [&_[data-slot=avatar-fallback]]:text-[6px]"
                        />
                      ) : null}
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>

              <PropertyRow label="Priority" icon={CircleAlert}>
                <Select
                  value={task.priority}
                  onValueChange={(value) => setPriority(value as TaskPriority)}
                >
                  <SelectTrigger className="h-8 w-full border-transparent bg-transparent px-1.5 text-[11.5px] shadow-none hover:bg-accent focus-visible:ring-0">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: priorityMeta[task.priority].color }}
                      />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(priorityMeta) as TaskPriority[]).map(
                      (priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priorityMeta[priority].label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </PropertyRow>

              <PropertyRow label="Due date" icon={CalendarDays}>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={task.dueDate ?? ""}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-[11px] outline-none hover:bg-accent focus:border-border focus:bg-card"
                    aria-label="Due date"
                  />
                  {task.dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate("")}
                      aria-label="Clear due date"
                      className="flex size-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-2.5" />
                    </button>
                  )}
                </div>
              </PropertyRow>

              <PropertyRow label="Labels" icon={Tag}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-8 w-full flex-wrap items-center gap-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[11px] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                    >
                      {task.labels.length === 0 ? (
                        <span className="text-muted-foreground/45">None</span>
                      ) : (
                        task.labels.map((label) => (
                          <span
                            key={label.id}
                            className="flex items-center gap-1 rounded border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[9px]"
                          >
                            <span
                              className="size-1 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            {label.name}
                          </span>
                        ))
                      )}
                      <ChevronDown className="ml-auto size-3 shrink-0 text-muted-foreground/40" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[210px]">
                    <DropdownMenuLabel>Labels</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {labels.length === 0 ? (
                      <DropdownMenuItem disabled>No labels</DropdownMenuItem>
                    ) : (
                      labels.map((label) => (
                        <DropdownMenuCheckboxItem
                          key={label.id}
                          checked={task.labels.some(
                            (item) => item.id === label.id,
                          )}
                          onCheckedChange={() => toggleLabel(label.id)}
                          onSelect={(event) => event.preventDefault()}
                          disabled={savingField === "labels"}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </DropdownMenuCheckboxItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </PropertyRow>
            </div>

            <div className="my-3 h-px bg-border/60" />

            <div className="space-y-2 px-0.5 text-[10px] text-muted-foreground">
              <Link
                href={`/w/${workspaceSlug}/projects/${task.projectKey}`}
                className="flex items-center justify-between transition-colors hover:text-foreground"
              >
                <span>Project</span>
                <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                  <span
                    className="size-1.5 rounded-[2px]"
                    style={{ backgroundColor: task.projectColor }}
                  />
                  {task.projectKey}
                </span>
              </Link>
              <div className="flex items-center justify-between gap-2">
                <span>Created by</span>
                <span className="flex items-center gap-1.5 font-medium text-foreground/75">
                  <UserAvatar
                    name={task.createdByName}
                    image={task.createdByImage}
                    className="size-4 border-0 [&_[data-slot=avatar-fallback]]:text-[6px]"
                  />
                  {task.createdByName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span title={format(new Date(task.createdAt), "PPpp")}>
                  {formatDistanceToNowStrict(new Date(task.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated</span>
                <span title={format(new Date(task.updatedAt), "PPpp")}>
                  {formatDistanceToNowStrict(new Date(task.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Link a related task</DialogTitle>
            <DialogDescription>
              Search by title or task ID. Links are shown on both tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              autoFocus
              value={linkQuery}
              onChange={(event) => setLinkQuery(event.target.value)}
              placeholder="Search tasks…"
              className="pl-8"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {searchingLinks ? (
              <div className="flex items-center justify-center py-8 text-[11px] text-muted-foreground">
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Searching…
              </div>
            ) : linkResults.length === 0 ? (
              <p className="py-8 text-center text-[11px] text-muted-foreground/60">
                {linkQuery.trim()
                  ? "No matching tasks."
                  : "Start typing to find a task."}
              </p>
            ) : (
              <div className="space-y-0.5 pt-2">
                {linkResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => addLink(result)}
                    disabled={Boolean(linkingId)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11.5px] transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: result.color ?? "#94a3b8" }}
                    />
                    <span className="font-mono text-[9px] text-muted-foreground/60">
                      {result.subtitle}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {result.title}
                    </span>
                    {linkingId === result.id && (
                      <Loader2 className="size-3 animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3 shrink-0 text-muted-foreground/45" />
      <div className="grid min-w-0 flex-1 grid-cols-[78px_1fr] items-center gap-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        {children}
      </div>
    </div>
  );
}
