import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    // Return all clients with calculated financial stats
    const clients = await query(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) as projectCount,
        COALESCE((
          SELECT SUM(amount) 
          FROM transactions t 
          WHERE t.client_id = c.id AND t.type = 'INCOME'
        ), 0.00) as totalPaid,
        COALESCE((
          SELECT SUM(amount) 
          FROM receivables r 
          WHERE r.client_id = c.id AND r.status != 'PAID'
        ), 0.00) as outstandingAmount
      FROM clients c
      ORDER BY c.name ASC
    `);

    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('API Error in Clients GET:', error);
    return NextResponse.json({ error: 'Failed to retrieve clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company } = body;

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();

    await query(
      `INSERT INTO clients (id, name, email, phone, company) VALUES (?, ?, ?, ?, ?)`,
      [id, name, email || null, phone || null, company || null]
    );

    const [newClient] = await query(`SELECT * FROM clients WHERE id = ?`, [id]);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('API Error in Clients POST:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
