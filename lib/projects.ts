import { query, withTransaction } from "./db";
import { AppError } from "./errors";
import {
  defaultProjectStatuses,
  statusCategoryOrder,
} from "./project-constants";
import type {
  ProjectStatusCategory,
  ProjectStatusItem,
  ProjectSummary,
} from "./types";

type ProjectRow = {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  icon: string;
  leadId: string | null;
  leadName: string | null;
  leadImage: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  taskCount: number;
  completedCount: number;
};

type StatusRow = {
  id: string;
  projectId: string;
  name: string;
  category: ProjectStatusCategory;
  color: string;
  position: number;
};

type ProjectRecord = {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  icon: string;
  leadId: string | null;
  archivedAt: Date | null;
  sortOrder: number;
};

const projectSelect = `
  select
    p.id,
    p.workspace_id as "workspaceId",
    p.name,
    p.key,
    p.description,
    p.color,
    p.icon,
    p.lead_id as "leadId",
    lead.name as "leadName",
    lead.image as "leadImage",
    p.archived_at as "archivedAt",
    p.created_at as "createdAt",
    p.updated_at as "updatedAt",
    (
      select count(*)::int from tasks t
      where t.project_id = p.id
    ) as "taskCount",
    (
      select count(*)::int
      from tasks t
      join project_statuses s on s.id = t.status_id
      where t.project_id = p.id and s.category = 'done'
    ) as "completedCount"
  from projects p
  left join "user" lead on lead.id = p.lead_id
`;

