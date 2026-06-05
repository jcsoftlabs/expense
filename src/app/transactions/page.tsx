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
import { formatLocalDate, formatLocalDateCompact } from '@/lib/date';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';



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
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Client-side Sorting States
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  async function fetchData(silent = false) {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }

  const { pullDistance, isRefreshing, isPulling } = usePullToRefresh({
    onRefresh: async () => {
      await fetchData(true);
    }
  });


  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchData(); }, [startDate, endDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.amount || !formData.date || !formData.category || !formData.description) {
      showToast('Veuillez remplir tous les champs requis', 'warning');
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
      showToast('Transaction enregistrée avec succès !', 'success');
      setIsModalOpen(false);
      setFormData({ type: 'INCOME', amount: '', date: new Date().toISOString().split('T')[0], category: 'Freelance Dev', description: '', currency: 'USD', client_id: '', project_id: '', payment_method: '' });
      fetchData();
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

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/transactions/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de supprimer la transaction.');
      showToast('Transaction supprimée avec succès !', 'success');
      setTransactions(transactions.filter(t => t.id !== deleteId));
    } catch (err: any) {
      showToast(err.message || 'Impossible de supprimer la transaction.', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteId(null);
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

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    } else {
      return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    }
  });

  if (loading && transactions.length === 0) {
    return (
      <div>
        {/* Header Skeleton */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div className="skeleton" style={{ width: '240px', height: '36px', marginBottom: '8px' }}></div>
            <div className="skeleton" style={{ width: '400px', height: '16px' }}></div>
          </div>
          <div className="skeleton" style={{ width: '180px', height: '40px', borderRadius: '8px' }}></div>
        </header>

        {/* Filter Skeleton */}
        <div className="skeleton-card" style={{ padding: '20px', minHeight: '120px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div className="skeleton" style={{ width: '220px', height: '38px', borderRadius: '8px' }}></div>
            <div className="skeleton" style={{ width: '300px', height: '38px', borderRadius: '8px' }}></div>
          </div>
          <div className="skeleton" style={{ width: '100%', height: '1px' }}></div>
        </div>

        {/* List Skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="skeleton-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line lg" style={{ marginBottom: '8px' }}></div>
                  <div className="skeleton-line sm" style={{ width: '40%' }}></div>
                </div>
                <div className="skeleton" style={{ width: '100px', height: '24px', borderRadius: '6px' }}></div>
              </div>
            </div>
          ))}
        </div>
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
            {isRefreshing ? 'Actualisation du journal...' : 'Tirez pour rafraîchir'}
          </span>
        </div>
      )}

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
          <div className="mobile-scroll-x">
            <div className="mobile-scroll-x-content" style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)', flexWrap: 'nowrap' }}>
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

          {/* Interactive Sorting Controls */}
          <div className="mobile-scroll-x">
            <div className="mobile-scroll-x-content" style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'nowrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Trier par :</span>
            <button
              type="button"
              className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
            >
              Date {sortBy === 'date' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
            </button>
            <button
              type="button"
              className={`sort-btn ${sortBy === 'amount' ? 'active' : ''}`}
              onClick={() => {
                if (sortBy === 'amount') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('amount');
                  setSortOrder('desc');
                }
              }}
            >
              Montant {sortBy === 'amount' ? (sortOrder === 'desc' ? '▼' : '▲') : '⇅'}
            </button>
            </div>
          </div>
        </div>
      </section>

      {/* ——————————————————————————————————————————
          DUAL MODE: Table (desktop) / Cards (mobile)
      —————————————————————————————————————————— */}
      <section>
        {sortedTransactions.length === 0 ? (
          <div className="empty-state glass-panel" style={{ padding: '60px 24px' }}>
            <div className="empty-state-icon">
              <Tag size={28} />
            </div>
            <h4 className="empty-state-title">Aucune transaction</h4>
            <p className="empty-state-subtitle">
              {transactions.length === 0 
                ? "Commencez à suivre vos finances en ajoutant votre première entrée ou dépense."
                : "Aucune opération ne correspond à vos critères de recherche ou de filtrage."
              }
            </p>
            {transactions.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={() => setIsModalOpen(true)}>
                Ajouter transaction
              </button>
            )}
          </div>

        ) : isMobile ? (
          /* ═══════════════════════════════
             📱 MOBILE — Vue en Cartes
          ═══════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedTransactions.map((t) => (
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
                      onClick={() => confirmDelete(t.id)}
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
                <p className="mobile-wrap-anywhere" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px', lineHeight: 1.3 }}>
                  {t.description}
                </p>

                {/* Row 3: Meta chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Calendar size={11} />
                    {formatLocalDate(t.date, { day: '2-digit', month: 'short', year: 'numeric' })}
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
                  {sortedTransactions.map((t) => (
                    <tr key={t.id} className="tx-table-row" style={{ borderBottom: '1px solid var(--border-glass)', transition: 'var(--transition-fast)' }}>
                      <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={15} color="var(--text-dark)" />
                          <span style={{ fontSize: '0.9rem' }}>{formatLocalDateCompact(t.date)}</span>
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
                        <button className="delete-icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', padding: '6px' }} onClick={() => confirmDelete(t.id)}>
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
              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <select 
                  className="form-select" 
                  value={CATEGORIES[formData.type].includes(formData.category) ? formData.category : 'Autre'} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Autre') {
                      setFormData({ ...formData, category: 'Autre' });
                    } else {
                      setFormData({ ...formData, category: val });
                    }
                  }}
                >
                  {CATEGORIES[formData.type].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Custom Category Input */}
              {(!CATEGORIES[formData.type].includes(formData.category) || formData.category === 'Autre') && (
                <div className="input-group" style={{ 
                  marginTop: '12px',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <label className="input-label">Nom de la catégorie personnalisée *</label>
                  <input 
                    type="text" 
                    placeholder="Saisissez votre propre catégorie (ex: Assurance, Internet...)" 
                    className="form-input" 
                    required 
                    value={formData.category === 'Autre' ? '' : formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value || 'Autre' })} 
                  />
                </div>
              )}

              {/* Project & Client */}
              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Supprimer la transaction ?"
        message="Cette action est irréversible et supprimera définitivement cette transaction de vos livres comptables."
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
