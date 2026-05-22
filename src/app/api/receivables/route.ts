import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const projectId = searchParams.get('project_id');

    let sql = `
      SELECT r.*, c.name as clientName, c.company as clientCompany, p.name as projectName
      FROM receivables r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND r.status = ?`;
      params.push(status);
    }
    if (clientId) {
      sql += ` AND r.client_id = ?`;
      params.push(clientId);
    }
    if (projectId) {
      sql += ` AND r.project_id = ?`;
      params.push(projectId);
    }

    sql += ` ORDER BY r.due_date ASC, r.created_at DESC`;

    const receivables = await query(sql, params);
    const formatted = receivables.map((r: any) => ({
      ...r,
      amount: parseFloat(r.amount || 0),
      paid_amount: parseFloat(r.paid_amount || 0)
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('API Error in Receivables GET:', error);
    return NextResponse.json({ error: 'Failed to retrieve accounts receivable' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoice_number, amount, issue_date, due_date, status, client_id, project_id, notes, currency } = body;

    if (!invoice_number || !amount || !issue_date || !due_date) {
      return NextResponse.json({ error: 'Missing required invoice fields' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const invAmount = parseFloat(amount);
    const issueDate = new Date(issue_date).toISOString().split('T')[0];
    const dueDate = new Date(due_date).toISOString().split('T')[0];
    const invStatus = status || 'PENDING';
    const invCurrency = currency || 'USD';

    await query(
      `INSERT INTO receivables (id, invoice_number, amount, paid_amount, issue_date, due_date, status, client_id, project_id, notes, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, invoice_number, invAmount, 0.00, issueDate, dueDate, invStatus, client_id || null, project_id || null, notes || null, invCurrency]
    );

    const [newInvoice] = await query(`SELECT * FROM receivables WHERE id = ?`, [id]);
    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error: any) {
    console.error('API Error in Receivables POST:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
