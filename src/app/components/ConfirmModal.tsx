'use client';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirmation',
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;


  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-container"
        style={{ maxWidth: '380px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: danger ? 'rgba(244,63,94,0.1)' : 'rgba(59,130,246,0.1)',
          border: `1px solid ${danger ? 'rgba(244,63,94,0.2)' : 'rgba(59,130,246,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: danger ? 'var(--danger)' : 'var(--primary)',
        }}>
          {danger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
        </div>

        {/* Text */}
        <h3 style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          marginBottom: '10px',
          color: '#ffffff',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          lineHeight: 1.55,
          marginBottom: '28px',
        }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
