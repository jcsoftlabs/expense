'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CreditCard, CheckCircle2, AlertTriangle, Briefcase, User } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatLocalDateCompact } from '@/lib/date';
import { estimateStripeFeeCoverage } from '@/lib/stripe-fees';

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
  const [amountToPay, setAmountToPay] = useState('');
  const [coverStripeFees, setCoverStripeFees] = useState(true);

  function applySuggestedAmount(value: number) {
    setAmountToPay(value.toFixed(2));
  }

  async function fetchInvoice() {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/invoices/${params.token}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Impossible de charger la facture.');
      }

      setInvoice(json);
      setAmountToPay(json.remaining_amount?.toFixed(2) || '');
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
      setError(null);
      const parsedAmount = parseFloat(amountToPay);

      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Veuillez saisir un montant valide.');
      }

      if (invoice && parsedAmount > invoice.remaining_amount + 0.01) {
        throw new Error('Le montant dépasse le solde restant.');
      }

      const res = await fetch(`/api/public/invoices/${params.token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountToPay: parsedAmount,
          coverStripeFees,
        }),
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
  const parsedAmountToPay = parseFloat(amountToPay);
  const feeEstimate = invoice && Number.isFinite(parsedAmountToPay) && parsedAmountToPay > 0
    ? estimateStripeFeeCoverage(parsedAmountToPay, invoice.currency)
    : null;
  const stripeFeeAmount = coverStripeFees && feeEstimate ? feeEstimate.feeAmount : 0;
  const checkoutTotal = coverStripeFees && feeEstimate ? feeEstimate.totalAmount : (Number.isFinite(parsedAmountToPay) ? parsedAmountToPay : 0);

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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Montant total</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(invoice.amount, invoice.currency)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Déjà payé</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(invoice.paid_amount, invoice.currency)}</div>
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

              <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Paiement partiel activé</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                    Choisissez vous-même le montant à payer maintenant
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Montant à payer maintenant ({invoice.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    max={invoice.remaining_amount}
                    className="form-input"
                    value={amountToPay}
                    onChange={(e) => setAmountToPay(e.target.value)}
                  />
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Vous pouvez payer un acompte ou régler le solde complet. Maximum : {formatCurrency(invoice.remaining_amount, invoice.currency)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minWidth: 'unset', padding: '10px 14px' }}
                    onClick={() => applySuggestedAmount(invoice.remaining_amount * 0.25)}
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minWidth: 'unset', padding: '10px 14px' }}
                    onClick={() => applySuggestedAmount(invoice.remaining_amount * 0.5)}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minWidth: 'unset', padding: '10px 14px' }}
                    onClick={() => applySuggestedAmount(invoice.remaining_amount)}
                  >
                    Solde complet
                  </button>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginTop: '16px',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={coverStripeFees}
                    onChange={(e) => setCoverStripeFees(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Couvrir les frais Stripe</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Ajoute un petit supplément pour que le montant net reçu corresponde au montant de facture choisi.
                    </span>
                  </span>
                </label>

                {feeEstimate && parsedAmountToPay > 0 && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      display: 'grid',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Montant facture</span>
                      <strong>{formatCurrency(parsedAmountToPay, invoice.currency)}</strong>
                    </div>
                    {coverStripeFees && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Supplément frais Stripe</span>
                        <strong>{formatCurrency(stripeFeeAmount, invoice.currency)}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>Total à payer</span>
                      <strong style={{ color: 'var(--primary)' }}>{formatCurrency(checkoutTotal, invoice.currency)}</strong>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px 20px', fontSize: '1rem' }}
                onClick={handlePayNow}
                disabled={submitting || invoice.remaining_amount <= 0 || !amountToPay}
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                {invoice.remaining_amount <= 0 ? 'Déjà réglée' : `Payer ${Number.isFinite(checkoutTotal) && checkoutTotal > 0 ? checkoutTotal.toFixed(2) : amountToPay} ${invoice.currency}`}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
