import { query } from "./db";
import type { NavSearchResult } from "./types";

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function searchWorkspace(
  workspaceId: string,
  workspaceSlug: string,
  userId: string,
  q: string,
): Promise<NavSearchResult[]> {
  const term = q.trim();
  if (!term) return [];

  const escaped = escapeLike(term);
  const pattern = `%${escaped}%`;
  const prefix = `${escaped}%`;

  const [projects, tasks, docs] = await Promise.all([
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
    query<{ id: string; title: string; icon: string | null }>(
      `
        select id, title, icon
        from doc_pages
        where workspace_id = $1
          and archived_at is null
          and (visibility = 'workspace' or owner_id = $4)
          and (title ilike $2 or content_text ilike $2)
        order by
          case when title ilike $3 then 0 when title ilike $2 then 1 else 2 end,
          updated_at desc
        limit 5
      `,
      [workspaceId, pattern, prefix, userId],
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

  const docResults: NavSearchResult[] = docs.rows.map((page) => ({
    id: page.id,
    type: "page",
    title: page.title,
    href: `/w/${workspaceSlug}/docs/${page.id}`,
    meta: "Doc",
    subtitle: page.icon ?? undefined,
  }));

  return [...projectResults, ...taskResults, ...docResults];
}
