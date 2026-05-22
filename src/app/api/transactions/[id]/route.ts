import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, amount, date, category, description, project_id, client_id } = body;

    if (!type || !amount || !date || !category) {
      return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
    }

    // Check if transaction exists
    const txnCheck = await query(`SELECT id FROM transactions WHERE id = ?`, [id]);
    if (txnCheck.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const txnAmount = parseFloat(amount);
    const txnDate = new Date(date).toISOString().split('T')[0];

    await query(
      `UPDATE transactions SET type = ?, amount = ?, date = ?, category = ?, description = ?, project_id = ?, client_id = ? WHERE id = ?`,
      [type, txnAmount, txnDate, category, description || null, project_id || null, client_id || null, id]
    );

    const [updatedTxn] = await query(`SELECT * FROM transactions WHERE id = ?`, [id]);
    return NextResponse.json(updatedTxn);
  } catch (error: any) {
    console.error('API Error in Transactions PUT:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if transaction exists
    const txnCheck = await query(`SELECT id FROM transactions WHERE id = ?`, [id]);
    if (txnCheck.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Delete transaction
    await query(`DELETE FROM transactions WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error: any) {
    console.error('API Error in Transactions DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
