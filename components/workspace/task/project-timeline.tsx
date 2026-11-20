import Link from "next/link";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isWeekend,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { CalendarRange, ListTree } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { TaskPriorityIcon } from "@/components/workspace/task/task-priority-icon";
import type { TaskListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_COUNT = 42;

export function ProjectTimeline({
  tasks,
  workspaceSlug,
}: {
  tasks: TaskListItem[];
  workspaceSlug: string;
}) {
  const today = startOfDay(new Date());
  const start = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
  const days = Array.from({ length: DAY_COUNT }, (_, index) =>
    addDays(start, index),
  );
  const todayIndex = differenceInCalendarDays(today, start);

  const scheduled = tasks
    .filter((task) => task.dueDate)
    .sort(
      (a, b) =>
        parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime(),
    );
  const unscheduled = tasks.filter((task) => !task.dueDate);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-card">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground/60">
            <CalendarRange className="size-4" />
          </span>
          <p className="mt-3 text-[13px] font-medium">No tasks to plot</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tasks with due dates will appear on this timeline.
          </p>
        </div>
      ) : (
        <div className="hub-scrollbar overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="sticky top-0 z-10 flex border-b border-border/70 bg-card">
              <div className="sticky left-0 z-20 flex h-12 w-[260px] shrink-0 items-end border-r border-border/60 bg-card px-3 pb-2">
                <span className="text-[9.5px] font-semibold tracking-[0.12em] text-muted-foreground/55 uppercase">
                  Task
                </span>
                <span className="ml-auto text-[9px] text-muted-foreground/40">
                  {format(start, "MMM d")} –{" "}
                  {format(addDays(start, DAY_COUNT - 1), "MMM d")}
                </span>
              </div>
              <div
                className="grid flex-1"
                style={{
                  gridTemplateColumns: `repeat(${DAY_COUNT}, minmax(0, 1fr))`,
                }}
              >
                {days.map((day, index) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex h-12 flex-col items-center justify-end border-r border-border/35 pb-1.5",
                      index % 7 === 0 && "border-l border-border/60",
                      isWeekend(day) && "bg-muted/25",
                      isToday(day) && "bg-primary/[0.055]",
                    )}
                  >
                    <span className="text-[8px] tracking-wide text-muted-foreground/45 uppercase">
                      {format(day, "EEEEE")}
                    </span>
                    <span
                      className={cn(
                        "mt-1 flex size-5 items-center justify-center rounded-full text-[9px] tabular-nums text-muted-foreground/70",
                        isToday(day) &&
                          "bg-primary font-semibold text-primary-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {scheduled.map((task) => {
              const due = parseISO(task.dueDate!);
              const rawIndex = differenceInCalendarDays(due, start);
              const index = Math.max(0, Math.min(DAY_COUNT - 1, rawIndex));
              const outOfRange = rawIndex < 0 || rawIndex >= DAY_COUNT;

              return (
                <div
                  key={task.id}
                  className="group flex border-b border-border/45 last:border-b-0 hover:bg-muted/15"
                >
                  <div className="sticky left-0 z-10 flex h-9 w-[260px] shrink-0 items-center gap-2 border-r border-border/55 bg-card px-3 group-hover:bg-muted/10">
                    <TaskPriorityIcon
                      priority={task.priority}
                      className="size-3"
                    />
                    <span className="w-[50px] shrink-0 font-mono text-[9px] text-muted-foreground/50">
                      {task.identifier}
                    </span>
                    <Link
                      href={`/w/${workspaceSlug}/tasks/${task.id}`}
                      className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground/80 hover:underline hover:decoration-border hover:underline-offset-4"
                    >
                      {task.title}
                    </Link>
                    {task.subtaskCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[8.5px] text-muted-foreground/40">
                        <ListTree className="size-2.5" />
                        {task.subtaskCount}
                      </span>
                    )}
                    {task.assigneeName && (
                      <UserAvatar
                        name={task.assigneeName}
                        image={task.assigneeImage}
                        className="size-4 border-0 [&_[data-slot=avatar-fallback]]:text-[5px]"
                      />
                    )}
                  </div>

                  <div
                    className="relative grid flex-1"
                    style={{
                      gridTemplateColumns: `repeat(${DAY_COUNT}, minmax(0, 1fr))`,
                    }}
                  >
                    {days.map((day, dayIndex) => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "h-9 border-r border-border/25",
                          dayIndex % 7 === 0 && "border-l border-border/50",
                          isWeekend(day) && "bg-muted/15",
                          isToday(day) && "bg-primary/[0.04]",
                        )}
                      />
                    ))}

                    <Link
                      href={`/w/${workspaceSlug}/tasks/${task.id}`}
                      className={cn(
                        "absolute top-1/2 flex h-[18px] -translate-y-1/2 items-center gap-1 rounded-full px-1.5 text-[8px] font-medium text-white shadow-sm transition-transform hover:scale-105",
                        outOfRange && "ring-2 ring-background",
                      )}
                      style={{
                        left: `calc(${(index / DAY_COUNT) * 100}% + 2px)`,
                        backgroundColor: task.statusColor,
                        maxWidth: `calc(${100 / DAY_COUNT}% * 2.4)`,
                      }}
                      title={`${task.identifier} · due ${format(due, "MMM d, yyyy")}`}
                    >
                      <span className="truncate">
                        {isToday(due)
                          ? "Today"
                          : format(due, "MMM d")}
                      </span>
                    </Link>

                    {todayIndex >= 0 && todayIndex < DAY_COUNT && (
                      <div
                        className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/30"
                        style={{
                          left: `${((todayIndex + 0.5) / DAY_COUNT) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {unscheduled.length > 0 && (
              <div className="border-t border-border/70 bg-muted/15">
                <div className="flex h-8 items-center border-b border-border/40 px-3">
                  <span className="text-[9.5px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase">
                    No due date
                  </span>
                  <span className="ml-1.5 text-[9px] text-muted-foreground/40">
                    {unscheduled.length}
                  </span>
                </div>
                <div className="divide-y divide-border/40">
                  {unscheduled.map((task) => (
                    <div
                      key={task.id}
                      className="flex h-9 items-center gap-2 px-3"
                    >
                      <TaskPriorityIcon
                        priority={task.priority}
                        className="size-3"
                      />
                      <span className="w-[50px] font-mono text-[9px] text-muted-foreground/50">
                        {task.identifier}
                      </span>
                      <Link
                        href={`/w/${workspaceSlug}/tasks/${task.id}`}
                        className="text-[11px] font-medium text-foreground/80 hover:underline hover:decoration-border hover:underline-offset-4"
                      >
                        {task.title}
                      </Link>
                      <span
                        className="ml-1 size-1.5 rounded-full"
                        style={{ backgroundColor: task.statusColor }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scheduled.length === 0 && unscheduled.length === 0 && (
              <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
                No tasks match this view.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
