'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Loader2,
  X,
  User,
  Briefcase,
  AlertTriangle,
  Building,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';


interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'PIPELINE';
  client_id: string | null;
  budget: number;
  currency: 'USD' | 'HTG';
  clientName: string | null;
  clientCompany: string | null;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    budget: '',
    status: 'ACTIVE' as 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'PIPELINE',
    currency: 'USD' as 'USD' | 'HTG',
    created_at: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [projRes, clientsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients')
      ]);

      if (!projRes.ok || !clientsRes.ok) {
        throw new Error('Erreur lors du chargement des projets');
      }

      const projJson = await projRes.json();
      const clientsJson = await clientsRes.json();

      setProjects(projJson);
      setClients(clientsJson);
    } catch (err: any) {
      setError(err.message || 'Impossible de se connecter aux API.');
    } finally {
      setLoading(false);
    }
  }

  // Handle project creation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) {
      alert('Le nom du projet est requis');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : 0,
          client_id: formData.client_id || null,
          created_at: formData.created_at || null
        })
      });

      if (!res.ok) throw new Error("Erreur lors de la création du projet");

      setIsModalOpen(false);
      // Reset form
      setFormData({
        name: '',
        description: '',
        client_id: '',
        budget: '',
        status: 'ACTIVE',
        currency: 'USD',
        created_at: new Date().toISOString().split('T')[0]
      });
      fetchData(); // reload
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle project deletion
  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Les transactions associées ne seront pas supprimées, mais dissociées du projet.')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Impossible de supprimer le projet.');
      
      setProjects(projects.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading && projects.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '15px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p>Analyse de la rentabilité des projets...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', marginBottom: '6px' }}>Planificateur & Rentabilité Projets</h1>
          <p>Suivez l'avancement de vos projets techniques et analysez votre marge brute en temps réel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nouveau Projet
        </button>
      </header>

      {/* Projects Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        {projects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '50px 20px', textAlign: 'center', color: 'var(--text-dark)' }} className="glass-panel">
            Aucun projet enregistré pour le moment.
          </div>
        ) : (
          projects.map((p) => {
            const margin = p.profitMargin;
            const netProfit = p.netProfit;
            const isProfitable = netProfit >= 0;
            const hasActivity = p.totalRevenue > 0 || p.totalExpenses > 0;
            
            // Status labels & badges
            const statusLabels: { [key: string]: string } = {
              ACTIVE: 'Actif',
              COMPLETED: 'Terminé',
              ON_HOLD: 'En pause',
              PIPELINE: 'Opportunité'
            };
            const statusBadges: { [key: string]: string } = {
              ACTIVE: 'badge-warning',
              COMPLETED: 'badge-success',
              ON_HOLD: 'badge-danger',
              PIPELINE: 'badge-warning'
            };

            return (
              <div 
                key={p.id} 
                className="glass-panel card-hover-lift"
                style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  gap: '20px',
                  borderLeft: `3px solid ${isProfitable ? 'var(--success)' : 'var(--danger)'}`
                }}
              >
                {/* Header info */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
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
                        <Briefcase size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', color: '#ffffff' }}>{p.name}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px' }}>
                          {p.clientName && (
                            <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                              <User size={12} /> {p.clientName}
                            </span>
                          )}
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📅 Début : {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${statusBadges[p.status]}`}>
                      {statusLabels[p.status]}
                    </span>
                  </div>

                  {p.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: '1.4' }}>
                      {p.description}
                    </p>
                  )}

                  {/* Financial Metrics Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', background: 'rgba(0, 0, 0, 0.15)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    {/* Budget vs Revenue */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Budget Prévisionnel:</span>
                      <strong style={{ color: '#ffffff' }}>{formatCurrency(p.budget, p.currency)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingBottom: '8px', borderBottom: '1px dashed var(--border-glass)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Revenu encaissé (Milestones):</span>
                      <strong style={{ color: 'var(--success)' }}>+{formatCurrency(p.totalRevenue, p.currency)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Dépenses imputées:</span>
                      <strong style={{ color: 'var(--danger)' }}>-{formatCurrency(p.totalExpenses, p.currency)}</strong>
                    </div>
                  </div>
                </div>

                {/* Profitability margin indicator footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid var(--border-glass)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                      Rentabilité Nette
                    </span>
                    <span style={{ 
                      fontSize: '1.05rem', 
                      fontWeight: '800',
                      color: isProfitable ? 'var(--success)' : 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isProfitable ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {formatCurrency(netProfit, p.currency)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                        Marge Brute
                      </span>
                      <span style={{ 
                        fontSize: '0.98rem', 
                        fontWeight: '700', 
                        color: hasActivity ? (isProfitable ? 'var(--success)' : 'var(--danger)') : 'var(--text-dark)' 
                      }}>
                        {hasActivity ? `${margin.toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>

                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', padding: '6px' }}
                      className="delete-icon-btn"
                      onClick={() => handleDelete(p.id)}
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

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Créer un projet</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Project Name */}
              <div className="input-group">
                <label className="input-label">Nom du projet *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Refonte Dashboard E-commerce" 
                  className="form-input" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Devise (Currency) Selection */}
              <div className="input-group">
                <label className="input-label">Devise du projet *</label>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
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

              {/* Client and Budget */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Client commanditaire</label>
                  <select 
                    className="form-select"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  >
                    <option value="">Aucun client lié</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Budget global ({formData.currency})</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="form-input" 
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              </div>

              {/* Date de Début / Création & Status Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Date de début / Création *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required 
                    value={formData.created_at}
                    onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Statut initial *</label>
                  <select 
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="ACTIVE">Actif (En cours)</option>
                    <option value="COMPLETED">Terminé</option>
                    <option value="ON_HOLD">En Pause</option>
                    <option value="PIPELINE">Opportunité (En discussion)</option>
                  </select>
                </div>
              </div>

              {/* Description Input */}
              <div className="input-group">
                <label className="input-label">Description du projet</label>
                <textarea 
                  placeholder="Ex: Stack Next.js App Router, migration depuis Magento, hébergement Vercel..." 
                  className="form-textarea" 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Création...' : 'Créer le projet'}
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
