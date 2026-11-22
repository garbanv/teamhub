# Deploying Hub with Coolify

Hub runs as a normal Dockerfile application in Coolify, with a separate Coolify-managed PostgreSQL database. Coolify provides the domain, HTTPS certificate, reverse proxy, deployments, and database backups. **Do not use `docker-compose.prod.yml` or the bundled Caddy profile for a Coolify deployment.**

```
Internet
  │  HTTPS (Coolify proxy / Traefik)
  ▼
Coolify application (Dockerfile, port 3000)
  │  private Docker network
  ▼
Coolify PostgreSQL resource
```

## 1. Create the PostgreSQL database

In the same Coolify project, environment, server, and destination network as the app:

1. **New Resource → PostgreSQL**.
2. Choose **PostgreSQL 17** (recommended; Hub is tested against 17) or the default PostgreSQL version.
3. Start the database and wait until it is healthy.
4. Open **General** and copy the **Postgres URL (internal)**.

Keep the database private. Hub does not need a public TCP proxy for PostgreSQL.

The internal URL looks like:

```text
postgres://postgres:password@<database-container>:5432/postgres
```

## 2. Create the application

1. **New Resource → Application** and connect the Git repository containing Hub.
2. Set **Build Pack** / **Build strategy** to **Dockerfile**.
3. Set:

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Base Directory | `/` |
| Dockerfile Location | `Dockerfile` |
| Ports Exposes | `3000` |
| Domain | `https://hub.yourdomain.com` |

The Dockerfile builds the Next.js standalone server and runs it as the unprivileged `node` user. It already listens on `0.0.0.0:3000`; do not add `PORT`, `HOST`, or `HOSTNAME` variables.

### Health check

Under the application's **Healthcheck** settings, configure:

| Setting | Value |
| --- | --- |
| Enabled | On |
| Scheme | `http` |
| Port | `3000` |
| Path | `/api/health` |
| Expected status | `200` |

The endpoint checks the database as well, so Coolify only marks a deployment healthy after the app can serve real requests.

## 3. Add environment variables

Add these under **Environment Variables**. Set **Build time** to **Not available during build** for every variable below; Hub reads them at runtime. The Dockerfile intentionally uses build-only placeholders so no production secrets need to enter the image build.

| Variable | Value | Required |
| --- | --- | --- |
| `DATABASE_URL` | The **Postgres URL (internal)** copied from step 1 | Yes |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` (32+ characters) | Yes |
| `BETTER_AUTH_URL` | `https://hub.yourdomain.com` (exact public URL, no trailing slash) | Yes |
| `NEXT_PUBLIC_APP_URL` | Same as `BETTER_AUTH_URL` (optional but recommended) | No |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Extra comma-separated origins, e.g. `https://www.hub.yourdomain.com` | No |
| `DATABASE_POOL_MAX` | `10` (default) | No |
| `SMTP_HOST` | SMTP hostname | For email |
| `SMTP_PORT` | `587` (or `465` for implicit TLS) | For email |
| `SMTP_SECURE` | `true`/`false`; port 465 is detected automatically | No |
| `SMTP_USERNAME` (or `SMTP_USER`), `SMTP_PASSWORD` | SMTP credentials | For email |
| `SMTP_FROM` | Verified sender, e.g. `Hub <notifications@yourdomain.com>` | For email |
| `SMTP_REPLY_TO` | Optional Reply-To address | No |
| `EMAIL_NOTIFICATION_TYPES` | Default `assigned,mentioned,comment` | No |

Notes:

- **Lock** `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `SMTP_PASSWORD` after saving them.
- All SMTP variables are runtime-only. Leave `SMTP_HOST` and `SMTP_FROM` empty to disable email; invitation links still work.
- For Gmail/Google Workspace: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USERNAME=you@gmail.com`, `SMTP_PASSWORD=<16-character App Password>`, and `SMTP_FROM` set to that Gmail address or a verified alias. A `535` error means Gmail rejected the credentials; regenerate the App Password and verify the username.
- If the internal Postgres URL contains `$` characters, set its interpolation to **Literal** in Coolify.
- Do not set `DATABASE_SSL` for the private internal connection.
- If you access the app through both the apex and `www` domains, add both to `BETTER_AUTH_TRUSTED_ORIGINS`. The origin must match or Better Auth rejects the login/signup request with `Invalid origin`.
- The container refuses to boot with the placeholder values from `.env.production.example` or a secret shorter than 32 characters.
- Notification emails are queued in PostgreSQL and delivered by a worker inside the app process within about 15 seconds. No separate worker or cron job is needed; leave the app running normally.
- Invitations send email immediately when SMTP is configured. If SMTP is down or not configured, the invite dialog still shows a copyable link.

## 4. Deploy

Select **Deploy** and watch the deployment logs. On first boot you should see:

```text
Running database migrations...
  → applying 001_initial.sql
  → applying 002_docs.sql
  → applying 003_email_outbox.sql
Applied 3 migrations.
Starting Hub on 0.0.0.0:3000...
✓ Ready
```

Then verify:

```bash
curl -fsS https://hub.yourdomain.com/api/health
# {"status":"ok"}
```

Open `https://hub.yourdomain.com/signup` and create the owner account. The production database is empty; Hub does not seed the demo workspace or demo users.

## 5. No persistent app volume is needed

Hub stores uploaded images and attachments in PostgreSQL. The only persistent data is the Coolify PostgreSQL volume. Do not add a persistent storage mount to the app container.

## 6. Backups

Configure scheduled backups on the **PostgreSQL** resource in Coolify (Backups page), ideally to S3 or another off-host destination. The database dump includes users, workspaces, tasks, docs, and uploaded files.

Before every deployment that contains a schema migration, take a backup. Application rollbacks do not automatically reverse database migrations.

## 7. Updates

Push to `main` and let Coolify redeploy (or select **Deploy** manually).

The new container runs migrations under a PostgreSQL advisory lock before starting. This makes repeated starts and overlapping deployments safe. If a migration fails, the new container exits and Coolify will not route traffic to it; check the deployment/runtime logs and restore from a backup if necessary.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid origin` on login/signup | `BETTER_AUTH_URL` must exactly match the browser URL, including `https://` and no trailing slash. Add extra domains to `BETTER_AUTH_TRUSTED_ORIGINS`. |
| 502 / no available server | Confirm **Ports Exposes** is `3000`, the health check is `/api/health`, and the app listens on `0.0.0.0` (the image already does). |
| Database connection error during deploy | Use the **internal** Postgres URL and make sure the app and database are on the same Coolify destination network. |
| Migrations keep retrying | Check the database is healthy, the URL credentials are current, and the database user owns the database. |
| Login works but links point to the wrong domain | Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public HTTPS URL, then restart the app. |
| Build asks for database/auth values | All three variables should be runtime-only. The Dockerfile has build placeholders. |

## Coolify quick reference

- Build pack: **Dockerfile**
- Port: **3000**
- Health path: **`/api/health`**
- Database: **PostgreSQL**, same destination network
- Secrets: **runtime only**, locked
- App storage: **none**
- TLS: **Coolify proxy** (not the bundled Caddy profile)