function mapProject(row: ProjectRow): ProjectSummary {
  return {
    ...row,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapStatus(row: StatusRow): ProjectStatusItem {
  return row;
}

export async function getProjects(
  workspaceId: string,
  includeArchived = true,
): Promise<ProjectSummary[]> {
  const { rows } = await query<ProjectRow>(
    `
      ${projectSelect}
      where p.workspace_id = $1
        ${includeArchived ? "" : "and p.archived_at is null"}
      order by
        case when p.archived_at is null then 0 else 1 end,
        p.sort_order asc,
        p.created_at asc
    `,
    [workspaceId],
  );
  return rows.map(mapProject);
}

export async function getProjectById(
  projectId: string,
): Promise<ProjectSummary | null> {
  const { rows } = await query<ProjectRow>(
    `${projectSelect} where p.id = $1 limit 1`,
    [projectId],
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function getProjectForWorkspace(
  workspaceId: string,
  projectId: string,
): Promise<ProjectSummary | null> {
  const { rows } = await query<ProjectRow>(
    `${projectSelect} where p.id = $1 and p.workspace_id = $2 limit 1`,
    [projectId, workspaceId],
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function getProjectByKey(
  workspaceId: string,
  key: string,
): Promise<ProjectSummary | null> {
  const { rows } = await query<ProjectRow>(
    `${projectSelect} where p.workspace_id = $1 and lower(p.key) = lower($2) limit 1`,
    [workspaceId, key],
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function getProjectStatuses(
  projectId: string,
): Promise<ProjectStatusItem[]> {
  const { rows } = await query<StatusRow>(
    `
      select
        id,
        project_id as "projectId",
        name,
        category,
        color,
        position
      from project_statuses
      where project_id = $1
      order by
        case category
          when 'backlog' then 0
          when 'todo' then 1
          when 'in_progress' then 2
          when 'done' then 3
          when 'canceled' then 4
          else 5
        end,
        position asc,
        created_at asc
    `,
    [projectId],
  );
  return rows.map(mapStatus);
}

async function assertLeadIsMember(
  workspaceId: string,
  leadId: string | null | undefined,
) {
  if (!leadId) return;
  const { rowCount } = await query(
    "select 1 from workspace_members where workspace_id = $1 and user_id = $2",
    [workspaceId, leadId],
  );
  if (!rowCount) {
    throw new AppError("That lead is not a member of this workspace.", 400);
  }
}

export async function createProject(input: {
  workspaceId: string;
  userId: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  icon: string;
  leadId: string | null;
}): Promise<ProjectSummary> {
  await assertLeadIsMember(input.workspaceId, input.leadId);

  const projectId = await withTransaction(async (client) => {
    const duplicate = await client.query(
      "select 1 from projects where workspace_id = $1 and lower(key) = lower($2)",
      [input.workspaceId, input.key],
    );
    if (duplicate.rowCount) {
      throw new AppError(`The project key ${input.key} is already in use.`, 409);
    }

    const next = await client.query<{ sortOrder: number }>(
      `
        select coalesce(max(sort_order), -1) + 1 as "sortOrder"
        from projects where workspace_id = $1
      `,
      [input.workspaceId],
    );

    const { rows } = await client.query<{ id: string }>(
      `
        insert into projects
          (workspace_id, name, key, description, color, icon, lead_id, sort_order, created_by)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning id
      `,
      [
        input.workspaceId,
        input.name,
        input.key,
        input.description,
        input.color,
        input.icon,
        input.leadId,
        next.rows[0]?.sortOrder ?? 0,
        input.userId,
      ],
    );

    const id = rows[0]!.id;

    for (const [index, status] of defaultProjectStatuses.entries()) {
      await client.query(
        `
          insert into project_statuses (project_id, name, category, color, position)
          values ($1, $2, $3, $4, $5)
        `,
        [id, status.name, status.category, status.color, index],
      );
    }

    return id;
  });

  const project = await getProjectById(projectId);
  if (!project) throw new AppError("Project could not be created.", 500);
  return project;
}

export async function updateProject(input: {
  workspaceId: string;
  projectId: string;
  name?: string;
  key?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  leadId?: string | null;
  archived?: boolean;
}): Promise<ProjectSummary> {
  await assertLeadIsMember(input.workspaceId, input.leadId);

  await withTransaction(async (client) => {
    const currentResult = await client.query<ProjectRecord>(
      `
        select
          id,
          workspace_id as "workspaceId",
          name,
          key,
          description,
          color,
          icon,
          lead_id as "leadId",
          archived_at as "archivedAt",
          sort_order as "sortOrder"
        from projects
        where id = $1 and workspace_id = $2
        for update
      `,
      [input.projectId, input.workspaceId],
    );

    const current = currentResult.rows[0];
    if (!current) throw new AppError("Project not found.", 404);

    const nextKey = input.key?.toUpperCase() ?? current.key;
    const nextLeadId =
      input.leadId !== undefined ? input.leadId : current.leadId;

    if (nextLeadId) {
      const lead = await client.query(
        "select 1 from workspace_members where workspace_id = $1 and user_id = $2",
        [input.workspaceId, nextLeadId],
      );
      if (!lead.rowCount) {
        throw new AppError("That lead is not a member of this workspace.", 400);
      }
    }

    const duplicate = await client.query(
      `
        select 1 from projects
        where workspace_id = $1 and lower(key) = lower($2) and id <> $3
      `,
      [input.workspaceId, nextKey, input.projectId],
    );
    if (duplicate.rowCount) {
      throw new AppError(`The project key ${nextKey} is already in use.`, 409);
    }

    let archivedAt = current.archivedAt;
    if (input.archived === true && !archivedAt) archivedAt = new Date();
    if (input.archived === false) archivedAt = null;

    await client.query(
      `
        update projects set
          name = $2,
          key = $3,
          description = $4,
          color = $5,
          icon = $6,
          lead_id = $7,
          archived_at = $8
        where id = $1
      `,
      [
        input.projectId,
        input.name ?? current.name,
        nextKey,
        input.description !== undefined ? input.description : current.description,
        input.color ?? current.color,
        input.icon ?? current.icon,
        nextLeadId,
        archivedAt,
      ],
    );
  });

  const project = await getProjectById(input.projectId);
  if (!project) throw new AppError("Project not found.", 404);
  return project;
}

export async function createProjectStatus(input: {
  projectId: string;
  name: string;
  category: ProjectStatusCategory;
  color: string;
}): Promise<ProjectStatusItem> {
  return withTransaction(async (client) => {
    const duplicate = await client.query(
      `
        select 1 from project_statuses
        where project_id = $1 and lower(name) = lower($2)
      `,
      [input.projectId, input.name],
    );
    if (duplicate.rowCount) {
      throw new AppError("A status with that name already exists.", 409);
    }

    const positionResult = await client.query<{ position: number }>(
      `
        select coalesce(max(position), -1) + 1 as position
        from project_statuses
        where project_id = $1 and category = $2
      `,
      [input.projectId, input.category],
    );

    const { rows } = await client.query<StatusRow>(
      `
        insert into project_statuses (project_id, name, category, color, position)
        values ($1, $2, $3, $4, $5)
        returning
          id,
          project_id as "projectId",
          name,
          category,
          color,
          position
      `,
      [
        input.projectId,
        input.name,
        input.category,
        input.color,
        positionResult.rows[0]?.position ?? 0,
      ],
    );

    return mapStatus(rows[0]!);
  });
}

export async function updateProjectStatus(input: {
  projectId: string;
  statusId: string;
  name?: string;
  category?: ProjectStatusCategory;
  color?: string;
}): Promise<ProjectStatusItem> {
  return withTransaction(async (client) => {
    const currentResult = await client.query<StatusRow>(
      `
        select
          id,
          project_id as "projectId",
          name,
          category,
          color,
          position
        from project_statuses
        where id = $1 and project_id = $2
        for update
      `,
      [input.statusId, input.projectId],
    );

    const current = currentResult.rows[0];
    if (!current) throw new AppError("Status not found.", 404);

    const nextName = input.name ?? current.name;
    const nextCategory = input.category ?? current.category;

    const duplicate = await client.query(
      `
        select 1 from project_statuses
        where project_id = $1
          and lower(name) = lower($2)
          and id <> $3
      `,
      [input.projectId, nextName, input.statusId],
    );
    if (duplicate.rowCount) {
      throw new AppError("A status with that name already exists.", 409);
    }

    let position = current.position;
    if (nextCategory !== current.category) {
      const last = await client.query<{ position: number }>(
        `
          select coalesce(max(position), -1) + 1 as position
          from project_statuses
          where project_id = $1 and category = $2
        `,
        [input.projectId, nextCategory],
      );
      position = last.rows[0]?.position ?? 0;
    }

    const { rows } = await client.query<StatusRow>(
      `
        update project_statuses
        set name = $3, category = $4, color = $5, position = $6
        where id = $1 and project_id = $2
        returning
          id,
          project_id as "projectId",
          name,
          category,
          color,
          position
      `,
      [
        input.statusId,
        input.projectId,
        nextName,
        nextCategory,
        input.color ?? current.color,
        position,
      ],
    );

    return mapStatus(rows[0]!);
  });
}

export async function reorderProjectStatuses(input: {
  projectId: string;
  category: ProjectStatusCategory;
  statusIds: string[];
}) {
  await withTransaction(async (client) => {
    const current = await client.query<{ id: string }>(
      `
        select id from project_statuses
        where project_id = $1 and category = $2
      `,
      [input.projectId, input.category],
    );

    const currentIds = current.rows.map((row) => row.id).sort();
    const nextIds = [...input.statusIds].sort();

    if (
      currentIds.length !== nextIds.length ||
      currentIds.some((id, index) => id !== nextIds[index])
    ) {
      throw new AppError(
        "Status order must include every status in this category.",
        400,
      );
    }

    for (const [index, statusId] of input.statusIds.entries()) {
      await client.query(
        "update project_statuses set position = $2 where id = $1",
        [statusId, index],
      );
    }
  });

  return getProjectStatuses(input.projectId);
}

export function groupedStatuses(statuses: ProjectStatusItem[]) {
  return statusCategoryOrder.map((category) => ({
    category,
    statuses: statuses.filter((status) => status.category === category),
  }));
}
