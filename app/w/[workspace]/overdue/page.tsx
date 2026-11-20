import type { Metadata } from "next";

import { PersonalTaskView } from "@/components/workspace/task/personal-task-view";
import { getTasksForUser } from "@/lib/tasks";
import { requireWorkspacePage } from "@/lib/workspace-page";

export const metadata: Metadata = { title: "Overdue" };

export default async function OverduePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { user, workspace } = await requireWorkspacePage(slug);
  const tasks = await getTasksForUser(workspace.id, user.id, "overdue");
  return (
    <PersonalTaskView
      view="overdue"
      tasks={tasks}
      workspaceSlug={workspace.slug}
    />
  );
}
