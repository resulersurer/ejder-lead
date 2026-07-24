import { NextRequest, NextResponse } from "next/server";
import { db, ensureLeadsTable } from "../../../lib/db";

type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  status: string;
  salesPerson: string;
  notes: string;
};

async function getAllLeads() {
  await ensureLeadsTable();
  const result = await db.query(
    `SELECT id, name, company, phone, status, sales_person AS "salesPerson", notes FROM leads ORDER BY created_at`
  );
  return result.rows as Lead[];
}

export async function GET() {
  const leads = await getAllLeads();
  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const leads = Array.isArray(body.leads) ? body.leads as Lead[] : [];
  await ensureLeadsTable();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const lead of leads) {
      await client.query(
        `INSERT INTO leads (id, name, company, phone, status, sales_person, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           company = EXCLUDED.company,
           phone = EXCLUDED.phone,
           status = EXCLUDED.status,
           sales_person = EXCLUDED.sales_person,
           notes = EXCLUDED.notes`,
        [lead.id, lead.name, lead.company, lead.phone, lead.status, lead.salesPerson, lead.notes]
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
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const lead = body.lead as Lead | undefined;

  if (!lead?.id) {
    return NextResponse.json({ error: "Lead id is required" }, { status: 400 });
  }

  await ensureLeadsTable();
  await db.query(
    `INSERT INTO leads (id, name, company, phone, status, sales_person, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           company = EXCLUDED.company,
           phone = EXCLUDED.phone,
           status = EXCLUDED.status,
           sales_person = EXCLUDED.sales_person,
           notes = EXCLUDED.notes`,
    [lead.id, lead.name, lead.company, lead.phone, lead.status, lead.salesPerson, lead.notes]
  );

  return NextResponse.json({ lead });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids : [];

  if (!ids.length) {
    return NextResponse.json({ error: "Lead ids are required" }, { status: 400 });
  }

  await ensureLeadsTable();
  await db.query(`DELETE FROM leads WHERE id = ANY($1)`, [ids]);

  return NextResponse.json({ deleted: ids.length });
}
