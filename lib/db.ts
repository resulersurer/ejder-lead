import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

function getPool() {
  if (globalThis.pgPool) return globalThis.pgPool;

  const envVars = [
    "DATABASE_URL",
    "STORAGE_DATABASE_URL",
    "STORAGE_DATABASE_URL_UNPOOLED",
    "STORAGE_POSTGRES_URL",
    "STORAGE_POSTGRES_URL_NO_SSL",
    "STORAGE_POSTGRES_URL_NON_POOLING",
    "STORAGE_POSTGRES_PRISMA_URL",
  ];

  let connectionString = envVars
    .map((name) => process.env[name])
    .find(Boolean);

  if (!connectionString) {
    const host =
      process.env.STORAGE_POSTGRES_HOST || process.env.STORAGE_PGHOST;
    const database =
      process.env.STORAGE_POSTGRES_DATABASE || process.env.STORAGE_PGDATABASE;
    const user = process.env.STORAGE_POSTGRES_USER || process.env.STORAGE_PGUSER;
    const password =
      process.env.STORAGE_POSTGRES_PASSWORD || process.env.STORAGE_PGPASSWORD;

    if (host && database && user && password) {
      connectionString = `postgresql://${encodeURIComponent(
        user
      )}:${encodeURIComponent(password)}@${host}/${database}?sslmode=require`;
    }
  }

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or one of the Vercel STORAGE_* Postgres URLs is required."
    );
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = connectionString;
  }

  const pool = new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") {
    globalThis.pgPool = pool;
  }

  return pool;
}

export const db = {
  query: (...args: any[]) => {
    const pool = getPool();
    return (pool.query as any)(...args);
  },
  connect: () => getPool().connect(),
};

export async function ensureLeadsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      status TEXT,
      sales_person TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
