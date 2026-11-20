import type { PoolClient } from "pg";

import { query } from "./db";
import type { TaskActivityEntry } from "./types";

export async function logTaskActivity(
  client: PoolClient,
  input: {
    taskId: string;
    actorId: string;
    type: string;
    field?: string | null;
    fromValue?: unknown;
    toValue?: unknown;
    metadata?: Record<string, unknown>;
  },
) {
  await client.query(
    `
      insert into task_activities
        (task_id, actor_id, type, field, from_value, to_value, metadata)
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      input.taskId,
      input.actorId,
      input.type,
      input.field ?? null,
      input.fromValue === undefined ? null : JSON.stringify(input.fromValue),
      input.toValue === undefined ? null : JSON.stringify(input.toValue),
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

type ActivityRow = {
  id: string;
  type: string;
  field: string | null;
  actorName: string | null;
  actorImage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

export function describeActivity(row: {
  type: string;
  metadata: Record<string, unknown> | null;
}) {
  const meta = row.metadata ?? {};

  switch (row.type) {
    case "created":
      return "created this task";
    case "status_changed": {
      const from = typeof meta.fromName === "string" ? meta.fromName : null;
      const to = typeof meta.toName === "string" ? meta.toName : null;
      if (from && to) return `changed status from ${from} to ${to}`;
      if (to) return `changed status to ${to}`;
      return "changed the status";
    }
    case "assignee_changed": {
      const from = typeof meta.fromName === "string" ? meta.fromName : null;
      const to = typeof meta.toName === "string" ? meta.toName : null;
      if (to && from) return `reassigned from ${from} to ${to}`;
      if (to) return `assigned this task to ${to}`;
      if (from) return "unassigned this task";
      return "changed the assignee";
    }
    case "priority_changed": {
      const to = typeof meta.toLabel === "string" ? meta.toLabel : null;
      return to ? `set priority to ${to}` : "changed the priority";
    }
    case "due_date_changed": {
      const to = typeof meta.toLabel === "string" ? meta.toLabel : null;
      return to ? `set the due date to ${to}` : "cleared the due date";
    }
    case "title_changed":
      return "renamed the task";
    case "description_changed":
      return "updated the description";
    case "labels_changed": {
      const added = strings(meta.addedNames);
      const removed = strings(meta.removedNames);
      const parts: string[] = [];
      if (added.length) parts.push(`added ${added.join(", ")}`);
      if (removed.length) parts.push(`removed ${removed.join(", ")}`);
      return parts.length ? `updated labels — ${parts.join("; ")}` : "updated labels";
    }
    case "link_added": {
      const identifier =
        typeof meta.relatedIdentifier === "string"
          ? meta.relatedIdentifier
          : null;
      return identifier ? `linked ${identifier}` : "linked a related task";
    }
    case "link_removed": {
      const identifier =
        typeof meta.relatedIdentifier === "string"
          ? meta.relatedIdentifier
          : null;
      return identifier
        ? `removed the link to ${identifier}`
        : "removed a related task link";
    }
    case "comment_added":
      return "commented on this task";
    default:
      return `updated ${humanize(row.type)}`;
  }
}

export async function getTaskActivity(
  taskId: string,
): Promise<TaskActivityEntry[]> {
  const { rows } = await query<ActivityRow>(
    `
      select
        a.id,
        a.type,
        a.field,
        actor.name as "actorName",
        actor.image as "actorImage",
        a.metadata,
        a.created_at as "createdAt"
      from task_activities a
      left join "user" actor on actor.id = a.actor_id
      where a.task_id = $1
      order by a.created_at desc
      limit 80
    `,
    [taskId],
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    field: row.field,
    actorName: row.actorName,
    actorImage: row.actorImage,
    description: describeActivity(row),
    createdAt: row.createdAt.toISOString(),
  }));
}
