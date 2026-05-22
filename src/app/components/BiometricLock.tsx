'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Lock, ShieldAlert, Check, Delete, Loader2 } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

interface BiometricLockProps {
  onUnlockSuccess: () => void;
}

export default function BiometricLock({ onUnlockSuccess }: BiometricLockProps) {
  const [pin, setPin] = useState<string>('');
  const [status, setStatus] = useState<'locked' | 'authenticating' | 'unlocking' | 'error'>('locked');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<{
    hasPin: boolean;
    biometricEnabled: boolean;
    hasPasskeys: boolean;
  } | null>(null);

  // Animation states
  const [shake, setShake] = useState(false);

  useEffect(() => {
    fetchSecurityConfig();
  }, []);

  async function fetchSecurityConfig() {
    try {
      const res = await fetch('/api/auth/biometric/pin');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (!data.hasPin) {
          // Si aucune sécurité n'est configurée, déverrouiller automatiquement
          onUnlockSuccess();
        } else if (data.biometricEnabled && data.hasPasskeys) {
          // Déclencher la biométrie automatiquement au chargement
          triggerBiometrics();
        }
      }
    } catch (err) {
      console.error('Erreur config sécurité:', err);
    }
  }

  async function triggerBiometrics() {
    setStatus('authenticating');
    setErrorMsg(null);
    try {
      // 1. Obtenir les options de connexion du serveur
      const optionsRes = await fetch('/api/auth/biometric/login/options');
      if (!optionsRes.ok) {
        const err = await optionsRes.json();
        throw new Error(err.error || 'Erreur lors de la génération du défi biométrique');
      }
      const options = await optionsRes.json();

      // 2. Lancer l'authentification biométrique native du navigateur
      const assertion = await startAuthentication({ optionsJSON: options });

      // 3. Envoyer la réponse pour validation au backend
      const verifyRes = await fetch('/api/auth/biometric/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: assertion }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Signature biométrique invalide');
      }

      const verifyData = await verifyRes.json();
      if (verifyData.verified) {
        setStatus('unlocking');
        setTimeout(() => {
          onUnlockSuccess();
        }, 600);
      } else {
        throw new Error('Échec du déverrouillage biométrique');
      }
    } catch (err: any) {
      console.warn('Biométrie ignorée/échouée:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Authentification biométrique annulée ou indisponible.');
      
      // Auto-fallback sur l'état locked normal après 3 secondes
      setTimeout(() => {
        setStatus('locked');
      }, 3000);
    }
  }

  // Gérer la pression sur le clavier numérique
  function handleKeyPress(num: string) {
    if (status === 'authenticating' || status === 'unlocking') return;
    setErrorMsg(null);

    const nextPin = pin + num;
    if (nextPin.length <= 4) {
      setPin(nextPin);
    }

    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  }

  function handleBackspace() {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  }

  async function verifyPin(pinToVerify: string) {
    setStatus('authenticating');
    try {
      const res = await fetch('/api/auth/biometric/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin: pinToVerify }),
      });

      if (res.ok) {
        setStatus('unlocking');
        setTimeout(() => {
          onUnlockSuccess();
        }, 600);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Code PIN incorrect');
      }
    } catch (err: any) {
      setPin('');
      setShake(true);
      setStatus('locked');
      setErrorMsg(err.message || 'Erreur lors de la validation du code PIN');
      setTimeout(() => setShake(false), 500);
    }
  }

  if (!config) {
    return (
      <div className="lock-screen-overlay">
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="lock-screen-overlay">
      <div className={`lock-screen-container ${shake ? 'shake-animation' : ''}`}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className={`lock-icon-container ${status === 'unlocking' ? 'unlocked' : ''}`}>
            {status === 'unlocking' ? (
              <Check size={28} color="var(--success)" />
            ) : (
              <Lock size={28} color="var(--primary)" />
            )}
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>
            {status === 'unlocking' ? 'Session Déverrouillée' : 'DevFinance Sécurisé'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '280px' }}>
            {status === 'unlocking' 
              ? 'Chargement de votre trésorerie...' 
              : config.biometricEnabled 
                ? 'Saisissez votre code PIN ou utilisez Face ID/Touch ID' 
                : 'Saisissez votre code PIN à 4 chiffres'}
          </p>
        </div>

        {/* PIN Indicators */}
        <div style={{ display: 'flex', gap: '16px', margin: '20px 0' }}>
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index}
              className={`pin-dot ${pin.length > index ? 'filled' : ''} ${errorMsg ? 'error' : ''}`}
            />
          ))}
        </div>

        {/* Dynamic Status / Errors */}
        {errorMsg && (
          <div className="lock-error-badge">
            <ShieldAlert size={14} /> {errorMsg}
          </div>
        )}

        {/* Biometrics Pulse Trigger Button */}
        {config.biometricEnabled && config.hasPasskeys && status !== 'unlocking' && (
          <button 
            onClick={triggerBiometrics}
            className={`biometric-pulse-btn ${status === 'authenticating' ? 'active' : ''}`}
          >
            {status === 'authenticating' ? (
              <Loader2 className="animate-spin" size={28} color="#ffffff" />
            ) : (
              <Fingerprint size={32} />
            )}
          </button>
        )}

        {/* Clavier Numérique (PIN) */}
        <div className="pin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button 
              key={num} 
              className="keypad-btn" 
              onClick={() => handleKeyPress(num)}
              disabled={status === 'unlocking' || status === 'authenticating'}
            >
              {num}
            </button>
          ))}
          
          <button 
            className="keypad-btn secondary-btn"
            style={{ fontSize: '0.9rem', fontWeight: '600' }}
            onClick={() => setPin('')}
            disabled={status === 'unlocking' || pin.length === 0}
          >
            Vider
          </button>

          <button 
            className="keypad-btn"
            onClick={() => handleKeyPress('0')}
            disabled={status === 'unlocking' || status === 'authenticating'}
          >
            0
          </button>

          <button 
            className="keypad-btn secondary-btn"
            onClick={handleBackspace}
            disabled={status === 'unlocking' || pin.length === 0}
          >
            <Delete size={18} />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .lock-screen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 6, 10, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lock-screen-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 25px;
          width: 100%;
          max-width: 360px;
          padding: 20px;
        }

        .lock-icon-container {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          color: var(--primary);
        }

        .lock-icon-container.unlocked {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.4);
          transform: scale(1.1) rotate(360deg);
        }

        .pin-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.25);
          transition: all 0.2s ease;
        }

        .pin-dot.filled {
          background: #ffffff;
          border-color: #ffffff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
        }

        .pin-dot.error {
          border-color: var(--danger);
          background: var(--danger);
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
        }

        .lock-error-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
          animation: fadeIn 0.3s ease;
        }

        .biometric-pulse-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid var(--primary);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
          animation: pulseGlow 2s infinite;
        }

        .biometric-pulse-btn:hover {
          background: rgba(59, 130, 246, 0.25);
          transform: scale(1.05);
        }

        .biometric-pulse-btn.active {
          animation: spinPulse 1.5s infinite linear;
          border-color: rgba(255,255,255,0.4);
          color: #ffffff;
        }

        .pin-keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          width: 270px;
          margin-top: 10px;
        }

        .keypad-btn {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          outline: none;
        }

        .keypad-btn:active {
          background: rgba(255, 255, 255, 0.15);
          transform: scale(0.95);
        }

        .keypad-btn.secondary-btn {
          background: transparent;
          border-color: transparent;
          color: var(--text-dark);
          font-size: 1.1rem;
        }

        .keypad-btn.secondary-btn:active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .shake-animation {
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
