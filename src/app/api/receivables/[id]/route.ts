import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { invoice_number, amount, issue_date, due_date, status, client_id, project_id, notes, currency } = body;

    if (!invoice_number || !amount || !issue_date || !due_date) {
      return NextResponse.json({ error: 'Missing required invoice fields' }, { status: 400 });
    }

    // Check if invoice exists
    const invCheck = await query(`SELECT id, paid_amount FROM receivables WHERE id = ?`, [id]);
    if (invCheck.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invAmount = parseFloat(amount);
    const paidAmount = parseFloat(invCheck[0].paid_amount || 0);
    const issueDate = new Date(issue_date).toISOString().split('T')[0];
    const dueDate = new Date(due_date).toISOString().split('T')[0];
    const invoiceStatus =
      paidAmount >= invAmount
        ? 'PAID'
        : paidAmount > 0
          ? 'PARTIAL'
          : status || 'PENDING';

    if (invAmount < paidAmount) {
      return NextResponse.json(
        { error: 'Le montant de la facture ne peut pas être inférieur au montant déjà encaissé.' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE receivables SET invoice_number = ?, amount = ?, issue_date = ?, due_date = ?, status = ?, client_id = ?, project_id = ?, notes = ?, currency = ? WHERE id = ?`,
      [invoice_number, invAmount, issueDate, dueDate, invoiceStatus, client_id || null, project_id || null, notes || null, currency || 'USD', id]
    );

    const [updatedInvoice] = await query(`SELECT * FROM receivables WHERE id = ?`, [id]);
    return NextResponse.json(updatedInvoice);
  } catch (error: any) {
    console.error('API Error in Receivables PUT:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if invoice exists
    const invCheck = await query(`SELECT id FROM receivables WHERE id = ?`, [id]);
    if (invCheck.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Delete invoice
    await query(`DELETE FROM receivables WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('API Error in Receivables DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
