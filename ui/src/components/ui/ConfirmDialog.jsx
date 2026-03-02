import React, { useEffect, useCallback, useRef } from 'react';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  dark = false,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      // Focus trap: cycle through focusable elements within the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (open) {
      // Save previously focused element to restore on close
      previousFocusRef.current = document.activeElement;

      document.addEventListener('keydown', handleKeyDown);

      // Focus the dialog panel on open
      requestAnimationFrame(() => {
        if (dialogRef.current) {
          const firstFocusable = dialogRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) firstFocusable.focus();
        }
      });

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus on close
        if (previousFocusRef.current && previousFocusRef.current.focus) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`max-w-sm w-full mx-4 p-6 rounded-[14px] ${
          dark
            ? 'bg-[#1A1A1A] border border-white/10'
            : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className={`text-lg font-semibold ${
            dark ? 'text-white' : 'text-[#1A1A1A]'
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className={`text-sm mt-2 ${
            dark ? 'text-white/60' : 'text-[#6B7280]'
          }`}>{description}</p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" size="md" dark={dark} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            size="md"
            dark={dark}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
