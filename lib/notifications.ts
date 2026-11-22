import type { PoolClient } from "pg";

import { query } from "./db";
import { enqueueNotificationEmail } from "./email-outbox";
import type { NotificationSummary } from "./types";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: Date | null;
  createdAt: Date;
  actorName: string | null;
  actorImage: string | null;
  taskId: string | null;
};

export async function getRecentNotifications(
  workspaceId: string,
  userId: string,
  limit = 10,
): Promise<NotificationSummary[]> {
  const { rows } = await query<NotificationRow>(
    `
      select
        n.id,
        n.title,
        n.body,
        n.type,
        n.read_at as "readAt",
        n.created_at as "createdAt",
        actor.name as "actorName",
        actor.image as "actorImage",
        n.task_id as "taskId"
      from notifications n
      left join "user" actor on actor.id = n.actor_id
      where n.workspace_id = $1 and n.user_id = $2
      order by n.created_at desc
      limit $3
    `,
    [workspaceId, userId, limit],
  );

  return rows.map((row) => ({
    ...row,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getUnreadNotificationCount(
  workspaceId: string,
  userId: string,
) {
  const { rows } = await query<{ count: number }>(
    `
      select count(*)::int as count
      from notifications
      where workspace_id = $1 and user_id = $2 and read_at is null
    `,
    [workspaceId, userId],
  );
  return rows[0]?.count ?? 0;
}

export async function markNotificationRead(input: {
  workspaceId: string;
  userId: string;
  notificationId: string;
  read: boolean;
}) {
  const result = await query(
    `
      update notifications
      set read_at = case when $4 then coalesce(read_at, now()) else null end
      where id = $1 and workspace_id = $2 and user_id = $3
    `,
    [input.notificationId, input.workspaceId, input.userId, input.read],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(
  workspaceId: string,
  userId: string,
) {
  const result = await query(
    `
      update notifications
      set read_at = now()
      where workspace_id = $1 and user_id = $2 and read_at is null
    `,
    [workspaceId, userId],
  );
  return result.rowCount ?? 0;
}

export async function getActorName(
  client: PoolClient,
  actorId: string,
): Promise<string> {
  const { rows } = await client.query<{ name: string }>(
    'select name from "user" where id = $1',
    [actorId],
  );
  return rows[0]?.name ?? "Someone";
}

export async function createNotification(
  client: PoolClient,
  input: {
    workspaceId: string;
    userId: string;
    actorId: string;
    type: string;
    title: string;
    body?: string | null;
    taskId?: string | null;
  },
) {
  if (input.userId === input.actorId) return null;

  // Notifications are intentionally limited to urgent work. This applies to
  // both the in-app bell and the notification email outbox.
  if (input.taskId) {
    const priority = await client.query<{ priority: string }>(
      "select priority from tasks where id = $1 limit 1",
      [input.taskId],
    );
    if (priority.rows[0]?.priority !== "urgent") return null;
  }

  const result = await client.query<{ id: string }>(
    `
      insert into notifications
        (workspace_id, user_id, actor_id, task_id, type, title, body)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id
    `,
    [
      input.workspaceId,
      input.userId,
      input.actorId,
      input.taskId ?? null,
      input.type,
      input.title,
      input.body ?? null,
    ],
  );

  const notificationId = result.rows[0]!.id;
  await enqueueNotificationEmail(client, {
    notificationId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    taskId: input.taskId,
  });

  return notificationId;
}

export async function getTaskFollowerIds(
  client: PoolClient,
  taskId: string,
) {
  const { rows } = await client.query<{ userId: string }>(
    "select user_id as \"userId\" from task_followers where task_id = $1",
    [taskId],
  );
  return rows.map((row) => row.userId);
}

export async function addTaskFollower(
  client: PoolClient,
  taskId: string,
  userId: string,
) {
  await client.query(
    `
      insert into task_followers (task_id, user_id)
      values ($1, $2)
      on conflict do nothing
    `,
    [taskId, userId],
  );
}

export async function notifyTaskFollowers(
  client: PoolClient,
  input: {
    workspaceId: string;
    taskId: string;
    actorId: string;
    type: string;
    title: string;
    body: string;
    excludeUserIds?: string[];
  },
) {
  const followers = await getTaskFollowerIds(client, input.taskId);
  const excluded = new Set([input.actorId, ...(input.excludeUserIds ?? [])]);
  for (const userId of followers) {
    if (excluded.has(userId)) continue;
    await createNotification(client, {
      workspaceId: input.workspaceId,
      userId,
      actorId: input.actorId,
      taskId: input.taskId,
      type: input.type,
      title: input.title,
      body: input.body,
    });
  }
}
