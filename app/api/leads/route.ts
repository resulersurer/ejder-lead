import { NextRequest, NextResponse } from "next/server";
import { db, ensureLeadsTable } from "../../../lib/db";

type Lead = {
  id: string;
  name: string;
  turname: string;
  phone: string;
  status: string;
  salesPerson: string;
  notes: string;
  touched?: boolean;
  createdAt?: string;
  statusUpdatedAt?: string | null;
};

function normalizeLeadStatus(status: unknown) {
  const raw = String(status ?? "").trim();
  const key = raw
    .toLowerCase()
    .replace(/ä±|ã¤â±/g, "i")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z]/g, "");

  if (!key || key === "new") return "Yeni";
  if (key === "called" || key === "arandi") return "Arandı";
  if (key === "noanswer" || key.includes("cevap")) return "Cevap Yok";
  if (key === "waiting" || key.startsWith("bekl")) return "Bekliyor";
  if (key === "sold" || key === "satildi") return "Satıldı";
  return raw || "Yeni";
}

async function getAllLeads(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  person?: string;
}) {
  await ensureLeadsTable();

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params?.search) {
    const searchTerm = `%${params.search.toLowerCase()}%`;
    values.push(searchTerm, searchTerm, searchTerm);
    conditions.push(
      `(LOWER(name) LIKE $${values.length - 2} OR LOWER(turname) LIKE $${values.length - 1} OR phone LIKE $${values.length})`
    );
  }

  if (params?.status && params.status !== "all") {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }

  if (params?.person && params.person !== "all") {
    values.push(params.person);
    conditions.push(`sales_person = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM leads ${whereClause}`,
    values
  );
  const total = countResult.rows[0]?.total ?? 0;

  const statusResult = await db.query(
    `SELECT status, COUNT(*)::int AS count FROM leads ${whereClause} GROUP BY status`,
    values
  );
  const statusCounts: Record<string, number> = {
    "Yeni": 0,
    "Arandı": 0,
    "Cevap Yok": 0,
    "Bekliyor": 0,
    "Satıldı": 0,
  };
  for (const row of statusResult.rows as { status: string; count: number }[]) {
    if (row.status) {
      statusCounts[row.status] = row.count;
    }
  }

  let query = `SELECT
       id,
       name,
       turname,
       phone,
       status,
       sales_person AS "salesPerson",
       notes,
       touched,
       created_at AS "createdAt",
       status_updated_at AS "statusUpdatedAt"
     FROM leads
     ${whereClause}
     ORDER BY touched ASC, created_at`;

  const queryValues = [...values];

  if (params?.limit) {
    queryValues.push(params.limit);
    query += ` LIMIT $${queryValues.length}`;
  }

  if (params?.offset) {
    queryValues.push(params.offset);
    query += ` OFFSET $${queryValues.length}`;
  }

  const result = await db.query(query, queryValues);
  return { leads: result.rows as Lead[], total, statusCounts };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");
    const person = url.searchParams.get("person");

    const result = await getAllLeads({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      search: search || undefined,
      status: status || undefined,
      person: person || undefined,
    });

    return NextResponse.json({ leads: result.leads, total: result.total, statusCounts: result.statusCounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen bir sunucu hatası oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leads = Array.isArray(body.leads) ? (body.leads as Lead[]) : [];
    await ensureLeadsTable();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      for (const lead of leads) {
        const status = normalizeLeadStatus(lead.status);
        await client.query(
          `INSERT INTO leads (id, name, turname, phone, status, sales_person, notes, touched)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             turname = EXCLUDED.turname,
             phone = EXCLUDED.phone,
             status = EXCLUDED.status,
             sales_person = EXCLUDED.sales_person,
             notes = EXCLUDED.notes,
             touched = COALESCE(leads.touched, EXCLUDED.touched, false)`,
          [lead.id, lead.name, lead.turname, lead.phone, status, lead.salesPerson, lead.notes, lead.touched ?? false]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ inserted: leads.length, leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen bir sunucu hatası oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const lead = body.lead as Lead | undefined;

    if (!lead?.id) {
      return NextResponse.json({ error: "Lead id is required" }, { status: 400 });
    }

    await ensureLeadsTable();
    const status = normalizeLeadStatus(lead.status);
    const result = await db.query(
      `INSERT INTO leads (id, name, turname, phone, status, sales_person, notes, touched, status_updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             turname = EXCLUDED.turname,
             phone = EXCLUDED.phone,
             status = EXCLUDED.status,
             sales_person = EXCLUDED.sales_person,
             notes = EXCLUDED.notes,
             touched = EXCLUDED.touched,
             status_updated_at = CASE
               WHEN leads.status IS DISTINCT FROM EXCLUDED.status THEN NOW()
               ELSE leads.status_updated_at
             END
           RETURNING
             id,
             name,
             turname,
             phone,
             status,
             sales_person AS "salesPerson",
             notes,
             touched,
             created_at AS "createdAt",
             status_updated_at AS "statusUpdatedAt"`,
      [lead.id, lead.name, lead.turname, lead.phone, status, lead.salesPerson, lead.notes, lead.touched ?? true]
    );

    return NextResponse.json({ lead: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen bir sunucu hatası oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids : [];

    if (!ids.length) {
      return NextResponse.json({ error: "Lead ids are required" }, { status: 400 });
    }

    await ensureLeadsTable();
    await db.query(`DELETE FROM leads WHERE id = ANY($1)`, [ids]);

    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen bir sunucu hatası oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
