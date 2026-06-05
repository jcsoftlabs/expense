import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { appBaseUrl, getStripe, toStripeAmount } from '@/lib/stripe';

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const invoices = await query(
      `SELECT r.*, c.name as clientName, c.company as clientCompany, c.email as clientEmail, p.name as projectName
       FROM receivables r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.public_payment_token = ?
       LIMIT 1`,
      [token]
    );

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];
    const amount = parseFloat(invoice.amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || 0);
    const remainingAmount = Math.max(amount - paidAmount, 0);

    if (invoice.status === 'PAID' || remainingAmount <= 0) {
      return NextResponse.json({ error: 'Invoice is already fully paid.' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${appBaseUrl()}/pay/${token}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl()}/pay/${token}?status=cancelled`,
      locale: 'fr',
      customer_email: invoice.clientEmail || undefined,
      client_reference_id: invoice.id,
      metadata: {
        receivable_id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id || '',
        project_id: invoice.project_id || '',
        public_payment_token: token,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (invoice.currency || 'USD').toLowerCase(),
            unit_amount: toStripeAmount(remainingAmount, invoice.currency || 'USD'),
            product_data: {
              name: `Facture ${invoice.invoice_number}`,
              description: invoice.projectName
                ? `${invoice.clientName || 'Client'} • ${invoice.projectName}`
                : (invoice.clientName || invoice.clientCompany || 'Facture client'),
            },
          },
        },
      ],
    });

    await query(
      `UPDATE receivables
       SET stripe_checkout_session_id = ?, stripe_payment_status = ?
       WHERE id = ?`,
      [session.id, 'pending', invoice.id]
    );

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('API Error in public invoice checkout POST:', error);
    return NextResponse.json({ error: error.message || 'Failed to create Stripe Checkout session' }, { status: 500 });
  }
}
