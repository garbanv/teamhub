import { query } from "./db";
import { AppError } from "./errors";
import {
  dueFilterOptions,
  isUuid,
  taskSortOptions,
  type ProjectTaskView,
  type TaskDueFilter,
  type TaskFilterState,
  type TaskSortOption,
} from "./task-view";
import type { SavedProjectView, TaskPriority } from "./types";

type SavedViewRow = {
  id: string;
  projectId: string;
  name: string;
  layout: ProjectTaskView;
  filters: unknown;
  sort: unknown;
  shared: boolean;
  ownerId: string;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
};

const priorities: TaskPriority[] = ["none", "low", "medium", "high", "urgent"];

function sanitizeFilters(value: unknown): TaskFilterState {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const filters: TaskFilterState = {};

  if (typeof raw.assignee === "string" && raw.assignee.trim()) {
    filters.assignee = raw.assignee;
  }
  if (typeof raw.status === "string" && isUuid(raw.status)) {
    filters.status = raw.status;
  }
  if (
    typeof raw.priority === "string" &&
    priorities.includes(raw.priority as TaskPriority)
  ) {
    filters.priority = raw.priority as TaskPriority;
  }
  if (typeof raw.label === "string" && isUuid(raw.label)) {
    filters.label = raw.label;
  }
  if (
    typeof raw.due === "string" &&
    dueFilterOptions.includes(raw.due as TaskDueFilter)
  ) {
    filters.due = raw.due as TaskDueFilter;
  }
  return filters;
}

function sanitizeSort(value: unknown): TaskSortOption {
  if (typeof value === "string") {
    return taskSortOptions.includes(value as TaskSortOption)
      ? (value as TaskSortOption)
      : "manual";
  }
  if (value && typeof value === "object" && "by" in value) {
    const by = (value as { by?: unknown }).by;
    if (
      typeof by === "string" &&
      taskSortOptions.includes(by as TaskSortOption)
    ) {
      return by as TaskSortOption;
    }
  }
  return "manual";
}

function mapSavedView(row: SavedViewRow): SavedProjectView {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    layout: row.layout,
    filters: sanitizeFilters(row.filters),
    sort: sanitizeSort(row.sort),
    shared: row.shared,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const savedViewSelect = `
  select
    v.id,
    v.project_id as "projectId",
    v.name,
    v.layout,
    v.filters,
    v.sort,
    v.shared,
    v.owner_id as "ownerId",
    owner.name as "ownerName",
    v.created_at as "createdAt",
    v.updated_at as "updatedAt"
  from saved_views v
  join "user" owner on owner.id = v.owner_id
`;

export async function getSavedViewsForProject(
  projectId: string,
  userId: string,
): Promise<SavedProjectView[]> {
  const { rows } = await query<SavedViewRow>(
    `
      ${savedViewSelect}
      where v.project_id = $1
        and (v.owner_id = $2 or v.shared = true)
      order by v.shared desc, lower(v.name)
    `,
    [projectId, userId],
  );
  return rows.map(mapSavedView);
}

export async function getSavedView(input: {
  workspaceId: string;
  projectId: string;
  viewId: string;
  userId: string;
}): Promise<SavedProjectView | null> {
  const { rows } = await query<SavedViewRow>(
    `
      ${savedViewSelect}
      join projects p on p.id = v.project_id
      where v.id = $1
        and v.project_id = $2
        and p.workspace_id = $3
        and (v.owner_id = $4 or v.shared = true)
      limit 1
    `,
    [input.viewId, input.projectId, input.workspaceId, input.userId],
  );
  return rows[0] ? mapSavedView(rows[0]) : null;
}

export async function createSavedView(input: {
  workspaceId: string;
  projectId: string;
  userId: string;
  name: string;
  layout: ProjectTaskView;
  filters: TaskFilterState;
  sort: TaskSortOption;
  shared: boolean;
}): Promise<SavedProjectView> {
  const { rows } = await query<{ id: string }>(
    `
      insert into saved_views
        (workspace_id, project_id, owner_id, name, layout, filters, sort, shared)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning id
    `,
    [
      input.workspaceId,
      input.projectId,
      input.userId,
      input.name,
      input.layout,
      JSON.stringify(input.filters),
      JSON.stringify({ by: input.sort }),
      input.shared,
    ],
  );
  const view = await getSavedView({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    viewId: rows[0]!.id,
    userId: input.userId,
  });
  if (!view) throw new AppError("Saved view could not be created.", 500);
  return view;
}

export async function deleteSavedView(input: {
  workspaceId: string;
  projectId: string;
  viewId: string;
  userId: string;
}) {
  const result = await query(
    `
      delete from saved_views v
      using projects p
      where v.id = $1
        and v.project_id = $2
        and p.id = v.project_id
        and p.workspace_id = $3
        and v.owner_id = $4
    `,
    [input.viewId, input.projectId, input.workspaceId, input.userId],
  );
  if (!result.rowCount) {
    throw new AppError("Saved view not found or you cannot delete it.", 404);
  }
}
