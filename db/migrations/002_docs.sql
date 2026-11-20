-- Docs: nested pages and stored file uploads.
-- Teamspaces, sharing, favorites, revisions, and task links are added in later migrations.

create table doc_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  parent_id uuid references doc_pages (id) on delete cascade,
  title text not null default 'Untitled' check (length(title) <= 200),
  icon text,
  cover_url text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_text text not null default '',
  visibility text not null default 'workspace' check (visibility in ('workspace', 'teamspace', 'private')),
  owner_id text not null references "user" ("id") on delete restrict,
  position integer not null default 0,
  created_by text not null references "user" ("id") on delete restrict,
  last_edited_by text references "user" ("id") on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index doc_pages_workspace_idx on doc_pages (workspace_id);
create index doc_pages_parent_idx on doc_pages (workspace_id, parent_id, position);
create index doc_pages_updated_idx on doc_pages (workspace_id, updated_at desc);

create trigger doc_pages_set_updated_at
before update on doc_pages
for each row execute function hub_set_updated_at();

create table workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  uploaded_by text not null references "user" ("id") on delete restrict,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null check (size_bytes >= 0),
  data bytea not null,
  created_at timestamptz not null default now()
);

create index workspace_files_workspace_idx on workspace_files (workspace_id, created_at desc);
