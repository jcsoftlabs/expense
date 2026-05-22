'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_CONFIG = {
  success: { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
  error:   { icon: XCircle,      color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.2)'  },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  info:    { icon: Info,          color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)'  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Stack */}
      <div style={{
        position: 'fixed',
        bottom: '90px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        width: 'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => {
          const cfg = TOAST_CONFIG[toast.type];
          const Icon = cfg.icon;
          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#0c1222',
                border: `1px solid ${cfg.border}`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.border}`,
                backdropFilter: 'blur(20px)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 500,
                lineHeight: 1.45,
                animation: 'toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
                pointerEvents: 'all',
              }}
            >
              <Icon size={18} color={cfg.color} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dark)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes toastSlideIn {
          from { transform: translateX(110%) scale(0.95); opacity: 0; }
          to   { transform: translateX(0)   scale(1);    opacity: 1; }
        }
        @media (max-width: 768px) {
          /* On mobile, toasts appear above the bottom nav */
          div[style*="bottom: 90px"][style*="right: 20px"] {
            bottom: 80px !important;
            left: 12px !important;
            right: 12px !important;
            width: auto !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
