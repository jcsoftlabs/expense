'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Loader2,
  X,
  FileText,
  User,
  Briefcase
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface Receivable {
  id: string;
  invoice_number: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  currency: string;
  client_id?: string;
  project_id?: string;
  clientName?: string;
  projectName?: string;
  clientCompany?: string;
  notes?: string;
  payment_method?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

export default function Receivables() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter tabs
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days out default
    client_id: '',
    project_id: '',
    currency: 'USD' as 'USD' | 'HTG',
    notes: ''
  });

  // Pay Invoice Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [recRes, clientsRes, projectsRes] = await Promise.all([
        fetch('/api/receivables'),
        fetch('/api/clients'),
        fetch('/api/projects')
      ]);

      if (!recRes.ok || !clientsRes.ok || !projectsRes.ok) {
        throw new Error('Erreur lors du chargement des factures');
      }

      const recJson = await recRes.json();
      const clientsJson = await clientsRes.json();
      const projectsJson = await projectsRes.json();

      setReceivables(recJson);
      setClients(clientsJson);
      setProjects(projectsJson);

      // Auto-suggest next invoice number based on size
      const count = recJson.length + 1;
      const formattedNum = `INV-2026-${count.toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, invoice_number: formattedNum }));
    } catch (err: any) {
      setError(err.message || 'Impossible de se connecter aux API.');
    } finally {
      setLoading(false);
    }
  }

  // Handle invoice payment activation opening modal
  const openPayModal = (id: string) => {
    setPayingInvoiceId(id);
    setPayMethod('CASH');
    setPayDate(new Date().toISOString().split('T')[0]);
    setIsPayModalOpen(true);
  };

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingInvoiceId) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/receivables/${payingInvoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethod,
          paymentDate: payDate
        })
      });

      if (!res.ok) throw new Error('Erreur lors de la validation du paiement.');

      await res.json();
      setIsPayModalOpen(false);
      setPayingInvoiceId(null);
      fetchData(); // reload
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle invoice creation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.invoice_number || !formData.amount || !formData.issue_date || !formData.due_date || !formData.client_id) {
      alert('Veuillez remplir tous les champs requis, y compris le client.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/receivables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          project_id: formData.project_id || null
        })
      });

      if (!res.ok) throw new Error("Erreur lors de la création de la facture");

      setIsModalOpen(false);
      // Reset form (retaining next invoice calculation and dates)
      setFormData({
        invoice_number: '',
        amount: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        client_id: '',
        project_id: '',
        currency: 'USD',
        notes: ''
      });
      fetchData(); // reload
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle invoice deletion
  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;

    try {
      const res = await fetch(`/api/receivables/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Impossible de supprimer la facture.');
      
      setReceivables(receivables.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Filter computation
  const filteredReceivables = receivables.filter(r => {
    if (activeTab === 'ALL') return true;
    return r.status === activeTab;
  });

  if (loading && receivables.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '15px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p>Lecture du registre de facturation...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', marginBottom: '6px' }}>Comptes à Recevoir & Factures</h1>
          <p>Suivez vos prestations facturées, gérez les relances en USD/HTG et encaissez vos paiements.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Émettre une facture
        </button>
      </header>

      {/* Filter Tabs */}
      <section style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '30px', flexWrap: 'wrap' }}>
        {['ALL', 'PENDING', 'OVERDUE', 'PAID'].map((status) => {
          const count = receivables.filter(r => status === 'ALL' || r.status === status).length;
          const labels: { [key: string]: string } = {
            ALL: 'Toutes',
            PENDING: 'En Attente',
            OVERDUE: 'En Retard',
            PAID: 'Payées'
          };
          
          return (
            <button
              key={status}
              className={`btn`}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: '20px',
                background: activeTab === status ? 'var(--primary-glow)' : 'transparent',
                borderColor: activeTab === status ? 'var(--primary)' : 'transparent',
                color: activeTab === status ? '#ffffff' : 'var(--text-muted)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              onClick={() => setActiveTab(status)}
            >
              {labels[status]} ({count})
            </button>
          );
        })}
      </section>

      {/* Invoice Card Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {filteredReceivables.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '50px 20px', textAlign: 'center', color: 'var(--text-dark)' }} className="glass-panel">
            Aucune facture ne correspond à ce filtre.
          </div>
        ) : (
          filteredReceivables.map((inv) => {
            const isOverdue = inv.status === 'OVERDUE';
            return (
              <div 
                key={inv.id} 
                className={`glass-panel ${isOverdue ? 'pulse-overdue' : ''}`}
                style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '20px',
                  background: isOverdue ? 'rgba(244, 63, 94, 0.03)' : 'var(--bg-surface)'
                }}
              >
                {/* Top Info */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)'
                      }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.98rem' }}>{inv.invoice_number}</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dark)' }}>
                          Émise le {new Date(inv.issue_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <span className={`badge ${
                      inv.status === 'PAID' ? 'badge-success' : isOverdue ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {inv.status === 'PAID' ? 'Payée' : isOverdue ? 'En retard' : 'En attente'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '20px 0 10px 0' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
                      {formatCurrency(inv.amount, inv.currency)}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <User size={13} color="var(--text-dark)" />
                      <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{inv.clientName}</span>
                      {inv.clientCompany && <span style={{ color: 'var(--text-dark)' }}>({inv.clientCompany})</span>}
                    </div>

                    {inv.projectName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--primary)' }}>
                        <Briefcase size={13} />
                        <span>{inv.projectName}</span>
                      </div>
                    )}

                    {inv.notes && (
                      <p style={{ fontSize: '0.8rem', marginTop: '8px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        "{inv.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                    <Clock size={12} />
                    <span>Échéance: {new Date(inv.due_date).toLocaleDateString('fr-FR')}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {inv.status !== 'PAID' ? (
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px' }}
                        onClick={() => openPayModal(inv.id)}
                      >
                        <CheckCircle2 size={13} /> Encaisser
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                          <CheckCircle2 size={13} /> Rapprochée
                        </span>
                        {inv.payment_method && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {inv.payment_method === 'CASH' && '💵 Espèces'}
                            {inv.payment_method === 'VIREMENT' && '🏦 Virement'}
                            {inv.payment_method === 'CHEQUE' && '✍️ Chèque'}
                            {inv.payment_method === 'MOBILE_MONEY' && '📱 Mobile'}
                          </span>
                        )}
                      </div>
                    )}

                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', padding: '6px' }}
                      className="delete-icon-btn"
                      onClick={() => handleDelete(inv.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Add Invoice Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Créer une facture</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Devise (Currency) Selection */}
              <div className="input-group">
                <label className="input-label">Devise de facturation *</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="currency" 
                      value="USD" 
                      checked={formData.currency === 'USD'}
                      onChange={() => setFormData({ ...formData, currency: 'USD' })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span>Dollar Américain (USD - $)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="currency" 
                      value="HTG" 
                      checked={formData.currency === 'HTG'}
                      onChange={() => setFormData({ ...formData, currency: 'HTG' })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span>Gourde Haïtienne (HTG - G)</span>
                  </label>
                </div>
              </div>

              {/* Number and Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Numéro de Facture *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: INV-2026-001" 
                    className="form-input" 
                    required 
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Montant ({formData.currency}) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="form-input" 
                    required 
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Date d'émission *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required 
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Date d'échéance *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required 
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Client Selector (Required) */}
              <div className="input-group">
                <label className="input-label">Client destinataire *</label>
                <select 
                  className="form-select"
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                >
                  <option value="">Sélectionner un client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Project Selector (Optional) */}
              <div className="input-group">
                <label className="input-label">Associer à un projet</label>
                <select 
                  className="form-select"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">Aucun projet lié</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes Input */}
              <div className="input-group">
                <label className="input-label">Notes de facturation</label>
                <textarea 
                  placeholder="Ex: Facturation Phase 1, Développement frontend..." 
                  className="form-textarea" 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Création...' : 'Créer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Invoice Modal Dialog */}
      {isPayModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Encaisser la Facture</h3>
              <button className="modal-close" onClick={() => setIsPayModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitPayment}>
              {/* Payment Method Selector */}
              <div className="input-group">
                <label className="input-label">Moyen de paiement *</label>
                <select 
                  className="form-select"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  required
                >
                  <option value="CASH">💵 Espèces (Cash)</option>
                  <option value="VIREMENT">🏦 Virement Bancaire</option>
                  <option value="CHEQUE">✍️ Chèque</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money (MonCash/Natcash)</option>
                </select>
              </div>

              {/* Payment Date */}
              <div className="input-group">
                <label className="input-label">Date de paiement réelle *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  required 
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '25px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? 'Encaissement...' : 'Confirmer l\'encaissement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled JSX local hover states */}
      <style jsx global>{`
        .delete-icon-btn:hover {
          color: var(--danger) !important;
          filter: drop-shadow(0 0 5px rgba(244,63,94,0.3));
        }
      `}</style>
    </div>
  );
}
