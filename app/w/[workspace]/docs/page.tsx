import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileText, Plus } from "lucide-react";

import {
  Card,
  EmptyState,
  PageHeader,
  PageShell,
} from "@/components/workspace/page";
import { NewDocPageButton } from "@/components/workspace/docs/new-page-button";
import { getDocPages } from "@/lib/docs";
import { requireWorkspacePage } from "@/lib/workspace-page";
import type { DocPageListItem } from "@/lib/types";

export const metadata: Metadata = { title: "Docs" };

function flatten(pages: DocPageListItem[]) {
  const byParent = new Map<string | null, DocPageListItem[]>();
  for (const page of pages) {
    const key = page.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(page);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  const out: Array<{ page: DocPageListItem; depth: number }> = [];
  function walk(parentId: string | null, depth: number) {
    for (const page of byParent.get(parentId) ?? []) {
      out.push({ page, depth });
      walk(page.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}

export default async function DocsHomePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { user, workspace } = await requireWorkspacePage(slug);
  const pages = await getDocPages(workspace.id, user.id);
  const rows = flatten(pages);

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <BookOpen className="size-3" />
            Workspace
          </>
        }
        title="Docs"
        description="A shared home for the team's notes, specs, and decisions."
        actions={
          <NewDocPageButton
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
          />
        }
      />

      {rows.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={BookOpen}
            title="No pages yet"
            description="Start with a team handbook, a project spec, or a page that just needs to exist. Nested pages are supported too."
            className="py-16"
            action={
              <NewDocPageButton
                workspaceId={workspace.id}
                workspaceSlug={workspace.slug}
                variant="outline"
                label="Create your first page"
              />
            }
          />
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="flex h-9 items-center border-b border-border/70 bg-muted/15 px-4">
            <span className="text-[0.5938rem] font-semibold tracking-[0.12em] text-muted-foreground/55 uppercase">
              All pages
            </span>
            <span className="ml-2 text-[0.5625rem] text-muted-foreground/40">
              {rows.length}
            </span>
            <span className="ml-auto hidden text-[0.5625rem] text-muted-foreground/40 sm:block">
              Drag pages in the sidebar to reorder
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {rows.map(({ page, depth }) => (
              <Link
                key={page.id}
                href={`/w/${workspace.slug}/docs/${page.id}`}
                className="group flex h-10 items-center gap-2.5 px-4 transition-colors hover:bg-muted/30"
              >
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded text-[0.875rem]"
                  style={{ marginLeft: depth * 18 }}
                >
                  {page.icon || (
                    <FileText className="size-3.5 text-muted-foreground/55" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.75rem] font-medium">
                  {page.title || "Untitled"}
                </span>
                {depth > 0 && (
                  <span className="hidden text-[0.5625rem] text-muted-foreground/35 sm:block">
                    Nested page
                  </span>
                )}
                <span className="text-[0.5938rem] text-muted-foreground/45">
                  {page.lastEditedByName
                    ? `Edited by ${page.lastEditedByName}`
                    : "No edits yet"}
                </span>
              </Link>
            ))}
          </div>
          <div className="border-t border-border/60 bg-muted/10 px-4 py-2.5">
            <NewDocPageButton
              workspaceId={workspace.id}
              workspaceSlug={workspace.slug}
              variant="ghost"
              label="Add another page"
            />
          </div>
        </Card>
      )}

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-dashed border-border px-4 py-3.5">
        <span className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Plus className="size-3.5" />
        </span>
        <div>
          <p className="text-[0.7188rem] font-medium">Built for thinking together</p>
          <p className="mt-0.5 text-[0.6562rem] leading-4 text-muted-foreground">
            Use <kbd className="rounded border border-border px-1">⌥N</kbd> to
            create a page from anywhere outside an editor. Rich blocks, file uploads, and nested
            pages are ready to go.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
