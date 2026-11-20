"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  GripVertical,
  ListTree,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { format, isBefore, isToday, isTomorrow, parseISO, startOfDay } from "date-fns";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { TaskPriorityIcon } from "@/components/workspace/task/task-priority-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectStatusItem, TaskListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectBoard({
  workspaceId,
  workspaceSlug,
  statuses,
  initialTasks,
}: {
  workspaceId: string;
  workspaceSlug: string;
  statuses: ProjectStatusItem[];
  initialTasks: TaskListItem[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = React.useState(initialTasks);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [overStatus, setOverStatus] = React.useState<string | null>(null);
  const [movingId, setMovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  async function moveTask(taskId: string, status: ProjectStatusItem) {
    const current = tasks.find((task) => task.id === taskId);
    if (!current || current.statusId === status.id || movingId) return;

    const previous = tasks;
    setMovingId(taskId);
    setTasks((items) =>
      items.map((task) =>
        task.id === taskId
          ? {
              ...task,
              statusId: status.id,
              statusName: status.name,
              statusColor: status.color,
              statusCategory: status.category,
            }
          : task,
      ),
    );

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusId: status.id }),
        },
      );
      const data = (await response.json()) as {
        task?: TaskListItem;
        error?: string;
      };
      if (!response.ok || !data.task) {
        throw new Error(data.error || "Could not move the task.");
      }
      setTasks((items) =>
        items.map((task) => (task.id === taskId ? data.task! : task)),
      );
      router.refresh();
    } catch (error) {
      setTasks(previous);
      toast.error(
        error instanceof Error ? error.message : "Could not move the task.",
      );
    } finally {
      setMovingId(null);
      setDraggingId(null);
      setOverStatus(null);
    }
  }

  return (
    <div className="hub-scrollbar mt-3 flex gap-3 overflow-x-auto pb-3">
      {statuses.map((status) => {
        const columnTasks = tasks.filter(
          (task) => task.statusId === status.id,
        );
        return (
          <section
            key={status.id}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOverStatus(status.id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setOverStatus((current) =>
                  current === status.id ? null : current,
                );
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("text/plain");
              if (taskId) void moveTask(taskId, status);
            }}
            className={cn(
              "flex w-[284px] shrink-0 flex-col rounded-xl border border-border/70 bg-muted/20 transition-colors",
              overStatus === status.id &&
                "border-primary/40 bg-primary/[0.04] ring-2 ring-primary/10",
            )}
          >
            <header className="flex h-9 shrink-0 items-center gap-2 px-3">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span className="text-[11px] font-semibold">{status.name}</span>
              <span className="text-[9.5px] tabular-nums text-muted-foreground/50">
                {columnTasks.length}
              </span>
            </header>

            <div className="hub-scrollbar flex max-h-[calc(100vh-260px)] min-h-[140px] flex-col gap-2 overflow-y-auto px-2 pb-2">
              {columnTasks.map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  workspaceSlug={workspaceSlug}
                  statuses={statuses}
                  dragging={draggingId === task.id}
                  moving={movingId === task.id}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", task.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingId(task.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverStatus(null);
                  }}
                  onMove={(nextStatus) => moveTask(task.id, nextStatus)}
                />
              ))}

              {columnTasks.length === 0 && (
                <div className="flex min-h-[110px] flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-3 text-center text-[10px] text-muted-foreground/45">
                  {draggingId ? "Drop here" : "No tasks"}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardCard({
  task,
  workspaceSlug,
  statuses,
  dragging,
  moving,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  task: TaskListItem;
  workspaceSlug: string;
  statuses: ProjectStatusItem[];
  dragging: boolean;
  moving: boolean;
  onDragStart: React.DragEventHandler<HTMLElement>;
  onDragEnd: React.DragEventHandler<HTMLElement>;
  onMove: (status: ProjectStatusItem) => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative cursor-grab rounded-lg border border-border/80 bg-card p-2.5 shadow-[0_1px_2px_rgba(16,16,24,0.03)] transition-[opacity,box-shadow,border-color] active:cursor-grabbing",
        dragging && "opacity-40",
        moving && "opacity-70",
      )}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="size-3 text-muted-foreground/15 opacity-0 transition-opacity group-hover:opacity-100" />
        <TaskPriorityIcon priority={task.priority} />
        <span className="font-mono text-[9px] tracking-wide text-muted-foreground/55">
          {task.identifier}
        </span>
        {moving && (
          <Loader2 className="size-2.5 animate-spin text-muted-foreground/50" />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Move ${task.identifier}`}
              className="ml-auto flex size-5 items-center justify-center rounded text-muted-foreground/40 opacity-100 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <MoreHorizontal className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[190px]">
            <DropdownMenuLabel>Move to status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statuses.map((status) => (
              <DropdownMenuItem
                key={status.id}
                disabled={status.id === task.statusId}
                onSelect={() => onMove(status)}
                className="gap-2"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                {status.name}
                {status.id === task.statusId && (
                  <ArrowRight className="ml-auto size-3 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link
        href={`/w/${workspaceSlug}/tasks/${task.id}`}
        className="mt-1.5 block text-[12px] leading-4.5 font-medium text-foreground/90 hover:underline hover:decoration-border hover:underline-offset-4"
      >
        {task.title}
      </Link>

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="flex items-center gap-1 rounded border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[9px] text-muted-foreground"
            >
              <span
                className="size-1 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[9px] text-muted-foreground/45">
              +{task.labels.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 border-t border-border/50 pt-2">
        {task.dueDate ? (
          <span
            className={cn(
              "flex items-center gap-1 text-[9.5px] text-muted-foreground/60",
              task.statusCategory !== "done" &&
                task.statusCategory !== "canceled" &&
                isBefore(
                  parseISO(task.dueDate),
                  startOfDay(new Date()),
                ) &&
                "font-medium text-destructive",
            )}
          >
            <CalendarDays className="size-2.5" />
            {isToday(parseISO(task.dueDate))
              ? "Today"
              : isTomorrow(parseISO(task.dueDate))
                ? "Tomorrow"
                : format(parseISO(task.dueDate), "MMM d")}
          </span>
        ) : (
          <span className="text-[9.5px] text-muted-foreground/30">No date</span>
        )}

        {task.subtaskCount > 0 && (
          <span className="flex items-center gap-0.5 text-[9.5px] text-muted-foreground/50">
            <ListTree className="size-2.5" />
            {task.subtaskCount}
          </span>
        )}

        <span className="ml-auto">
          {task.assigneeName ? (
            <UserAvatar
              name={task.assigneeName}
              image={task.assigneeImage}
              className="size-4.5 border-0 [&_[data-slot=avatar-fallback]]:text-[6px]"
            />
          ) : (
            <span className="block size-4.5 rounded-full border border-dashed border-border/70" />
          )}
        </span>
      </div>
    </article>
  );
}
