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

    let paymentMethod = null;
    let paymentDate = null;

    try {
      const body = await request.json();
      paymentMethod = body.paymentMethod || null;
      paymentDate = body.paymentDate || null;
    } catch (e) {
      // Body may be empty
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const actualPaymentDate = paymentDate || todayStr;

    // 2. Perform updates
    // Update invoice status to PAID and set payment method
    await query(
      `UPDATE receivables SET status = 'PAID', payment_method = ? WHERE id = ?`,
      [paymentMethod, id]
    );

    // 3. Inject corresponding INCOME transaction
    const txnId = crypto.randomUUID();
    const txnDescription = `Paiement Facture #${invoice.invoice_number}${invoice.notes ? ` - ${invoice.notes}` : ''}`;
    
    // Choose appropriate category
    const txnCategory = 'Freelance Dev';

    await query(
      `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency, payment_method) VALUES (?, 'INCOME', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txnId, 
        parseFloat(invoice.amount), 
        actualPaymentDate, 
        txnCategory, 
        txnDescription, 
        invoice.project_id || null, 
        invoice.client_id || null,
        invoice.currency || 'USD',
        paymentMethod
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
