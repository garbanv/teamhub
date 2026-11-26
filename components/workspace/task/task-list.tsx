import Link from "next/link";
import { CircleCheck, ListTree } from "lucide-react";
import {
  format,
  isBefore,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from "date-fns";

import { NewTaskButton } from "@/components/workspace/task/quick-create-task";
import { TaskPriorityIcon } from "@/components/workspace/task/task-priority-icon";
import { AssigneeStack } from "@/components/workspace/task/assignee-stack";
import { Card, EmptyState } from "@/components/workspace/page";
import type { ProjectStatusItem, TaskListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function DueDate({ task }: { task: TaskListItem }) {
  if (!task.dueDate) return null;
  const due = parseISO(task.dueDate);
  const overdue =
    task.statusCategory !== "done" &&
    task.statusCategory !== "canceled" &&
    isBefore(due, startOfDay(new Date()));
  const today = isToday(due);
  const tomorrow = isTomorrow(due);
  const label = today
    ? "Today"
    : tomorrow
      ? "Tomorrow"
      : format(due, "MMM d");

  return (
    <span
      className={cn(
        "hidden min-w-[3rem] items-center justify-end gap-1 text-[0.625rem] whitespace-nowrap sm:flex",
        overdue
          ? "font-medium text-destructive"
          : today
            ? "font-medium text-amber-600 dark:text-amber-300"
            : "text-muted-foreground/65",
      )}
    >
      {label}
    </span>
  );
}

function LabelChips({ task }: { task: TaskListItem }) {
  if (task.labels.length === 0) return null;
  return (
    <span className="hidden items-center gap-1 lg:flex">
      {task.labels.slice(0, 2).map((label) => (
        <span
          key={label.id}
          className="flex items-center gap-1 rounded border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[0.5625rem] text-muted-foreground"
        >
          <span
            className="size-1 rounded-full"
            style={{ backgroundColor: label.color }}
          />
          {label.name}
        </span>
      ))}
      {task.labels.length > 2 && (
        <span className="text-[0.5625rem] text-muted-foreground/50">
          +{task.labels.length - 2}
        </span>
      )}
    </span>
  );
}

export function TaskRow({
  task,
  workspaceSlug,
  showStatus = false,
  showProject = false,
}: {
  task: TaskListItem;
  workspaceSlug: string;
  showStatus?: boolean;
  showProject?: boolean;
}) {
  return (
    <Link
      href={`/w/${workspaceSlug}/tasks/${task.id}`}
      className="group flex h-10 items-center gap-2.5 px-3 transition-colors hover:bg-muted/35"
    >
      <TaskPriorityIcon priority={task.priority} />
      <span className="hidden w-[3.625rem] shrink-0 font-mono text-[0.5938rem] tracking-wide text-muted-foreground/55 sm:inline">
        {task.identifier}
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.7812rem] text-foreground/90 group-hover:text-foreground">
        {task.title}
      </span>

      <LabelChips task={task} />

      {task.subtaskCount > 0 && (
        <span className="hidden items-center gap-0.5 text-[0.5938rem] text-muted-foreground/50 sm:flex">
          <ListTree className="size-3" />
          {task.subtaskCount}
        </span>
      )}

      {showProject && (
        <span
          className="hidden max-w-[9.375rem] items-center gap-1.5 rounded border border-border/70 bg-muted/25 px-1.5 py-0.5 text-[0.5938rem] text-foreground/75 sm:flex"
          title={task.projectName}
        >
          <span
            className="size-1.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: task.projectColor }}
          />
          <span className="truncate">{task.projectName}</span>
        </span>
      )}

      {showStatus && (
        <span className="hidden items-center gap-1.5 rounded border border-border/70 bg-card px-1.5 py-0.5 text-[0.5938rem] text-muted-foreground md:flex">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: task.statusColor }}
          />
          {task.statusName}
        </span>
      )}

      <DueDate task={task} />

      <AssigneeStack
        assignees={task.assignees}
        max={3}
        avatarClassName="size-5 border-0 [&_[data-slot=avatar-fallback]]:text-[0.4375rem]"
      />
    </Link>
  );
}

export function ProjectTaskList({
  project,
  statuses,
  tasks,
  workspaceSlug,
  canCreate = true,
  isFiltered = false,
}: {
  project: { id: string; key: string; name: string };
  statuses: ProjectStatusItem[];
  tasks: TaskListItem[];
  workspaceSlug: string;
  canCreate?: boolean;
  isFiltered?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CircleCheck}
          title={isFiltered ? "No tasks match this view" : "No tasks yet"}
          description={
            isFiltered
              ? "Try removing a filter or clearing all filters to see more tasks."
              : `${project.name} is ready. Add the first task and it will show up here with its status, assignee, and due date.`
          }
          action={
            !isFiltered && canCreate ? (
              <NewTaskButton projectId={project.id} />
            ) : undefined
          }
        />
      </Card>
    );
  }

  const groups = statuses
    .map((status) => ({
      status,
      tasks: tasks.filter((task) => task.statusId === status.id),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <Card className="overflow-hidden">
      {groups.map((group, index) => (
        <section
          key={group.status.id}
          className={cn(index > 0 && "border-t border-border/60")}
        >
          <div className="flex h-8 items-center gap-2 bg-muted/20 px-3">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: group.status.color }}
            />
            <span className="text-[0.6562rem] font-semibold tracking-[0.02em]">
              {group.status.name}
            </span>
            <span className="text-[0.5938rem] tabular-nums text-muted-foreground/50">
              {group.tasks.length}
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {group.tasks.map((task) => (
              <TaskRow key={task.id} task={task} workspaceSlug={workspaceSlug} />
            ))}
          </div>
        </section>
      ))}
    </Card>
  );
}

export function PersonalTaskList({
  tasks,
  workspaceSlug,
  emptyTitle,
  emptyDescription,
}: {
  tasks: TaskListItem[];
  workspaceSlug: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CircleCheck}
          title={emptyTitle}
          description={emptyDescription}
          action={<NewTaskButton />}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border/50">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            workspaceSlug={workspaceSlug}
            showStatus
            showProject
          />
        ))}
      </div>
    </Card>
  );
}
