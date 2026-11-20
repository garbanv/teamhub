export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  logoColor: string;
  role: WorkspaceRole;
  memberCount: number;
};

export type WorkspaceMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: WorkspaceRole;
  joinedAt: string;
};

export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
};

export type InvitePreview = {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  workspaceName: string;
  workspaceSlug: string;
  workspaceLogoColor: string;
  inviterName: string;
  expiresAt: string;
  expired: boolean;
  accepted: boolean;
};

export type ProjectNavItem = {
  id: string;
  name: string;
  key: string;
  color: string;
  icon: string;
  archived: boolean;
};

export type ProjectStatusCategory =
  | "backlog"
  | "todo"
  | "in_progress"
  | "done"
  | "canceled";

export type ProjectStatusItem = {
  id: string;
  projectId: string;
  name: string;
  category: ProjectStatusCategory;
  color: string;
  position: number;
};

export type ProjectSummary = {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  icon: string;
  leadId: string | null;
  leadName: string | null;
  leadImage: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  completedCount: number;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type NavSearchResult = {
  id: string;
  type: "page" | "project" | "task";
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
  color?: string;
};

export type NotificationSummary = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
  actorName: string | null;
  actorImage: string | null;
  taskId: string | null;
};

export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";

export type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

export type TaskListItem = {
  id: string;
  projectId: string;
  projectKey: string;
  projectName: string;
  projectColor: string;
  projectIcon: string;
  number: number;
  identifier: string;
  title: string;
  statusId: string;
  statusName: string;
  statusColor: string;
  statusCategory: ProjectStatusCategory;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeImage: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  parentTaskId: string | null;
  subtaskCount: number;
  labels: TaskLabel[];
  createdAt: string;
  updatedAt: string;
};

export type RelatedTask = TaskListItem & {
  linkId: string;
};

export type TaskDetail = TaskListItem & {
  description: unknown;
  descriptionText: string;
  createdById: string;
  createdByName: string;
  createdByImage: string | null;
  parentTask: {
    id: string;
    identifier: string;
    title: string;
  } | null;
  subtasks: TaskListItem[];
  relatedTasks: RelatedTask[];
};

export type SavedProjectView = {
  id: string;
  projectId: string;
  name: string;
  layout: "list" | "board" | "timeline";
  filters: {
    assignee?: string;
    status?: string;
    priority?: TaskPriority;
    label?: string;
    due?: "overdue" | "today" | "week" | "no_date";
  };
  sort:
    | "manual"
    | "due_asc"
    | "due_desc"
    | "priority"
    | "created_desc"
    | "updated_desc";
  shared: boolean;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskCommentMention = {
  id: string;
  name: string;
  image: string | null;
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  bodyText: string;
  mentions: TaskCommentMention[];
  createdAt: string;
};

export type TaskActivityEntry = {
  id: string;
  type: string;
  field: string | null;
  actorName: string | null;
  actorImage: string | null;
  description: string;
  createdAt: string;
};

export type DocPageListItem = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  position: number;
  ownerId: string;
  visibility: "workspace" | "teamspace" | "private";
  updatedAt: string;
  lastEditedByName: string | null;
};

export type DocPageDetail = DocPageListItem & {
  coverUrl: string | null;
  content: unknown;
  contentText: string;
  createdById: string;
  createdByName: string;
  createdByImage: string | null;
  lastEditedById: string | null;
  lastEditedByImage: string | null;
  createdAt: string;
};
