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
  touched?: boolean;
};

async function getAllLeads() {
  await ensureLeadsTable();
  const result = await db.query(
    `SELECT id, name, company, phone, status, sales_person AS "salesPerson", notes, touched FROM leads ORDER BY touched ASC, created_at`
  );
  return result.rows as Lead[];
}

export async function GET() {
  try {
    const leads = await getAllLeads();
    return NextResponse.json({ leads });
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
        await client.query(
          `INSERT INTO leads (id, name, company, phone, status, sales_person, notes, touched)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             company = EXCLUDED.company,
             phone = EXCLUDED.phone,
             status = EXCLUDED.status,
             sales_person = EXCLUDED.sales_person,
             notes = EXCLUDED.notes,
             touched = COALESCE(leads.touched, EXCLUDED.touched, false)`,
          [lead.id, lead.name, lead.company, lead.phone, lead.status, lead.salesPerson, lead.notes, lead.touched ?? false]
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
    await db.query(
      `INSERT INTO leads (id, name, company, phone, status, sales_person, notes, touched)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             company = EXCLUDED.company,
             phone = EXCLUDED.phone,
             status = EXCLUDED.status,
             sales_person = EXCLUDED.sales_person,
             notes = EXCLUDED.notes,
             touched = EXCLUDED.touched`,
      [lead.id, lead.name, lead.company, lead.phone, lead.status, lead.salesPerson, lead.notes, lead.touched ?? true]
    );

    return NextResponse.json({ lead });
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
