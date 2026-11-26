"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CornerDownLeft,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { AssigneePicker } from "@/components/workspace/task/assignee-picker";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import type {
  ProjectNavItem,
  TaskPriority,
  WorkspaceMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type OpenOptions = { projectId?: string };

type QuickCreateContextValue = {
  open: (options?: OpenOptions) => void;
};

const QuickCreateContext = React.createContext<QuickCreateContextValue | null>(
  null,
);

export function useQuickCreateTask() {
  const context = React.useContext(QuickCreateContext);
  if (!context) {
    throw new Error("useQuickCreateTask must be used inside QuickCreateTaskProvider");
  }
  return context;
}

export function QuickCreateTaskProvider({
  workspaceId,
  workspaceSlug,
  projects,
  members,
  children,
}: {
  workspaceId: string;
  workspaceSlug: string;
  projects: ProjectNavItem[];
  members: WorkspaceMember[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? "");
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [priority, setPriority] = React.useState<TaskPriority>("none");
  const [dueDate, setDueDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const currentProjectId = React.useMemo(() => {
    const match = pathname.match(/\/projects\/([^/]+)/);
    if (!match) return null;
    return projects.find((project) => project.key === match[1])?.id ?? null;
  }, [pathname, projects]);

  function openQuickCreate(options?: OpenOptions) {
    if (projects.length === 0) {
      toast.info("Create a project first, then add tasks to it.");
      router.push(`/w/${workspaceSlug}/projects?new=1`);
      return;
    }
    setTitle("");
    setProjectId(options?.projectId ?? currentProjectId ?? projects[0]!.id);
    setAssigneeIds([]);
    setPriority("none");
    setDueDate("");
    setSaving(false);
    setOpen(true);
  }

  React.useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (
        open ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat
      ) {
        return;
      }
      if (event.key.toLowerCase() !== "c") return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest("[contenteditable='true']"))
      ) {
        return;
      }

      event.preventDefault();
      openQuickCreate();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // openQuickCreate reads current path and projects; re-bind when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projects, currentProjectId, workspaceSlug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !title.trim() || !projectId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          assigneeIds,
          priority,
          dueDate: dueDate || null,
        }),
      });
      const data = (await response.json()) as {
        task?: { id: string; identifier: string };
        error?: string;
      };
      if (!response.ok || !data.task) {
        throw new Error(data.error || "Could not create the task.");
      }
      setOpen(false);
      toast.success(`${data.task.identifier} created.`);
      router.push(`/w/${workspaceSlug}/tasks/${data.task.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create the task.",
      );
      setSaving(false);
    }
  }

  return (
    <QuickCreateContext.Provider value={{ open: openQuickCreate }}>
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[33.125rem]">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2 text-[0.625rem] font-medium tracking-[0.12em] text-muted-foreground/60 uppercase">
              <Plus className="size-3" />
              Quick create
              <span className="ml-auto rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-normal text-muted-foreground/60">
                C
              </span>
            </div>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Capture it now. Add the details on the task page.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quick-task-title">Title</Label>
              <Input
                id="quick-task-title"
                autoFocus
                placeholder="What needs to happen?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={500}
                required
                disabled={saving}
                className="h-10 text-[0.8438rem]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.15fr_1fr]">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select
                  value={projectId}
                  onValueChange={setProjectId}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                          <span className="font-mono text-[0.5625rem] text-muted-foreground">
                            {project.key}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <AssigneePicker
                  members={members}
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  disabled={saving}
                  className="h-9 border border-input px-3"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as TaskPriority)}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quick-task-due">Due date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="quick-task-due"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    disabled={saving}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
              <span className="hidden items-center gap-1.5 text-[0.625rem] text-muted-foreground/55 sm:flex">
                <CornerDownLeft className="size-2.5" />
                Create task
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !title.trim()}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Create task
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </QuickCreateContext.Provider>
  );
}

export function NewTaskButton({
  projectId,
  variant = "default",
  size = "sm",
  showShortcut = false,
  className,
}: {
  projectId?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  showShortcut?: boolean;
  className?: string;
}) {
  const { open } = useQuickCreateTask();
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => open(projectId ? { projectId } : undefined)}
    >
      <Plus className="size-3.5" />
      New task
      {showShortcut && (
        <kbd className="ml-1 rounded border border-current/20 px-1 py-0.5 text-[0.5312rem] font-medium opacity-50">
          C
        </kbd>
      )}
    </Button>
  );
}
