-- Faster search and optimistic concurrency for docs ---------------------------

-- Trigram indexes make `ilike '%term%'` searches use an index.
-- pg_trgm is a "trusted" extension, so the database owner can create it.
create extension if not exists pg_trgm;

create index tasks_title_trgm_idx on tasks using gin (title gin_trgm_ops);
create index tasks_description_trgm_idx
  on tasks using gin (description_text gin_trgm_ops);
create index projects_name_trgm_idx on projects using gin (name gin_trgm_ops);
create index doc_pages_title_trgm_idx
  on doc_pages using gin (title gin_trgm_ops);
create index doc_pages_content_trgm_idx
  on doc_pages using gin (content_text gin_trgm_ops);

-- Incremented every time a page's content changes. The editor sends the
-- version it started from, so a stale save is rejected instead of overwriting.
alter table doc_pages add column version integer not null default 1;
