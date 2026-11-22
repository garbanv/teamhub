import type { PoolClient } from "pg";

import { logTaskActivity } from "./activity";
import { query, withTransaction } from "./db";
import { emptyRichText, richTextToPlainText } from "./rich-text";
import type { TaskFilterState, TaskSortOption } from "./task-view";
import { AppError } from "./errors";
import {
  addTaskFollower,
  createNotification,
  getActorName,
  notifyTaskFollowers,
} from "./notifications";
import type {
  ProjectStatusCategory,
  RelatedTask,
  TaskDetail,
  TaskLabel,
  TaskListItem,
  TaskPriority,
} from "./types";


const taskColumns = `
  t.id,
  t.project_id as "projectId",
  p.key as "projectKey",
  p.name as "projectName",
  p.color as "projectColor",
  p.icon as "projectIcon",
  t.number,
  (p.key || '-' || t.number::text) as identifier,
  t.title,
  t.status_id as "statusId",
  s.name as "statusName",
  s.color as "statusColor",
  s.category as "statusCategory",
  t.assignee_id as "assigneeId",
  assignee.name as "assigneeName",
  assignee.image as "assigneeImage",
  t.priority,
  to_char(t.due_date, 'YYYY-MM-DD') as "dueDate",
  t.parent_task_id as "parentTaskId",
  (
    select count(*)::int from tasks child
    where child.parent_task_id = t.id
  ) as "subtaskCount",
  coalesce((
    select jsonb_agg(
      jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)
      order by l.name
    )
    from task_labels tl
    join labels l on l.id = tl.label_id
    where tl.task_id = t.id
  ), '[]'::jsonb) as labels,
  t.created_by as "createdById",
  creator.name as "createdByName",
  creator.image as "createdByImage",
  t.created_at as "createdAt",
  t.updated_at as "updatedAt"
`;

const taskJoins = `
  join projects p on p.id = t.project_id
  join project_statuses s on s.id = t.status_id
  left join "user" assignee on assignee.id = t.assignee_id
  left join "user" creator on creator.id = t.created_by
`;

type TaskRow = Omit<TaskListItem, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdByName: string;
  createdByImage: string | null;
  description?: unknown;
  descriptionText?: string;
};

function mapTask(row: TaskRow): TaskListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    projectKey: row.projectKey,
    projectName: row.projectName,
    projectColor: row.projectColor,
    projectIcon: row.projectIcon,
    number: row.number,
    identifier: row.identifier,
    title: row.title,
    statusId: row.statusId,
    statusName: row.statusName,
    statusColor: row.statusColor,
    statusCategory: row.statusCategory,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    assigneeImage: row.assigneeImage,
    priority: row.priority,
    dueDate: row.dueDate,
    parentTaskId: row.parentTaskId,
    subtaskCount: row.subtaskCount,
    labels: Array.isArray(row.labels) ? row.labels : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getWorkspaceLabels(workspaceId: string) {
  const { rows } = await query<TaskLabel>(
    `
      select id, name, color
      from labels
      where workspace_id = $1
      order by name asc
    `,
    [workspaceId],
  );
  return rows;
}

