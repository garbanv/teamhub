-- Admin-controlled delete permissions ---------------------------------------
-- Admins and owners can always delete. These switches control regular members.
-- Default true keeps the current behaviour for existing workspaces.

alter table workspaces
  add column members_can_delete_tasks boolean not null default true,
  add column members_can_delete_docs boolean not null default true;
