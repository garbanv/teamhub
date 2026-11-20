import "./load-env";
import { auth } from "../lib/auth";
import { pool, query, withTransaction } from "../lib/db";
import { createDocPage, updateDocPage } from "../lib/docs";
import { defaultWorkspaceLabels } from "../lib/label-constants";
import { createProject, createProjectStatus } from "../lib/projects";
import {
  createTask,
  createTaskLink,
  getWorkspaceLabels,
} from "../lib/tasks";

const PASSWORD = "hubdemo123";

const people = [
  {
    name: "Alex Morgan",
    email: "demo@hub.so",
    role: "owner" as const,
  },
  {
    name: "Priya Shah",
    email: "priya@hub.so",
    role: "admin" as const,
  },
  {
    name: "Jonas Weber",
    email: "jonas@hub.so",
    role: "member" as const,
  },
  {
    name: "Maya Chen",
    email: "maya@hub.so",
    role: "member" as const,
  },
];

const projects = [
  {
    name: "Website Refresh",
    key: "WEB",
    description:
      "A calmer, faster marketing site for the next chapter of Northstar.",
    color: "#6366f1",
    icon: "globe",
    leadEmail: "demo@hub.so",
  },
  {
    name: "Mobile App",
    key: "APP",
    description:
      "Bring the Northstar experience to iOS and Android, starting with the essentials.",
    color: "#f97316",
    icon: "smartphone",
    leadEmail: "priya@hub.so",
  },
];

function docFromText(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

function dateFromOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function docContent(blocks: Array<
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "checks"; items: string[] }
  | { type: "quote"; text: string }
>) {
  return {
    type: "doc",
    content: blocks.map((block) => {
      if (block.type === "heading") {
        return {
          type: "heading",
          attrs: { level: block.level },
          content: [{ type: "text", text: block.text }],
        };
      }
      if (block.type === "paragraph") {
        return {
          type: "paragraph",
          content: [{ type: "text", text: block.text }],
        };
      }
      if (block.type === "bullets") {
        return {
          type: "bulletList",
          content: block.items.map((item) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: item }],
              },
            ],
          })),
        };
      }
      if (block.type === "checks") {
        return {
          type: "taskList",
          content: block.items.map((item) => ({
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: item }],
              },
            ],
          })),
        };
      }
      return {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: block.text }],
          },
        ],
      };
    }),
  };
}

async function ensureDocs(workspaceId: string, userId: string) {
  const existing = await query<{ count: number }>(
    "select count(*)::int as count from doc_pages where workspace_id = $1",
    [workspaceId],
  );
  if ((existing.rows[0]?.count ?? 0) > 0) {
    console.log("  · docs already exist");
    return;
  }

  const handbook = await createDocPage({
    workspaceId,
    userId,
    title: "Team handbook",
  });
  await updateDocPage({
    workspaceId,
    pageId: handbook.id,
    userId,
    icon: "📚",
    content: docContent([
      {
        type: "paragraph",
        text: "The shared operating manual for Northstar Studio. Keep it useful, honest, and alive.",
      },
      { type: "heading", level: 2, text: "How we work" },
      {
        type: "bullets",
        items: [
          "Write decisions down so future-you does not have to remember the context.",
          "Keep projects focused: one lead, one clear outcome, and a workflow that matches the work.",
          "Default to async updates, then use live time for the conversations that need it.",
        ],
      },
      { type: "quote", text: "Calm is a feature. Clarity is the roadmap." },
      { type: "heading", level: 2, text: "What good looks like" },
      {
        type: "checks",
        items: [
          "Every project has an owner and a lightweight spec",
          "Tasks have a next action, not just a topic",
          "Launch notes capture what changed and why",
        ],
      },
    ]),
  });

  const communication = await createDocPage({
    workspaceId,
    userId,
    title: "How we communicate",
    parentId: handbook.id,
  });
  await updateDocPage({
    workspaceId,
    pageId: communication.id,
    userId,
    icon: "💬",
    content: docContent([
      {
        type: "paragraph",
        text: "A few defaults that keep conversations calm and decisions visible.",
      },
      {
        type: "bullets",
        items: [
          "Use comments on the task when the conversation is about the work.",
          "Use docs for context that should outlive the task.",
          "Tag people when you need their decision, not just their awareness.",
        ],
      },
    ]),
  });

  const principles = await createDocPage({
    workspaceId,
    userId,
    title: "Product principles",
    parentId: handbook.id,
  });
  await updateDocPage({
    workspaceId,
    pageId: principles.id,
    userId,
    icon: "🧭",
    content: docContent([
      {
        type: "checks",
        items: [
          "Make the next action obvious",
          "Reduce noise before adding power",
          "Prefer durable context over ephemeral chatter",
          "Respect attention in every interaction",
        ],
      },
    ]),
  });

  const template = await createDocPage({
    workspaceId,
    userId,
    title: "Project spec template",
  });
  await updateDocPage({
    workspaceId,
    pageId: template.id,
    userId,
    icon: "🗂️",
    content: docContent([
      { type: "paragraph", text: "Use this page as the starting point for a new project." },
      { type: "heading", level: 2, text: "Problem" },
      { type: "paragraph", text: "What problem are we solving, and for whom?" },
      { type: "heading", level: 2, text: "Outcome" },
      { type: "paragraph", text: "What changes for the team or the customer when this ships?" },
      { type: "heading", level: 2, text: "Scope" },
      {
        type: "checks",
        items: [
          "In scope",
          "Out of scope",
          "Open questions",
          "Launch checklist",
        ],
      },
      { type: "heading", level: 2, text: "Links" },
      {
        type: "paragraph",
        text: "Add related tasks, research, and design references here once they exist.",
      },
    ]),
  });

  console.log("  + docs — Team handbook and Project spec template");
}