export async function getTasksForProject(
  projectId: string,
  filters: TaskFilterState = {},
  sort: TaskSortOption = "manual",
): Promise<TaskListItem[]> {
  const conditions = ["t.project_id = $1", "t.parent_task_id is null"];
  const values: unknown[] = [projectId];

  if (filters.assignee) {
    if (filters.assignee === "unassigned") {
      conditions.push("t.assignee_id is null");
    } else {
      values.push(filters.assignee);
      conditions.push(`t.assignee_id = $${values.length}`);
    }
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`t.status_id = $${values.length}::uuid`);
  }
  if (filters.priority) {
    values.push(filters.priority);
    conditions.push(`t.priority = $${values.length}`);
  }
  if (filters.label) {
    values.push(filters.label);
    conditions.push(
      `exists (
        select 1 from task_labels filter_label
        where filter_label.task_id = t.id
          and filter_label.label_id = $${values.length}::uuid
      )`,
    );
  }
  if (filters.due === "overdue") {
    conditions.push(
      "t.due_date < current_date and s.category not in ('done', 'canceled')",
    );
  } else if (filters.due === "today") {
    conditions.push("t.due_date = current_date");
  } else if (filters.due === "week") {
    conditions.push(
      "t.due_date >= current_date and t.due_date <= current_date + 7",
    );
  } else if (filters.due === "no_date") {
    conditions.push("t.due_date is null");
  }

  const priorityOrder = `case t.priority
    when 'urgent' then 0
    when 'high' then 1
    when 'medium' then 2
    when 'low' then 3
    else 4
  end`;

  const orderBy = {
    manual: `case s.category
        when 'backlog' then 0
        when 'todo' then 1
        when 'in_progress' then 2
        when 'done' then 3
        when 'canceled' then 4
        else 5
      end, s.position asc, t.sort_order asc, t.created_at asc`,
    due_asc: `t.due_date asc nulls last, ${priorityOrder}, t.created_at asc`,
    due_desc: `t.due_date desc nulls last, ${priorityOrder}, t.created_at asc`,
    priority: `${priorityOrder}, t.due_date asc nulls last, t.created_at asc`,
    created_desc: "t.created_at desc",
    updated_desc: "t.updated_at desc",
  }[sort];

  const { rows } = await query<TaskRow>(
    `
      select ${taskColumns}
      from tasks t
      ${taskJoins}
      where ${conditions.join(" and ")}
      order by ${orderBy}
    `,
    values,
  );
  return rows.map(mapTask);
}

export type PersonalTaskView =
  | "my-tasks"
  | "this-week"
  | "overdue"
  | "due-soon";

export async function getTasksForUser(
  workspaceId: string,
  userId: string,
  view: PersonalTaskView,
  limit = 100,
): Promise<TaskListItem[]> {
  const viewFilter = {
    "my-tasks": "",
    "this-week":
      "and t.due_date >= current_date and t.due_date <= current_date + 7",
    overdue: "and t.due_date < current_date",
    "due-soon":
      "and t.due_date >= current_date and t.due_date <= current_date + 3",
  }[view];

  const { rows } = await query<TaskRow>(
    `
      select ${taskColumns}
      from tasks t
      ${taskJoins}
      where p.workspace_id = $1
        and t.assignee_id = $2
        and p.archived_at is null
        and s.category not in ('done', 'canceled')
        ${viewFilter}
      order by
        t.due_date asc nulls last,
        case t.priority
          when 'urgent' then 0
          when 'high' then 1
          when 'medium' then 2
          when 'low' then 3
          else 4
        end,
        t.updated_at desc
      limit $3
    `,
    [workspaceId, userId, limit],
  );
  return rows.map(mapTask);
}

export async function getTaskById(
  workspaceId: string,
  taskId: string,
): Promise<TaskDetail | null> {
  const { rows } = await query<TaskRow>(
    `
      select ${taskColumns},
        t.description,
        t.description_text as "descriptionText"
      from tasks t
      ${taskJoins}
      where t.id = $1 and p.workspace_id = $2
      limit 1
    `,
    [taskId, workspaceId],
  );

  const row = rows[0];
  if (!row) return null;

  const [parentResult, subtasks, related] = await Promise.all([
    row.parentTaskId
      ? query<{ id: string; identifier: string; title: string }>(
          `
            select
              t.id,
              (p.key || '-' || t.number::text) as identifier,
              t.title
            from tasks t
            join projects p on p.id = t.project_id
            where t.id = $1
            limit 1
          `,
          [row.parentTaskId],
        )
      : Promise.resolve({ rows: [] }),
    query<TaskRow>(
      `
        select ${taskColumns}
        from tasks t
        ${taskJoins}
        where t.parent_task_id = $1
        order by t.created_at asc
      `,
      [row.id],
    ),
    query<TaskRow & { linkId: string }>(
      `
        select ${taskColumns}, ln.id as "linkId"
        from task_links ln
        join tasks t on t.id = case
          when ln.task_id = $1 then ln.related_task_id
          else ln.task_id
        end
        ${taskJoins}
        where (ln.task_id = $1 or ln.related_task_id = $1)
          and t.id <> $1
        order by ln.created_at asc
      `,
      [row.id],
    ),
  ]);

  return {
    ...mapTask(row),
    description: row.description ?? emptyRichText,
    descriptionText: row.descriptionText ?? "",
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdByImage: row.createdByImage,
    parentTask: parentResult.rows[0] ?? null,
    subtasks: subtasks.rows.map(mapTask),
    relatedTasks: related.rows.map((relatedRow) => ({
      ...mapTask(relatedRow),
      linkId: relatedRow.linkId,
    })) as RelatedTask[],
  };
}

