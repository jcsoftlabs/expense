import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Fetch invoice info
    const invoices = await query(
      `SELECT * FROM receivables WHERE id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];

    // If already paid, return early with message
    if (invoice.status === 'PAID') {
      return NextResponse.json({ message: 'Invoice is already marked as Paid', invoice });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Perform updates
    // Update invoice status to PAID
    await query(
      `UPDATE receivables SET status = 'PAID' WHERE id = ?`,
      [id]
    );

    // 3. Inject corresponding INCOME transaction
    const txnId = crypto.randomUUID();
    const txnDescription = `Payment for Invoice #${invoice.invoice_number}${invoice.notes ? ` - ${invoice.notes}` : ''}`;
    
    // Choose appropriate category: e.g. "Freelance Dev" or "Consulting"
    const txnCategory = 'Freelance Dev';

    await query(
      `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency) VALUES (?, 'INCOME', ?, ?, ?, ?, ?, ?, ?)`,
      [
        txnId, 
        parseFloat(invoice.amount), 
        todayStr, 
        txnCategory, 
        txnDescription, 
        invoice.project_id || null, 
        invoice.client_id || null,
        invoice.currency || 'USD'
      ]
    );

    const [updatedInvoice] = await query(`SELECT * FROM receivables WHERE id = ?`, [id]);
    return NextResponse.json({
      success: true,
      message: 'Invoice marked as paid and income logged successfully.',
      invoice: updatedInvoice,
      transactionId: txnId
    });
  } catch (error: any) {
    console.error('API Error in Invoice Pay endpoint:', error);
    return NextResponse.json({ error: 'Failed to complete invoice payment processing' }, { status: 500 });
  }
}
