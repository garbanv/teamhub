"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type Field = "membersCanDeleteTasks" | "membersCanDeleteDocs";

const rows: { field: Field; title: string; description: string }[] = [
  {
    field: "membersCanDeleteTasks",
    title: "Members can delete tasks",
    description:
      "When off, only owners and admins can delete tasks (and their subtasks).",
  },
  {
    field: "membersCanDeleteDocs",
    title: "Members can delete docs pages",
    description:
      "When off, only owners and admins can delete docs pages (and their sub-pages).",
  },
];

export function DeletePermissionsForm({
  workspaceId,
  initial,
  canEdit,
}: {
  workspaceId: string;
  initial: Record<Field, boolean>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [saving, setSaving] = React.useState<Field | null>(null);

  async function toggle(field: Field) {
    if (!canEdit || saving) return;
    const next = !values[field];
    setValues((current) => ({ ...current, [field]: next }));
    setSaving(field);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save.");
      toast.success("Permissions updated.");
      router.refresh();
    } catch (error) {
      setValues((current) => ({ ...current, [field]: !next }));
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="divide-y divide-border/70">
      {rows.map((row) => {
        const on = values[row.field];
        return (
          <div
            key={row.field}
            className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5"
          >
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium">{row.title}</p>
              <p className="mt-0.5 text-[0.7188rem] leading-4 text-muted-foreground">
                {row.description}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={row.title}
              disabled={!canEdit || saving !== null}
              onClick={() => toggle(row.field)}
              className={cn(
                "relative h-[1.375rem] w-10 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                on ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-[1.125rem] rounded-full bg-background shadow-sm transition-transform",
                  on && "translate-x-[1.125rem]",
                )}
              />
            </button>
          </div>
        );
      })}
      <p className="px-4 py-2.5 text-[0.625rem] text-muted-foreground/65 sm:px-5">
        Owners and admins can always delete.
      </p>
    </div>
  );
}