async function assertWorkspaceMember(
  client: PoolClient,
  workspaceId: string,
  userId: string | null | undefined,
) {
  if (!userId) return;
  const { rowCount } = await client.query(
    "select 1 from workspace_members where workspace_id = $1 and user_id = $2",
    [workspaceId, userId],
  );
  if (!rowCount) {
    throw new AppError("That person is not a member of this workspace.", 400);
  }
}

async function validateLabelIds(
  client: PoolClient,
  workspaceId: string,
  labelIds: string[],
) {
  if (labelIds.length === 0) return;
  const unique = [...new Set(labelIds)];
  const { rows } = await client.query<{ id: string }>(
    "select id from labels where workspace_id = $1 and id = any($2::uuid[])",
    [workspaceId, unique],
  );
  if (rows.length !== unique.length) {
    throw new AppError("One or more labels are invalid.", 400);
  }
}

async function resolveDefaultStatus(client: PoolClient, projectId: string) {
  const { rows } = await client.query<{ id: string }>(
    `
      select id from project_statuses
      where project_id = $1
      order by
        case when category = 'todo' then 0 when category = 'backlog' then 1 else 2 end,
        position asc
      limit 1
    `,
    [projectId],
  );
  if (!rows[0]) throw new AppError("This project has no workflow statuses.", 409);
  return rows[0].id;
}

async function assertStatusForProject(
  client: PoolClient,
  projectId: string,
  statusId: string,
) {
  const { rows } = await client.query<{
    id: string;
    name: string;
    category: ProjectStatusCategory;
  }>(
    "select id, name, category from project_statuses where id = $1 and project_id = $2",
    [statusId, projectId],
  );
  if (!rows[0]) throw new AppError("That status does not belong to this project.", 400);
  return rows[0];
}

