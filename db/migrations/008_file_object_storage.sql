-- Optional S3-compatible object storage for uploaded files -------------------
-- Files uploaded while object storage is configured keep their bytes in the
-- bucket (storage_key) instead of Postgres (data). Existing rows are unchanged.

alter table workspace_files
  alter column data drop not null,
  add column storage_key text,
  add constraint workspace_files_has_content
    check (data is not null or storage_key is not null);
