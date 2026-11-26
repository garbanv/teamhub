import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleCheck,
  CircleDashed,
  FolderKanban,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { CommandTip } from "@/components/workspace/command-tip";
import { NewTaskButton } from "@/components/workspace/task/quick-create-task";
import { TaskRow } from "@/components/workspace/task/task-list";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  PageShell,
} from "@/components/workspace/page";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canManageWorkspace } from "@/lib/permissions";
import { getTasksForUser } from "@/lib/tasks";
import {
  getWorkspaceMembers,
  getWorkspaceOverviewCounts,
} from "@/lib/workspaces";
import { requireWorkspacePage } from "@/lib/workspace-page";
import { firstName, greeting, roleLabel } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { user, workspace } = await requireWorkspacePage(slug);
  const [counts, members, focusTasks] = await Promise.all([
    getWorkspaceOverviewCounts(workspace.id, user.id),
    getWorkspaceMembers(workspace.id),
    getTasksForUser(workspace.id, user.id, "my-tasks", 6),
  ]);

  const base = `/w/${workspace.slug}`;
  const canManage = canManageWorkspace(workspace.role);
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  const completedSteps =
    1 +
    (members.length > 1 ? 1 : 0) +
    (counts.projects > 0 ? 1 : 0);
  const progress = Math.round((completedSteps / 3) * 100);

  const statCards = [
    {
      label: "Assigned to me",
      value: counts.assigned,
      hint: counts.assigned === 0 ? "Nothing open" : "Open tasks",
      href: `${base}/my-tasks`,
      icon: CircleCheck,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "Due this week",
      value: counts.thisWeek,
      hint: counts.thisWeek === 0 ? "Clear ahead" : "Next 7 days",
      href: `${base}/this-week`,
      icon: CalendarDays,
      tone: "text-sky-600 bg-sky-500/10 dark:text-sky-300",
    },
    {
      label: "Overdue",
      value: counts.overdue,
      hint: counts.overdue === 0 ? "All on track" : "Needs a look",
      href: `${base}/overdue`,
      icon: AlarmClock,
      tone:
        counts.overdue > 0
          ? "text-destructive bg-destructive/10"
          : "text-muted-foreground bg-muted",
    },
    {
      label: "Active projects",
      value: counts.projects,
      hint: counts.projects === 0 ? "None yet" : "In this workspace",
      href: `${base}/projects`,
      icon: FolderKanban,
      tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-success/80" />
            {dateLabel}
          </>
        }
        title={`${greeting(now)}, ${firstName(user.name)}`}
        description={`Here's a quiet overview of ${workspace.name} — what needs attention, and what's moving.`}
        actions={
          counts.assigned === 0 ? (
            <Badge variant="outline" className="hidden h-6 gap-1.5 sm:flex">
              <Sparkles className="size-3 text-brand" />
              You&apos;re all caught up
            </Badge>
          ) : null
        }
      />

      <div className="mt-7 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-border/80 bg-card p-3.5 shadow-[0_1px_2px_rgba(16,16,24,0.02)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_6px_20px_-8px_rgba(16,16,24,0.12)]"
          >
            <div className="flex items-start justify-between">
              <span
                className={`flex size-7 items-center justify-center rounded-md ${stat.tone}`}
              >
                <stat.icon className="size-3.5" />
              </span>
              <ArrowUpRight className="size-3 -translate-y-0.5 text-muted-foreground/25 transition-colors group-hover:text-muted-foreground/60" />
            </div>
            <p className="mt-3.5 text-[1.4375rem] leading-none font-semibold tracking-[-0.04em] tabular-nums">
              {stat.value}
            </p>
            <p className="mt-1.5 text-[0.7188rem] font-medium">{stat.label}</p>
            <p className="mt-0.5 text-[0.625rem] text-muted-foreground/65">
              {stat.hint}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader
              title="Get your workspace moving"
              description="A few small steps and this place starts to feel like yours."
              actions={
                <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
                  {completedSteps} of 3
                </span>
              }
            />
            <div className="h-1 w-full bg-muted/60">
              <div
                className="h-full rounded-r-full bg-[linear-gradient(90deg,var(--brand),var(--primary))] transition-[width] duration-500"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>
            <div className="divide-y divide-border/60">
              <SetupStep
                done
                title="Create your workspace"
                description={`${workspace.name} is ready for work.`}
              />
              <SetupStep
                done={members.length > 1}
                title="Invite your teammates"
                description={
                  members.length > 1
                    ? `${members.length} people are in ${workspace.name}.`
                    : "Bring the people who make the work happen."
                }
                action={
                  members.length > 1 ? null : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`${base}/settings#members`}>
                        <UserPlus className="size-3.5" />
                        Invite
                      </Link>
                    </Button>
                  )
                }
              />
              <SetupStep
                done={counts.projects > 0}
                title="Create your first project"
                description={
                  counts.projects > 0
                    ? `${counts.projects} project${counts.projects === 1 ? "" : "s"} up and running.`
                    : "Give your work a home and a workflow."
                }
                action={
                  counts.projects > 0 ? null : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`${base}/projects`}>
                        <FolderKanban className="size-3.5" />
                        Projects
                      </Link>
                    </Button>
                  )
                }
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Your focus"
              description="Open tasks assigned to you, ordered by what's due first."
              actions={
                <Link
                  href={`${base}/my-tasks`}
                  className="flex items-center gap-1 text-[0.625rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  All tasks
                  <ArrowRight className="size-3" />
                </Link>
              }
            />
            {focusTasks.length > 0 ? (
              <div className="divide-y divide-border/50">
                {focusTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    workspaceSlug={workspace.slug}
                    showStatus
                    showProject
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CircleCheck}
                title="Nothing on your plate"
                description="When work lands on you, it will show up here ordered by due date."
                className="py-10"
                action={<NewTaskButton variant="outline" showShortcut />}
              />
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Team"
              description={`${members.length} member${members.length === 1 ? "" : "s"} in ${workspace.name}`}
              actions={
                <Button asChild size="icon-sm" variant="ghost">
                  <Link
                    href={`${base}/settings#members`}
                    aria-label="Manage members"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              }
            />
            <div className="p-2">
              {members.slice(0, 5).map((member) => (
                <div
                  key={member.membershipId}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/35"
                >
                  <UserAvatar
                    name={member.name}
                    image={member.image}
                    className="size-7 border-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.75rem] font-medium">
                      {member.name}
                      {member.userId === user.id && (
                        <span className="ml-1 text-[0.625rem] font-normal text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[0.625rem] text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <span className="text-[0.5938rem] font-medium tracking-wide text-muted-foreground/60 uppercase">
                    {roleLabel(member.role)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/70 px-4 py-2.5">
              {canManage ? (
                <Link
                  href={`${base}/settings#members`}
                  className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Users className="size-3" />
                  Manage members and invites
                </Link>
              ) : (
                <Link
                  href={`${base}/settings#members`}
                  className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Users className="size-3" />
                  View team members
                </Link>
              )}
            </div>
          </Card>

          <CommandTip />

          <div className="rounded-xl border border-dashed border-border px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[0.625rem] font-medium tracking-[0.12em] text-muted-foreground/55 uppercase">
              <Sparkles className="size-3 text-brand/80" />
              Building Hub
            </p>
            <p className="mt-1.5 text-[0.6875rem] leading-4 text-muted-foreground">
              Docs and Chat are coming next. Your projects and tasks will live
              right beside them.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function SetupStep({
  done,
  title,
  description,
  action,
}: {
  done: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span
        className={
          done
            ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-success/12 text-success"
            : "flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground/50"
        }
      >
        {done ? (
          <Check className="size-3" strokeWidth={2.5} />
        ) : (
          <CircleDashed className="size-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.7812rem] font-medium">{title}</p>
        <p className="mt-0.5 text-[0.6875rem] leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
