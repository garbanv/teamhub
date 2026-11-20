export const workspaceColors: Record<
  string,
  { from: string; to: string; solid: string }
> = {
  indigo: { from: "#6d6af5", to: "#4f46c8", solid: "#5b57e0" },
  violet: { from: "#a066f5", to: "#7138c9", solid: "#8847e0" },
  teal: { from: "#2bb8a3", to: "#128576", solid: "#1a9c8b" },
  coral: { from: "#f98562", to: "#dc573c", solid: "#ef6d4e" },
  amber: { from: "#e8a53a", to: "#c47a17", solid: "#d58e24" },
  rose: { from: "#ec6f9c", to: "#c23d6d", solid: "#db5683" },
  blue: { from: "#5a9bf5", to: "#3767c7", solid: "#4a83df" },
  emerald: { from: "#45b86d", to: "#23854a", solid: "#34a05a" },
};

export function workspaceColor(value?: string | null) {
  return workspaceColors[value ?? "indigo"] ?? workspaceColors.indigo!;
}

export const statusCategoryMeta = {
  backlog: { label: "Backlog", color: "#94a3b8" },
  todo: { label: "Todo", color: "#64748b" },
  in_progress: { label: "In progress", color: "#eab308" },
  done: { label: "Done", color: "#22c55e" },
  canceled: { label: "Canceled", color: "#a1a1aa" },
} as const;

export const priorityMeta = {
  none: { label: "No priority", color: "#a1a1aa", short: "—" },
  low: { label: "Low", color: "#94a3b8", short: "Low" },
  medium: { label: "Medium", color: "#eab308", short: "Med" },
  high: { label: "High", color: "#f97316", short: "High" },
  urgent: { label: "Urgent", color: "#ef4444", short: "Urgent" },
} as const;

export const projectColorChoices = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
  "#ef4444",
];
