'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CreditCard, CheckCircle2, AlertTriangle, Briefcase, User } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatLocalDateCompact } from '@/lib/date';

interface PublicInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  issue_date: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  currency: string;
  notes?: string | null;
  clientName?: string | null;
  clientCompany?: string | null;
  projectName?: string | null;
}

export default function PublicPaymentPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchInvoice() {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/invoices/${params.token}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Impossible de charger la facture.');
      }

      setInvoice(json);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la facture.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoice();
  }, [params.token]);

  async function handlePayNow() {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/invoices/${params.token}/checkout`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Impossible de créer la session de paiement.');
      }

      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer le paiement.');
      setSubmitting(false);
    }
  }

  const status = searchParams.get('status');

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(59,130,246,0.16), transparent 35%), #050811', padding: '24px 16px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Paiement de facture</h1>
            <p>Régler votre facture en ligne de manière sécurisée avec Stripe.</p>
          </div>

          {status === 'success' && (
            <div className="badge badge-success" style={{ width: 'fit-content' }}>
              <CheckCircle2 size={14} /> Paiement confirmé. Vérification en cours...
            </div>
          )}

          {status === 'cancelled' && (
            <div className="badge badge-warning" style={{ width: 'fit-content' }}>
              <AlertTriangle size={14} /> Paiement annulé. Vous pouvez réessayer.
            </div>
          )}

          {loading ? (
            <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          ) : error ? (
            <div className="glass-panel" style={{ padding: '18px', borderColor: 'rgba(244, 63, 94, 0.2)', background: 'rgba(244, 63, 94, 0.06)' }}>
              <p style={{ color: '#fff' }}>{error}</p>
            </div>
          ) : invoice ? (
            <>
              <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Facture</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{invoice.invoice_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Montant restant</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                      {formatCurrency(invoice.remaining_amount, invoice.currency)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <User size={14} />
                    <span>{invoice.clientName || invoice.clientCompany || 'Client'}</span>
                  </div>
                  {invoice.projectName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                      <Briefcase size={14} />
                      <span>{invoice.projectName}</span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Émise le {formatLocalDateCompact(invoice.issue_date)} • Échéance le {formatLocalDateCompact(invoice.due_date)}
                  </div>
                  {invoice.notes && (
                    <div style={{ fontSize: '0.9rem', color: '#fff', opacity: 0.9 }}>
                      {invoice.notes}
                    </div>
                  )}
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px 20px', fontSize: '1rem' }}
                onClick={handlePayNow}
                disabled={submitting || invoice.remaining_amount <= 0}
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                {invoice.remaining_amount <= 0 ? 'Déjà réglée' : 'Payer maintenant'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
