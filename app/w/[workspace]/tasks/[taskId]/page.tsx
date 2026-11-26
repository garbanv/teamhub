import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TaskDetailView } from "@/components/workspace/task/task-detail-view";
import { getTaskActivity } from "@/lib/activity";
import { getTaskComments } from "@/lib/comments";
import { getProjectStatuses } from "@/lib/projects";
import {
  getTaskById,
  getWorkspaceLabels,
  isTaskFollowed,
} from "@/lib/tasks";
import { getProjectNavItems, getWorkspaceMembers } from "@/lib/workspaces";
import { requireWorkspacePage } from "@/lib/workspace-page";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage({
  params,
}: {
  params: Promise<{ workspace: string; taskId: string }>;
}) {
  const { workspace: slug, taskId } = await params;
  const { user, workspace } = await requireWorkspacePage(slug);
  const task = await getTaskById(workspace.id, taskId);
  if (!task) notFound();

  const [statuses, members, projects, labels, comments, activities, following] =
    await Promise.all([
      getProjectStatuses(task.projectId),
      getWorkspaceMembers(workspace.id),
      getProjectNavItems(workspace.id),
      getWorkspaceLabels(workspace.id),
      getTaskComments(task.id),
      getTaskActivity(task.id),
      isTaskFollowed(task.id, user.id),
    ]);

  return (
    <TaskDetailView
      initialTask={task}
      workspaceId={workspace.id}
      workspaceSlug={workspace.slug}
      members={members}
      projects={projects}
      statuses={statuses}
      labels={labels}
      currentUser={user}
      comments={comments}
      activities={activities}
      initialFollowing={following}
    />
  );
}
