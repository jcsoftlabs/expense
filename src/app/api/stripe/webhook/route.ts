import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { recordInvoicePayment } from '@/lib/receivables';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is missing.');
    }

    const stripe = getStripe();
    const payload = await request.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const receivableId = session.metadata?.receivable_id;

      if (receivableId) {
        const invoices = await query('SELECT * FROM receivables WHERE id = ? LIMIT 1', [receivableId]);

        if (invoices.length > 0) {
          const invoice = invoices[0];
          const metadataRequestedAmount = parseFloat(session.metadata?.requested_amount || '');
          const amountPaid = Number.isFinite(metadataRequestedAmount) && metadataRequestedAmount > 0
            ? metadataRequestedAmount
            : (session.amount_total || 0) / 100;
          const paymentDate = new Date((event.created || Math.floor(Date.now() / 1000)) * 1000)
            .toISOString()
            .split('T')[0];

          await recordInvoicePayment({
            invoice,
            amountToPay: amountPaid,
            paymentMethod: 'STRIPE',
            paymentDate,
            externalPaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            source: 'STRIPE',
          });

          await query(
            `UPDATE receivables
             SET stripe_checkout_session_id = ?, stripe_customer_email = ?, stripe_payment_status = ?
             WHERE id = ?`,
            [session.id, session.customer_details?.email || null, session.payment_status, receivableId]
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: error.message || 'Stripe webhook failed' }, { status: 400 });
  }
}
