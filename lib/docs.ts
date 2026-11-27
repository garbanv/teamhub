import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { query, withTransaction } from "./db";
import { AppError } from "./errors";
import { emptyRichText, richTextToPlainText } from "./rich-text";
import {
  buildObjectKey,
  deleteObject,
  isObjectStorageEnabled,
  putObject,
} from "./storage";
import type { DocPageDetail, DocPageListItem } from "./types";

type PageRow = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  position: number;
  ownerId: string;
  visibility: "workspace" | "teamspace" | "private";
  coverUrl: string | null;
  version: number;
  content: unknown;
  contentText: string;
  createdById: string;
  createdByName: string;
  createdByImage: string | null;
  lastEditedById: string | null;
  lastEditedByName: string | null;
  lastEditedByImage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const pageSelect = `
  select
    p.id,
    p.parent_id as "parentId",
    p.title,
    p.icon,
    p.position,
    p.owner_id as "ownerId",
    p.visibility,
    p.cover_url as "coverUrl",
    p.version,
    p.content,
    p.content_text as "contentText",
    p.created_by as "createdById",
    creator.name as "createdByName",
    creator.image as "createdByImage",
    p.last_edited_by as "lastEditedById",
    editor.name as "lastEditedByName",
    editor.image as "lastEditedByImage",
    p.created_at as "createdAt",
    p.updated_at as "updatedAt"
  from doc_pages p
  join "user" creator on creator.id = p.created_by
  left join "user" editor on editor.id = p.last_edited_by
`;

function mapListItem(row: PageRow): DocPageListItem {
  return {
    id: row.id,
    parentId: row.parentId,
    title: row.title,
    icon: row.icon,
    position: row.position,
    ownerId: row.ownerId,
    visibility: row.visibility,
    updatedAt: row.updatedAt.toISOString(),
    lastEditedByName: row.lastEditedByName,
  };
}

