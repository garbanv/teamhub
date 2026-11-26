import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Users } from "lucide-react";

import { ProjectActionsMenu } from "@/components/workspace/project-actions-menu";
import { ProjectGlyph } from "@/components/workspace/project-icon";
import { ProjectFormDialog } from "@/components/workspace/project-form-dialog";
import { NewTaskButton } from "@/components/workspace/task/quick-create-task";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { ProjectSummary, WorkspaceMember } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ProjectHeader({
  project,
  workspaceId,
  workspaceSlug,
  members,
  canEdit,
  backHref,
}: {
  project: ProjectSummary;
  workspaceId: string;
  workspaceSlug: string;
  members: WorkspaceMember[];
  canEdit: boolean;
  backHref?: string;
}) {
  return (
    <header>
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-[0.7188rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to project
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <ProjectGlyph
            icon={project.icon}
            color={project.color}
            className="size-11 rounded-xl"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[1.5625rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[1.75rem]">
                {project.name}
              </h1>
              <Badge variant="outline" className="font-mono text-[0.625rem]">
                {project.key}
              </Badge>
              {project.archivedAt && <Badge variant="warning">Archived</Badge>}
            </div>
            <p className="mt-1.5 max-w-[38.75rem] text-[0.7812rem] leading-5 text-muted-foreground">
              {project.description || "No description yet."}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6562rem] text-muted-foreground/70">
              {project.leadName && (
                <span className="flex items-center gap-1.5">
                  <UserAvatar
                    name={project.leadName}
                    image={project.leadImage}
                    className="size-4 border-0 [&_[data-slot=avatar-fallback]]:text-[0.375rem]"
                  />
                  {project.leadName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3" />
                {project.completedCount} of {project.taskCount} done
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-3" />
                {members.length} member{members.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3" />
                Created {formatDate(project.createdAt, { year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-1.5">
            {!project.archivedAt && <NewTaskButton projectId={project.id} />}
            <ProjectFormDialog
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              members={members}
              project={project}
            />
            <ProjectActionsMenu
              project={project}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
            />
          </div>
        )}
      </div>
    </header>
  );
}
