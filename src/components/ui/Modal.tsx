import React, { useEffect, useRef, useState } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho máximo del cuadro (por defecto 440px). */
  maxWidth?: number;
}

/**
 * Modal accesible y ligero (sin dependencias): cierra con Escape y con click
 * en el fondo, y devuelve el foco al elemento que lo abrió.
 */
export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, maxWidth = 440 }) => {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // onClose se lee desde un ref para que el efecto principal dependa solo de
  // `open`: los onClose inline (p. ej. en TopBar) cambian de identidad en cada
  // re-render y re-ejecutarían el efecto, robando el foco a mitad de tipeo.
  // Este es exactamente el caso de uso del patrón "latest ref".
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    // Guarda el elemento previamente enfocado solo si está FUERA del modal,
    // para que la restauración al cerrar enfoque al botón que lo abrió; y
    // enfoca el card solo como fallback: si un hijo con autoFocus (input de
    // PromptDialog, botón de ConfirmDialog) ya tomó el foco, no robárselo.
    if (!cardRef.current?.contains(document.activeElement)) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      cardRef.current?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={cardRef}
        className="modal-card animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Reemplazo accesible de window.confirm(). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel,
}) => (
  <Modal open={open} title={title} onClose={onCancel}>
    <div style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>{message}</div>
    <div className="modal-actions">
      <button className="btn-secondary modal-btn" onClick={onCancel}>{cancelLabel}</button>
      <button
        className={danger ? 'btn-danger modal-btn' : 'btn-primary modal-btn'}
        onClick={onConfirm}
        autoFocus
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  confirmLabel: string;
  cancelLabel: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  /** Contenido extra (p. ej. selector de formato) renderizado bajo el input. */
  children?: React.ReactNode;
}

/** Reemplazo accesible de window.prompt(). */
export const PromptDialog: React.FC<PromptDialogProps> = ({
  open, title, label, defaultValue = '', confirmLabel, cancelLabel, onSubmit, onCancel, children,
}) => {
  const [value, setValue] = useState(defaultValue);

  // Al abrirse, el input arranca con defaultValue: ajuste de estado durante el
  // render comparando con el valor previo de `open`.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValue(defaultValue);
  }

  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'hsl(var(--text-secondary))' }}>
          {label}
          <input
            className="form-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </label>
        {children}
        <div className="modal-actions">
          <button type="button" className="btn-secondary modal-btn" onClick={onCancel}>{cancelLabel}</button>
          <button type="submit" className="btn-primary modal-btn" disabled={!value.trim()}>{confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
};
