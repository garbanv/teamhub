import { Pool, type QueryResult, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;
const hasDiscreteConfig = Boolean(
  process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE,
);

if (!connectionString && !hasDiscreteConfig) {
  throw new Error(
    "Database configuration is missing. Set DATABASE_URL, or PGHOST/PGUSER/PGDATABASE (and optional PGPORT/PGPASSWORD).",
  );
}

const globalForDb = globalThis as unknown as {
  hubPool?: Pool;
};

const configuredPoolSize = Number.parseInt(
  process.env.DATABASE_POOL_MAX ?? "10",
  10,
);
const poolMax =
  Number.isFinite(configuredPoolSize) && configuredPoolSize > 0
    ? configuredPoolSize
    : 10;

const ssl =
  process.env.DATABASE_SSL === "true"
    ? {
        rejectUnauthorized:
          process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
      }
    : undefined;

export const pool =
  globalForDb.hubPool ??
  new Pool({
    ...(connectionString ? { connectionString } : {}),
    max: poolMax,
    ssl,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.hubPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
