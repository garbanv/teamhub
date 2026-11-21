import type { PoolClient } from "pg";

import { buildNotificationEmail } from "./email-templates";
import { isEmailConfigured } from "./email";

function notificationEmailTypes() {
  return new Set(
    (process.env.EMAIL_NOTIFICATION_TYPES ?? "assigned,mentioned,comment")
      .split(",")
      .map((type) => type.trim())
      .filter(Boolean),
  );
}

export async function enqueueNotificationEmail(
  client: PoolClient,
  input: {
    notificationId: string;
    workspaceId: string;
    userId: string;
    type: string;
    title: string;
    body?: string | null;
    taskId?: string | null;
  },
) {
  if (!isEmailConfigured()) return;
  if (!notificationEmailTypes().has(input.type)) return;

  try {
    const { rows } = await client.query<{
      email: string;
      recipientName: string;
      workspaceName: string;
      workspaceSlug: string;
    }>(
      `
        select
          u.email,
          u.name as "recipientName",
          w.name as "workspaceName",
          w.slug as "workspaceSlug"
        from "user" u
        join workspaces w on w.id = $2
        where u.id = $1
        limit 1
      `,
      [input.userId, input.workspaceId],
    );
    const recipient = rows[0];
    if (!recipient) return;

    const email = buildNotificationEmail({
      title: input.title,
      body: input.body,
      recipientName: recipient.recipientName,
      workspaceName: recipient.workspaceName,
      workspaceSlug: recipient.workspaceSlug,
      notificationType: input.type,
      taskId: input.taskId,
    });

    await client.query(
      `
        insert into email_outbox
          (notification_id, workspace_id, user_id, to_email, subject, text_body, html_body)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (notification_id) do nothing
      `,
      [
        input.notificationId,
        input.workspaceId,
        input.userId,
        recipient.email,
        email.subject,
        email.text,
        email.html,
      ],
    );
  } catch (error) {
    // Email must never make the underlying task/comment mutation fail.
    console.error(
      "[email] could not queue notification email:",
      error instanceof Error ? error.message : error,
    );
  }
}
