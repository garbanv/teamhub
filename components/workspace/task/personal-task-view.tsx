import { AlarmClock, CalendarDays, CircleCheck, Clock3 } from "lucide-react";

import { PageHeader, PageShell } from "@/components/workspace/page";
import { PersonalTaskList } from "@/components/workspace/task/task-list";
import { NewTaskButton } from "@/components/workspace/task/quick-create-task";
import { Badge } from "@/components/ui/badge";
import type { PersonalTaskView as PersonalTaskViewName } from "@/lib/tasks";
import type { TaskListItem } from "@/lib/types";

const viewMeta = {
  "my-tasks": {
    eyebrow: "Personal",
    title: "My Tasks",
    description:
      "Everything assigned to you across the workspace, in one quiet place.",
    emptyTitle: "Nothing assigned to you",
    emptyDescription:
      "When a teammate assigns you a task, it will land here with its project, priority, and due date.",
    icon: CircleCheck,
  },
  "this-week": {
    eyebrow: "Personal",
    title: "This Week",
    description: "Work due in the next seven days, so the week has no surprises.",
    emptyTitle: "Your week is clear",
    emptyDescription:
      "Tasks due in the next seven days will appear here. A little breathing room is a good thing.",
    icon: CalendarDays,
  },
  overdue: {
    eyebrow: "Personal",
    title: "Overdue",
    description: "Tasks that slipped past their due date. No judgment — just a nudge.",
    emptyTitle: "Nothing overdue",
    emptyDescription:
      "You're on top of things. Anything that passes its due date will show up here.",
    icon: AlarmClock,
  },
  "due-soon": {
    eyebrow: "Personal",
    title: "Due Soon",
    description: "A closer look at what's coming up in the next three days.",
    emptyTitle: "Nothing due soon",
    emptyDescription:
      "Tasks due in the next three days will show up here. For now, the horizon is clear.",
    icon: Clock3,
  },
} as const;

export function PersonalTaskView({
  view,
  tasks,
  workspaceSlug,
}: {
  view: PersonalTaskViewName;
  tasks: TaskListItem[];
  workspaceSlug: string;
}) {
  const meta = viewMeta[view];
  const Icon = meta.icon;

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Icon className="size-3" />
            {meta.eyebrow}
          </>
        }
        title={meta.title}
        description={meta.description}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6">
              {tasks.length} open
            </Badge>
            <NewTaskButton />
          </div>
        }
      />

      <div className="mt-6">
        <PersonalTaskList
          tasks={tasks}
          workspaceSlug={workspaceSlug}
          emptyTitle={meta.emptyTitle}
          emptyDescription={meta.emptyDescription}
        />
      </div>
    </PageShell>
  );
}
