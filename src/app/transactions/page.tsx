'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  Loader2,
  Calendar,
  X,
  Tag,
  Briefcase,
  User
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  category: string;
  description: string;
  currency: string;
  project_id?: string;
  client_id?: string;
  projectName?: string;
  clientName?: string;
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

const CATEGORIES = {
  INCOME: ['Freelance Dev', 'Consulting', 'Maintenance', 'SaaS Revenue', 'Autre'],
  EXPENSE: ['Hosting/Cloud', 'SaaS Subscriptions', 'Hardware', 'Office', 'Travel', 'Marketing', 'Taxes', 'Autre']
};

function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    CASH:         { label: '💵 Espèces',      color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    VIREMENT:     { label: '🏦 Virement',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    CHEQUE:       { label: '✍️ Chèque',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    MOBILE_MONEY: { label: '📱 Mobile Money', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  };
  const m = map[method] ?? { label: method, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)' };
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 600,
      padding: '2px 8px', borderRadius: '5px',
      background: m.bg, color: m.color,
      display: 'inline-block', whiteSpace: 'nowrap'
    }}>
      {m.label}
    </span>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Responsive mode detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Freelance Dev',
    description: '',
    currency: 'USD' as 'USD' | 'HTG',
    client_id: '',
    project_id: '',
    payment_method: ''
  });

  async function fetchData() {
    try {
      setLoading(true);
      let txnsUrl = '/api/transactions';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) txnsUrl += `?${params.toString()}`;

      const [txnsRes, clientsRes, projectsRes] = await Promise.all([
        fetch(txnsUrl),
        fetch('/api/clients'),
        fetch('/api/projects')
      ]);

      if (!txnsRes.ok || !clientsRes.ok || !projectsRes.ok)
        throw new Error('Erreur lors du chargement des données.');

      setTransactions(await txnsRes.json());
      setClients(await clientsRes.json());
      setProjects(await projectsRes.json());
    } catch (err: any) {
      setError(err.message || 'Impossible de se connecter aux API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchData(); }, [startDate, endDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.amount || !formData.date || !formData.category || !formData.description) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          client_id: formData.client_id || null,
          project_id: formData.project_id || null,
          payment_method: formData.payment_method || null
        })
      });
      if (!res.ok) throw new Error('Erreur lors de la création de la transaction');
      setIsModalOpen(false);
      setFormData({ type: 'INCOME', amount: '', date: new Date().toISOString().split('T')[0], category: 'Freelance Dev', description: '', currency: 'USD', client_id: '', project_id: '', payment_method: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de supprimer la transaction.');
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  function handleTypeToggle(type: 'INCOME' | 'EXPENSE') {
    setFormData({ ...formData, type, category: type === 'INCOME' ? CATEGORIES.INCOME[0] : CATEGORIES.EXPENSE[0] });
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.projectName && t.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.clientName && t.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  if (loading && transactions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '15px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p>Lecture du grand livre...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', marginBottom: '6px' }}>Journal Financier</h1>
          <p>Consultez, filtrez et gérez vos encaissements et décaissements professionnels.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Ajouter transaction
        </button>
      </header>

      {/* Filter & Search bar */}
      <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map(type => (
              <button
                key={type}
                className="btn"
                style={{
                  padding: '8px 16px', fontSize: '0.85rem', borderRadius: '6px', color: '#ffffff',
                  background: filterType === type
                    ? (type === 'INCOME' ? 'var(--success)' : type === 'EXPENSE' ? 'var(--danger)' : 'var(--primary)')
                    : 'transparent'
                }}
                onClick={() => setFilterType(type)}
              >
                {type === 'ALL' ? 'Tous' : type === 'INCOME' ? 'Revenus' : 'Dépenses'}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: '260px', flexGrow: 1, maxWidth: '420px' }}>
            <Search size={18} color="var(--text-dark)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            <input
              type="text"
              placeholder="Rechercher description, projet, client..."
              className="form-input"
              style={{ paddingLeft: '45px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Du :</span>
            <input type="date" className="form-input" style={{ padding: '6px 10px', fontSize: '0.8rem', width: '140px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Au :</span>
            <input type="date" className="form-input" style={{ padding: '6px 10px', fontSize: '0.8rem', width: '140px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {(startDate || endDate) && (
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => { setStartDate(''); setEndDate(''); }}>
              Réinitialiser
            </button>
          )}
        </div>
      </section>

      {/* ——————————————————————————————————————————
          DUAL MODE: Table (desktop) / Cards (mobile)
      —————————————————————————————————————————— */}
      <section>
        {filteredTransactions.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dark)' }}>
            Aucune transaction ne correspond à vos critères.
          </div>

        ) : isMobile ? (
          /* ═══════════════════════════════
             📱 MOBILE — Vue en Cartes
          ═══════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredTransactions.map((t) => (
              <div
                key={t.id}
                className="glass-panel"
                style={{
                  padding: '14px 16px',
                  borderLeft: `3px solid ${t.type === 'INCOME' ? 'var(--success)' : 'var(--danger)'}`,
                  position: 'relative'
                }}
              >
                {/* Row 1: type badge + amount + delete */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      padding: '2px 7px', borderRadius: '4px',
                      background: t.type === 'INCOME' ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                      color: t.type === 'INCOME' ? 'var(--success)' : 'var(--danger)',
                      width: 'fit-content'
                    }}>
                      {t.type === 'INCOME' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {t.type === 'INCOME' ? 'Revenu' : 'Dépense'}
                    </span>
                    {t.payment_method && <PaymentBadge method={t.payment_method} />}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: t.type === 'INCOME' ? 'var(--success)' : '#ffffff' }}>
                      {t.type === 'INCOME' ? '+' : '−'}{formatCurrency(t.amount, t.currency)}
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{
                        background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.15)',
                        borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer',
                        padding: '5px 7px', display: 'flex', alignItems: 'center'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Description */}
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px', lineHeight: 1.3 }}>
                  {t.description}
                </p>

                {/* Row 3: Meta chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Calendar size={11} />
                    {new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Tag size={11} />
                    {t.category}
                  </span>
                  {t.projectName && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                      <Briefcase size={11} />
                      {t.projectName}
                    </span>
                  )}
                  {t.clientName && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <User size={11} />
                      {t.clientName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

        ) : (
          /* ═══════════════════════════════
             🖥️ DESKTOP — Vue en Tableau
          ═══════════════════════════════ */
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Date', 'Description', 'Catégorie', 'Projet & Client', 'Montant', 'Actions'].map((h, i) => (
                      <th key={h} style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, textAlign: i >= 4 ? (i === 4 ? 'right' : 'center') : 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="tx-table-row" style={{ borderBottom: '1px solid var(--border-glass)', transition: 'var(--transition-fast)' }}>
                      <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={15} color="var(--text-dark)" />
                          <span style={{ fontSize: '0.9rem' }}>{new Date(t.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>{t.description}</span>
                          {t.payment_method && <PaymentBadge method={t.payment_method} />}
                        </div>
                      </td>

                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Tag size={13} color="var(--text-dark)" />
                          <span>{t.category}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {t.projectName && <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: 500 }}><Briefcase size={12} /> {t.projectName}</span>}
                          {t.clientName && <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><User size={12} /> {t.clientName}</span>}
                          {!t.projectName && !t.clientName && <span style={{ fontSize: '0.78rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>Aucun lien</span>}
                        </div>
                      </td>

                      <td style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.98rem', color: t.type === 'INCOME' ? 'var(--success)' : '#ffffff' }}>
                          {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                        </span>
                      </td>

                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <button className="delete-icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', padding: '6px' }} onClick={() => handleDelete(t.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Enregistrer une transaction</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Type toggle */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                <button type="button" className="btn" style={{ flex: 1, border: '1px solid', background: formData.type === 'INCOME' ? 'rgba(16,185,129,0.15)' : 'transparent', color: formData.type === 'INCOME' ? 'var(--success)' : 'var(--text-muted)', borderColor: formData.type === 'INCOME' ? 'var(--success)' : 'var(--border-glass)' }} onClick={() => handleTypeToggle('INCOME')}>
                  <ArrowUpRight size={16} /> Revenu (Entrée)
                </button>
                <button type="button" className="btn" style={{ flex: 1, border: '1px solid', background: formData.type === 'EXPENSE' ? 'rgba(244,63,94,0.15)' : 'transparent', color: formData.type === 'EXPENSE' ? 'var(--danger)' : 'var(--text-muted)', borderColor: formData.type === 'EXPENSE' ? 'var(--danger)' : 'var(--border-glass)' }} onClick={() => handleTypeToggle('EXPENSE')}>
                  <ArrowDownRight size={16} /> Dépense (Sortie)
                </button>
              </div>

              {/* Currency */}
              <div className="input-group">
                <label className="input-label">Devise *</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {(['USD', 'HTG'] as const).map(c => (
                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="radio" name="currency" value={c} checked={formData.currency === c} onChange={() => setFormData({ ...formData, currency: c })} style={{ accentColor: 'var(--primary)' }} />
                      <span>{c === 'USD' ? 'Dollar Américain (USD)' : 'Gourde Haïtienne (HTG)'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Amount & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Montant ({formData.currency}) *</label>
                  <input type="number" step="0.01" placeholder="0.00" className="form-input" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Date *</label>
                  <input type="date" className="form-input" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>

              {/* Category */}
              <div className="input-group">
                <label className="input-label">Catégorie *</label>
                <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {CATEGORIES[formData.type].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Project & Client */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Projet</label>
                  <select className="form-select" value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}>
                    <option value="">Aucun projet</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Client</label>
                  <select className="form-select" value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}>
                    <option value="">Aucun client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="input-group">
                <label className="input-label">Description *</label>
                <input type="text" placeholder="Ex: Serveur AWS, Acompte client..." className="form-input" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              {/* Payment method */}
              <div className="input-group">
                <label className="input-label">Mode de paiement</label>
                <select className="form-select" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                  <option value="">Non spécifié / Autre</option>
                  <option value="CASH">💵 Espèces (Cash)</option>
                  <option value="VIREMENT">🏦 Virement Bancaire</option>
                  <option value="CHEQUE">✍️ Chèque</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money (MonCash/Natcash)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .tx-table-row:hover { background: rgba(255,255,255,0.015); }
        .delete-icon-btn:hover { color: var(--danger) !important; filter: drop-shadow(0 0 5px rgba(244,63,94,0.3)); }
      `}</style>
    </div>
  );
}
