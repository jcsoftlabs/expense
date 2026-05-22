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
  Briefcase,
  Search
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatLocalDateCompact } from '@/lib/date';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';


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
  const { showToast } = useToast();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter tabs and search query
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  async function fetchData(silent = false) {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }

  const { pullDistance, isRefreshing, isPulling } = usePullToRefresh({
    onRefresh: async () => {
      await fetchData(true);
    }
  });


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
      showToast('Paiement enregistré avec succès !', 'success');
      setIsPayModalOpen(false);
      setPayingInvoiceId(null);
      fetchData(); // reload
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l\'encaissement.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle invoice creation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.invoice_number || !formData.amount || !formData.issue_date || !formData.due_date || !formData.client_id) {
      showToast('Veuillez remplir tous les champs requis, y compris le client.', 'warning');
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

      showToast('Facture créée avec succès !', 'success');
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
      showToast(err.message || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(id: string) {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  }

  // Handle invoice deletion
  async function handleDelete() {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/receivables/${deleteId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Impossible de supprimer la facture.');
      
      showToast('Facture supprimée avec succès !', 'success');
      setReceivables(receivables.filter(r => r.id !== deleteId));
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression.', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    }
  }

  // Filter and search computation
  const filteredReceivables = receivables.filter(r => {
    const matchesTab = activeTab === 'ALL' || r.status === activeTab;
    const matchesSearch = 
      r.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.clientName && r.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.projectName && r.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  if (loading && receivables.length === 0) {
    return (
      <div>
        {/* Header Skeleton */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div className="skeleton" style={{ width: '280px', height: '36px', marginBottom: '8px' }}></div>
            <div className="skeleton" style={{ width: '420px', height: '16px' }}></div>
          </div>
          <div className="skeleton" style={{ width: '160px', height: '40px', borderRadius: '8px' }}></div>
        </header>

        {/* Search Bar Skeleton */}
        <div className="skeleton" style={{ width: '100%', maxWidth: '480px', height: '42px', borderRadius: '8px', marginBottom: '24px' }}></div>

        {/* Tabs Skeleton */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="skeleton" style={{ width: '110px', height: '38px', borderRadius: '20px' }}></div>
          ))}
        </div>

        {/* Card Grid Skeleton */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {[1, 2, 3].map(idx => (
            <div key={idx} className="skeleton-card" style={{ minHeight: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px' }}></div>
                <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '6px' }}></div>
              </div>
              <div className="skeleton-line lg" style={{ marginBottom: '8px' }}></div>
              <div className="skeleton-line md" style={{ marginBottom: '8px' }}></div>
              <div className="skeleton-line sm" style={{ width: '60%' }}></div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Pull to Refresh Mobile Indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="ptr-indicator" 
          style={{ 
            height: `${pullDistance}px`, 
            opacity: pullDistance > 0 ? Math.min(pullDistance / 50, 1) : 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            transition: isPulling ? 'none' : 'height 0.2s ease, opacity 0.2s ease'
          }}
        >
          <Loader2 
            className="animate-spin" 
            size={16} 
            color="var(--primary)" 
            style={{ 
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              transform: isRefreshing ? 'none' : `rotate(${pullDistance * 6}deg)`
            }} 
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isRefreshing ? 'Actualisation des factures...' : 'Tirez pour rafraîchir'}
          </span>
        </div>
      )}

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

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '480px', width: '100%' }}>
        <Search size={18} color="var(--text-dark)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
        <input
          type="text"
          placeholder="Rechercher par numéro, client, projet, notes..."
          className="form-input"
          style={{ paddingLeft: '45px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

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
          <div style={{ gridColumn: '1 / -1' }} className="empty-state glass-panel">
            <div className="empty-state-icon">
              <FileText size={28} />
            </div>
            <h4 className="empty-state-title">Aucune facture</h4>
            <p className="empty-state-subtitle">
              {receivables.length === 0 
                ? "Créez votre première facture professionnelle pour commencer à suivre vos paiements."
                : "Aucune facture ne correspond à vos critères de recherche ou de filtrage."
              }
            </p>
            {receivables.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={() => setIsModalOpen(true)}>
                Émettre une facture
              </button>
            )}
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
                          Émise le {formatLocalDateCompact(inv.issue_date)}
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
                    <span>Échéance: {formatLocalDateCompact(inv.due_date)}</span>
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
                      onClick={() => confirmDelete(inv.id)}
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
              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Supprimer la facture ?"
        message="Cette action supprimera définitivement cette facture et toutes ses données associées de votre registre de facturation."
        confirmLabel="Supprimer"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
