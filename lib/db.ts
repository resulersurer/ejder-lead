import { Pool } from "pg";
import { fallbackTeamMessages } from "../app/teamMessages";

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
      touched BOOLEAN NOT NULL DEFAULT FALSE,
      status_updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS touched BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await db.query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
  `);

  await db.query(`
    UPDATE leads
    SET status = CASE
      WHEN LOWER(TRIM(status)) = 'new' THEN 'Yeni'
      WHEN LOWER(TRIM(status)) = 'called' THEN 'Arandı'
      WHEN LOWER(TRIM(status)) = 'arandä±' THEN 'Arandı'
      WHEN LOWER(TRIM(status)) = 'no answer' THEN 'Cevap Yok'
      WHEN LOWER(TRIM(status)) = 'waiting' THEN 'Bekliyor'
      WHEN LOWER(TRIM(status)) = 'sold' THEN 'Satıldı'
      WHEN LOWER(TRIM(status)) = 'satä±ldä±' THEN 'Satıldı'
      ELSE status
    END
    WHERE LOWER(TRIM(status)) IN (
      'new',
      'called',
      'arandä±',
      'no answer',
      'waiting',
      'sold',
      'satä±ldä±'
    );
  `);

  await db.query(`
    WITH recipients(name, ord) AS (
      SELECT *
      FROM unnest(ARRAY[
        'NAZLICAN TUĞAL',
        'ÇAĞAN GENCER',
        'NURGÜL KOÇ',
        'YELİZ KABAKÇI',
        'YAREN DİKİLİTAŞ',
        'LEYLA SANEM UZUN',
        'OKAN ZİYLAN',
        'MUSTAFA ŞAHŞER ŞAHİN',
        'ŞİYAR KARADERE',
        'SİMAY KÖROĞLU',
        'SELİN ÖZBEY',
        'SEFA AYDAŞ',
        'RAMAZAN KOÇAK',
        'MUSA GÜNEŞ',
        'GİZEM BİLGİ',
        'FURKAN YILMAZ',
        'ELİF DİLAN EKİCİ',
        'ECEM BALKI',
        'CEREN VAREL',
        'CEMAL HALİL EMİR',
        'BEDİRHAN HEKİM',
        'BAHAR KELEŞ'
      ]::TEXT[]) WITH ORDINALITY AS person(name, ord)
    ),
    recipient_count(total) AS (
      SELECT COUNT(*) FROM recipients
    ),
    removed_leads AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
      FROM leads
      WHERE sales_person IN ('ERDİNÇ KÖSEBİŞ', 'ÖZLEM YENER')
    ),
    assignments AS (
      SELECT removed_leads.id, recipients.name
      FROM removed_leads
      CROSS JOIN recipient_count
      JOIN recipients
        ON recipients.ord = ((removed_leads.rn - 1) % recipient_count.total) + 1
    )
    UPDATE leads
    SET sales_person = assignments.name
    FROM assignments
    WHERE leads.id = assignments.id;
  `);
}

export async function ensureTeamMessagesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS team_messages (
      id TEXT PRIMARY KEY,
      quote TEXT NOT NULL,
      author TEXT NOT NULL,
      theme TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    ALTER TABLE team_messages
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
  `);

  await db.query(`
    ALTER TABLE team_messages
    ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
  `);

  const existing = await db.query("SELECT COUNT(*)::INT AS count FROM team_messages");
  if ((existing.rows[0]?.count ?? 0) > 0) return;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (const [index, message] of fallbackTeamMessages.entries()) {
      await client.query(
        `INSERT INTO team_messages (id, quote, author, theme, priority)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [message.id, message.quote, message.author, message.theme, index]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
