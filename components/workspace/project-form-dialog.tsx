"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectGlyph, ProjectIcon } from "@/components/workspace/project-icon";
import { projectColorChoices } from "@/lib/colors";
import {
  projectIconLabels,
  projectIcons,
  type ProjectIconName,
} from "@/lib/project-constants";
import type { ProjectSummary, WorkspaceMember } from "@/lib/types";
import { cn } from "@/lib/utils";

function keyFromName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3);
}

export function ProjectFormDialog({
  workspaceId,
  workspaceSlug,
  members,
  project,
  children,
  defaultOpen = false,
}: {
  workspaceId: string;
  workspaceSlug: string;
  members: WorkspaceMember[];
  project?: ProjectSummary;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const mode = project ? "edit" : "create";
  const [open, setOpen] = React.useState(defaultOpen);
  const [name, setName] = React.useState(project?.name ?? "");
  const [key, setKey] = React.useState(project?.key ?? "");
  const [keyTouched, setKeyTouched] = React.useState(Boolean(project));
  const [description, setDescription] = React.useState(
    project?.description ?? "",
  );
  const [color, setColor] = React.useState(project?.color ?? "#6366f1");
  const [icon, setIcon] = React.useState<ProjectIconName>(
    (project?.icon as ProjectIconName) ?? "folder",
  );
  const [leadId, setLeadId] = React.useState(project?.leadId ?? "none");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setKey(project?.key ?? "");
    setKeyTouched(Boolean(project));
    setDescription(project?.description ?? "");
    setColor(project?.color ?? "#6366f1");
    setIcon((project?.icon as ProjectIconName) ?? "folder");
    setLeadId(project?.leadId ?? "none");
  }, [open, project]);

  function handleNameChange(value: string) {
    setName(value);
    if (!keyTouched) setKey(keyFromName(value));
  }

  function handleKeyChange(value: string) {
    setKeyTouched(true);
    setKey(
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8),
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const endpoint =
        mode === "create"
          ? `/api/workspaces/${workspaceId}/projects`
          : `/api/workspaces/${workspaceId}/projects/${project!.id}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key,
          description: description.trim() || null,
          color,
          icon,
          leadId: leadId === "none" ? null : leadId,
        }),
      });
      const data = (await response.json()) as {
        project?: ProjectSummary;
        error?: string;
      };
      if (!response.ok || !data.project) {
        throw new Error(data.error || "Could not save the project.");
      }

      setOpen(false);
      toast.success(
        mode === "create"
          ? `${data.project.name} created.`
          : "Project updated.",
      );

      if (mode === "create") {
        router.push(`/w/${workspaceSlug}/projects/${data.project.key}`);
      } else if (pathname.includes(`/projects/${project!.key}`)) {
        router.replace(
          pathname.replace(
            `/projects/${project!.key}`,
            `/projects/${data.project.key}`,
          ),
        );
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the project.",
      );
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" variant={mode === "create" ? "default" : "outline"}>
            {mode === "create" ? (
              <Plus className="size-3.5" />
            ) : (
              <Pencil className="size-3.5" />
            )}
            {mode === "create" ? "New project" : "Edit project"}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[33.75rem]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create a project" : `Edit ${project!.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Every project gets its own key, workflow, and home for the work."
              : "Update the project details your team sees."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-end gap-3">
            <ProjectGlyph icon={icon} color={color} className="size-10" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                autoFocus
                placeholder="Website refresh"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                required
                maxLength={80}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-[6.875rem_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-key">Key</Label>
              <Input
                id="project-key"
                value={key}
                onChange={(event) => handleKeyChange(event.target.value)}
                placeholder="WEB"
                required
                minLength={2}
                maxLength={8}
                disabled={saving}
                className="font-mono tracking-wider uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <Select
                value={leadId}
                onValueChange={setLeadId}
                disabled={saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="-mt-1 text-[0.6562rem] text-muted-foreground/65">
            Task IDs use this key, like {key || "WEB"}-12. It can be changed
            later.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              placeholder="What is this project for?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={1000}
              disabled={saving}
              className="min-h-[76px] resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {projectColorChoices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setColor(choice)}
                    aria-label={`Use color ${choice}`}
                    aria-pressed={color === choice}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                      color === choice
                        ? "border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: choice }}
                  >
                    {color === choice && (
                      <Check className="size-3 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-1">
                {projectIcons.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setIcon(choice)}
                    aria-label={projectIconLabels[choice]}
                    title={projectIconLabels[choice]}
                    aria-pressed={icon === choice}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md border transition-colors",
                      icon === choice
                        ? "border-foreground/30 bg-accent text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent/60",
                    )}
                  >
                    <ProjectIcon icon={choice} className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Create project" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
