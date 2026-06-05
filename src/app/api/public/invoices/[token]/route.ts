import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
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

    return NextResponse.json({
      ...invoice,
      amount,
      paid_amount: paidAmount,
      remaining_amount: Math.max(amount - paidAmount, 0),
    });
  } catch (error: any) {
    console.error('API Error in public invoice GET:', error);
    return NextResponse.json({ error: 'Failed to retrieve invoice' }, { status: 500 });
  }
}
