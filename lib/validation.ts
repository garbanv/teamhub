import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(60, "Workspace name must be 60 characters or fewer."),
});

export const updateWorkspaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Workspace name must be at least 2 characters.")
      .max(60, "Workspace name must be 60 characters or fewer.")
      .optional(),
    membersCanDeleteTasks: z.boolean().optional(),
    membersCanDeleteDocs: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Nothing to update.",
  });

export const createInvitationSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  role: z.enum(["admin", "member"]).default("member"),
});

export const updateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

export const searchSchema = z.object({
  q: z.string().trim().max(120).default(""),
  workspace: z.string().trim().min(1),
});

export const safeNextPath = (value: string | null | undefined) => {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

export const projectKeySchema = z
  .string()
  .trim()
  .min(2, "Project keys need at least 2 characters.")
  .max(8, "Project keys can be up to 8 characters.")
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z][A-Z0-9]{1,7}$/.test(value), {
    message: "Use 2–8 letters or numbers, starting with a letter.",
  });

export const projectIconSchema = z.enum([
  "folder",
  "globe",
  "smartphone",
  "palette",
  "rocket",
  "layers",
  "sparkles",
  "box",
]);

export const projectColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid project color.");

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the project a name.")
    .max(80, "Project names can be up to 80 characters."),
  key: projectKeySchema,
  description: z.string().trim().max(1000).nullable().default(null),
  color: projectColorSchema.default("#6366f1"),
  icon: projectIconSchema.default("folder"),
  leadId: z.string().min(1).nullable().default(null),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  key: projectKeySchema.optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  color: projectColorSchema.optional(),
  icon: projectIconSchema.optional(),
  leadId: z.string().min(1).nullable().optional(),
  archived: z.boolean().optional(),
});

export const statusCategorySchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "done",
  "canceled",
]);

export const createProjectStatusSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the status a name.")
    .max(40, "Status names can be up to 40 characters."),
  category: statusCategorySchema,
  color: projectColorSchema.default("#94a3b8"),
});

export const updateProjectStatusSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  category: statusCategorySchema.optional(),
  color: projectColorSchema.optional(),
});

export const reorderProjectStatusesSchema = z.object({
  category: statusCategorySchema,
  statusIds: z.array(z.string().uuid()).min(1),
});

export const richTextSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const taskPrioritySchema = z.enum([
  "none",
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Give the task a title.")
    .max(500, "Task titles can be up to 500 characters."),
  description: richTextSchema.optional(),
  statusId: z.string().uuid().nullable().optional(),
  assigneeIds: z.array(z.string().min(1)).max(20).default([]),
  priority: taskPrioritySchema.default("none"),
  dueDate: taskDateSchema.nullable().optional(),
  labelIds: z.array(z.string().uuid()).max(20).default([]),
  parentTaskId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    description: richTextSchema.optional(),
    statusId: z.string().uuid().optional(),
    assigneeIds: z.array(z.string().min(1)).max(20).optional(),
    projectId: z.string().uuid().optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: taskDateSchema.nullable().optional(),
    labelIds: z.array(z.string().uuid()).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No task changes were provided.",
  });

export const createTaskLinkSchema = z.object({
  relatedTaskId: z.string().uuid(),
});

export const savedViewFiltersSchema = z
  .object({
    assignee: z.string().min(1).optional(),
    status: z.string().uuid().optional(),
    priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
    label: z.string().uuid().optional(),
    due: z.enum(["overdue", "today", "week", "no_date"]).optional(),
  })
  .default({});

export const createSavedViewSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the saved view a name.")
    .max(60, "Saved view names can be up to 60 characters."),
  layout: z.enum(["list", "board", "timeline"]).default("list"),
  filters: savedViewFiltersSchema,
  sort: z
    .enum([
      "manual",
      "due_asc",
      "due_desc",
      "priority",
      "created_desc",
      "updated_desc",
    ])
    .default("manual"),
  shared: z.boolean().default(false),
});

export const createCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something before commenting.")
    .max(5000, "Comments can be up to 5,000 characters."),
  mentionIds: z.array(z.string().min(1)).max(20).default([]),
});

export const notificationReadSchema = z.object({
  read: z.boolean().default(true),
});

export const createDocPageSchema = z.object({
  title: z.string().trim().max(200).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateDocPageSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    icon: z.string().max(32).nullable().optional(),
    coverUrl: z.string().max(2000).nullable().optional(),
    content: richTextSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No page changes were provided.",
  });

export const moveDocPageSchema = z.object({
  parentId: z.string().uuid().nullable(),
  index: z.number().int().min(0).max(100000),
});
