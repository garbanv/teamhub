import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocPageEditor } from "@/components/workspace/docs/doc-page-editor";
import { getDocPage } from "@/lib/docs";
import { requireWorkspacePage } from "@/lib/workspace-page";

export const metadata: Metadata = { title: "Page" };

export default async function DocPage({
  params,
}: {
  params: Promise<{ workspace: string; pageId: string }>;
}) {
  const { workspace: slug, pageId } = await params;
  const { user, workspace } = await requireWorkspacePage(slug);
  const page = await getDocPage(workspace.id, pageId, user.id);
  if (!page) notFound();

  return (
    <DocPageEditor
      initialPage={page}
      workspaceId={workspace.id}
      workspaceSlug={workspace.slug}
      currentUser={user}
    />
  );
}