export async function createTask(input: {
  workspaceId: string;
  projectId: string;
  actorId: string;
  title: string;
  description?: unknown;
  statusId?: string | null;
  assigneeId?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  labelIds?: string[];
  parentTaskId?: string | null;
}): Promise<TaskDetail> {
  const taskId = await withTransaction(async (client) => {
    const project = await client.query<{
      id: string;
      key: string;
      archivedAt: Date | null;
    }>(
      `
        select id, key, archived_at as "archivedAt"
        from projects
        where id = $1 and workspace_id = $2
        for update
      `,
      [input.projectId, input.workspaceId],
    );

    const projectRow = project.rows[0];
    if (!projectRow) throw new AppError("Project not found.", 404);
    if (projectRow.archivedAt) {
      throw new AppError("You can't add tasks to an archived project.", 409);
    }

    if (input.parentTaskId) {
      const parent = await client.query<{ projectId: string }>(
        "select project_id as \"projectId\" from tasks where id = $1",
        [input.parentTaskId],
      );
      if (!parent.rows[0] || parent.rows[0].projectId !== input.projectId) {
        throw new AppError("That parent task is not in this project.", 400);
      }
    }

    await assertWorkspaceMember(client, input.workspaceId, input.assigneeId);

    let statusId = input.statusId ?? null;
    if (statusId) {
      await assertStatusForProject(client, input.projectId, statusId);
    } else {
      statusId = await resolveDefaultStatus(client, input.projectId);
    }

    const labelIds = [...new Set(input.labelIds ?? [])];
    await validateLabelIds(client, input.workspaceId, labelIds);

    const sortResult = await client.query<{ sortOrder: number }>(
      `
        select coalesce(max(sort_order), 0) + 1 as "sortOrder"
        from tasks
        where project_id = $1 and status_id = $2
      `,
      [input.projectId, statusId],
    );

    const counter = await client.query<{ taskCounter: number }>(
      `
        update projects
        set task_counter = task_counter + 1
        where id = $1
        returning task_counter as "taskCounter"
      `,
      [input.projectId],
    );
    const number = counter.rows[0]?.taskCounter;
    if (!number) throw new AppError("Could not allocate a task number.", 500);

    const description = input.description ?? emptyRichText;
    const descriptionText = richTextToPlainText(description);

    const result = await client.query<{ id: string }>(
      `
        insert into tasks (
          project_id, number, title, description, description_text,
          status_id, assignee_id, priority, due_date, parent_task_id,
          sort_order, created_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning id
      `,
      [
        input.projectId,
        number,
        input.title,
        JSON.stringify(description),
        descriptionText,
        statusId,
        input.assigneeId ?? null,
        input.priority ?? "none",
        input.dueDate ?? null,
        input.parentTaskId ?? null,
        sortResult.rows[0]?.sortOrder ?? 1,
        input.actorId,
      ],
    );

    const id = result.rows[0]!.id;

    for (const labelId of labelIds) {
      await client.query(
        "insert into task_labels (task_id, label_id) values ($1, $2)",
        [id, labelId],
      );
    }

    await addTaskFollower(client, id, input.actorId);
    if (input.assigneeId) {
      await addTaskFollower(client, id, input.assigneeId);
      if (input.assigneeId !== input.actorId) {
        const actorName = await getActorName(client, input.actorId);
        const identifier = `${projectRow.key}-${number}`;
        await createNotification(client, {
          workspaceId: input.workspaceId,
          userId: input.assigneeId,
          actorId: input.actorId,
          taskId: id,
          type: "assigned",
          title: `${actorName} assigned you ${identifier}`,
          body: input.title,
        });
      }
    }

    await logTaskActivity(client, {
      taskId: id,
      actorId: input.actorId,
      type: "created",
      metadata: { title: input.title },
    });

    return id;
  });

  const task = await getTaskById(input.workspaceId, taskId);
  if (!task) throw new AppError("Task could not be created.", 500);
  return task;
}

