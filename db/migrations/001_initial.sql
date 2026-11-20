-- Hub initial schema
-- Auth tables match Better Auth 1.7's built-in PostgreSQL/Kysely schema.
-- Application tables use snake_case and UUID primary keys.

create table "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null
);

create table "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");

-- Workspaces ---------------------------------------------------------------

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  slug text not null unique check (slug = lower(slug)),
  logo_color text not null default 'indigo',
  created_by text not null references "user" ("id") on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_user_idx on workspace_members (user_id);
create index workspace_members_workspace_idx on workspace_members (workspace_id);

create table workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null default 'member' check (role in ('admin', 'member')),
  token_hash char(64) not null unique,
  invited_by text not null references "user" ("id") on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by text references "user" ("id") on delete set null,
  created_at timestamptz not null default now()
);

create unique index workspace_invitations_pending_email_idx
  on workspace_invitations (workspace_id, lower(email))
  where accepted_at is null;

create index workspace_invitations_token_idx on workspace_invitations (token_hash);

-- Projects -----------------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  key text not null check (key ~ '^[A-Z][A-Z0-9]{1,7}$'),
  description text,
  color text not null default '#6366f1',
  icon text not null default 'folder',
  lead_id text references "user" ("id") on delete set null,
  task_counter integer not null default 0 check (task_counter >= 0),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_by text not null references "user" ("id") on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create index projects_workspace_idx on projects (workspace_id);
create index projects_archived_idx on projects (workspace_id, archived_at);

create table project_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  category text not null check (category in ('backlog', 'todo', 'in_progress', 'done', 'canceled')),
  color text not null default '#94a3b8',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create index project_statuses_project_idx on project_statuses (project_id, position);

-- Tasks --------------------------------------------------------------------

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  number integer not null check (number > 0),
  title text not null check (length(trim(title)) between 1 and 500),
  description jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  description_text text not null default '',
  status_id uuid not null references project_statuses (id) on delete restrict,
  assignee_id text references "user" ("id") on delete set null,
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  due_date date,
  parent_task_id uuid references tasks (id) on delete cascade,
  sort_order double precision not null default 0,
  completed_at timestamptz,
  created_by text not null references "user" ("id") on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create index tasks_project_idx on tasks (project_id, sort_order);
create index tasks_status_idx on tasks (status_id);
create index tasks_assignee_idx on tasks (assignee_id);
create index tasks_due_date_idx on tasks (due_date);
create index tasks_parent_idx on tasks (parent_task_id);
create index tasks_updated_idx on tasks (updated_at desc);

create table labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 32),
  color text not null default '#94a3b8',
  created_at timestamptz not null default now()
);

create unique index labels_workspace_name_idx on labels (workspace_id, lower(name));

create table task_labels (
  task_id uuid not null references tasks (id) on delete cascade,
  label_id uuid not null references labels (id) on delete cascade,
  primary key (task_id, label_id)
);

create index task_labels_label_idx on task_labels (label_id);

create table task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  related_task_id uuid not null references tasks (id) on delete cascade,
  created_by text not null references "user" ("id") on delete restrict,
  created_at timestamptz not null default now(),
  check (task_id <> related_task_id),
  unique (task_id, related_task_id)
);

create index task_links_related_idx on task_links (related_task_id);

create table task_followers (
  task_id uuid not null references tasks (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  author_id text not null references "user" ("id") on delete cascade,
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  body_text text not null default '',
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_task_idx on comments (task_id, created_at);

create table comment_mentions (
  comment_id uuid not null references comments (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  primary key (comment_id, user_id)
);

create index comment_mentions_user_idx on comment_mentions (user_id);

create table task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  actor_id text references "user" ("id") on delete set null,
  type text not null,
  field text,
  from_value jsonb,
  to_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index task_activities_task_idx on task_activities (task_id, created_at desc);

-- Notifications & saved views ----------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  actor_id text references "user" ("id") on delete set null,
  task_id uuid references tasks (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, read_at, created_at desc);

create table saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  owner_id text not null references "user" ("id") on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  layout text not null default 'list' check (layout in ('list', 'board', 'timeline')),
  filters jsonb not null default '{}'::jsonb,
  sort jsonb not null default '{}'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_views_workspace_idx on saved_views (workspace_id, project_id);
create index saved_views_owner_idx on saved_views (owner_id);

-- Updated-at triggers ------------------------------------------------------

create or replace function hub_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
before update on workspaces
for each row execute function hub_set_updated_at();

create trigger projects_set_updated_at
before update on projects
for each row execute function hub_set_updated_at();

create trigger project_statuses_set_updated_at
before update on project_statuses
for each row execute function hub_set_updated_at();

create trigger tasks_set_updated_at
before update on tasks
for each row execute function hub_set_updated_at();

create trigger comments_set_updated_at
before update on comments
for each row execute function hub_set_updated_at();

create trigger saved_views_set_updated_at
before update on saved_views
for each row execute function hub_set_updated_at();
