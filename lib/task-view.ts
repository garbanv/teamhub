import type { TaskPriority } from "./types";

export const projectTaskViews = ["list", "board", "timeline"] as const;
export type ProjectTaskView = (typeof projectTaskViews)[number];

export const taskSortOptions = [
  "manual",
  "due_asc",
  "due_desc",
  "priority",
  "created_desc",
  "updated_desc",
] as const;
export type TaskSortOption = (typeof taskSortOptions)[number];

export const taskSortLabels: Record<TaskSortOption, string> = {
  manual: "Manual",
  due_asc: "Due date · soonest",
  due_desc: "Due date · latest",
  priority: "Priority",
  created_desc: "Newest",
  updated_desc: "Recently updated",
};

export const dueFilterOptions = [
  "overdue",
  "today",
  "week",
  "no_date",
] as const;
export type TaskDueFilter = (typeof dueFilterOptions)[number];

export const dueFilterLabels: Record<TaskDueFilter, string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  no_date: "No due date",
};

export type TaskFilterState = {
  assignee?: string;
  status?: string;
  priority?: TaskPriority;
  label?: string;
  due?: TaskDueFilter;
};

export const emptyTaskFilters: TaskFilterState = {};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null) {
  return Boolean(value && uuidPattern.test(value));
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseProjectTaskViewParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const rawView = first(searchParams.view);
  const view: ProjectTaskView = projectTaskViews.includes(
    rawView as ProjectTaskView,
  )
    ? (rawView as ProjectTaskView)
    : "list";

  const rawSort = first(searchParams.sort);
  const sort: TaskSortOption = taskSortOptions.includes(
    rawSort as TaskSortOption,
  )
    ? (rawSort as TaskSortOption)
    : "manual";

  const filters: TaskFilterState = {};
  const assignee = first(searchParams.assignee);
  if (assignee) filters.assignee = assignee;

  const status = first(searchParams.status);
  if (isUuid(status)) filters.status = status;

  const priority = first(searchParams.priority);
  if (
    priority &&
    ["none", "low", "medium", "high", "urgent"].includes(priority)
  ) {
    filters.priority = priority as TaskPriority;
  }

  const label = first(searchParams.label);
  if (isUuid(label)) filters.label = label;

  const due = first(searchParams.due);
  if (due && dueFilterOptions.includes(due as TaskDueFilter)) {
    filters.due = due as TaskDueFilter;
  }

  return {
    view,
    sort,
    filters,
    savedId: first(searchParams.saved) ?? null,
  };
}

export function hasTaskFilters(filters: TaskFilterState) {
  return Object.values(filters).some(Boolean);
}

export function countTaskFilters(filters: TaskFilterState) {
  return Object.values(filters).filter(Boolean).length;
}

export function cleanTaskFilters(filters: TaskFilterState): TaskFilterState {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as TaskFilterState;
}

export function buildProjectViewQuery(input: {
  view: ProjectTaskView;
  filters: TaskFilterState;
  sort: TaskSortOption;
  savedId?: string | null;
}) {
  const params = new URLSearchParams();
  if (input.view !== "list") params.set("view", input.view);

  if (input.savedId) {
    params.set("saved", input.savedId);
    return params.toString();
  }

  const filters = cleanTaskFilters(input.filters);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.label) params.set("label", filters.label);
  if (filters.due) params.set("due", filters.due);
  if (input.sort !== "manual") params.set("sort", input.sort);

  return params.toString();
}

export function projectViewHref(
  basePath: string,
  input: {
    view: ProjectTaskView;
    filters: TaskFilterState;
    sort: TaskSortOption;
    savedId?: string | null;
  },
) {
  const query = buildProjectViewQuery(input);
  return query ? `${basePath}?${query}` : basePath;
}