export async function updateTask(input: {
  workspaceId: string;
  taskId: string;
  actorId: string;
  title?: string;
  description?: unknown;
  statusId?: string;
  assigneeId?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  labelIds?: string[];
}): Promise<TaskDetail> {
  await withTransaction(async (client) => {
    const currentResult = await client.query<{
      id: string;
      projectId: string;
      identifier: string;
      title: string;
      description: unknown;
      descriptionText: string;
      statusId: string;
      statusName: string;
      statusCategory: ProjectStatusCategory;
      assigneeId: string | null;
      assigneeName: string | null;
      priority: TaskPriority;
      dueDate: string | null;
      completedAt: Date | null;
    }>(
      `
        select
          t.id,
          t.project_id as "projectId",
          (p.key || '-' || t.number::text) as identifier,
          t.title,
          t.description,
          t.description_text as "descriptionText",
          t.status_id as "statusId",
          s.name as "statusName",
          s.category as "statusCategory",
          t.assignee_id as "assigneeId",
          assignee.name as "assigneeName",
          t.priority,
          to_char(t.due_date, 'YYYY-MM-DD') as "dueDate",
          t.completed_at as "completedAt"
        from tasks t
        join projects p on p.id = t.project_id
        join project_statuses s on s.id = t.status_id
        left join "user" assignee on assignee.id = t.assignee_id
        where t.id = $1 and p.workspace_id = $2
        for update of t
      `,
      [input.taskId, input.workspaceId],
    );

    const current = currentResult.rows[0];
    if (!current) throw new AppError("Task not found.", 404);

    const actorName = await getActorName(client, input.actorId);

    if (input.assigneeId !== undefined) {
      await assertWorkspaceMember(
        client,
        input.workspaceId,
        input.assigneeId,
      );
    }

    let status = {
      id: current.statusId,
      name: current.statusName,
      category: current.statusCategory,
    };
    if (input.statusId && input.statusId !== current.statusId) {
      status = await assertStatusForProject(
        client,
        current.projectId,
        input.statusId,
      );
    }

    const labelIds = input.labelIds ? [...new Set(input.labelIds)] : null;
    if (labelIds) {
      await validateLabelIds(client, input.workspaceId, labelIds);
    }

    const currentLabelRows = await client.query<{ id: string; name: string }>(
      `
        select l.id, l.name
        from task_labels tl
        join labels l on l.id = tl.label_id
        where tl.task_id = $1
      `,
      [current.id],
    );
    const currentLabelIds = new Set(currentLabelRows.rows.map((row) => row.id));
    const nextLabelRows = labelIds
      ? (
          await client.query<{ id: string; name: string }>(
            "select id, name from labels where id = any($1::uuid[])",
            [labelIds],
          )
        ).rows
      : currentLabelRows.rows;
    const nextLabelIds = new Set(nextLabelRows.map((row) => row.id));
    const addedLabels = nextLabelRows.filter(
      (label) => !currentLabelIds.has(label.id),
    );
    const removedLabels = currentLabelRows.rows.filter(
      (label) => !nextLabelIds.has(label.id),
    );
    const labelsChanged = Boolean(
      labelIds && (addedLabels.length > 0 || removedLabels.length > 0),
    );

    const nextDescription =
      input.description !== undefined ? input.description : current.description;
    const nextDescriptionText =
      input.description !== undefined
        ? richTextToPlainText(input.description)
        : current.descriptionText;
    const descriptionChanged =
      input.description !== undefined &&
      JSON.stringify(input.description) !== JSON.stringify(current.description);

    let completedAt = current.completedAt;
    if (status.category === "done" && current.statusCategory !== "done") {
      completedAt = new Date();
    } else if (status.category !== "done") {
      completedAt = null;
    }

    const nextTitle = input.title ?? current.title;
    const nextAssigneeId =
      input.assigneeId !== undefined ? input.assigneeId : current.assigneeId;
    const nextPriority = input.priority ?? current.priority;
    const nextDueDate =
      input.dueDate !== undefined ? input.dueDate : current.dueDate;

    let nextAssigneeName: string | null = current.assigneeName;
    if (nextAssigneeId && nextAssigneeId !== current.assigneeId) {
      const assignee = await client.query<{ name: string }>(
        'select name from "user" where id = $1',
        [nextAssigneeId],
      );
      nextAssigneeName = assignee.rows[0]?.name ?? null;
    }
    if (!nextAssigneeId) nextAssigneeName = null;

    const statusChanged = status.id !== current.statusId;
    const assigneeChanged =
      input.assigneeId !== undefined && input.assigneeId !== current.assigneeId;
    const priorityChanged =
      input.priority !== undefined && input.priority !== current.priority;
    const dueDateChanged =
      input.dueDate !== undefined && input.dueDate !== current.dueDate;
    const titleChanged =
      input.title !== undefined && input.title !== current.title;

    await client.query(
      `
        update tasks set
          title = $2,
          description = $3,
          description_text = $4,
          status_id = $5,
          assignee_id = $6,
          priority = $7,
          due_date = $8,
          completed_at = $9
        where id = $1
      `,
      [
        current.id,
        nextTitle,
        JSON.stringify(nextDescription),
        nextDescriptionText,
        status.id,
        nextAssigneeId,
        nextPriority,
        nextDueDate,
        completedAt,
      ],
    );

    if (labelIds && labelsChanged) {
      await client.query("delete from task_labels where task_id = $1", [
        current.id,
      ]);
      for (const labelId of labelIds) {
        await client.query(
          "insert into task_labels (task_id, label_id) values ($1, $2)",
          [current.id, labelId],
        );
      }
    }

    const changes: string[] = [];

    if (titleChanged) {
      changes.push("renamed the task");
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "title_changed",
        field: "title",
        fromValue: current.title,
        toValue: nextTitle,
        metadata: { fromTitle: current.title, toTitle: nextTitle },
      });
    }

    if (descriptionChanged) {
      changes.push("updated the description");
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "description_changed",
        field: "description",
      });
    }

    if (statusChanged) {
      changes.push(`changed status to ${status.name}`);
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "status_changed",
        field: "status",
        fromValue: current.statusId,
        toValue: status.id,
        metadata: { fromName: current.statusName, toName: status.name },
      });
    }

    if (assigneeChanged) {
      changes.push(
        nextAssigneeName
          ? `assigned to ${nextAssigneeName}`
          : "removed the assignee",
      );
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "assignee_changed",
        field: "assignee",
        fromValue: current.assigneeId,
        toValue: nextAssigneeId,
        metadata: {
          fromName: current.assigneeName,
          toName: nextAssigneeName,
        },
      });
    }

    if (priorityChanged) {
      const priorityLabels: Record<TaskPriority, string> = {
        none: "No priority",
        low: "Low",
        medium: "Medium",
        high: "High",
        urgent: "Urgent",
      };
      changes.push(`set priority to ${priorityLabels[nextPriority]}`);
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "priority_changed",
        field: "priority",
        fromValue: current.priority,
        toValue: nextPriority,
        metadata: {
          fromLabel: priorityLabels[current.priority],
          toLabel: priorityLabels[nextPriority],
        },
      });
    }

    if (dueDateChanged) {
      changes.push(
        nextDueDate ? `set the due date to ${nextDueDate}` : "cleared the due date",
      );
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "due_date_changed",
        field: "due_date",
        fromValue: current.dueDate,
        toValue: nextDueDate,
        metadata: { fromLabel: current.dueDate, toLabel: nextDueDate },
      });
    }

    if (labelsChanged) {
      changes.push("updated labels");
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "labels_changed",
        field: "labels",
        metadata: {
          addedIds: addedLabels.map((label) => label.id),
          addedNames: addedLabels.map((label) => label.name),
          removedIds: removedLabels.map((label) => label.id),
          removedNames: removedLabels.map((label) => label.name),
        },
      });
    }

    if (assigneeChanged && nextAssigneeId) {
      await addTaskFollower(client, current.id, nextAssigneeId);
      if (nextAssigneeId !== input.actorId) {
        await createNotification(client, {
          workspaceId: input.workspaceId,
          userId: nextAssigneeId,
          actorId: input.actorId,
          taskId: current.id,
          type: "assigned",
          title: `${actorName} assigned you ${current.identifier}`,
          body: nextTitle,
        });
      }
    }

    if (changes.length > 0) {
      await notifyTaskFollowers(client, {
        workspaceId: input.workspaceId,
        taskId: current.id,
        actorId: input.actorId,
        type: "task_updated",
        title: `${actorName} updated ${current.identifier}`,
        body: changes.join(" · "),
        excludeUserIds:
          assigneeChanged && nextAssigneeId ? [nextAssigneeId] : [],
      });
    }
  });

  const task = await getTaskById(input.workspaceId, input.taskId);
  if (!task) throw new AppError("Task not found.", 404);
  return task;
}

