-- Durable transactional-email queue for in-app notification emails.
-- Invitations are sent immediately through the same SMTP transport and are
-- not stored here.

create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid unique references notifications (id) on delete cascade,
  workspace_id uuid references workspaces (id) on delete cascade,
  user_id text references "user" ("id") on delete cascade,
  to_email text not null,
  subject text not null,
  text_body text not null,
  html_body text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index email_outbox_pending_idx
  on email_outbox (status, next_attempt_at, created_at);

create index email_outbox_user_idx
  on email_outbox (user_id, created_at desc);
