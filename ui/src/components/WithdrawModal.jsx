import React, { useState } from 'react';
import { Button } from './ui';

export default function WithdrawModal({ isOpen, onClose, onConfirm, taskTitle, hasEscrow }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Failed to withdraw from task');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <div className="quick-apply-modal-overlay" onClick={handleClose}>
      <div className="quick-apply-modal" onClick={(e) => e.stopPropagation()}>
        <button className="quick-apply-modal-close" onClick={handleClose} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="quick-apply-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5F57" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h2>Withdraw from task</h2>
          </div>
        </div>

        {taskTitle && (
          <div className="quick-apply-modal-task">
            <h3 className="quick-apply-modal-task-title">{taskTitle}</h3>
          </div>
        )}

        <div style={{ padding: '0 4px' }}>
          <p style={{ fontSize: '14px', color: '#333333', lineHeight: '1.5', margin: '0 0 12px 0' }}>
            Are you sure you want to withdraw from this task? This will:
          </p>
          <ul style={{ fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 16px 0', paddingLeft: '20px' }}>
            <li>Remove you as the assigned worker</li>
            <li>Reopen the task for other applicants</li>
            {hasEscrow && <li>Refund the escrow payment to the agent</li>}
          </ul>
          <p style={{ fontSize: '13px', color: '#888888', margin: '0 0 16px 0' }}>
            This action cannot be undone. The agent will be notified.
          </p>
        </div>

        {error && (
          <p style={{ color: '#FF5F57', fontSize: '13px', margin: '0 0 12px 0', padding: '0 4px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={handleClose}
          >
            Keep working
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="flex-1"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Withdrawing...' : 'Withdraw from task'}
          </Button>
        </div>
      </div>
    </div>
  );
}
