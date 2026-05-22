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

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    project_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [txnsRes, clientsRes, projectsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/clients'),
        fetch('/api/projects')
      ]);

      if (!txnsRes.ok || !clientsRes.ok || !projectsRes.ok) {
        throw new Error('Erreur lors du chargement des données.');
      }

      const txnsJson = await txnsRes.json();
      const clientsJson = await clientsRes.json();
      const projectsJson = await projectsRes.json();

      setTransactions(txnsJson);
      setClients(clientsJson);
      setProjects(projectsJson);
    } catch (err: any) {
      setError(err.message || 'Impossible de se connecter aux API.');
    } finally {
      setLoading(false);
    }
  }

  // Handle transaction creation
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
          project_id: formData.project_id || null
        })
      });

      if (!res.ok) throw new Error("Erreur lors de la création de la transaction");

      setIsModalOpen(false);
      // Reset form
      setFormData({
        type: 'INCOME',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Freelance Dev',
        description: '',
        currency: 'USD',
        client_id: '',
        project_id: ''
      });
      
      // Reload list
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle transaction deletion
  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Impossible de supprimer la transaction.');
      
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Handle category type toggling in modal
  function handleTypeToggle(type: 'INCOME' | 'EXPENSE') {
    setFormData({
      ...formData,
      type,
      category: type === 'INCOME' ? CATEGORIES.INCOME[0] : CATEGORIES.EXPENSE[0]
    });
  }

  // Filter computations
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
      {/* Header section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', marginBottom: '6px' }}>Journal Financier</h1>
          <p>Consultez, filtrez et gérez vos encaissements et décaissements professionnels en USD et HTG.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Ajouter transaction
        </button>
      </header>

      {/* Filter and search control bar */}
      <section className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '30px' }}>
        {/* Toggle type filters */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          <button 
            className={`btn`} 
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '6px', background: filterType === 'ALL' ? 'var(--primary)' : 'transparent', color: '#ffffff' }}
            onClick={() => setFilterType('ALL')}
          >
            Tous
          </button>
          <button 
            className={`btn`} 
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '6px', background: filterType === 'INCOME' ? 'var(--success)' : 'transparent', color: '#ffffff' }}
            onClick={() => setFilterType('INCOME')}
          >
            Revenus
          </button>
          <button 
            className={`btn`} 
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '6px', background: filterType === 'EXPENSE' ? 'var(--danger)' : 'transparent', color: '#ffffff' }}
            onClick={() => setFilterType('EXPENSE')}
          >
            Dépenses
          </button>
        </div>

        {/* Text search */}
        <div style={{ position: 'relative', minWidth: '280px', flexGrow: 1, maxWidth: '400px' }}>
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
      </section>

      {/* Transaction Journal Table */}
      <section className="glass-panel" style={{ overflow: 'hidden' }}>
        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dark)' }}>
            Aucune transaction ne correspond à vos critères.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Date</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Description</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Catégorie</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Projet & Client</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', textAlign: 'right' }}>Montant</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'var(--transition-fast)' }} className="table-row-hover">
                    {/* Date */}
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={15} color="var(--text-dark)" />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {new Date(t.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: '600', color: '#ffffff' }}>{t.description}</span>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Tag size={13} color="var(--text-dark)" />
                        <span>{t.category}</span>
                      </div>
                    </td>

                    {/* Project & Client linkage */}
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {t.projectName && (
                          <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: '500' }}>
                            <Briefcase size={12} /> {t.projectName}
                          </span>
                        )}
                        {t.clientName && (
                          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                            <User size={12} /> {t.clientName}
                          </span>
                        )}
                        {!t.projectName && !t.clientName && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>Aucun lien</span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        fontWeight: '800', 
                        fontSize: '0.98rem',
                        color: t.type === 'INCOME' ? 'var(--success)' : '#ffffff' 
                      }}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', padding: '6px' }}
                        className="delete-icon-btn"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Transaction Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Enregistrer une transaction</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Type selector toggle */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                <button 
                  type="button"
                  className={`btn`}
                  style={{ 
                    flex: 1, 
                    border: '1px solid var(--border-glass)',
                    background: formData.type === 'INCOME' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: formData.type === 'INCOME' ? 'var(--success)' : 'var(--text-muted)',
                    borderColor: formData.type === 'INCOME' ? 'var(--success)' : 'var(--border-glass)'
                  }}
                  onClick={() => handleTypeToggle('INCOME')}
                >
                  <ArrowUpRight size={16} /> Revenu (Entrée)
                </button>
                <button 
                  type="button"
                  className={`btn`}
                  style={{ 
                    flex: 1, 
                    border: '1px solid var(--border-glass)',
                    background: formData.type === 'EXPENSE' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                    color: formData.type === 'EXPENSE' ? 'var(--danger)' : 'var(--text-muted)',
                    borderColor: formData.type === 'EXPENSE' ? 'var(--danger)' : 'var(--border-glass)'
                  }}
                  onClick={() => handleTypeToggle('EXPENSE')}
                >
                  <ArrowDownRight size={16} /> Dépense (Sortie)
                </button>
              </div>

              {/* Devise (Currency) Selection */}
              <div className="input-group">
                <label className="input-label">Devise de transaction *</label>
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

              {/* Amount & Date inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <div className="input-group">
                  <label className="input-label">Date *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="input-group">
                <label className="input-label">Catégorie *</label>
                <select 
                  className="form-select" 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES[formData.type].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Project & Client selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Lier à un projet</label>
                  <select 
                    className="form-select"
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  >
                    <option value="">Aucun projet</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Lier à un client</label>
                  <select 
                    className="form-select"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  >
                    <option value="">Aucun client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description Input */}
              <div className="input-group">
                <label className="input-label">Description *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Serveur d'API AWS, Acompte client..." 
                  className="form-input" 
                  required 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
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

      {/* Styled JSX local hover states */}
      <style jsx global>{`
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        .delete-icon-btn:hover {
          color: var(--danger) !important;
          filter: drop-shadow(0 0 5px rgba(244,63,94,0.3));
        }
      `}</style>
    </div>
  );
}
