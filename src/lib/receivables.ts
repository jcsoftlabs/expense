import crypto from 'crypto';
import { query } from '@/lib/db';

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: string | number;
  paid_amount: string | number;
  status: string;
  project_id?: string | null;
  client_id?: string | null;
  currency?: string | null;
  notes?: string | null;
  stripe_payment_intent_id?: string | null;
}

interface RecordInvoicePaymentInput {
  invoice: InvoiceRow;
  amountToPay: number;
  paymentMethod: string | null;
  paymentDate?: string | null;
  externalPaymentId?: string | null;
  source?: 'MANUAL' | 'STRIPE';
}

export async function recordInvoicePayment({
  invoice,
  amountToPay,
  paymentMethod,
  paymentDate,
  externalPaymentId,
  source = 'MANUAL',
}: RecordInvoicePaymentInput) {
  const amount = Number(invoice.amount || 0);
  const currentPaid = Number(invoice.paid_amount || 0);
  const remaining = amount - currentPaid;

  if (amountToPay <= 0) {
    throw new Error('Montant à encaisser invalide.');
  }

  if (amountToPay > remaining + 0.01) {
    throw new Error(`Le montant à encaisser dépasse le solde restant (${remaining.toFixed(2)}).`);
  }

  if (externalPaymentId && invoice.stripe_payment_intent_id === externalPaymentId) {
    const [existingInvoice] = await query('SELECT * FROM receivables WHERE id = ?', [invoice.id]);
    return {
      invoice: existingInvoice,
      transactionId: null,
      alreadyProcessed: true,
    };
  }

  const newPaidAmount = currentPaid + amountToPay;
  const newStatus = newPaidAmount >= amount - 0.01 ? 'PAID' : 'PARTIAL';
  const todayStr = new Date().toISOString().split('T')[0];
  const actualPaymentDate = paymentDate || todayStr;

  await query(
    `UPDATE receivables
     SET status = ?, paid_amount = ?, payment_method = ?, stripe_payment_intent_id = ?, stripe_payment_status = ?
     WHERE id = ?`,
    [
      newStatus,
      newPaidAmount,
      paymentMethod,
      externalPaymentId || null,
      source === 'STRIPE' ? 'paid' : null,
      invoice.id,
    ]
  );

  const txnId = crypto.randomUUID();
  const isPartial = newStatus === 'PARTIAL';
  const txnDescription = `Paiement ${isPartial ? 'Partiel ' : ''}Facture #${invoice.invoice_number}${invoice.notes ? ` - ${invoice.notes}` : ''}${source === 'STRIPE' ? ' (Stripe)' : ''}`;

  await query(
    `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency, payment_method)
     VALUES (?, 'INCOME', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      txnId,
      amountToPay,
      actualPaymentDate,
      'Freelance Dev',
      txnDescription,
      invoice.project_id || null,
      invoice.client_id || null,
      invoice.currency || 'USD',
      paymentMethod,
    ]
  );

  const [updatedInvoice] = await query('SELECT * FROM receivables WHERE id = ?', [invoice.id]);

  return {
    invoice: updatedInvoice,
    transactionId: txnId,
    alreadyProcessed: false,
  };
}

export function generatePublicPaymentToken() {
  return crypto.randomBytes(24).toString('hex');
}
