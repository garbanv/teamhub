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
  coalesce((
    select jsonb_agg(
      jsonb_build_object('id', u.id, 'name', u.name, 'image', u.image)
      order by ta.created_at, u.name
    )
    from task_assignees ta
    join "user" u on u.id = ta.user_id
    where ta.task_id = t.id
  ), '[]'::jsonb) as assignees,
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
    assignees: Array.isArray(row.assignees) ? row.assignees : [],
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
      conditions.push(
        "not exists (select 1 from task_assignees fa where fa.task_id = t.id)",
      );
    } else {
      values.push(filters.assignee);
      conditions.push(
        `exists (select 1 from task_assignees fa where fa.task_id = t.id and fa.user_id = $${values.length})`,
      );
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
        and exists (
          select 1 from task_assignees ta
          where ta.task_id = t.id and ta.user_id = $2
        )
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

async function assertWorkspaceMembers(
  client: PoolClient,
  workspaceId: string,
  userIds: string[],
) {
  if (userIds.length === 0) return;
  const { rows } = await client.query<{ userId: string }>(
    `select user_id as "userId" from workspace_members
     where workspace_id = $1 and user_id = any($2::text[])`,
    [workspaceId, userIds],
  );
  if (rows.length !== userIds.length) {
    throw new AppError("One or more assignees are not members of this workspace.", 400);
  }
}

async function mapStatusToProject(
  client: PoolClient,
  targetProjectId: string,
  status: { name: string; category: ProjectStatusCategory },
) {
  const byName = await client.query<{ id: string }>(
    `select id from project_statuses
     where project_id = $1 and lower(name) = lower($2)
     order by position asc limit 1`,
    [targetProjectId, status.name],
  );
  if (byName.rows[0]) return byName.rows[0].id;
  const byCategory = await client.query<{ id: string }>(
    `select id from project_statuses
     where project_id = $1 and category = $2
     order by position asc limit 1`,
    [targetProjectId, status.category],
  );
  if (byCategory.rows[0]) return byCategory.rows[0].id;
  return resolveDefaultStatus(client, targetProjectId);
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
  assigneeIds?: string[];
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

    const assigneeIds = [...new Set(input.assigneeIds ?? [])];
    await assertWorkspaceMembers(client, input.workspaceId, assigneeIds);

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
          status_id, priority, due_date, parent_task_id,
          sort_order, created_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        returning id
      `,
      [
        input.projectId,
        number,
        input.title,
        JSON.stringify(description),
        descriptionText,
        statusId,
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
    for (const assigneeId of assigneeIds) {
      await client.query(
        "insert into task_assignees (task_id, user_id) values ($1, $2)",
        [id, assigneeId],
      );
      await addTaskFollower(client, id, assigneeId);
      if (assigneeId !== input.actorId) {
        const actorName = await getActorName(client, input.actorId);
        const identifier = `${projectRow.key}-${number}`;
        await createNotification(client, {
          workspaceId: input.workspaceId,
          userId: assigneeId,
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
  assigneeIds?: string[];
  projectId?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  labelIds?: string[];
}): Promise<TaskDetail> {
  await withTransaction(async (client) => {
    const currentResult = await client.query<{
      id: string;
      projectId: string;
      projectKey: string;
      projectName: string;
      number: number;
      parentTaskId: string | null;
      identifier: string;
      title: string;
      description: unknown;
      descriptionText: string;
      statusId: string;
      statusName: string;
      statusCategory: ProjectStatusCategory;
      priority: TaskPriority;
      dueDate: string | null;
      completedAt: Date | null;
    }>(
      `
        select
          t.id,
          t.project_id as "projectId",
          p.key as "projectKey",
          p.name as "projectName",
          t.number,
          t.parent_task_id as "parentTaskId",
          (p.key || '-' || t.number::text) as identifier,
          t.title,
          t.description,
          t.description_text as "descriptionText",
          t.status_id as "statusId",
          s.name as "statusName",
          s.category as "statusCategory",
          t.priority,
          to_char(t.due_date, 'YYYY-MM-DD') as "dueDate",
          t.completed_at as "completedAt"
        from tasks t
        join projects p on p.id = t.project_id
        join project_statuses s on s.id = t.status_id
        where t.id = $1 and p.workspace_id = $2
        for update of t
      `,
      [input.taskId, input.workspaceId],
    );

    const current = currentResult.rows[0];
    if (!current) throw new AppError("Task not found.", 404);

    const actorName = await getActorName(client, input.actorId);

    const currentAssignees = (
      await client.query<{ id: string; name: string }>(
        `select u.id, u.name
         from task_assignees ta
         join "user" u on u.id = ta.user_id
         where ta.task_id = $1`,
        [current.id],
      )
    ).rows;
    const currentAssigneeIds = new Set(currentAssignees.map((a) => a.id));
    const nextAssigneeIds = input.assigneeIds
      ? [...new Set(input.assigneeIds)]
      : [...currentAssigneeIds];
    if (input.assigneeIds) {
      await assertWorkspaceMembers(client, input.workspaceId, nextAssigneeIds);
    }
    const nextAssigneeIdSet = new Set(nextAssigneeIds);
    const addedAssigneeIds = nextAssigneeIds.filter(
      (id) => !currentAssigneeIds.has(id),
    );
    const removedAssignees = currentAssignees.filter(
      (a) => !nextAssigneeIdSet.has(a.id),
    );
    const addedAssignees = addedAssigneeIds.length
      ? (
          await client.query<{ id: string; name: string }>(
            'select id, name from "user" where id = any($1::text[])',
            [addedAssigneeIds],
          )
        ).rows
      : [];
    const assigneesChanged =
      addedAssignees.length > 0 || removedAssignees.length > 0;

    // Moving to another project --------------------------------------
    const moving = Boolean(
      input.projectId && input.projectId !== current.projectId,
    );
    let targetProject = {
      id: current.projectId,
      key: current.projectKey,
      name: current.projectName,
    };
    if (moving) {
      if (current.parentTaskId) {
        throw new AppError(
          "Subtasks move with their parent task. Move the parent instead.",
          400,
        );
      }
      const target = await client.query<{
        id: string;
        key: string;
        name: string;
        archivedAt: Date | null;
      }>(
        `select id, key, name, archived_at as "archivedAt"
         from projects
         where id = $1 and workspace_id = $2
         for update`,
        [input.projectId, input.workspaceId],
      );
      const targetRow = target.rows[0];
      if (!targetRow) throw new AppError("Project not found.", 404);
      if (targetRow.archivedAt) {
        throw new AppError("You can't move tasks into an archived project.", 409);
      }
      targetProject = {
        id: targetRow.id,
        key: targetRow.key,
        name: targetRow.name,
      };
    }

    let status = {
      id: current.statusId,
      name: current.statusName,
      category: current.statusCategory,
    };
    if (moving) {
      if (input.statusId) {
        status = await assertStatusForProject(
          client,
          targetProject.id,
          input.statusId,
        );
      } else {
        const mappedId = await mapStatusToProject(client, targetProject.id, {
          name: current.statusName,
          category: current.statusCategory,
        });
        status = await assertStatusForProject(client, targetProject.id, mappedId);
      }
    } else if (input.statusId && input.statusId !== current.statusId) {
      status = await assertStatusForProject(
        client,
        current.projectId,
        input.statusId,
      );
    }

    let identifier = current.identifier;
    let movedSubtaskCount = 0;
    if (moving) {
      const allocate = async () => {
        const counter = await client.query<{ taskCounter: number }>(
          `update projects set task_counter = task_counter + 1
           where id = $1 returning task_counter as "taskCounter"`,
          [targetProject.id],
        );
        const value = counter.rows[0]?.taskCounter;
        if (!value) throw new AppError("Could not allocate a task number.", 500);
        return value;
      };
      const nextSort = async (statusId: string) =>
        (
          await client.query<{ sortOrder: number }>(
            `select coalesce(max(sort_order), 0) + 1 as "sortOrder"
             from tasks where project_id = $1 and status_id = $2`,
            [targetProject.id, statusId],
          )
        ).rows[0]?.sortOrder ?? 1;

      const newNumber = await allocate();
      await client.query(
        `update tasks
         set project_id = $2, number = $3, status_id = $4, sort_order = $5
         where id = $1`,
        [current.id, targetProject.id, newNumber, status.id, await nextSort(status.id)],
      );
      identifier = `${targetProject.key}-${newNumber}`;

      const subtasks = await client.query<{
        id: string;
        statusName: string;
        statusCategory: ProjectStatusCategory;
      }>(
        `select t.id, s.name as "statusName", s.category as "statusCategory"
         from tasks t
         join project_statuses s on s.id = t.status_id
         where t.parent_task_id = $1
         order by t.number asc`,
        [current.id],
      );
      for (const subtask of subtasks.rows) {
        const subStatusId = await mapStatusToProject(client, targetProject.id, {
          name: subtask.statusName,
          category: subtask.statusCategory,
        });
        await client.query(
          `update tasks
           set project_id = $2, number = $3, status_id = $4, sort_order = $5
           where id = $1`,
          [
            subtask.id,
            targetProject.id,
            await allocate(),
            subStatusId,
            await nextSort(subStatusId),
          ],
        );
      }
      movedSubtaskCount = subtasks.rows.length;
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
    const nextPriority = input.priority ?? current.priority;
    const nextDueDate =
      input.dueDate !== undefined ? input.dueDate : current.dueDate;

    const statusChanged = !moving && status.id !== current.statusId;
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
          priority = $6,
          due_date = $7,
          completed_at = $8
        where id = $1
      `,
      [
        current.id,
        nextTitle,
        JSON.stringify(nextDescription),
        nextDescriptionText,
        status.id,
        nextPriority,
        nextDueDate,
        completedAt,
      ],
    );

    if (assigneesChanged) {
      if (removedAssignees.length > 0) {
        await client.query(
          "delete from task_assignees where task_id = $1 and user_id = any($2::text[])",
          [current.id, removedAssignees.map((a) => a.id)],
        );
      }
      for (const added of addedAssignees) {
        await client.query(
          "insert into task_assignees (task_id, user_id) values ($1, $2) on conflict do nothing",
          [current.id, added.id],
        );
      }
    }

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

    if (moving) {
      changes.push(`moved to ${targetProject.name}`);
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "project_changed",
        field: "project",
        fromValue: current.projectId,
        toValue: targetProject.id,
        metadata: {
          fromName: current.projectName,
          toName: targetProject.name,
          fromIdentifier: current.identifier,
          toIdentifier: identifier,
          subtasksMoved: movedSubtaskCount,
        },
      });
    }

    if (assigneesChanged) {
      if (addedAssignees.length > 0) {
        changes.push(
          `assigned to ${addedAssignees.map((a) => a.name).join(", ")}`,
        );
      }
      if (removedAssignees.length > 0) {
        changes.push(
          `unassigned ${removedAssignees.map((a) => a.name).join(", ")}`,
        );
      }
      await logTaskActivity(client, {
        taskId: current.id,
        actorId: input.actorId,
        type: "assignee_changed",
        field: "assignees",
        metadata: {
          addedIds: addedAssignees.map((a) => a.id),
          addedNames: addedAssignees.map((a) => a.name),
          removedIds: removedAssignees.map((a) => a.id),
          removedNames: removedAssignees.map((a) => a.name),
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

    for (const added of addedAssignees) {
      await addTaskFollower(client, current.id, added.id);
      if (added.id !== input.actorId) {
        await createNotification(client, {
          workspaceId: input.workspaceId,
          userId: added.id,
          actorId: input.actorId,
          taskId: current.id,
          type: "assigned",
          title: `${actorName} assigned you ${identifier}`,
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
        title: `${actorName} updated ${identifier}`,
        body: changes.join(" · "),
        excludeUserIds: addedAssignees.map((a) => a.id),
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
