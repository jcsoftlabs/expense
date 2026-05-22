'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, 
  Mail, 
  Phone, 
  Building, 
  Trash2, 
  Loader2,
  X,
  User,
  Briefcase,
  TrendingUp,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  projectCount: number;
  totalPaidUSD: string | number;
  totalPaidHTG: string | number;
  outstandingAmountUSD: string | number;
  outstandingAmountHTG: string | number;
  created_at: string;
}

export default function Clients() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Erreur lors du chargement des clients');
      const json = await res.json();
      setClients(json);
    } catch (err: any) {
      setError(err.message || 'Impossible de se connecter aux API.');
    } finally {
      setLoading(false);
    }
  }

  // Hash function to dynamically select avatar class (0 to 7) based on client name
  function getAvatarClass(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 8;
    return `avatar-${index}`;
  }

  // Handle client creation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) {
      showToast('Le nom du client est requis', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Erreur lors de la création du client");

      showToast('Client créé avec succès !', 'success');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', company: '' }); // reset
      fetchClients(); // reload
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création du client.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(id: string) {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  }

  // Handle client deletion
  async function handleDelete() {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/clients/${deleteId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Impossible de supprimer le client.');
      
      showToast('Client supprimé avec succès !', 'success');
      setClients(clients.filter(c => c.id !== deleteId));
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression.', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    }
  }

  if (loading && clients.length === 0) {
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

        {/* Card Grid Skeleton */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {[1, 2, 3].map(idx => (
            <div key={idx} className="skeleton-card" style={{ minHeight: '260px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: '50%' }}></div>
                  <div>
                    <div className="skeleton" style={{ width: '140px', height: '18px', marginBottom: '6px' }}></div>
                    <div className="skeleton" style={{ width: '100px', height: '12px' }}></div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ width: '80%', height: '14px' }}></div>
                <div className="skeleton" style={{ width: '60%', height: '14px' }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="skeleton" style={{ height: '60px', borderRadius: '8px' }}></div>
                <div className="skeleton" style={{ height: '60px', borderRadius: '8px' }}></div>
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div>
      {/* Header section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', marginBottom: '6px' }}>Répertoire Clients & CRM</h1>
          <p>Gérez votre portefeuille clients, suivez les encaissements totaux et l'encours de facturation.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nouveau Client
        </button>
      </header>

      {/* CRM Client Cards Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {clients.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            padding: '60px 20px', 
            textAlign: 'center', 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }} className="glass-panel empty-state">
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dark)',
              border: '1px solid var(--border-glass)',
              marginBottom: '8px'
            }}>
              <User size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '6px' }}>Aucun client enregistré</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                Ajoutez vos clients pour lier leurs projets, suivre leur facturation et gérer vos encours financiers de façon structurée.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ marginTop: '8px' }}>
              <Plus size={16} /> Ajouter votre premier client
            </button>
          </div>
        ) : (
          clients.map((c) => {
            const paidUSD = parseFloat(c.totalPaidUSD as string || '0');
            const paidHTG = parseFloat(c.totalPaidHTG as string || '0');
            const outstandingUSD = parseFloat(c.outstandingAmountUSD as string || '0');
            const outstandingHTG = parseFloat(c.outstandingAmountHTG as string || '0');
            const hasOutstanding = outstandingUSD > 0 || outstandingHTG > 0;

            return (
              <div 
                key={c.id} 
                className="glass-panel card-hover-lift"
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '24px' }}
              >
                {/* Header Information */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        className={getAvatarClass(c.name)}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '1.1rem'
                        }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', color: '#ffffff' }}>{c.name}</h4>
                        {c.company && (
                          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <Building size={12} /> {c.company}
                          </span>
                        )}
                      </div>
                    </div>

                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', padding: '6px' }}
                      className="delete-icon-btn"
                      onClick={() => confirmDelete(c.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Contact Methods */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '24px 0 0 0', padding: '16px 0', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)' }}>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }} className="contact-link">
                        <Mail size={14} color="var(--text-dark)" /> {c.email}
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>Pas d'adresse e-mail</span>
                    )}

                    {c.phone ? (
                      <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }} className="contact-link">
                        <Phone size={14} color="var(--text-dark)" /> {c.phone}
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>Pas de numéro de téléphone</span>
                    )}
                  </div>
                </div>

                {/* Key Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={11} color="var(--success)" /> Facturé & Reçu
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--success)' }}>
                        {formatCurrency(paidUSD, 'USD')}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(74, 222, 128, 0.85)' }}>
                        {formatCurrency(paidHTG, 'HTG')}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={11} color={hasOutstanding ? 'var(--warning)' : 'var(--text-dark)'} /> Reste à payer
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: outstandingUSD > 0 ? 'var(--warning)' : '#ffffff' }}>
                        {formatCurrency(outstandingUSD, 'USD')}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: outstandingHTG > 0 ? 'var(--warning)' : '#ffffff' }}>
                        {formatCurrency(outstandingHTG, 'HTG')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Count info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Briefcase size={13} color="var(--text-dark)" />
                  <span>Projet(s) associé(s) : <strong>{c.projectCount}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Ajouter un Client</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div className="input-group">
                <label className="input-label">Nom complet du client *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Jean Dupont" 
                  className="form-input" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Company */}
              <div className="input-group">
                <label className="input-label">Entreprise / Société</label>
                <input 
                  type="text" 
                  placeholder="Ex: Acme Systems SAS" 
                  className="form-input" 
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              {/* Email */}
              <div className="input-group">
                <label className="input-label">Adresse e-mail</label>
                <input 
                  type="email" 
                  placeholder="jean.dupont@company.com" 
                  className="form-input" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Phone */}
              <div className="input-group">
                <label className="input-label">Numéro de téléphone</label>
                <input 
                  type="tel" 
                  placeholder="+33 6 12 34 56 78" 
                  className="form-input" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Création...' : 'Créer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Supprimer le client"
        message="Êtes-vous sûr de vouloir supprimer ce client ? Tous les projets et transactions liés seront conservés, mais dissociés de ce client."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteId(null);
        }}
      />

      {/* Styled JSX local hover states */}
      <style jsx global>{`
        .delete-icon-btn:hover {
          color: var(--danger) !important;
          filter: drop-shadow(0 0 5px rgba(244,63,94,0.3));
        }
        .contact-link:hover {
          color: #ffffff !important;
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
}
