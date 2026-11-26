"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Columns3, GanttChartSquare, ListTodo } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ProjectTaskView } from "@/lib/task-view";

function OptionCard({
  selected,
  onSelect,
  title,
  description,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected
          ? "border-primary/60 bg-primary/5"
          : "border-border/80 hover:bg-muted/40",
      )}
    >
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8125rem] font-medium">{title}</span>
        {description && (
          <span className="mt-0.5 block text-[0.7188rem] leading-4 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {selected && <Check className="mt-0.5 size-4 shrink-0 text-primary" />}
    </button>
  );
}

const viewOptions: {
  value: ProjectTaskView;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "list",
    title: "List",
    description: "Tasks grouped by status, one per row.",
    icon: <ListTodo className="size-4" />,
  },
  {
    value: "board",
    title: "Board",
    description: "Kanban columns you can drag tasks between.",
    icon: <Columns3 className="size-4" />,
  },
  {
    value: "timeline",
    title: "Timeline",
    description: "Tasks plotted by due date across the weeks.",
    icon: <GanttChartSquare className="size-4" />,
  },
];

export function DefaultViewSetting({
  initialValue,
}: {
  initialValue: ProjectTaskView;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialValue);
  const [saving, setSaving] = React.useState(false);

  async function choose(next: ProjectTaskView) {
    if (next === value || saving) return;
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultProjectView: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save.");
      toast.success("Default project view saved.");
      router.refresh();
    } catch (error) {
      setValue(previous);
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="radiogroup" aria-label="Default project view" className="grid gap-2.5 p-4 sm:grid-cols-3 sm:p-5">
      {viewOptions.map((option) => (
        <OptionCard
          key={option.value}
          selected={value === option.value}
          onSelect={() => choose(option.value)}
          title={option.title}
          description={option.description}
          icon={option.icon}
        />
      ))}
    </div>
  );
}

const STORAGE_KEY = "hub-text-size";

const textSizes = [
  { value: "default", label: "Default", sample: "text-[0.8125rem]" },
  { value: "large", label: "Large", sample: "text-[0.9375rem]" },
  { value: "larger", label: "Larger", sample: "text-[1.0625rem]" },
  { value: "largest", label: "Largest", sample: "text-[1.25rem]" },
] as const;

type TextSize = (typeof textSizes)[number]["value"];

function applyTextSize(size: TextSize) {
  if (size === "default") {
    document.documentElement.removeAttribute("data-text-size");
  } else {
    document.documentElement.setAttribute("data-text-size", size);
  }
  try {
    if (size === "default") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // Storage can be blocked; the size still applies for this visit.
  }
}

export function TextSizeSetting() {
  const [size, setSize] = React.useState<TextSize>("default");

  React.useEffect(() => {
    const current = document.documentElement.getAttribute("data-text-size");
    if (textSizes.some((item) => item.value === current)) {
      setSize(current as TextSize);
    }
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Text size"
      className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5"
    >
      {textSizes.map((item) => (
        <OptionCard
          key={item.value}
          selected={size === item.value}
          onSelect={() => {
            setSize(item.value);
            applyTextSize(item.value);
          }}
          title={<span className={item.sample}>{item.label}</span>}
        />
      ))}
    </div>
  );
}
