import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import { ProjectActionsMenu } from "@/components/workspace/project-actions-menu";
import { ProjectGlyph } from "@/components/workspace/project-icon";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { ProjectSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectCard({
  project,
  workspaceId,
  workspaceSlug,
  canEdit,
}: {
  project: ProjectSummary;
  workspaceId: string;
  workspaceSlug: string;
  canEdit: boolean;
}) {
  const archived = Boolean(project.archivedAt);
  const href = `/w/${workspaceSlug}/projects/${project.key}`;

  return (
    <div
      className={cn(
        "group relative flex min-h-[148px] flex-col rounded-xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(16,16,24,0.02)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_8px_26px_-16px_rgba(16,16,24,0.28)]",
        archived && "opacity-70 hover:opacity-100",
      )}
    >
      <div className="flex items-start gap-3">
        <ProjectGlyph icon={project.icon} color={project.color} className="size-9" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={href}
              className="truncate text-[13.5px] font-semibold tracking-[-0.015em] hover:underline hover:decoration-border hover:underline-offset-4"
            >
              {project.name}
            </Link>
            {archived && (
              <Badge variant="outline" className="shrink-0">
                Archived
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[9.5px] tracking-wider text-muted-foreground/65 uppercase">
              {project.key}
            </span>
            {project.leadName && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/65">
                <UserAvatar
                  name={project.leadName}
                  image={project.leadImage}
                  className="size-5 border-0 [&_[data-slot=avatar-fallback]]:text-[7px]"
                />
                {project.leadName}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="-mt-1 -mr-1">
            <ProjectActionsMenu
              project={project}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
            />
          </div>
        )}
      </div>

      <p className="mt-3 line-clamp-2 min-h-[32px] text-[11px] leading-4 text-muted-foreground">
        {project.description || "No description yet."}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2.5">
        <span className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
          <span>
            {project.taskCount} task{project.taskCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-2.5" />
            {project.completedCount} done
          </span>
        </span>
        <Link
          href={href}
          className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          Open
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
