import type { ProjectStatusCategory } from "./types";

export const projectIcons = [
  "folder",
  "globe",
  "smartphone",
  "palette",
  "rocket",
  "layers",
  "sparkles",
  "box",
] as const;

export type ProjectIconName = (typeof projectIcons)[number];

export const projectIconLabels: Record<ProjectIconName, string> = {
  folder: "Folder",
  globe: "Globe",
  smartphone: "Mobile",
  palette: "Design",
  rocket: "Launch",
  layers: "Layers",
  sparkles: "Special",
  box: "Box",
};

export const statusCategoryOrder: ProjectStatusCategory[] = [
  "backlog",
  "todo",
  "in_progress",
  "done",
  "canceled",
];

export const statusCategoryLabels: Record<ProjectStatusCategory, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  canceled: "Canceled",
};

export const defaultProjectStatuses = [
  { name: "Backlog", category: "backlog" as const, color: "#94a3b8" },
  { name: "Todo", category: "todo" as const, color: "#64748b" },
  { name: "In Progress", category: "in_progress" as const, color: "#eab308" },
  { name: "Done", category: "done" as const, color: "#22c55e" },
  { name: "Canceled", category: "canceled" as const, color: "#a1a1aa" },
];
