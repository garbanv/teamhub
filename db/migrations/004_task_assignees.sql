-- Multiple assignees per task ------------------------------------------------

create table task_assignees (
  task_id uuid not null references tasks (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index task_assignees_user_idx on task_assignees (user_id);

insert into task_assignees (task_id, user_id)
select id, assignee_id from tasks where assignee_id is not null
on conflict do nothing;

drop index if exists tasks_assignee_idx;
alter table tasks drop column assignee_id;
