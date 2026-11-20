import type { Metadata } from "next";
import { Archive, FolderKanban } from "lucide-react";

import {
  Card,
  EmptyState,
  PageHeader,
  PageShell,
} from "@/components/workspace/page";
import { ProjectCard } from "@/components/workspace/project-card";
import { ProjectFormDialog } from "@/components/workspace/project-form-dialog";
import { getProjects } from "@/lib/projects";
import { getWorkspaceMembers } from "@/lib/workspaces";
import { requireWorkspacePage } from "@/lib/workspace-page";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { workspace: slug } = await params;
  const query = await searchParams;
  const { workspace } = await requireWorkspacePage(slug);
  const [projects, members] = await Promise.all([
    getProjects(workspace.id),
    getWorkspaceMembers(workspace.id),
  ]);

  const active = projects.filter((project) => !project.archivedAt);
  const archived = projects.filter((project) => project.archivedAt);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Each project gets its own key, workflow, and place for the work."
        actions={
          <ProjectFormDialog
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
            members={members}
            defaultOpen={query.new === "1"}
          />
        }
      />

      {active.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceId={workspace.id}
              workspaceSlug={workspace.slug}
              canEdit
            />
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to give the work a key, a workflow, and a home."
            className="py-16"
            action={
              <ProjectFormDialog
                workspaceId={workspace.id}
                workspaceSlug={workspace.slug}
                members={members}
              />
            }
          />
        </Card>
      )}

      {archived.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Archive className="size-3.5 text-muted-foreground/60" />
            <h2 className="text-[12px] font-semibold tracking-[-0.01em]">
              Archived
            </h2>
            <span className="text-[10px] text-muted-foreground/50">
              {archived.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                workspaceId={workspace.id}
                workspaceSlug={workspace.slug}
                canEdit
              />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
