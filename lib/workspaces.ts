import { query, withTransaction } from "./db";
import { AppError } from "./errors";
import { createInviteToken, hashInviteToken } from "./invitations";
import { defaultWorkspaceLabels } from "./label-constants";
import { slugify } from "./utils";
import type {
  InvitePreview,
  ProjectNavItem,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from "./types";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  logoColor: string;
  role: WorkspaceRole;
  memberCount: number;
};

type MemberRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: WorkspaceRole;
  joinedAt: Date;
};

type InvitationRow = {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  invitedByName: string;
  createdAt: Date;
  expiresAt: Date;
};

type InvitePreviewRow = {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  acceptedAt: Date | null;
  expiresAt: Date;
  workspaceName: string;
  workspaceSlug: string;
  workspaceLogoColor: string;
  inviterName: string;
};

export async function getWorkspacesForUser(
  userId: string,
): Promise<WorkspaceSummary[]> {
  const { rows } = await query<WorkspaceRow>(
    `
      select
        w.id,
        w.name,
        w.slug,
        w.logo_color as "logoColor",
        m.role,
        (select count(*)::int from workspace_members wmc where wmc.workspace_id = w.id) as "memberCount"
      from workspace_members m
      join workspaces w on w.id = m.workspace_id
      where m.user_id = $1
      order by m.joined_at asc
    `,
    [userId],
  );

  return rows;
}

export async function getWorkspaceForUser(
  slug: string,
  userId: string,
): Promise<WorkspaceSummary | null> {
  const { rows } = await query<WorkspaceRow>(
    `
      select
        w.id,
        w.name,
        w.slug,
        w.logo_color as "logoColor",
        m.role,
        (select count(*)::int from workspace_members wmc where wmc.workspace_id = w.id) as "memberCount"
      from workspace_members m
      join workspaces w on w.id = m.workspace_id
      where w.slug = $1 and m.user_id = $2
      limit 1
    `,
    [slug, userId],
  );

  return rows[0] ?? null;
}

export async function getWorkspaceIdentity(workspaceId: string) {
  const { rows } = await query<{ name: string; slug: string }>(
    "select name, slug from workspaces where id = $1 limit 1",
    [workspaceId],
  );
  return rows[0] ?? null;
}

export async function getWorkspaceRole(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const { rows } = await query<{ role: WorkspaceRole }>(
    "select role from workspace_members where workspace_id = $1 and user_id = $2",
    [workspaceId, userId],
  );
  return rows[0]?.role ?? null;
}

export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const { rows } = await query<MemberRow>(
    `
      select
        m.id as "membershipId",
        u.id as "userId",
        u.name,
        u.email,
        u.image,
        m.role,
        m.joined_at as "joinedAt"
      from workspace_members m
      join "user" u on u.id = m.user_id
      where m.workspace_id = $1
      order by
        case m.role when 'owner' then 0 when 'admin' then 1 else 2 end,
        lower(u.name)
    `,
    [workspaceId],
  );

  return rows.map((row) => ({
    ...row,
    joinedAt: row.joinedAt.toISOString(),
  }));
}

export async function getPendingInvitations(
  workspaceId: string,
): Promise<WorkspaceInvitation[]> {
  const { rows } = await query<InvitationRow>(
    `
      select
        i.id,
        i.email,
        i.role,
        inviter.name as "invitedByName",
        i.created_at as "createdAt",
        i.expires_at as "expiresAt"
      from workspace_invitations i
      join "user" inviter on inviter.id = i.invited_by
      where i.workspace_id = $1 and i.accepted_at is null
      order by i.created_at desc
    `,
    [workspaceId],
  );

  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    expired: row.expiresAt.getTime() < now,
  }));
}

async function availableSlug(base: string) {
  const root = slugify(base) || "workspace";
  for (let suffix = 1; suffix < 100; suffix += 1) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const { rowCount } = await query(
      "select 1 from workspaces where slug = $1 limit 1",
      [candidate],
    );
    if (!rowCount) return candidate;
  }
  throw new AppError("Could not find an available workspace URL.", 409);
}

export async function createWorkspace(
  userId: string,
  name: string,
): Promise<WorkspaceSummary> {
  const slug = await availableSlug(name);

  return withTransaction(async (client) => {
    const workspaceResult = await client.query<{
      id: string;
      name: string;
      slug: string;
      logoColor: string;
    }>(
      `
        insert into workspaces (name, slug, created_by)
        values ($1, $2, $3)
        returning id, name, slug, logo_color as "logoColor"
      `,
      [name, slug, userId],
    );

    const workspace = workspaceResult.rows[0]!;

    await client.query(
      "insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner')",
      [workspace.id, userId],
    );

    for (const label of defaultWorkspaceLabels) {
      await client.query(
        "insert into labels (workspace_id, name, color) values ($1, $2, $3)",
        [workspace.id, label.name, label.color],
      );
    }

    return {
      ...workspace,
      role: "owner" as const,
      memberCount: 1,
    };
  });
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const { rows } = await query<{ id: string; name: string; slug: string }>(
    `
      update workspaces
      set name = $2
      where id = $1
      returning id, name, slug
    `,
    [workspaceId, name],
  );
  return rows[0] ?? null;
}

