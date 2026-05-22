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
    let amountToPay = null;

    try {
      const body = await request.json();
      paymentMethod = body.paymentMethod || null;
      paymentDate = body.paymentDate || null;
      amountToPay = body.amountToPay !== undefined ? parseFloat(body.amountToPay) : null;
    } catch (e) {
      // Body may be empty
    }

    const amount = parseFloat(invoice.amount || 0);
    const currentPaid = parseFloat(invoice.paid_amount || 0);
    const remaining = amount - currentPaid;

    // Default to paying the remaining balance
    const actualAmountToPay = amountToPay !== null ? amountToPay : remaining;

    if (actualAmountToPay <= 0) {
      return NextResponse.json({ error: 'Montant à encaisser invalide.' }, { status: 400 });
    }

    if (actualAmountToPay > remaining + 0.01) {
      return NextResponse.json({ error: `Le montant à encaisser dépasse le solde restant (${remaining.toFixed(2)}).` }, { status: 400 });
    }

    const newPaidAmount = currentPaid + actualAmountToPay;
    const newStatus = newPaidAmount >= amount - 0.01 ? 'PAID' : 'PARTIAL';

    const todayStr = new Date().toISOString().split('T')[0];
    const actualPaymentDate = paymentDate || todayStr;

    // 2. Perform updates
    // Update invoice status, paid_amount and set payment method
    await query(
      `UPDATE receivables SET status = ?, paid_amount = ?, payment_method = ? WHERE id = ?`,
      [newStatus, newPaidAmount, paymentMethod, id]
    );

    // 3. Inject corresponding INCOME transaction
    const txnId = crypto.randomUUID();
    const isPartial = newStatus === 'PARTIAL';
    const txnDescription = `Paiement ${isPartial ? 'Partiel ' : ''}Facture #${invoice.invoice_number}${invoice.notes ? ` - ${invoice.notes}` : ''}`;
    
    // Choose appropriate category
    const txnCategory = 'Freelance Dev';

    await query(
      `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency, payment_method) VALUES (?, 'INCOME', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txnId, 
        actualAmountToPay, 
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
      message: isPartial 
        ? 'Acompte enregistré avec succès.' 
        : 'Facture soldée et enregistrée avec succès.',
      invoice: {
        ...updatedInvoice,
        amount: parseFloat(updatedInvoice.amount || 0),
        paid_amount: parseFloat(updatedInvoice.paid_amount || 0)
      },
      transactionId: txnId
    });
  } catch (error: any) {
    console.error('API Error in Invoice Pay endpoint:', error);
    return NextResponse.json({ error: 'Failed to complete invoice payment processing' }, { status: 500 });
  }
}