async function ensureWorkspaceLabels(workspaceId: string) {
  const existing = await query<{ name: string }>(
    "select name from labels where workspace_id = $1",
    [workspaceId],
  );
  const names = new Set(existing.rows.map((row) => row.name.toLowerCase()));
  for (const label of defaultWorkspaceLabels) {
    if (names.has(label.name.toLowerCase())) continue;
    await query(
      "insert into labels (workspace_id, name, color) values ($1, $2, $3)",
      [workspaceId, label.name, label.color],
    );
    console.log(`  + label ${label.name}`);
  }
}

async function ensureUser(person: (typeof people)[number]) {
  const existing = await query<{ id: string }>(
    'select id from "user" where lower(email) = lower($1)',
    [person.email],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const result = await auth.api.signUpEmail({
    body: {
      name: person.name,
      email: person.email,
      password: PASSWORD,
    },
  });

  if (!result?.user?.id) {
    throw new Error(`Could not create seed user ${person.email}`);
  }

  console.log(`  + user ${person.email}`);
  return result.user.id;
}

async function seed() {
  console.log("Preparing demo team…");
  const memberIds = new Map<string, string>();
  for (const person of people) {
    memberIds.set(person.email, await ensureUser(person));
  }

  const existing = await query<{ id: string; name: string; slug: string }>(
    "select id, name, slug from workspaces where slug = $1",
    ["northstar"],
  );

  let workspace = existing.rows[0];

  if (!workspace) {
    const ownerId = memberIds.get("demo@hub.so")!;
    workspace = await withTransaction(async (client) => {
      const workspaceResult = await client.query<{
        id: string;
        name: string;
        slug: string;
      }>(
        `
          insert into workspaces (name, slug, logo_color, created_by)
          values ('Northstar Studio', 'northstar', 'indigo', $1)
          returning id, name, slug
        `,
        [ownerId],
      );
      return workspaceResult.rows[0]!;
    });
    console.log(`  + workspace ${workspace.name} (/w/${workspace.slug})`);
  } else {
    console.log(`  · workspace ${workspace.name} already exists`);
  }

  for (const person of people) {
    await query(
      `
        insert into workspace_members (workspace_id, user_id, role)
        values ($1, $2, $3)
        on conflict (workspace_id, user_id) do nothing
      `,
      [workspace.id, memberIds.get(person.email), person.role],
    );
  }

  const ownerId = memberIds.get("demo@hub.so")!;

  for (const project of projects) {
    const existingProject = await query<{ id: string }>(
      "select id from projects where workspace_id = $1 and lower(key) = lower($2)",
      [workspace.id, project.key],
    );

    if (existingProject.rows[0]) {
      console.log(`  · project ${project.key} already exists`);
      continue;
    }

    const created = await createProject({
      workspaceId: workspace.id,
      userId: ownerId,
      name: project.name,
      key: project.key,
      description: project.description,
      color: project.color,
      icon: project.icon,
      leadId: memberIds.get(project.leadEmail) ?? null,
    });
    console.log(`  + project ${created.key} — ${created.name}`);
  }

  const website = await query<{ id: string }>(
    "select id from projects where workspace_id = $1 and key = 'WEB'",
    [workspace.id],
  );
  if (website.rows[0]) {
    const hasReview = await query(
      `
        select 1 from project_statuses
        where project_id = $1 and lower(name) = lower('In Review')
      `,
      [website.rows[0].id],
    );
    if (!hasReview.rowCount) {
      await createProjectStatus({
        projectId: website.rows[0].id,
        name: "In Review",
        category: "in_progress",
        color: "#f59e0b",
      });
      console.log("  + workflow status In Review (WEB)");
    }
  }

  await ensureWorkspaceLabels(workspace.id);

  const labelRows = await getWorkspaceLabels(workspace.id);
  const labels = new Map(labelRows.map((label) => [label.name, label.id]));

  const projectRows = await query<{ id: string; key: string }>(
    "select id, key from projects where workspace_id = $1",
    [workspace.id],
  );
  const projectIds = new Map(projectRows.rows.map((project) => [project.key, project.id]));

  const taskSeeds = [
    {
      project: "WEB",
      title: "Audit the current site and collect analytics",
      status: "Done",
      assignee: "priya@hub.so",
      priority: "medium",
      due: -6,
      label: "Research",
      description:
        "Review the current marketing site, export the key analytics, and collect the pages that matter most to the refresh.",
    },
    {
      project: "WEB",
      title: "Write the new homepage copy",
      status: "In Progress",
      assignee: "demo@hub.so",
      priority: "high",
      due: 2,
      label: "Marketing",
      description:
        "Draft the hero, product story, and closing section. Keep the voice calm, direct, and specific.",
    },
    {
      project: "WEB",
      title: "Design the refreshed navigation",
      status: "In Progress",
      assignee: "maya@hub.so",
      priority: "high",
      due: 3,
      label: "Design",
      description:
        "Explore a simpler navigation that works for both marketing and product visitors.",
    },
    {
      project: "WEB",
      title: "Final QA of the pricing page",
      status: "In Review",
      assignee: "maya@hub.so",
      priority: "high",
      due: 1,
      label: "Bug",
      description:
        "Check layout, responsive behavior, plan comparison, and every link before launch.",
    },
    {
      project: "WEB",
      title: "Build responsive marketing pages",
      status: "Todo",
      assignee: "jonas@hub.so",
      priority: "medium",
      due: 7,
      label: "Feature",
      description:
        "Implement the homepage, product pages, and shared layout across desktop and mobile.",
    },
    {
      project: "WEB",
      title: "Set up analytics events for launch",
      status: "Todo",
      assignee: "priya@hub.so",
      priority: "low",
      due: 9,
      label: "Ops",
      description:
        "Define the launch funnel, wire up the core events, and verify them in staging.",
    },
    {
      project: "WEB",
      title: "Prepare launch announcement",
      status: "Backlog",
      assignee: "demo@hub.so",
      priority: "low",
      due: 14,
      label: "Marketing",
      description:
        "Draft the announcement post and coordinate the send with the launch checklist.",
    },
    {
      project: "APP",
      title: "Define the v1 app scope",
      status: "Done",
      assignee: "priya@hub.so",
      priority: "high",
      due: -10,
      label: "Research",
      description:
        "Agree on the smallest useful first release and the outcomes it needs to deliver.",
    },
    {
      project: "APP",
      title: "Design onboarding screens",
      status: "In Progress",
      assignee: "maya@hub.so",
      priority: "high",
      due: 2,
      label: "Design",
      description:
        "Design a short onboarding flow that gets new members to their first project quickly.",
    },
    {
      project: "APP",
      title: "Build authentication flow",
      status: "Todo",
      assignee: "jonas@hub.so",
      priority: "urgent",
      due: 5,
      label: "Feature",
      description:
        "Wire up sign in, session restoration, and the secure storage needed for the first release.",
    },
    {
      project: "APP",
      title: "Set up push notifications",
      status: "Backlog",
      assignee: "demo@hub.so",
      priority: "medium",
      due: 12,
      label: "Feature",
      description:
        "Add the notification permission prompt and a small set of useful task-related notifications.",
    },
    {
      project: "APP",
      title: "App store launch checklist",
      status: "Backlog",
      assignee: "priya@hub.so",
      priority: "low",
      due: 20,
      label: "Marketing",
      description:
        "Collect screenshots, write the store copy, and confirm the review requirements.",
    },
  ] as const;

  for (const projectKey of ["WEB", "APP"]) {
    const projectId = projectIds.get(projectKey);
    if (!projectId) continue;

    const existingTasks = await query<{ count: number }>(
      "select count(*)::int as count from tasks where project_id = $1",
      [projectId],
    );
    if ((existingTasks.rows[0]?.count ?? 0) > 0) {
      console.log(`  · tasks for ${projectKey} already exist`);
      continue;
    }

    const statuses = await query<{ id: string; name: string }>(
      "select id, name from project_statuses where project_id = $1",
      [projectId],
    );
    const statusIds = new Map(statuses.rows.map((status) => [status.name, status.id]));
    const created: Record<string, string> = {};

    for (const item of taskSeeds.filter((task) => task.project === projectKey)) {
      const task = await createTask({
        workspaceId: workspace.id,
        projectId,
        actorId: ownerId,
        title: item.title,
        description: docFromText(item.description),
        statusId: statusIds.get(item.status) ?? null,
        assigneeId: memberIds.get(item.assignee) ?? null,
        priority: item.priority,
        dueDate: dateFromOffset(item.due),
        labelIds: labels.get(item.label) ? [labels.get(item.label)!] : [],
      });
      created[item.title] = task.id;
      console.log(`  + task ${task.identifier} — ${task.title}`);
    }

    if (projectKey === "WEB") {
      const parentId = created["Design the refreshed navigation"];
      if (parentId) {
        await createTask({
          workspaceId: workspace.id,
          projectId,
          actorId: ownerId,
          parentTaskId: parentId,
          title: "Desktop navigation exploration",
          statusId: statusIds.get("Done") ?? null,
          assigneeId: memberIds.get("maya@hub.so") ?? null,
          priority: "medium",
          dueDate: dateFromOffset(1),
          labelIds: labels.get("Design") ? [labels.get("Design")!] : [],
        });
        await createTask({
          workspaceId: workspace.id,
          projectId,
          actorId: ownerId,
          parentTaskId: parentId,
          title: "Mobile navigation states",
          statusId: statusIds.get("Todo") ?? null,
          assigneeId: memberIds.get("maya@hub.so") ?? null,
          priority: "medium",
          dueDate: dateFromOffset(2),
          labelIds: labels.get("Design") ? [labels.get("Design")!] : [],
        });
        console.log("  + subtasks for Design the refreshed navigation");
      }
    }

    const linkPairs =
      projectKey === "WEB"
        ? [
            ["Build responsive marketing pages", "Design the refreshed navigation"],
            ["Write the new homepage copy", "Prepare launch announcement"],
          ]
        : [["Build authentication flow", "Design onboarding screens"]];

    for (const [first, second] of linkPairs) {
      if (created[first] && created[second]) {
        await createTaskLink({
          workspaceId: workspace.id,
          taskId: created[first]!,
          relatedTaskId: created[second]!,
          actorId: ownerId,
        });
      }
    }
  }

  await query(
    `
      insert into task_followers (task_id, user_id)
      select t.id, t.assignee_id
      from tasks t
      join projects p on p.id = t.project_id
      where p.workspace_id = $1 and t.assignee_id is not null
      on conflict do nothing
    `,
    [workspace.id],
  );

  await ensureDocs(workspace.id, ownerId);

  console.log("\nDemo sign in:");
  console.log(`  email:    ${people[0]!.email}`);
  console.log(`  password: ${PASSWORD}`);
  console.log("\nSeed complete.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
