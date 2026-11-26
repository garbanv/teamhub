-- Per-user preferences -------------------------------------------------------

create table user_preferences (
  user_id text primary key references "user" ("id") on delete cascade,
  default_project_view text not null default 'list'
    check (default_project_view in ('list', 'board', 'timeline')),
  updated_at timestamptz not null default now()
);