function mapDetail(row: PageRow): DocPageDetail {
  return {
    ...mapListItem(row),
    coverUrl: row.coverUrl,
    version: row.version,
    content: row.content ?? emptyRichText,
    contentText: row.contentText,
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdByImage: row.createdByImage,
    lastEditedById: row.lastEditedById,
    lastEditedByImage: row.lastEditedByImage,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getDocPages(
  workspaceId: string,
  userId: string,
): Promise<DocPageListItem[]> {
  const { rows } = await query<PageRow>(
    `
      ${pageSelect}
      where p.workspace_id = $1
        and p.archived_at is null
        and (p.visibility = 'workspace' or p.owner_id = $2)
      order by p.position asc, p.created_at asc
    `,
    [workspaceId, userId],
  );
  return rows.map(mapListItem);
}

export async function getDocPage(
  workspaceId: string,
  pageId: string,
  userId: string,
): Promise<DocPageDetail | null> {
  const { rows } = await query<PageRow>(
    `
      ${pageSelect}
      where p.id = $1
        and p.workspace_id = $2
        and p.archived_at is null
        and (p.visibility = 'workspace' or p.owner_id = $3)
      limit 1
    `,
    [pageId, workspaceId, userId],
  );
  return rows[0] ? mapDetail(rows[0]) : null;
}

async function assertParent(
  client: PoolClient,
  workspaceId: string,
  parentId: string | null,
) {
  if (!parentId) return;
  const { rows } = await client.query<{ id: string }>(
    "select id from doc_pages where id = $1 and workspace_id = $2 and archived_at is null",
    [parentId, workspaceId],
  );
  if (!rows[0]) throw new AppError("Parent page not found.", 404);
}

export async function createDocPage(input: {
  workspaceId: string;
  userId: string;
  title?: string;
  parentId?: string | null;
}): Promise<DocPageDetail> {
  const pageId = await withTransaction(async (client) => {
    await assertParent(client, input.workspaceId, input.parentId ?? null);

    const position = await client.query<{ next: number }>(
      `
        select coalesce(max(position), -1) + 1 as next
        from doc_pages
        where workspace_id = $1
          and parent_id is not distinct from $2::uuid
          and archived_at is null
      `,
      [input.workspaceId, input.parentId ?? null],
    );

    const title = input.title?.trim() || "Untitled";
    const result = await client.query<{ id: string }>(
      `
        insert into doc_pages
          (workspace_id, parent_id, title, content, content_text, owner_id, position, created_by, last_edited_by)
        values ($1, $2, $3, $4, '', $5, $6, $5, $5)
        returning id
      `,
      [
        input.workspaceId,
        input.parentId ?? null,
        title,
        JSON.stringify(emptyRichText),
        input.userId,
        position.rows[0]?.next ?? 0,
      ],
    );
    return result.rows[0]!.id;
  });

  const page = await getDocPage(input.workspaceId, pageId, input.userId);
  if (!page) throw new AppError("Page could not be created.", 500);
  return page;
}

export async function updateDocPage(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
  title?: string;
  icon?: string | null;
  coverUrl?: string | null;
  content?: unknown;
  /**
   * The content version the editor started from. When given together with
   * `content`, the save is rejected with a 409 if someone else saved first.
   */
  baseVersion?: number;
}): Promise<DocPageDetail> {
  const current = await getDocPage(
    input.workspaceId,
    input.pageId,
    input.userId,
  );
  if (!current) throw new AppError("Page not found.", 404);

  const nextTitle =
    input.title !== undefined ? input.title.trim() || "Untitled" : undefined;
  const nextContent =
    input.content !== undefined ? input.content : undefined;
  const nextContentText =
    input.content !== undefined
      ? richTextToPlainText(input.content)
      : undefined;

  const fields: string[] = [];
  const values: unknown[] = [input.pageId, input.workspaceId];

  function add(field: string, value: unknown) {
    values.push(value);
    fields.push(`${field} = $${values.length}`);
  }

  if (nextTitle !== undefined) add("title", nextTitle);
  if (input.icon !== undefined) add("icon", input.icon);
  if (input.coverUrl !== undefined) add("cover_url", input.coverUrl);
  if (nextContent !== undefined) {
    add("content", JSON.stringify(nextContent));
    add("content_text", nextContentText ?? "");
    fields.push("version = version + 1");
  }

  const checkVersion =
    nextContent !== undefined && input.baseVersion !== undefined;
  let where = "id = $1 and workspace_id = $2";
  if (checkVersion) {
    values.push(input.baseVersion);
    where += ` and version = $${values.length}`;
  }

  values.push(input.userId);
  fields.push(`last_edited_by = $${values.length}`);

  if (fields.length === 0) return current;

  const result = await query(
    `
      update doc_pages
      set ${fields.join(", ")}
      where ${where}
    `,
    values,
  );

  if (checkVersion && !result.rowCount) {
    throw new AppError(
      "This page was changed by someone else since you opened it.",
      409,
      "version_conflict",
    );
  }

  const page = await getDocPage(
    input.workspaceId,
    input.pageId,
    input.userId,
  );
  if (!page) throw new AppError("Page not found.", 404);
  return page;
}

async function normalizeSiblings(
  client: PoolClient,
  workspaceId: string,
  parentId: string | null,
) {
  const siblings = await client.query<{ id: string }>(
    `
      select id from doc_pages
      where workspace_id = $1
        and parent_id is not distinct from $2::uuid
        and archived_at is null
      order by position asc, created_at asc
    `,
    [workspaceId, parentId],
  );
  for (const [index, row] of siblings.rows.entries()) {
    await client.query("update doc_pages set position = $2 where id = $1", [
      row.id,
      index,
    ]);
  }
}

export async function moveDocPage(input: {
  workspaceId: string;
  userId: string;
  pageId: string;
  parentId: string | null;
  index: number;
}): Promise<DocPageListItem[]> {
  await withTransaction(async (client) => {
    const page = await client.query<{
      id: string;
      parentId: string | null;
    }>(
      `
        select id, parent_id as "parentId"
        from doc_pages
        where id = $1 and workspace_id = $2 and archived_at is null
        for update
      `,
      [input.pageId, input.workspaceId],
    );
    if (!page.rows[0]) throw new AppError("Page not found.", 404);

    if (input.parentId === input.pageId) {
      throw new AppError("A page cannot be its own parent.", 400);
    }

    await assertParent(client, input.workspaceId, input.parentId);

    if (input.parentId) {
      const cycle = await client.query<{ id: string }>(
        `
          with recursive ancestors as (
            select id, parent_id
            from doc_pages
            where id = $1
            union all
            select p.id, p.parent_id
            from doc_pages p
            join ancestors a on p.id = a.parent_id
          )
          select id from ancestors where id = $2 limit 1
        `,
        [input.parentId, input.pageId],
      );
      if (cycle.rows[0]) {
        throw new AppError("A page cannot be moved inside its own subtree.", 400);
      }
    }

    const oldParent = page.rows[0].parentId;

    const siblings = await client.query<{ id: string }>(
      `
        select id from doc_pages
        where workspace_id = $1
          and parent_id is not distinct from $2::uuid
          and archived_at is null
          and id <> $3
        order by position asc, created_at asc
      `,
      [input.workspaceId, input.parentId, input.pageId],
    );

    const ordered = siblings.rows.map((row) => row.id);
    const index = Math.max(0, Math.min(input.index, ordered.length));
    ordered.splice(index, 0, input.pageId);

    await client.query(
      "update doc_pages set parent_id = $2 where id = $1",
      [input.pageId, input.parentId],
    );

    for (const [position, id] of ordered.entries()) {
      await client.query("update doc_pages set position = $2 where id = $1", [
        id,
        position,
      ]);
    }

    if (oldParent !== input.parentId) {
      await normalizeSiblings(client, input.workspaceId, oldParent);
    }
  });

  return getDocPages(input.workspaceId, input.userId);
}

export async function deleteDocPage(input: {
  workspaceId: string;
  pageId: string;
  userId: string;
}) {
  const page = await getDocPage(input.workspaceId, input.pageId, input.userId);
  if (!page) throw new AppError("Page not found.", 404);

  const deletedIds = await withTransaction(async (client) => {
    const descendants = await client.query<{ id: string }>(
      `
        with recursive tree as (
          select id
          from doc_pages
          where id = $1 and workspace_id = $2
          union all
          select child.id
          from doc_pages child
          join tree on child.parent_id = tree.id
        )
        select id from tree
      `,
      [input.pageId, input.workspaceId],
    );

    await client.query(
      "delete from doc_pages where id = $1 and workspace_id = $2",
      [input.pageId, input.workspaceId],
    );
    await normalizeSiblings(client, input.workspaceId, page.parentId);

    return descendants.rows.map((row) => row.id);
  });

  const pages = await getDocPages(input.workspaceId, input.userId);
  return { deletedIds, pages };
}

export async function storeWorkspaceFile(input: {
  workspaceId: string;
  userId: string;
  name: string;
  mimeType: string;
  data: Buffer;
}) {
  const fileId = randomUUID();
  const useObjectStorage = isObjectStorageEnabled();
  const storageKey = useObjectStorage
    ? buildObjectKey(input.workspaceId, fileId)
    : null;

  if (storageKey) {
    await putObject({
      key: storageKey,
      body: input.data,
      contentType: input.mimeType,
    });
  }

  try {
    await query(
      `
        insert into workspace_files
          (id, workspace_id, uploaded_by, name, mime_type, size_bytes, data, storage_key)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        fileId,
        input.workspaceId,
        input.userId,
        input.name,
        input.mimeType,
        input.data.length,
        storageKey ? null : input.data,
        storageKey,
      ],
    );
  } catch (error) {
    // Don't leave an orphaned object behind if the row couldn't be saved.
    if (storageKey) await deleteObject(storageKey).catch(() => undefined);
    throw error;
  }
  return fileId;
}

export async function getWorkspaceFile(workspaceId: string, fileId: string) {
  const { rows } = await query<{
    name: string;
    mimeType: string;
    sizeBytes: number;
    data: Buffer | null;
    storageKey: string | null;
  }>(
    `
      select name, mime_type as "mimeType", size_bytes as "sizeBytes",
             data, storage_key as "storageKey"
      from workspace_files
      where id = $1 and workspace_id = $2
      limit 1
    `,
    [fileId, workspaceId],
  );
  return rows[0] ?? null;
}
