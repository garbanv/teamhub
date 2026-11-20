import { query } from "./db";
import type { NavSearchResult } from "./types";

export async function searchWorkspace(
  workspaceId: string,
  workspaceSlug: string,
  q: string,
): Promise<NavSearchResult[]> {
  const term = q.trim();
  if (!term) return [];

  const pattern = `%${term}%`;
  const prefix = `${term}%`;

  const [projects, tasks] = await Promise.all([
    query<{
      id: string;
      name: string;
      key: string;
      color: string;
    }>(
      `
        select id, name, key, color
        from projects
        where workspace_id = $1
          and archived_at is null
          and (name ilike $2 or key ilike $2)
        order by
          case when name ilike $3 then 0 else 1 end,
          name asc
        limit 5
      `,
      [workspaceId, pattern, prefix],
    ),
    query<{
      id: string;
      title: string;
      number: number;
      key: string;
      projectName: string;
      projectColor: string;
      statusName: string;
      statusColor: string;
    }>(
      `
        select
          t.id,
          t.title,
          t.number,
          p.key,
          p.name as "projectName",
          p.color as "projectColor",
          s.name as "statusName",
          s.color as "statusColor"
        from tasks t
        join projects p on p.id = t.project_id
        join project_statuses s on s.id = t.status_id
        where p.workspace_id = $1
          and p.archived_at is null
          and (
            t.title ilike $2
            or t.description_text ilike $2
            or (p.key || '-' || t.number::text) ilike $2
          )
        order by
          case
            when (p.key || '-' || t.number::text) ilike $3 then 0
            when t.title ilike $3 then 1
            else 2
          end,
          t.updated_at desc
        limit 8
      `,
      [workspaceId, pattern, prefix],
    ),
  ]);

  const projectResults: NavSearchResult[] = projects.rows.map((project) => ({
    id: project.id,
    type: "project",
    title: project.name,
    subtitle: project.key,
    href: `/w/${workspaceSlug}/projects/${project.key}`,
    meta: "Project",
    color: project.color,
  }));

  const taskResults: NavSearchResult[] = tasks.rows.map((task) => ({
    id: task.id,
    type: "task",
    title: task.title,
    subtitle: `${task.key}-${task.number}`,
    href: `/w/${workspaceSlug}/tasks/${task.id}`,
    meta: task.statusName,
    color: task.statusColor,
  }));

  return [...projectResults, ...taskResults];
}