export async function getProjectNavItems(
  workspaceId: string,
): Promise<ProjectNavItem[]> {
  const { rows } = await query<ProjectNavItem>(
    `
      select id, name, key, color, icon, (archived_at is not null) as archived
      from projects
      where workspace_id = $1 and archived_at is null
      order by sort_order asc, created_at asc
    `,
    [workspaceId],
  );
  return rows;
}

export async function getWorkspaceOverviewCounts(
  workspaceId: string,
  userId: string,
) {
  const { rows } = await query<{
    projects: number;
    assigned: number;
    thisWeek: number;
    overdue: number;
  }>(
    `
      select
        (select count(*)::int
          from projects p
          where p.workspace_id = $1 and p.archived_at is null) as projects,
        (select count(*)::int
          from tasks t
          join projects p on p.id = t.project_id
          join project_statuses s on s.id = t.status_id
          where p.workspace_id = $1
            and exists (select 1 from task_assignees ta where ta.task_id = t.id and ta.user_id = $2)
            and s.category not in ('done', 'canceled')) as assigned,
        (select count(*)::int
          from tasks t
          join projects p on p.id = t.project_id
          join project_statuses s on s.id = t.status_id
          where p.workspace_id = $1
            and exists (select 1 from task_assignees ta where ta.task_id = t.id and ta.user_id = $2)
            and s.category not in ('done', 'canceled')
            and t.due_date between current_date and current_date + 7) as "thisWeek",
        (select count(*)::int
          from tasks t
          join projects p on p.id = t.project_id
          join project_statuses s on s.id = t.status_id
          where p.workspace_id = $1
            and exists (select 1 from task_assignees ta where ta.task_id = t.id and ta.user_id = $2)
            and s.category not in ('done', 'canceled')
            and t.due_date < current_date) as overdue
    `,
    [workspaceId, userId],
  );

  return (
    rows[0] ?? {
      projects: 0,
      assigned: 0,
      thisWeek: 0,
      overdue: 0,
    }
  );
}

export async function getInvitePreview(
  token: string,
): Promise<InvitePreview | null> {
  const { rows } = await query<InvitePreviewRow>(
    `
      select
        i.id,
        i.email,
        i.role,
        i.accepted_at as "acceptedAt",
        i.expires_at as "expiresAt",
        w.name as "workspaceName",
        w.slug as "workspaceSlug",
        w.logo_color as "workspaceLogoColor",
        inviter.name as "inviterName"
      from workspace_invitations i
      join workspaces w on w.id = i.workspace_id
      join "user" inviter on inviter.id = i.invited_by
      where i.token_hash = $1
      limit 1
    `,
    [hashInviteToken(token)],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    workspaceName: row.workspaceName,
    workspaceSlug: row.workspaceSlug,
    workspaceLogoColor: row.workspaceLogoColor,
    inviterName: row.inviterName,
    expiresAt: row.expiresAt.toISOString(),
    expired: row.expiresAt.getTime() < Date.now(),
    accepted: row.acceptedAt !== null,
  };
}

export async function createInvitation(input: {
  workspaceId: string;
  email: string;
  role: "admin" | "member";
  invitedBy: string;
}) {
  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);

  return withTransaction(async (client) => {
    const existingMember = await client.query(
      `
        select 1
        from workspace_members m
        join "user" u on u.id = m.user_id
        where m.workspace_id = $1 and lower(u.email) = lower($2)
        limit 1
      `,
      [input.workspaceId, input.email],
    );
    if (existingMember.rowCount) {
      throw new AppError("That person is already a member of this workspace.", 409);
    }

    await client.query(
      `
        delete from workspace_invitations
        where workspace_id = $1
          and lower(email) = lower($2)
          and accepted_at is null
          and expires_at < now()
      `,
      [input.workspaceId, input.email],
    );

    const pending = await client.query(
      `
        select 1 from workspace_invitations
        where workspace_id = $1 and lower(email) = lower($2) and accepted_at is null
        limit 1
      `,
      [input.workspaceId, input.email],
    );
    if (pending.rowCount) {
      throw new AppError("There's already a pending invite for that email.", 409);
    }

    const { rows } = await client.query<{
      id: string;
      expiresAt: Date;
    }>(
      `
        insert into workspace_invitations
          (workspace_id, email, role, token_hash, invited_by)
        values ($1, lower($2), $3, $4, $5)
        returning id, expires_at as "expiresAt"
      `,
      [input.workspaceId, input.email, input.role, tokenHash, input.invitedBy],
    );

    return {
      id: rows[0]!.id,
      token,
      expiresAt: rows[0]!.expiresAt.toISOString(),
    };
  });
}

