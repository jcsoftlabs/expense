import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const projectId = searchParams.get('project_id');
    const clientId = searchParams.get('client_id');
    const category = searchParams.get('category');

    let sql = `
      SELECT t.*, p.name as projectName, c.name as clientName
      FROM transactions t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type) {
      sql += ` AND t.type = ?`;
      params.push(type);
    }
    if (projectId) {
      sql += ` AND t.project_id = ?`;
      params.push(projectId);
    }
    if (clientId) {
      sql += ` AND t.client_id = ?`;
      params.push(clientId);
    }
    if (category) {
      sql += ` AND t.category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY t.date DESC, t.created_at DESC`;

    const transactions = await query(sql, params);
    const formatted = transactions.map((t: any) => ({
      ...t,
      amount: parseFloat(t.amount || 0)
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('API Error in Transactions GET:', error);
    return NextResponse.json({ error: 'Failed to retrieve transactions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, date, category, description, project_id, client_id, currency } = body;

    if (!type || !amount || !date || !category) {
      return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const txnAmount = parseFloat(amount);
    const txnDate = new Date(date).toISOString().split('T')[0]; // format YYYY-MM-DD
    const txnCurrency = currency || 'USD';

    await query(
      `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, txnAmount, txnDate, category, description || null, project_id || null, client_id || null, txnCurrency]
    );

    const [newTxn] = await query(`SELECT * FROM transactions WHERE id = ?`, [id]);
    return NextResponse.json(newTxn, { status: 201 });
  } catch (error: any) {
    console.error('API Error in Transactions POST:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
