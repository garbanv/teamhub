#!/usr/bin/env node
/**
 * Apply SQL migrations in db/migrations exactly once.
 *
 * Usage:
 *   pnpm db:migrate                 # local, loads .env.local
 *   node scripts/migrate.mjs        # production (env injected by Docker)
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Pool } from "pg";

const migrationsDir = path.join(process.cwd(), "db", "migrations");
const connectionString = process.env.DATABASE_URL;
const hasDiscreteConfig = Boolean(
  process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE,
);

if (!connectionString && !hasDiscreteConfig) {
  console.error(
    "Database configuration is required. Set DATABASE_URL, or PGHOST/PGUSER/PGDATABASE.",
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase(pool) {
  const attempts = Number.parseInt(process.env.DB_WAIT_ATTEMPTS ?? "30", 10);
  const delayMs = Number.parseInt(process.env.DB_WAIT_DELAY_MS ?? "2000", 10);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const client = await pool.connect();
      try {
        await client.query("select 1");
      } finally {
        client.release();
      }
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.log(
        `  · database not ready (${attempt}/${attempts}), retrying in ${delayMs}ms`,
      );
      await sleep(delayMs);
    }
  }
}

async function migrate() {
  const pool = new Pool({
    ...(connectionString ? { connectionString } : {}),
    max: 1,
  });
  try {
    await waitForDatabase(pool);

    const client = await pool.connect();
    try {
      await client.query(
        "select pg_advisory_lock(hashtext('hub_schema_migrations'))",
      );

      await client.query(`
        create table if not exists _hub_migrations (
          name text primary key,
          applied_at timestamptz not null default now()
        )
      `);

      const files = (await readdir(migrationsDir))
        .filter((file) => file.endsWith(".sql"))
        .sort();

      const { rows } = await client.query(
        "select name from _hub_migrations",
      );
      const applied = new Set(rows.map((row) => row.name));

      let count = 0;
      for (const file of files) {
        if (applied.has(file)) {
          console.log(`  · ${file} (already applied)`);
          continue;
        }

        const sql = await readFile(path.join(migrationsDir, file), "utf8");
        console.log(`  → applying ${file}`);
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(
            "insert into _hub_migrations (name) values ($1)",
            [file],
          );
          await client.query("COMMIT");
          count += 1;
        } catch (error) {
          await client.query("ROLLBACK");
          throw new Error(`Migration ${file} failed`, { cause: error });
        }
      }

      console.log(
        count > 0
          ? `\nApplied ${count} migration${count === 1 ? "" : "s"}.`
          : "\nDatabase is up to date.",
      );
    } finally {
      await client
        .query("select pg_advisory_unlock(hashtext('hub_schema_migrations'))")
        .catch(() => {});
      client.release();
    }
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
