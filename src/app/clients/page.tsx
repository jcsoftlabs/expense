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

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  projectCount: number;
  totalPaid: string | number;
  outstandingAmount: string | number;
  created_at: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Handle client creation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) {
      alert('Le nom du client est requis');
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

      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', company: '' }); // reset
      fetchClients(); // reload
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle client deletion
  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Tous les projets et transactions liés seront conservés, mais dissociés de ce client.')) return;

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Impossible de supprimer le client.');
      
      setClients(clients.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading && clients.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '15px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p>Ouverture du répertoire clients...</p>
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
          <div style={{ gridColumn: '1 / -1', padding: '50px 20px', textAlign: 'center', color: 'var(--text-dark)' }} className="glass-panel">
            Aucun client enregistré pour le moment.
          </div>
        ) : (
          clients.map((c) => {
            const paid = parseFloat(c.totalPaid as string || '0');
            const outstanding = parseFloat(c.outstandingAmount as string || '0');
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
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        fontWeight: '800',
                        fontSize: '1.1rem'
                      }}>
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
                      onClick={() => handleDelete(c.id)}
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
                  <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={11} color="var(--success)" /> Facturé & Reçu
                    </div>
                    <div style={{ fontSize: '1.02rem', fontWeight: '800', color: 'var(--success)' }}>
                      {paid.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={11} color={outstanding > 0 ? 'var(--warning)' : 'var(--text-dark)'} /> Reste à payer
                    </div>
                    <div style={{ fontSize: '1.02rem', fontWeight: '800', color: outstanding > 0 ? 'var(--warning)' : '#ffffff' }}>
                      {outstanding.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
