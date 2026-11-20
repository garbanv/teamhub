import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Settings2, Workflow } from "lucide-react";

import {
  Card,
  CardHeader,
  PageHeader,
  PageShell,
} from "@/components/workspace/page";
import { ProjectActionsMenu } from "@/components/workspace/project-actions-menu";
import { ProjectFormDialog } from "@/components/workspace/project-form-dialog";
import { ProjectGlyph } from "@/components/workspace/project-icon";
import { UserAvatar } from "@/components/user-avatar";
import { WorkflowManager } from "@/components/workspace/workflow-manager";
import { canManageWorkspace } from "@/lib/permissions";
import { getProjectByKey, getProjectStatuses } from "@/lib/projects";
import { getWorkspaceMembers } from "@/lib/workspaces";
import { requireWorkspacePage } from "@/lib/workspace-page";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace: slug, key } = await params;
  const { workspace } = await requireWorkspacePage(slug);
  const project = await getProjectByKey(workspace.id, key);
  if (!project) notFound();

  const [statuses, members] = await Promise.all([
    getProjectStatuses(project.id),
    getWorkspaceMembers(workspace.id),
  ]);
  const canManageWorkflow = canManageWorkspace(workspace.role);

  return (
    <PageShell className="max-w-[900px]">
      <Link
        href={`/w/${workspace.slug}/projects/${project.key}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to {project.name}
      </Link>

      <PageHeader
        eyebrow={
          <>
            <Settings2 className="size-3" />
            Project settings
          </>
        }
        title={project.name}
        description="Manage the project's details and the workflow its tasks move through."
        actions={
          <ProjectActionsMenu
            project={project}
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
          />
        }
      />

      {!canManageWorkflow && (
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3.5 py-3">
          <Workflow className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11.5px] leading-4 text-muted-foreground">
            You can edit this project&apos;s details. Only workspace admins can
            change its workflow.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <Card>
          <CardHeader
            title="General"
            description="The project name, key, lead, and appearance."
            actions={
              <ProjectFormDialog
                workspaceId={workspace.id}
                workspaceSlug={workspace.slug}
                members={members}
                project={project}
              />
            }
          />
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <ProjectGlyph
                icon={project.icon}
                color={project.color}
                className="size-10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{project.name}</p>
                <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
                  {project.key}
                </p>
                <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
                  {project.description || "No description yet."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-3">
              <ReadonlyField
                label="Lead"
                value={
                  project.leadName ? (
                    <span className="flex items-center gap-1.5">
                      <UserAvatar
                        name={project.leadName}
                        image={project.leadImage}
                        className="size-5 border-0 [&_[data-slot=avatar-fallback]]:text-[7px]"
                      />
                      {project.leadName}
                    </span>
                  ) : (
                    "No lead"
                  )
                }
              />
              <ReadonlyField label="Created" value={formatDate(project.createdAt, { year: "numeric" })} />
              <ReadonlyField
                label="Status"
                value={project.archivedAt ? "Archived" : "Active"}
              />
            </div>
          </div>
        </Card>

        <Card>
          <WorkflowManager
            workspaceId={workspace.id}
            projectId={project.id}
            statuses={statuses}
            canManage={canManageWorkflow}
          />
        </Card>
      </div>

      <p className="mt-6 text-[10px] text-muted-foreground/50">
        Project ID · <span className="font-mono">{project.id}</span>
      </p>
    </PageShell>
  );
}

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[9.5px] font-medium tracking-wide text-muted-foreground/60 uppercase">
        {label}
      </p>
      <div className="mt-1 text-[11.5px] font-medium">{value}</div>
    </div>
  );
}
