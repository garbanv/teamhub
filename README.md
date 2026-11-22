# Hub

A calm, keyboard-friendly team workspace inspired by [Linear](https://linear.app/), [Notion](https://www.notion.so/), and [Orbit](https://orbit.so/). Hub is built as a modular Next.js application, with the Docs area now live alongside Projects, Tasks, and collaboration.

> **Build status:** Hub’s five core workspace phases are complete. The new Docs module is at **phase 1 of 5**: nested pages, the block editor, uploads, autosave, and a draggable sidebar page tree are ready for review. Teamspaces, favorites, permissions, live co-editing, task embeds, history, and docs search follow.

![Hub docs editor](docs/hub-docs.png)

## What's in so far

### Foundation

- Email + password authentication with [Better Auth](https://better-auth.com/) and database-backed sessions.
- Workspaces with `owner`, `admin`, and `member` roles.
- Email-bound, single-use invite links with 7-day expiry. Invitations can be emailed automatically when SMTP is configured.
- Persistent sidebar with workspace switcher, Home, My Tasks, personal views, Projects, nested Docs, and a disabled Chat placeholder.
- Command palette (`⌘K` / `Ctrl+K`) with page jumps, project/task search, workspace switching, and theme actions.
- Light, dark, and system themes.
- Workspace settings: rename workspace, view members, invite teammates, manage roles, remove members, and revoke pending invites.
- Responsive layout with a mobile navigation drawer.
- PostgreSQL schema for the full product, including docs, tasks, comments, activity, notifications, saved views, and uploaded files.

### Projects & workflows

- Create projects with a name, key, description, color, icon, and optional lead.
- Project keys like `WEB`; task IDs use the pattern `WEB-12`.
- Per-project workflows seeded with **Backlog**, **Todo**, **In Progress**, **Done**, and **Canceled**.
- Statuses are grouped into five fixed categories. Admins can add statuses, rename them, change their color/category, and reorder them within a category.
- Project pages with list, board, and timeline views, project details, and workflow settings.
- Archive and restore projects without deleting their tasks or workflow.
- Project and task search in the command palette and live project links in the sidebar.

### Tasks & views

- Global **New task** button plus a `C` keyboard shortcut that opens quick create from anywhere.
- Quick create with project, assignee, priority, and due date pickers.
- Per-project auto-incrementing IDs: `WEB-1`, `WEB-2`, `APP-1`, and so on.
- Task page with editable title, rich-text description, status, assignee, priority, labels, due date, project, creator, and timestamps.
- Rich-text descriptions powered by Tiptap with formatting, lists, quotes, and code blocks.
- Subtasks that inherit the parent project and appear on the parent task.
- Related task links, searchable across the workspace and shown from both directions.
- Per-project **List**, **Board**, and **Timeline** views with one-click switching.
- Board columns support drag-and-drop status changes, plus a keyboard/touch status menu on each card.
- Timeline view plots tasks by due date across a scrollable six-week window.
- Filters for assignee, status, priority, label, and due date; sorting by manual order, due date, priority, or recency.
- Saved views store the current layout, filters, and sort order. Views can be private or shared with the workspace.
- Personal views backed by real task data: **My Tasks**, **This Week**, **Overdue**, and **Due Soon**.
- Home shows open tasks assigned to you, ordered by due date and priority.
- Comments with an `@` mention picker, highlighted mentions, and mention notifications.
- Per-task activity feed covering creation, title, description, status, assignee, priority, due date, labels, related links, and comments.
- Follow/unfollow a task. Creators and assignees follow automatically, and mentioned teammates are added as followers.
- In-app notifications for assignments, mentions, and changes or comments on followed tasks, with unread counts and mark-as-read controls.
- Optional transactional email for invitations, assignments, mentions, and comments, delivered through Nodemailer and a durable outbox worker.

### Docs — phase 1

- Enable **Docs** in the persistent sidebar with a nested page tree.
- Create pages from the **+** button or with **`⌥N` / `Alt+N`**, including child pages from any tree row.
- Drag pages by the handle to reorder, nest, or move them back to the top level. The drop target shows before/after/inside feedback.
- Docs home lists every page with its nesting depth, icon, and last editor.
- Block editor built on Tiptap with headings, paragraphs, bulleted and numbered lists, checklists, tables, code blocks with syntax highlighting, quotes, dividers, images, and file attachments.
- Slash menu (`/`) for inserting blocks, plus a floating formatting toolbar for selections and table controls.
- Upload images and files through the editor, or set an optional cover image.
- Emoji picker, inline title editing, cover controls, created-by/last-edited metadata, and autosave with visible save state.
- Stored files are workspace-scoped and served through an authenticated file route.
- Delete pages from the sidebar row menu or the page header, with a confirmation that also removes nested pages.
- Docs page jumps are available in the command palette. Full docs search (title + content) comes in phase 5.

Seeded pages: **Team handbook**, nested **How we communicate** and **Product principles**, plus **Project spec template**.

![Docs home](docs/hub-docs-home.png)

**Still to come for Docs:** teamspaces, favorites, page visibility/permissions, Yjs live co-editing, task embeds and linked docs, version history, docs search, and Markdown import.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui patterns with Radix primitives |
| Rich text | Tiptap 3 (StarterKit, tables, task lists, code highlighting, uploads) |
| Database | PostgreSQL 17 |
| Data access | Raw SQL through `pg` — no Prisma or Drizzle |
| Auth | Better Auth 1.7 (email/password, session cookies) |
| Email | Nodemailer + SMTP, durable PostgreSQL outbox |
| Icons | Lucide |
| Local services | Docker Compose |

## Quick start

### Prerequisites

- Node.js 22.9+ (`.nvmrc` pins Node 22)
- pnpm 10 (`corepack enable`)
- Docker with the Compose plugin for the local PostgreSQL container

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Generate a Better Auth secret and put it in `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

The default `.env.example` points at the Docker Compose database:

```env
DATABASE_URL=postgresql://hub:hub@localhost:5434/hub
```

Port `5434` is used to avoid colliding with a local PostgreSQL on the common `5432`/`5433` ports.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

If you prefer an existing PostgreSQL server, update `DATABASE_URL` and skip this step. Create the database first.

### 4. Migrate and seed

```bash
pnpm db:migrate
pnpm db:seed
```

The seed is idempotent. Re-running it fills in missing demo projects, labels, tasks, and workflows without duplicating existing data.

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test email locally

Hub can send real SMTP email. For local testing, start the bundled Mailpit catcher:

```bash
docker compose --profile mail up -d
```

Add these to `.env.local`:

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="Hub <hub@local.test>"
EMAIL_NOTIFICATION_TYPES=assigned,mentioned,comment
```

Restart `pnpm dev`, then open [http://localhost:8025](http://localhost:8025) to inspect delivered messages. Invitations are sent immediately; task notifications are queued and delivered by the in-process worker within about 15 seconds.

## Email delivery

Email is optional and enabled by setting `SMTP_HOST` and `SMTP_FROM`.

For Gmail/Google Workspace, use an **App Password** (not your account password):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM="Your Name <you@gmail.com>"
```

`SMTP_USER` and `SMTP_PASS` are also accepted as aliases. The sender in `SMTP_FROM` must be the Gmail address or a verified Gmail “Send mail as” alias. A Gmail `535` response means the username/password pair was rejected — regenerate the App Password and make sure 2-Step Verification is enabled.

- **Invitations** send immediately. If SMTP is unavailable, the invite still exists and the dialog keeps the copyable link.
- **In-app notifications** queue an email in the same PostgreSQL transaction as the notification. A worker inside the app delivers pending messages every 15 seconds, retries transient failures up to five times, and recovers stale claims after a crash.
- Default email notification types are `assigned`, `mentioned`, and `comment`. Set `EMAIL_NOTIFICATION_TYPES=assigned,mentioned,comment,task_updated` to also email every followed-task update, or leave it empty to disable notification email while keeping invitation email enabled.
- The worker is part of the app process, so no separate worker container or cron job is required. Multiple app replicas are safe: `FOR UPDATE SKIP LOCKED` prevents duplicate claims.
- Emails contain task/workspace deep links built from `BETTER_AUTH_URL`. Set it to the public URL.
- A failed notification email never rolls back the underlying task, comment, or notification.

## Production deployment

> **Using Coolify?** Follow the dedicated [COOLIFY.md](COOLIFY.md) guide. It uses the Dockerfile as a Coolify application plus a separate Coolify PostgreSQL resource; Coolify handles HTTPS, so the bundled Compose/Caddy stack is not used.

For a plain VPS without Coolify, Hub ships with a production Docker image and Compose stack. On a new database, the app applies migrations automatically at startup, then serves the app. **No demo data is seeded in production** — the first account creates its own workspace.

### What is included

- Multi-stage `Dockerfile` using Next.js standalone output, running as a non-root user with a container health check.
- `docker-compose.prod.yml` with PostgreSQL 17, a persistent database volume, restart policies, log rotation, and startup health checks.
- Automatic migrations under an advisory lock, safe for repeated starts.
- Optional Caddy HTTPS profile with automatic TLS certificates.
- `/api/health` for uptime checks.
- Production config template in [`.env.production.example`](.env.production.example).
- GitHub Actions CI in `.github/workflows/ci.yml` (migrations, typecheck, production build on every push/PR).

### VPS requirements

- A Linux VPS with Docker Engine 24+ and the Docker Compose plugin.
- A DNS `A` record pointing your domain at the VPS (for example `hub.example.com`).
- Ports `80` and `443` open in the VPS firewall if using the bundled Caddy profile.
- 1–2 GB RAM is enough for a small team; PostgreSQL is the only additional service.

### 1. Configure

```bash
git clone <your-repository-url> hub
cd hub
cp .env.production.example .env
```

Generate secrets:

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -hex 24      # POSTGRES_PASSWORD
```

Set at least these values in `.env`:

```env
BETTER_AUTH_URL=https://hub.example.com
APP_DOMAIN=hub.example.com
BETTER_AUTH_SECRET=<32+ random characters>
POSTGRES_PASSWORD=<long random password>
```

`BETTER_AUTH_URL` must exactly match the public URL, including `https://`, with no trailing slash. `APP_DOMAIN` is the domain only, without a scheme.

### 2. Start with automatic HTTPS (recommended)

```bash
docker compose -f docker-compose.prod.yml --profile caddy up -d --build
```

Caddy obtains and renews certificates automatically once DNS resolves to the VPS. Check startup:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
curl https://hub.example.com/api/health
```

The app runs migrations before its first request. Then open `https://hub.example.com/signup`, create the owner account, and set up the workspace.

### 3. Alternative: existing nginx, Caddy, or Traefik

If you already run a reverse proxy on the host, start only the app and database:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The app is bound to `127.0.0.1:3000` and is not exposed publicly. Point your existing proxy at it and make sure these are forwarded:

- `Host` and `X-Forwarded-Host`
- `X-Forwarded-Proto: https`
- WebSocket upgrade headers (needed for future live features)
- A request body limit above 10 MB for file uploads

Terminate TLS at the proxy and set `BETTER_AUTH_URL` to the public HTTPS URL.

### Updating a deployment

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Migrations run automatically during app startup. Take a database backup before updating.

### Backups

Uploaded images and files live in PostgreSQL, so a normal database dump covers all app data:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U hub -d hub > "hub-$(date +%F-%H%M).sql"
```

Restore into a fresh database:

```bash
cat hub-backup.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U hub -d hub
```

The database is stored in the `postgres_data` Docker volume. Do not delete this volume unless you intend to erase the installation. `docker compose down -v` deletes the database and is only appropriate for disposable test installs.

### Health and logs

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 app
curl -fsS https://hub.example.com/api/health
```

`/api/health` returns `200 {"status":"ok"}` only when the database responds; it returns `503` otherwise.

### Production notes

- The app container validates `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and database settings at startup. It refuses to start with a too-short secret or the placeholder values from the example file.
- Session cookies are secure when `BETTER_AUTH_URL` is HTTPS. Use HTTPS in production.
- The PostgreSQL port is not published to the host in the production stack.
- The app container runs as the unprivileged `node` user.
- The default upload limit is 10 MB per file, enforced by the app.
- Configure off-host backups for the `postgres_data` volume. A VPS disk is not a backup.

## Demo sign-in (local seed)

| Role | Email | Password |
| --- | --- | --- |
| Owner | `demo@hub.so` | `hubdemo123` |
| Admin | `priya@hub.so` | `hubdemo123` |
| Member | `jonas@hub.so` | `hubdemo123` |
| Member | `maya@hub.so` | `hubdemo123` |

The login screen also has an **Explore the demo workspace** shortcut. Seeded workspace: **Northstar Studio** (`/w/northstar`).

Seeded projects and content:

- **Website Refresh** (`WEB`) — 7 parent tasks, 2 subtasks, 6 workflow statuses including a custom **In Review**.
- **Mobile App** (`APP`) — 5 tasks across the default workflow.
- Workspace labels: Bug, Feature, Design, Research, Marketing, Ops.
- Sample related links, due dates, assignments, priorities, and rich-text descriptions.

## Adding a task

From any workspace page:

1. Press **`C`**, or click **New task** in the top bar.
2. Enter a title, choose the project, and optionally set an assignee, priority, and due date.
3. Press **Create task**. Hub opens the task, where you can add a rich description, labels, subtasks, and related tasks.

You can also use **New task** inside a project page, where the project picker is pre-filled.


## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm typecheck` | TypeScript check |
| `pnpm db:migrate` | Apply pending SQL migrations |
| `pnpm db:seed` | Create or complete the demo workspace |
| `pnpm db:reset` | Drop and recreate the `public` schema (asks for database name confirmation) |

After `db:reset`, run `pnpm db:migrate && pnpm db:seed`. Production deploys do not run the seed. `pnpm db:migrate` loads `.env.local` when it exists; the container uses its injected environment.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Local | PostgreSQL connection string |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Production alternative | Discrete PostgreSQL settings used by the production Compose stack |
| `BETTER_AUTH_SECRET` | Yes | Signing secret for Better Auth; at least 32 characters in production |
| `BETTER_AUTH_URL` | Yes in production | Public origin of the app, including `https://` |
| `NEXT_PUBLIC_APP_URL` | No | Used for invite links; the production stack sets it to `BETTER_AUTH_URL` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | No | Comma-separated extra trusted origins |
| `DATABASE_POOL_MAX` | No | PostgreSQL pool size per app instance (default 10) |
| `DATABASE_SSL` | No | Set to `true` for a managed PostgreSQL instance requiring TLS |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | No | Set to `false` only for a self-signed certificate |
| `SMTP_HOST` | No | SMTP hostname; enables transactional email when set with `SMTP_FROM` |
| `SMTP_PORT` | No | SMTP port (default 587; 465 enables implicit TLS automatically) |
| `SMTP_SECURE` | No | Set to `true` for implicit TLS on non-465 ports |
| `SMTP_LOCAL_ADDRESS` | No | Outgoing bind address (defaults to `0.0.0.0`) |
| `SMTP_USER` / `SMTP_USERNAME`, `SMTP_PASSWORD` | No | SMTP authentication credentials (`SMTP_USERNAME` is the Gmail-friendly alias) |
| `SMTP_FROM` | With SMTP | Verified sender, e.g. `Hub <notifications@example.com>` |
| `SMTP_REPLY_TO` | No | Optional Reply-To address |
| `EMAIL_NOTIFICATION_TYPES` | No | Comma-separated notification types to email (default `assigned,mentioned,comment`) |

The production Compose stack also reads `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `APP_DOMAIN`, and `APP_PORT` from `.env`.

## Architecture

```
app/
  api/                       REST endpoints + Better Auth handler
  invite/[token]/            Public invite acceptance
  login/, signup/            Auth screens
  onboarding/                Workspace creation
  w/[workspace]/             Workspace-scoped product shell and pages
    projects/[key]/          Project task list and workflow settings
    tasks/[taskId]/          Task detail
    docs/[pageId]/           Nested docs page + block editor
components/
  ui/                        shadcn/ui primitives
  auth/                      Auth and onboarding forms
  workspace/                 Shell, sidebar, command palette, projects
    task/                    Task lists, quick create, task detail
    docs/                    Page tree, block editor, page shell
  invite/                    Invite acceptance UI
lib/
  auth.ts                    Better Auth server config
  db.ts                      pg pool + transaction helper
  workspaces.ts              Workspace, member, invite queries
  projects.ts                Project + workflow queries and mutations
  tasks.ts                   Task queries, mutations, subtasks, links, followers
  comments.ts                Task comments, mentions, and comment notifications
  activity.ts                Activity logging, formatting, and history queries
  notifications.ts           Notification creation, reads, and follower fan-out
  task-view.ts               View/filter/sort parsing and URL helpers
  saved-views.ts             Saved view storage and access
  docs.ts                    Nested docs pages and workspace files
  email.ts                   Nodemailer SMTP transport
  email-templates.ts         Invite and notification email templates
  email-outbox.ts            Durable notification email queue
  email-worker.ts            In-process outbox delivery worker
  access.ts                  Workspace/project authorization helpers
  search.ts                  Command palette search
instrumentation.ts           Starts the email worker at server boot
db/
  migrations/001_initial.sql Core relational schema
  migrations/002_docs.sql    Docs pages and uploaded files
  migrations/003_email_outbox.sql Durable notification email queue
scripts/
  migrate.mjs                Production-safe SQL migration runner
  docker-entrypoint.sh       Validates env, migrates, starts standalone server
  seed.ts, reset.ts          Local demo tooling
deploy/
  Caddyfile                  Optional automatic HTTPS reverse proxy
COOLIFY.md                   Coolify + PostgreSQL deployment guide
Dockerfile                   Multi-stage production image
docker-compose.prod.yml      App + PostgreSQL + optional Caddy
.env.production.example      Production environment template
```

### Modular boundaries

- **Auth** lives behind Better Auth and a small session helper (`lib/session.ts`).
- **Workspace authorization** is centralized in `lib/access.ts` and `lib/permissions.ts`, then enforced again in every API route.
- **Data access** is isolated in `lib/*` modules using parameterized SQL. No ORM.
- **Product areas** live under `/w/[workspace]` and are independent routes. Docs is now a self-contained route group, and Chat can follow the same pattern.
- **Tasks** are scoped to projects, with project-specific statuses validated server-side on every write.
- **Server-rendered pages** fetch directly through the data modules; browser mutations use route handlers under `/api`.

### Roles

| Capability | Owner | Admin | Member |
| --- | --- | --- | --- |
| View workspace and members | ✓ | ✓ | ✓ |
| Invite/revoke invites | ✓ | ✓ | |
| Rename workspace | ✓ | ✓ | |
| Change roles / remove members | ✓ | | |
| Create, edit, and archive projects | ✓ | ✓ | ✓ |
| Add/rename/reorder project statuses | ✓ | ✓ | |
| Create, edit, and assign tasks | ✓ | ✓ | ✓ |
| Add subtasks and related links | ✓ | ✓ | ✓ |
| Comment, mention teammates, follow tasks | ✓ | ✓ | ✓ |
| Delete tasks (including their subtasks and comments) | ✓ | ✓ | ✓ |
| Create and edit workspace docs | ✓ | ✓ | ✓ |

The last owner cannot be demoted or removed.

### Tasks

- Task IDs are allocated transactionally from a per-project counter, so two people creating tasks at once cannot receive the same number.
- Descriptions are stored as Tiptap JSON and a plain-text index for search. The raw text is never interpreted as HTML.
- Completing a task sets `completed_at`; moving it back to an open status clears it.
- Every task starts with its creator following it; assignees and mentioned teammates are added as followers automatically.
- Comments support @mention autocomplete. Mentions are highlighted and notify the mentioned teammate.
- Every meaningful task change is written to the activity table with human-readable metadata.
- Project list views show parent tasks grouped by status; subtasks are shown on the parent task with a count in the list.
- Personal views exclude done and canceled tasks and exclude tasks from archived projects.
- The task page supports inline title editing, rich-text saving, property changes, subtask creation, related-task linking, and deletion.
- Deleting a task permanently removes its subtasks, comments, activity, links, and notifications after a confirmation dialog.

### Comments, activity & notifications

- Comments live on the task page and support @mention autocomplete with inline mention highlighting.
- Mentioned teammates receive a notification and automatically follow the task.
- The activity tab describes every meaningful change, including title, description, status, assignee, priority, due date, labels, related links, and comments.
- Users can follow or unfollow a task. New tasks are followed by their creator; assignments and mentions add followers.
- Notifications are created for assignments, mentions, comments, and updates on tasks a user follows. The bell menu shows unread counts, links directly to the task, supports mark-all-read, and updates when a notification is opened.

![Notifications](docs/hub-notifications.png)

### Views, filters & saved views

- **List** groups parent tasks by workflow status.
- **Board** shows one column per status. Drag cards between columns, or use the card menu for a keyboard-friendly and touch-friendly move.
- **Timeline** plots due dates across a scrollable six-week window, with overdue, today, and later work visible at a glance.
- Filters cover assignee, status, priority, label, and due date. Sorting covers manual order, soonest/latest due date, priority, newest, and recently updated.
- Saved views persist the layout, filters, and sort order. They can be private or shared with everyone on the project. Selecting a saved view applies all three in one click.
- Filter/sort state is reflected in the URL, so views are linkable and survive refreshes.

![Board view](docs/hub-board.png)

![Timeline view](docs/hub-timeline.png)

### Projects & workflows

- Project keys are unique per workspace, 2–8 uppercase letters/numbers, and can be changed later.
- Every new project receives the same sensible default workflow.
- Workflow categories are fixed: Backlog, Todo, In Progress, Done, Canceled.
- Archived projects leave the sidebar and active list but keep their workflow and tasks. They can be restored from the Archived section.

### Invitations

Invites are bound to an email address and stored as SHA-256 hashes — the raw token is returned once. The invite dialog provides a copyable private URL and a pre-filled email composer. Expired pending invites can be replaced by inviting the same email again.

### Data model

- `db/migrations/001_initial.sql` — Better Auth, workspaces, projects/workflows, tasks, comments, activity, notifications, saved views.
- `db/migrations/002_docs.sql` — nested docs pages and workspace file uploads.
- `db/migrations/003_email_outbox.sql` — durable outbox for notification emails.

Docs pages store their Tiptap JSON and a plain-text representation for future search. Page files are stored in PostgreSQL and served only to workspace members through an authenticated route.

Notification emails are queued inside the same transaction as the in-app notification, then claimed with `FOR UPDATE SKIP LOCKED` by the app's background worker. Invitation emails are sent immediately and are not stored in the outbox.

The migration runner tracks applied files in `_hub_migrations`.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘K` / `Ctrl+K` | Open command palette |
| `C` | Quick-create a task |
| `⌥N` / `Alt+N` | Create a docs page (outside an editor) |
| `↑` / `↓` | Move through command results |
| `Enter` | Open result |
| `Esc` | Close palette or dialog |

## Build roadmap

1. **Foundation** — auth, workspace, roles, invitations, sidebar, command palette, theme ✅
2. **Projects & workflows** — project CRUD, archive, custom statuses, workflow settings ✅
3. **Tasks & list view** — rich description, task IDs, subtasks, labels, quick create, list view ✅
4. **Board, timeline & filters** — drag-and-drop status changes, timeline, filters, saved views ✅
5. **Comments, activity & notifications** — mentions, activity feed, in-app notifications ✅

## Docs build roadmap

1. **Page tree + basic editor** — nested pages, drag/move, docs home, block editor, uploads, autosave ✅
2. **Teamspaces, favorites & permissions** — shared/team/private visibility and direct sharing
3. **Live co-editing** — Yjs websocket server, collaborator cursors, presence
4. **Task embeds & linked docs** — `#` task cards and doc links on tasks/projects
5. **History & search** — page versions, restore, global docs search, Markdown import

## Review checkpoint

Hub's five core build phases are complete, and Docs phase 1 is ready for review. Suggested checks:

1. Open a task, add a comment, type `@`, and mention a teammate.
2. Open the **Activity** tab to confirm the comment and task changes are recorded.
3. Use **Follow/Following** to change the task's follower state.
4. Sign in as the mentioned teammate, open the bell, and confirm the notification deep-links to the task.
5. Assign a task to another member and confirm they receive an assignment notification.
6. Comment on or update a task followed by another member and confirm they receive the follower notification.
7. Mark notifications as read and confirm the unread badge clears.
8. Open **Docs**, create a page with **⌥N**, and rename it.
9. Drag a page by its handle to nest and reorder; use the slash menu to add a table, checklist, image, and file.
10. Edit content, reload, and confirm autosave persisted. Set an emoji and cover image.
11. Delete a page from its row menu or page header and confirm nested pages are called out.

Docs phase 1 is complete. The next review checkpoint is teamspaces, favorites, and page permissions.
