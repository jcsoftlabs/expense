import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { recordInvoicePayment } from '@/lib/receivables';

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

    const { invoice: updatedInvoice, transactionId } = await recordInvoicePayment({
      invoice,
      amountToPay: actualAmountToPay,
      paymentMethod,
      paymentDate,
      source: 'MANUAL',
    });

    const newPaidAmount = parseFloat(updatedInvoice.paid_amount || 0);
    const newStatus = updatedInvoice.status;
    const isPartial = newStatus === 'PARTIAL';

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
      transactionId
    });
  } catch (error: any) {
    console.error('API Error in Invoice Pay endpoint:', error);
    return NextResponse.json({ error: 'Failed to complete invoice payment processing' }, { status: 500 });
  }
}