export async function deleteTask(input: {
  workspaceId: string;
  taskId: string;
}) {
  const task = await query<{
    id: string;
    projectKey: string;
    subtaskCount: number;
  }>(
    `
      select
        t.id,
        p.key as "projectKey",
        (
          select count(*)::int
          from tasks child
          where child.parent_task_id = t.id
        ) as "subtaskCount"
      from tasks t
      join projects p on p.id = t.project_id
      where t.id = $1 and p.workspace_id = $2
      limit 1
    `,
    [input.taskId, input.workspaceId],
  );
  const current = task.rows[0];
  if (!current) throw new AppError("Task not found.", 404);

  await query("delete from tasks where id = $1", [input.taskId]);

  return {
    id: current.id,
    projectKey: current.projectKey,
    subtaskCount: current.subtaskCount,
  };
}

export async function createTaskLink(input: {
  workspaceId: string;
  taskId: string;
  relatedTaskId: string;
  actorId: string;
}): Promise<{ id: string }> {
  if (input.taskId === input.relatedTaskId) {
    throw new AppError("A task cannot be related to itself.", 400);
  }

  return withTransaction(async (client) => {
    const tasks = await client.query<{
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
        where t.id = any($1::uuid[]) and p.workspace_id = $2
      `,
      [[input.taskId, input.relatedTaskId], input.workspaceId],
    );
    if (tasks.rows.length !== 2) {
      throw new AppError("One of those tasks could not be found.", 404);
    }

    const primaryTask = tasks.rows.find((task) => task.id === input.taskId)!;
    const relatedTask = tasks.rows.find(
      (task) => task.id === input.relatedTaskId,
    )!;

    const existing = await client.query<{ id: string }>(
      `
        select id from task_links
        where (task_id = $1 and related_task_id = $2)
           or (task_id = $2 and related_task_id = $1)
        limit 1
      `,
      [input.taskId, input.relatedTaskId],
    );
    if (existing.rows[0]) return { id: existing.rows[0].id };

    const result = await client.query<{ id: string }>(
      `
        insert into task_links (task_id, related_task_id, created_by)
        values ($1, $2, $3)
        returning id
      `,
      [input.taskId, input.relatedTaskId, input.actorId],
    );

    await logTaskActivity(client, {
      taskId: input.taskId,
      actorId: input.actorId,
      type: "link_added",
      metadata: {
        relatedTaskId: input.relatedTaskId,
        relatedIdentifier: relatedTask.identifier,
        relatedTitle: relatedTask.title,
      },
    });

    const actorName = await getActorName(client, input.actorId);
    await notifyTaskFollowers(client, {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      actorId: input.actorId,
      type: "task_updated",
      title: `${actorName} updated ${primaryTask.identifier}`,
      body: `linked ${relatedTask.identifier}`,
    });

    return { id: result.rows[0]!.id };
  });
}

export async function removeTaskLink(input: {
  workspaceId: string;
  taskId: string;
  linkId: string;
  actorId: string;
}) {
  await withTransaction(async (client) => {
    const link = await client.query<{
      id: string;
      relatedIdentifier: string;
      primaryIdentifier: string;
    }>(
      `
        select
          ln.id,
          (rp.key || '-' || rt.number::text) as "relatedIdentifier",
          (op.key || '-' || ot.number::text) as "primaryIdentifier"
        from task_links ln
        join tasks t on t.id = ln.task_id
        join projects p on p.id = t.project_id
        join tasks rt on rt.id = case
          when ln.task_id = $3 then ln.related_task_id
          else ln.task_id
        end
        join projects rp on rp.id = rt.project_id
        join tasks ot on ot.id = $3
        join projects op on op.id = ot.project_id
        where ln.id = $1
          and p.workspace_id = $2
          and (ln.task_id = $3 or ln.related_task_id = $3)
      `,
      [input.linkId, input.workspaceId, input.taskId],
    );
    if (!link.rows[0]) throw new AppError("Link not found.", 404);

    await client.query("delete from task_links where id = $1", [input.linkId]);
    await logTaskActivity(client, {
      taskId: input.taskId,
      actorId: input.actorId,
      type: "link_removed",
      metadata: {
        linkId: input.linkId,
        relatedIdentifier: link.rows[0].relatedIdentifier,
      },
    });

    const actorName = await getActorName(client, input.actorId);
    await notifyTaskFollowers(client, {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      actorId: input.actorId,
      type: "task_updated",
      title: `${actorName} updated ${link.rows[0].primaryIdentifier}`,
      body: `removed the link to ${link.rows[0].relatedIdentifier}`,
    });
  });
}

export async function isTaskFollowed(taskId: string, userId: string) {
  const { rowCount } = await query(
    "select 1 from task_followers where task_id = $1 and user_id = $2",
    [taskId, userId],
  );
  return Boolean(rowCount);
}

export async function setTaskFollowed(input: {
  workspaceId: string;
  taskId: string;
  userId: string;
  follow: boolean;
}) {
  const task = await query(
    `
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = $1 and p.workspace_id = $2
    `,
    [input.taskId, input.workspaceId],
  );
  if (!task.rowCount) throw new AppError("Task not found.", 404);

  if (input.follow) {
    await query(
      `
        insert into task_followers (task_id, user_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [input.taskId, input.userId],
    );
  } else {
    await query(
      "delete from task_followers where task_id = $1 and user_id = $2",
      [input.taskId, input.userId],
    );
  }
  return input.follow;
}