export async function revokeInvitation(
  workspaceId: string,
  invitationId: string,
) {
  const result = await query(
    `
      delete from workspace_invitations
      where id = $1 and workspace_id = $2 and accepted_at is null
    `,
    [invitationId, workspaceId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function acceptInvitation(input: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      workspaceId: string;
      workspaceName: string;
      workspaceSlug: string;
      email: string;
      role: "admin" | "member";
      acceptedAt: Date | null;
      acceptedBy: string | null;
      expiresAt: Date;
    }>(
      `
        select
          i.id,
          i.workspace_id as "workspaceId",
          w.name as "workspaceName",
          w.slug as "workspaceSlug",
          i.email,
          i.role,
          i.accepted_at as "acceptedAt",
          i.accepted_by as "acceptedBy",
          i.expires_at as "expiresAt"
        from workspace_invitations i
        join workspaces w on w.id = i.workspace_id
        where i.token_hash = $1
        for update of i
      `,
      [hashInviteToken(input.token)],
    );

    const invitation = rows[0];
    if (!invitation) {
      throw new AppError("This invite link is invalid or has been revoked.", 404);
    }

    if (invitation.acceptedAt) {
      if (invitation.acceptedBy === input.userId) {
        return {
          workspaceName: invitation.workspaceName,
          workspaceSlug: invitation.workspaceSlug,
        };
      }
      throw new AppError("This invite has already been used.", 409);
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new AppError("This invite has expired. Ask an admin for a new one.", 410);
    }

    if (invitation.email.toLowerCase() !== input.userEmail.toLowerCase()) {
      throw new AppError(
        "This invite was sent to a different email address. Sign in with that account to accept it.",
        403,
      );
    }

    await client.query(
      `
        insert into workspace_members (workspace_id, user_id, role)
        values ($1, $2, $3)
        on conflict (workspace_id, user_id) do nothing
      `,
      [invitation.workspaceId, input.userId, invitation.role],
    );

    await client.query(
      `
        update workspace_invitations
        set accepted_at = now(), accepted_by = $2
        where id = $1
      `,
      [invitation.id, input.userId],
    );

    return {
      workspaceName: invitation.workspaceName,
      workspaceSlug: invitation.workspaceSlug,
    };
  });
}

export async function updateMemberRole(input: {
  workspaceId: string;
  membershipId: string;
  role: WorkspaceRole;
}) {
  return withTransaction(async (client) => {
    const target = await client.query<{ role: WorkspaceRole; userId: string }>(
      `
        select role, user_id as "userId"
        from workspace_members
        where id = $1 and workspace_id = $2
        for update
      `,
      [input.membershipId, input.workspaceId],
    );

    const member = target.rows[0];
    if (!member) throw new AppError("Member not found.", 404);

    if (member.role === "owner" && input.role !== "owner") {
      const owners = await client.query<{ count: number }>(
        "select count(*)::int as count from workspace_members where workspace_id = $1 and role = 'owner'",
        [input.workspaceId],
      );
      if ((owners.rows[0]?.count ?? 0) <= 1) {
        throw new AppError("A workspace must have at least one owner.", 409);
      }
    }

    await client.query(
      "update workspace_members set role = $2 where id = $1",
      [input.membershipId, input.role],
    );

    return { userId: member.userId, role: input.role };
  });
}

export async function removeMember(input: {
  workspaceId: string;
  membershipId: string;
}) {
  return withTransaction(async (client) => {
    const target = await client.query<{ role: WorkspaceRole; userId: string }>(
      `
        select role, user_id as "userId"
        from workspace_members
        where id = $1 and workspace_id = $2
        for update
      `,
      [input.membershipId, input.workspaceId],
    );

    const member = target.rows[0];
    if (!member) throw new AppError("Member not found.", 404);

    if (member.role === "owner") {
      const owners = await client.query<{ count: number }>(
        "select count(*)::int as count from workspace_members where workspace_id = $1 and role = 'owner'",
        [input.workspaceId],
      );
      if ((owners.rows[0]?.count ?? 0) <= 1) {
        throw new AppError("You can't remove the workspace's last owner.", 409);
      }
    }

    await client.query("delete from workspace_members where id = $1", [
      input.membershipId,
    ]);

    return { userId: member.userId };
  });
}
