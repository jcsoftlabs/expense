'use client';

import { useEffect, useState } from 'react';
import { Shield, Fingerprint, Lock, CheckCircle2, ShieldAlert, Loader2, Sparkles } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function SecuritySettings() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<{
    hasPin: boolean;
    biometricEnabled: boolean;
    hasPasskeys: boolean;
  } | null>(null);

  // Form states
  const [showPinForm, setShowPinForm] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Deactivation Modal State
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/biometric/pin');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Erreur status sécurité:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterPin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMsg('Le code PIN doit comporter 4 chiffres.');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg('Les codes PIN ne correspondent pas.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/auth/biometric/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', pin }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Impossible d'enregistrer le code PIN.");
      }

      showToast('Code PIN configuré avec succès !', 'success');
      setShowPinForm(false);
      setPin('');
      setConfirmPin('');
      fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message);
      showToast(err.message || "Erreur lors de la configuration du code PIN.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleBiometric() {
    if (!config) return;
    setErrorMsg(null);

    const nextEnabledState = !config.biometricEnabled;

    // Si on veut ACTIVER et qu'il n'y a pas encore de passkey enregistré, il faut d'abord enregistrer l'appareil
    if (nextEnabledState && !config.hasPasskeys) {
      try {
        setSubmitting(true);
        // 1. Obtenir les options d'enregistrement
        const resOptions = await fetch('/api/auth/biometric/register/options');
        if (!resOptions.ok) {
          const err = await resOptions.json();
          throw new Error(err.error || "Erreur de génération des options d'enregistrement");
        }
        const options = await resOptions.json();

        // 2. Déclencher le capteur biométrique de l'appareil (inscription)
        const attestation = await startRegistration({ optionsJSON: options });

        // 3. Valider la clé auprès de notre serveur
        const resVerify = await fetch('/api/auth/biometric/register/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: attestation }),
        });

        if (!resVerify.ok) {
          const err = await resVerify.json();
          throw new Error(err.error || 'Validation de la clé biométrique échouée');
        }

        showToast('Verrouillage biométrique activé avec succès !', 'success');
        fetchStatus();
      } catch (err: any) {
        console.error('Erreur enregistrement passkey:', err);
        setErrorMsg(err.message || 'Enregistrement biométrique annulé ou non supporté par ce navigateur/appareil.');
        showToast(err.message || "Annulé ou non supporté.", 'warning');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Si la clé existe déjà, on bascule simplement l'état d'activation
      try {
        setSubmitting(true);
        const res = await fetch('/api/auth/biometric/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_biometric', enabled: nextEnabledState }),
        });

        if (res.ok) {
          showToast(nextEnabledState ? 'Verrouillage biométrique activé !' : 'Verrouillage biométrique désactivé.', 'info');
          fetchStatus();
        } else {
          const err = await res.json();
          throw new Error(err.error || 'Erreur lors de la modification des paramètres.');
        }
      } catch (err: any) {
        setErrorMsg(err.message);
        showToast(err.message || 'Erreur lors de l\'activation.', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  }

  async function handleDisableAllSecurity() {
    setErrorMsg(null);
    try {
      setSubmitting(true);
      const res = await fetch('/api/auth/biometric/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable_lock' }),
      });

      if (res.ok) {
        showToast('Sécurité désactivée avec succès. Clés et PIN effacés.', 'info');
        fetchStatus();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Impossible de désactiver la sécurité');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      showToast(err.message || 'Erreur lors de la désactivation.', 'error');
    } finally {
      setSubmitting(false);
      setIsDisableModalOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '140px' }}>
        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Shield size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Sécurité & Verrouillage <Sparkles size={13} color="var(--primary)" className="animate-pulse" />
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Protégez votre journal de bord et vos finances contre les accès locaux indésirables.</p>
          </div>
        </div>
        
        {config.hasPin && (
          <span style={{
            fontSize: '0.72rem',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: 'var(--success)',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle2 size={12} /> Actif
          </span>
        )}
      </div>

      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#fca5a5',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: '600'
        }}>
          <ShieldAlert size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Configuration Status / Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
        
        {/* Row 1: PIN Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Lock size={16} color={config.hasPin ? 'var(--primary)' : 'var(--text-dark)'} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff' }}>Code PIN de Secours</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {config.hasPin ? 'Code PIN à 4 chiffres configuré.' : 'Configurez un code PIN pour activer la sécurité.'}
              </div>
            </div>
          </div>
          
          {!config.hasPin ? (
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => setShowPinForm(true)}
              disabled={submitting}
            >
              Définir un PIN
            </button>
          ) : (
            <button 
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 12px', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
              onClick={() => setIsDisableModalOpen(true)}
              disabled={submitting}
            >
              Désactiver
            </button>
          )}
        </div>

        {/* Row 2: Biometric Status */}
        {config.hasPin && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Fingerprint size={18} color={config.biometricEnabled ? 'var(--primary)' : 'var(--text-dark)'} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff' }}>Verrouillage Biométrique</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {config.biometricEnabled 
                    ? 'Déverrouillez instantanément avec Face ID / Touch ID.' 
                    : 'Permet de s\'authentifier via l\'empreinte ou le visage.'}
                </div>
              </div>
            </div>
            
            <button
              className={`btn ${config.biometricEnabled ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 14px', minWidth: '90px' }}
              onClick={handleToggleBiometric}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={14} />
              ) : config.biometricEnabled ? (
                'Activé'
              ) : (
                'Activer'
              )}
            </button>
          </div>
        )}
      </div>

      {/* PIN Setting Modal Form */}
      {showPinForm && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '340px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Activer la Sécurité</h3>
            </div>
            
            <form onSubmit={handleRegisterPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Choisissez un code PIN à 4 chiffres pour sécuriser l'application. Ce code servira aussi de secours si la biométrie échoue.
              </p>
              
              <div className="input-group">
                <label className="input-label">Nouveau code PIN (4 chiffres)</label>
                <input 
                  type="password"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="••••"
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '8px' }}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Confirmer le code PIN</label>
                <input 
                  type="password"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="••••"
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '8px' }}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPinForm(false); setErrorMsg(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Validation...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation of deactivation */}
      <ConfirmModal
        isOpen={isDisableModalOpen}
        title="Désactiver la sécurité"
        message="Êtes-vous sûr de vouloir désactiver complètement la sécurité ? Vos clés d'accès (biométrie) et votre code PIN seront effacés."
        confirmLabel="Désactiver"
        cancelLabel="Conserver"
        onConfirm={handleDisableAllSecurity}
        onCancel={() => setIsDisableModalOpen(false)}
      />

    </div>
  );
}
