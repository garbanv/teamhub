import { logTaskActivity } from "./activity";
import { query, withTransaction } from "./db";
import { AppError } from "./errors";
import {
  addTaskFollower,
  createNotification,
  getActorName,
  notifyTaskFollowers,
} from "./notifications";
import type { TaskComment } from "./types";

type CommentRow = {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  bodyText: string;
  mentions: Array<{ id: string; name: string; image: string | null }>;
  createdAt: Date;
};

function mapComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.taskId,
    authorId: row.authorId,
    authorName: row.authorName,
    authorImage: row.authorImage,
    bodyText: row.bodyText,
    mentions: Array.isArray(row.mentions) ? row.mentions : [],
    createdAt: row.createdAt.toISOString(),
  };
}

const commentSelect = `
  select
    c.id,
    c.task_id as "taskId",
    c.author_id as "authorId",
    author.name as "authorName",
    author.image as "authorImage",
    c.body_text as "bodyText",
    coalesce((
      select jsonb_agg(
        jsonb_build_object('id', mu.id, 'name', mu.name, 'image', mu.image)
        order by mu.name
      )
      from comment_mentions cm
      join "user" mu on mu.id = cm.user_id
      where cm.comment_id = c.id
    ), '[]'::jsonb) as mentions,
    c.created_at as "createdAt"
  from comments c
  join "user" author on author.id = c.author_id
`;

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { rows } = await query<CommentRow>(
    `
      ${commentSelect}
      where c.task_id = $1
      order by c.created_at asc
    `,
    [taskId],
  );
  return rows.map(mapComment);
}

export async function taskBelongsToWorkspace(
  taskId: string,
  workspaceId: string,
) {
  const { rowCount } = await query(
    `
      select 1
      from tasks t
      join projects p on p.id = t.project_id
      where t.id = $1 and p.workspace_id = $2
    `,
    [taskId, workspaceId],
  );
  return Boolean(rowCount);
}

export async function createTaskComment(input: {
  workspaceId: string;
  taskId: string;
  actorId: string;
  text: string;
  mentionIds: string[];
}): Promise<TaskComment> {
  const text = input.text.trim();
  if (!text) throw new AppError("Write something before commenting.", 400);
  if (text.length > 5000) {
    throw new AppError("Comments can be up to 5,000 characters.", 400);
  }

  const mentionIds = [...new Set(input.mentionIds)];

  const commentId = await withTransaction(async (client) => {
    const task = await client.query<{
      id: string;
      identifier: string;
      title: string;
    }>(
      `
        select
          t.id,
          (p.key || '-' || t.number::text) as identifier,
          t.title
        from tasks t
        join projects p on p.id = t.project_id
        where t.id = $1 and p.workspace_id = $2
        for update of t
      `,
      [input.taskId, input.workspaceId],
    );
    const taskRow = task.rows[0];
    if (!taskRow) throw new AppError("Task not found.", 404);

    if (mentionIds.length > 0) {
      const members = await client.query<{ userId: string }>(
        `
          select user_id as "userId"
          from workspace_members
          where workspace_id = $1 and user_id = any($2)
        `,
        [input.workspaceId, mentionIds],
      );
      if (members.rows.length !== mentionIds.length) {
        throw new AppError("One or more mentioned people are not members.", 400);
      }
    }

    const body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    };

    const result = await client.query<{ id: string }>(
      `
        insert into comments (task_id, author_id, body, body_text)
        values ($1, $2, $3, $4)
        returning id
      `,
      [input.taskId, input.actorId, JSON.stringify(body), text],
    );
    const id = result.rows[0]!.id;

    for (const mentionId of mentionIds) {
      await client.query(
        "insert into comment_mentions (comment_id, user_id) values ($1, $2)",
        [id, mentionId],
      );
      await addTaskFollower(client, input.taskId, mentionId);
    }
    await addTaskFollower(client, input.taskId, input.actorId);

    const excerpt = text.replace(/\s+/g, " ").slice(0, 160);
    await logTaskActivity(client, {
      taskId: input.taskId,
      actorId: input.actorId,
      type: "comment_added",
      metadata: { excerpt },
    });

    const actorName = await getActorName(client, input.actorId);

    for (const mentionId of mentionIds) {
      await createNotification(client, {
        workspaceId: input.workspaceId,
        userId: mentionId,
        actorId: input.actorId,
        taskId: input.taskId,
        type: "mentioned",
        title: `${actorName} mentioned you on ${taskRow.identifier}`,
        body: `${taskRow.title} · ${excerpt}`,
      });
    }

    await notifyTaskFollowers(client, {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      actorId: input.actorId,
      type: "comment",
      title: `${actorName} commented on ${taskRow.identifier}`,
      body: `${taskRow.title} · ${excerpt}`,
      excludeUserIds: mentionIds,
    });

    return id;
  });

  const { rows } = await query<CommentRow>(
    `${commentSelect} where c.id = $1 limit 1`,
    [commentId],
  );
  if (!rows[0]) throw new AppError("Comment could not be created.", 500);
  return mapComment(rows[0]);
}
