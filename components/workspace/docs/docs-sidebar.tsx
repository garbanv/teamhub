"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { DeleteDocPageDialog } from "@/components/workspace/docs/delete-doc-page-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocPageListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type TreeNode = DocPageListItem & { children: TreeNode[] };

function buildTree(pages: DocPageListItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const page of pages) {
    map.set(page.id, { ...page, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const page of pages) {
    const node = map.get(page.id)!;
    if (page.parentId && map.has(page.parentId)) {
      map.get(page.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) sort(node.children);
  };
  sort(roots);
  return roots;
}

type DropTarget = {
  pageId: string | null;
  position: "before" | "after" | "inside" | "root";
};

function countDescendants(pageId: string, pages: DocPageListItem[]) {
  let count = 0;
  const queue = [pageId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = pages.filter((page) => page.parentId === current);
    count += children.length;
    queue.push(...children.map((child) => child.id));
  }
  return count;
}

export function DocsSidebar({
  workspaceId,
  workspaceSlug,
  pages: incoming,
  onNavigate,
  enableShortcut = true,
}: {
  workspaceId: string;
  workspaceSlug: string;
  pages: DocPageListItem[];
  onNavigate?: () => void;
  enableShortcut?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pages, setPages] = React.useState(incoming);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null);
  const [creatingParent, setCreatingParent] = React.useState<string | null>(
    null,
  );
  const [moving, setMoving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<DocPageListItem | null>(null);

  const docsBase = `/w/${workspaceSlug}/docs`;
  const activePageId = pathname.startsWith(`${docsBase}/`)
    ? pathname.slice(docsBase.length + 1).split("/")[0]
    : null;
  const tree = buildTree(pages);

  React.useEffect(() => {
    setPages(incoming);
  }, [incoming]);

  async function createPage(parentId: string | null) {
    if (creatingParent !== null) return;
    setCreatingParent(parentId ?? "root");
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/docs/pages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId }),
        },
      );
      const data = (await response.json()) as {
        page?: { id: string };
        error?: string;
      };
      if (!response.ok || !data.page) {
        throw new Error(data.error || "Could not create the page.");
      }
      if (parentId) {
        setCollapsed((current) => {
          const next = new Set(current);
          next.delete(parentId);
          return next;
        });
      }
      router.push(`${docsBase}/${data.page.id}`);
      router.refresh();
      onNavigate?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create the page.",
      );
    } finally {
      setCreatingParent(null);
    }
  }

  React.useEffect(() => {
    if (!enableShortcut) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        event.code === "KeyN"
      ) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        void createPage(activePageId);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Re-bind when route changes so the shortcut creates a child of the page
    // currently being viewed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId, workspaceId, workspaceSlug, enableShortcut]);

  async function movePage(input: {
    pageId: string;
    parentId: string | null;
    index: number;
  }) {
    if (moving) return;
    setMoving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/docs/pages/${input.pageId}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: input.parentId,
            index: input.index,
          }),
        },
      );
      const data = (await response.json()) as {
        pages?: DocPageListItem[];
        error?: string;
      };
      if (!response.ok || !data.pages) {
        throw new Error(data.error || "Could not move the page.");
      }
      setPages(data.pages);
      setDropTarget(null);
      setDraggingId(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not move the page.",
      );
    } finally {
      setMoving(false);
    }
  }

  function handleDrop(target: DropTarget) {
    if (!draggingId || moving) return;
    if (target.pageId === draggingId) return;

    if (target.position === "root") {
      const rootIds = pages
        .filter((page) => !page.parentId)
        .sort((a, b) => a.position - b.position)
        .map((page) => page.id)
        .filter((id) => id !== draggingId);
      void movePage({
        pageId: draggingId,
        parentId: null,
        index: rootIds.length,
      });
      return;
    }

    if (!target.pageId) return;
    const targetPage = pages.find((page) => page.id === target.pageId);
    if (!targetPage) return;

    if (target.position === "inside") {
      const children = pages
        .filter((page) => page.parentId === targetPage.id)
        .sort((a, b) => a.position - b.position)
        .filter((page) => page.id !== draggingId);
      setCollapsed((current) => {
        const next = new Set(current);
        next.delete(targetPage.id);
        return next;
      });
      void movePage({
        pageId: draggingId,
        parentId: targetPage.id,
        index: children.length,
      });
      return;
    }

    const siblings = pages
      .filter(
        (page) =>
          page.parentId === targetPage.parentId && page.id !== draggingId,
      )
      .sort((a, b) => a.position - b.position);
    const targetIndex = siblings.findIndex(
      (page) => page.id === targetPage.id,
    );
    const index =
      target.position === "before"
        ? Math.max(targetIndex, 0)
        : targetIndex + 1;
    void movePage({
      pageId: draggingId,
      parentId: targetPage.parentId,
      index,
    });
  }

  function dropPosition(
    event: React.DragEvent<HTMLDivElement>,
  ): "before" | "after" | "inside" {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    if (ratio < 0.28) return "before";
    if (ratio > 0.72) return "after";
    return "inside";
  }

  function renderNodes(nodes: TreeNode[], depth = 0) {
    return nodes.map((node) => {
      const isActive = node.id === activePageId;
      const hasChildren = node.children.length > 0;
      const isCollapsed = collapsed.has(node.id);
      const drop =
        dropTarget?.pageId === node.id ? dropTarget.position : null;

      return (
        <div key={node.id}>
          <div
            onDragOver={(event) => {
              if (!draggingId) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget({
                pageId: node.id,
                position: dropPosition(event),
              });
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDropTarget((current) =>
                  current?.pageId === node.id ? null : current,
                );
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop({
                pageId: node.id,
                position: dropPosition(event),
              });
            }}
            className={cn(
              "group relative flex h-7 items-center gap-1 rounded-md pr-1 transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              drop === "inside" &&
                "bg-primary/10 ring-1 ring-primary/25 ring-inset",
              drop === "before" &&
                "before:absolute before:top-0 before:right-1 before:left-1 before:h-px before:bg-primary",
              drop === "after" &&
                "after:absolute after:right-1 after:bottom-0 after:left-1 after:h-px after:bg-primary",
            )}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            <span
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData("text/plain", node.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggingId(node.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              className="flex size-4 cursor-grab items-center justify-center rounded text-muted-foreground/25 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              title="Drag to reorder or move"
            >
              <GripVertical className="size-3" />
            </span>

            {hasChildren ? (
              <button
                type="button"
                onClick={() => {
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(node.id)) next.delete(node.id);
                    else next.add(node.id);
                    return next;
                  });
                }}
                className="flex size-4 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground"
                aria-label={isCollapsed ? "Expand page" : "Collapse page"}
              >
                {isCollapsed ? (
                  <ChevronRight className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
            ) : (
              <span className="size-4" />
            )}

            <Link
              href={`${docsBase}/${node.id}`}
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-1.5"
            >
              <span className="flex size-4 shrink-0 items-center justify-center text-[0.75rem]">
                {node.icon || (
                  <FileText className="size-3 text-muted-foreground/60" />
                )}
              </span>
              <span
                className={cn(
                  "truncate text-[0.7188rem]",
                  isActive && "font-medium",
                )}
              >
                {node.title || "Untitled"}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => createPage(node.id)}
              disabled={creatingParent !== null}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/45 opacity-100 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100 sm:opacity-0"
              aria-label={`Add a page inside ${node.title}`}
            >
              {creatingParent === node.id ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 opacity-100 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Actions for ${node.title}`}
                >
                  <MoreHorizontal className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[11.25rem]">
                <DropdownMenuItem
                  onSelect={() => createPage(node.id)}
                  className="gap-2"
                >
                  <Plus className="size-3.5" />
                  Add subpage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteTarget(node)}
                  className="gap-2"
                >
                  <Trash2 className="size-3.5" />
                  Delete page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {hasChildren && !isCollapsed && (
            <div>{renderNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  return (
    <div>
      <div className="mb-0.5 flex h-8 items-center gap-2.5 rounded-md px-2">
        <BookOpen className="size-3.5 shrink-0 text-muted-foreground/80" />
        <Link
          href={docsBase}
          onClick={onNavigate}
          className={cn(
            "min-w-0 flex-1 truncate text-[0.7812rem] font-medium transition-colors hover:text-sidebar-foreground",
            pathname.startsWith(docsBase)
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/75",
          )}
        >
          Docs
        </Link>
        <button
          type="button"
          onClick={() => createPage(null)}
          disabled={creatingParent !== null}
          className="flex size-5 items-center justify-center rounded text-muted-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-foreground"
          aria-label="New page"
          title="New page · ⌥N"
        >
          {creatingParent === "root" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </button>
      </div>

      {pages.length === 0 ? (
        <button
          type="button"
          onClick={() => createPage(null)}
          className="ml-4 flex h-7 items-center gap-1.5 rounded px-2 text-[0.6562rem] text-muted-foreground/55 hover:bg-sidebar-accent/50 hover:text-foreground"
        >
          <Plus className="size-3" />
          Add your first page
        </button>
      ) : (
        <div className="ml-3">
          {renderNodes(tree)}
          {draggingId && (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget({ pageId: null, position: "root" });
              }}
              onDragLeave={() => {
                if (dropTarget?.position === "root") setDropTarget(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop({ pageId: null, position: "root" });
              }}
              className={cn(
                "mt-1 flex h-7 items-center rounded border border-dashed border-border/70 px-2 text-[0.625rem] text-muted-foreground/50",
                dropTarget?.position === "root" &&
                  "border-primary/40 bg-primary/5 text-primary",
              )}
            >
              Move to top level
            </div>
          )}
        </div>
      )}

      <DeleteDocPageDialog
        page={deleteTarget}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        descendantCount={
          deleteTarget ? countDescendants(deleteTarget.id, pages) : 0
        }
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={(result) => {
          setPages(result.pages);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
