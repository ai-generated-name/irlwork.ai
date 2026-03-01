import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui';

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning', // 'warning' | 'danger' | 'info'
  isLoading = false,
  error = null,
}) {
  const modalRef = useRef(null);

  // Trap focus & handle Escape
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Focus the modal on open
    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const confirmColors = {
    warning: 'bg-[#E8853D] hover:bg-[#D4703A]',
    danger: 'bg-[#FF5F57] hover:bg-[#E54E47]',
    info: 'bg-[#3B82F6] hover:bg-[#2563EB]',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      {/* eslint-disable-next-line irlwork/no-inline-card-pattern -- modal container with alertdialog role, not a card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white rounded-[14px] w-full max-w-[420px] p-5 sm:p-6 shadow-lg outline-none"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <h3 id="confirm-title" className="text-[15px] sm:text-base font-bold text-[#1A1A1A] mb-2">
          {title}
        </h3>
        <div id="confirm-desc" className="text-[13px] sm:text-sm text-[#333333] mb-5 leading-relaxed">
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[10px] bg-[rgba(255,95,87,0.08)] border border-[rgba(255,95,87,0.15)] text-[#FF5F57] text-xs sm:text-sm flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-[10px] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${confirmColors[variant] || confirmColors.warning}`}
          >
            {isLoading && (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
