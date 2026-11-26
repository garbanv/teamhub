"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AlarmClock,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  CornerDownLeft,
  FileText,
  FolderKanban,
  Hash,
  Home,
  Loader2,
  Monitor,
  Moon,
  Plus,
  SearchX,
  Settings2,
  Sun,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { WorkspaceGlyph } from "@/components/logo";
import { canManageWorkspace } from "@/lib/permissions";
import type {
  DocPageListItem,
  NavSearchResult,
  ProjectNavItem,
  WorkspaceSummary,
} from "@/lib/types";

type CommandContextValue = {
  open: () => void;
};

const CommandContext = React.createContext<CommandContextValue | null>(null);

export function useCommandMenu() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error("useCommandMenu must be used inside CommandMenuProvider");
  }
  return context;
}

const personalPages = [
  { label: "Home", path: "", icon: Home },
  { label: "My Tasks", path: "/my-tasks", icon: CircleCheck },
  { label: "This Week", path: "/this-week", icon: CalendarDays },
  { label: "Overdue", path: "/overdue", icon: AlarmClock },
  { label: "Due Soon", path: "/due-soon", icon: Clock3 },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Docs", path: "/docs", icon: BookOpen },
];

export function CommandMenuProvider({
  workspace,
  workspaces,
  projects,
  docs,
  children,
}: {
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  projects: ProjectNavItem[];
  docs: DocPageListItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <CommandContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        workspace={workspace}
        workspaces={workspaces}
        projects={projects}
        docs={docs}
      />
    </CommandContext.Provider>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  workspace,
  workspaces,
  projects,
  docs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  projects: ProjectNavItem[];
  docs: DocPageListItem[];
}) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<NavSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&workspace=${encodeURIComponent(workspace.slug)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = (await response.json()) as { results: NavSearchResult[] };
        setResults(data.results);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 160);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, workspace.slug]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const canManage = canManageWorkspace(workspace.role);
  const projectResults = results.filter((result) => result.type === "project");
  const taskResults = results.filter((result) => result.type === "task");
  const docResults = results.filter((result) => result.type === "page");
  const hasResults = results.length > 0;
  const trimmed = query.trim();

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search tasks, projects and docs, or jump anywhere in Hub."
      commandProps={{ shouldFilter: false }}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search tasks, projects, docs, or jump to…"
      />
      <CommandList>
        {trimmed ? (
          <>
            {loading && (
              <div className="flex items-center gap-2 px-3 py-6 text-[0.7812rem] text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Searching {workspace.name}…
              </div>
            )}

            {!loading && !hasResults && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex size-9 items-center justify-center rounded-full border border-border bg-muted/40">
                  <SearchX className="size-4 text-muted-foreground" />
                </span>
                <p className="text-[0.7812rem] font-medium">No matches yet</p>
                <p className="max-w-[15.625rem] text-[0.7188rem] leading-4 text-muted-foreground">
                  Try a project key like WEB, a task title, a task number, or a docs page.
                </p>
              </div>
            )}

            {projectResults.length > 0 && (
              <CommandGroup heading="Projects">
                {projectResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`project-${result.id}`}
                    onSelect={() => go(result.href)}
                  >
                    <span
                      className="flex size-5 items-center justify-center rounded-[5px] text-[0.5625rem] font-semibold text-white"
                      style={{ backgroundColor: result.color ?? "#6366f1" }}
                    >
                      {result.subtitle?.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {result.title}
                    </span>
                    <span className="font-mono text-[0.625rem] text-muted-foreground">
                      {result.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {taskResults.length > 0 && (
              <CommandGroup heading="Tasks">
                {taskResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`task-${result.id}`}
                    onSelect={() => go(result.href)}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: result.color ?? "#94a3b8" }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {result.title}
                    </span>
                    <span className="font-mono text-[0.625rem] text-muted-foreground">
                      {result.subtitle}
                    </span>
                    <span className="hidden text-[0.625rem] text-muted-foreground sm:inline">
                      {result.meta}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {docResults.length > 0 && (
              <CommandGroup heading="Docs">
                {docResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`doc-${result.id}`}
                    onSelect={() => go(result.href)}
                  >
                    {result.subtitle ? (
                      <span className="flex size-5 items-center justify-center text-[0.8125rem]">
                        {result.subtitle}
                      </span>
                    ) : (
                      <FileText className="size-4 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {result.title}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />
            <CommandGroup heading="Jump to">
              <CommandItem
                value="settings"
                onSelect={() => go(`/w/${workspace.slug}/settings`)}
              >
                <Settings2 />
                Workspace settings
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        ) : (
          <>
            <CommandGroup heading="Go to">
              {personalPages.map((page) => (
                <CommandItem
                  key={page.path}
                  value={`page-${page.path}`}
                  onSelect={() => go(`/w/${workspace.slug}${page.path}`)}
                >
                  <page.icon />
                  {page.label}
                  {page.path === "" && (
                    <CommandShortcut>Home</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {docs.length > 0 && (
              <CommandGroup heading="Docs">
                {docs.slice(0, 6).map((page) => (
                  <CommandItem
                    key={page.id}
                    value={`doc-${page.id}`}
                    onSelect={() =>
                      go(`/w/${workspace.slug}/docs/${page.id}`)
                    }
                  >
                    <span className="flex size-4 items-center justify-center text-[0.6875rem]">
                      {page.icon || <FileText className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {page.title}
                    </span>
                    <CommandShortcut>Page</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {projects.length > 0 && (
              <CommandGroup heading="Projects">
                {projects.slice(0, 6).map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() =>
                      go(`/w/${workspace.slug}/projects/${project.key}`)
                    }
                  >
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                    <span className="font-mono text-[0.625rem] text-muted-foreground">
                      {project.key}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading={`Workspace · ${workspace.name}`}>
              <CommandItem
                value="new-project"
                onSelect={() => go(`/w/${workspace.slug}/projects?new=1`)}
              >
                <Plus />
                New project
                <CommandShortcut>Projects</CommandShortcut>
              </CommandItem>
              {canManage && (
                <CommandItem
                  value="invite-people"
                  onSelect={() => go(`/w/${workspace.slug}/settings#members`)}
                >
                  <Hash />
                  Invite people
                  <CommandShortcut>Members</CommandShortcut>
                </CommandItem>
              )}
              <CommandItem
                value="workspace-settings"
                onSelect={() => go(`/w/${workspace.slug}/settings`)}
              >
                <Settings2 />
                Workspace settings
              </CommandItem>
              {workspaces
                .filter((item) => item.id !== workspace.id)
                .map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`workspace-${item.id}`}
                    onSelect={() => go(`/w/${item.slug}`)}
                  >
                    <WorkspaceGlyph
                      name={item.name}
                      color={item.logoColor}
                      className="size-5 rounded-[5px] text-[0.5rem]"
                    />
                    Switch to {item.name}
                    <ArrowUpRight className="ml-auto text-muted-foreground" />
                  </CommandItem>
                ))}
              <CommandItem
                value="create-workspace"
                onSelect={() => go("/onboarding?new=1")}
              >
                <Plus />
                Create workspace
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading="Appearance">
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ].map((option) => (
                <CommandItem
                  key={option.value}
                  value={`theme-${option.value}`}
                  onSelect={() => {
                    setTheme(option.value);
                    onOpenChange(false);
                  }}
                >
                  <option.icon />
                  {option.label}
                  {theme === option.value && (
                    <Check className="ml-auto text-muted-foreground" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandEmpty>No results found.</CommandEmpty>
      </CommandList>

      <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-3 text-[0.625rem] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-card px-1 py-0.5 font-sans text-[0.5625rem]">
              ↑
            </kbd>
            <kbd className="rounded border border-border bg-card px-1 py-0.5 font-sans text-[0.5625rem]">
              ↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-2.5" />
            open
          </span>
        </div>
        <span className="font-mono text-[0.5938rem] text-muted-foreground/50">
          {workspace.name}
        </span>
      </div>
    </CommandDialog>
  );
}
