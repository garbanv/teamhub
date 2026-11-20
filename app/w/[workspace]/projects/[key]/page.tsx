import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/workspace/page";
import { ProjectHeader } from "@/components/workspace/project-header";
import { ProjectBoard } from "@/components/workspace/task/project-board";
import { ProjectTimeline } from "@/components/workspace/task/project-timeline";
import { ProjectTaskList } from "@/components/workspace/task/task-list";
import { ProjectViewControls } from "@/components/workspace/task/project-view-controls";
import { getProjectByKey, getProjectStatuses } from "@/lib/projects";
import { getSavedView, getSavedViewsForProject } from "@/lib/saved-views";
import { getTasksForProject, getWorkspaceLabels } from "@/lib/tasks";
import {
  hasTaskFilters,
  parseProjectTaskViewParams,
} from "@/lib/task-view";
import { getWorkspaceMembers } from "@/lib/workspaces";
import { requireWorkspacePage } from "@/lib/workspace-page";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug, key } = await params;
  const rawQuery = await searchParams;
  const { user, workspace } = await requireWorkspacePage(slug);
  const project = await getProjectByKey(workspace.id, key);
  if (!project) notFound();

  const [statuses, members, labels, savedViews] = await Promise.all([
    getProjectStatuses(project.id),
    getWorkspaceMembers(workspace.id),
    getWorkspaceLabels(workspace.id),
    getSavedViewsForProject(project.id, user.id),
  ]);

  const parsed = parseProjectTaskViewParams(rawQuery);
  const saved = parsed.savedId
    ? await getSavedView({
        workspaceId: workspace.id,
        projectId: project.id,
        viewId: parsed.savedId,
        userId: user.id,
      })
    : null;

  const view = saved?.layout ?? parsed.view;
  const filters = saved?.filters ?? parsed.filters;
  const sort = saved?.sort ?? parsed.sort;
  const savedId = saved?.id ?? null;
  const tasks = await getTasksForProject(project.id, filters, sort);

  const basePath = `/w/${workspace.slug}/projects/${project.key}`;

  return (
    <PageShell>
      <ProjectHeader
        project={project}
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        members={members}
        canEdit
      />

      <ProjectViewControls
        basePath={basePath}
        workspaceId={workspace.id}
        projectId={project.id}
        view={view}
        filters={filters}
        sort={sort}
        savedId={savedId}
        taskCount={tasks.length}
        statuses={statuses}
        members={members}
        labels={labels}
        savedViews={savedViews}
        currentUserId={user.id}
      />

      <div className="mt-1">
        {view === "list" && (
          <ProjectTaskList
            project={project}
            statuses={statuses}
            tasks={tasks}
            workspaceSlug={workspace.slug}
            canCreate={!project.archivedAt}
            isFiltered={hasTaskFilters(filters)}
          />
        )}
        {view === "board" && (
          <ProjectBoard
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
            statuses={statuses}
            initialTasks={tasks}
          />
        )}
        {view === "timeline" && (
          <ProjectTimeline tasks={tasks} workspaceSlug={workspace.slug} />
        )}
      </div>
    </PageShell>
  );
}
