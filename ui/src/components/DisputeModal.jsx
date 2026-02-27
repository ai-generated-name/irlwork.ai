import React, { useState } from 'react';

export default function DisputeModal({ isOpen, onClose, onSubmit, taskTitle }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await onSubmit(reason.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to file dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    setSuccess(false);
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

        {success ? (
          <div className="quick-apply-modal-success">
            <div className="quick-apply-modal-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3>Dispute Filed</h3>
            <p>Your dispute has been submitted. Our team will review it and both parties will be notified.</p>
          </div>
        ) : (
          <>
            <div className="quick-apply-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8853D" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h2>File a Dispute</h2>
              </div>
              <p style={{ fontSize: '14px', color: '#888888', marginTop: '4px' }}>
                Disputes are reviewed by our team. Please provide a clear reason.
              </p>
            </div>

            {taskTitle && (
              <div className="quick-apply-modal-task">
                <h3 className="quick-apply-modal-task-title">{taskTitle}</h3>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="quick-apply-modal-field">
                <label htmlFor="disputeReason">Reason for dispute *</label>
                <textarea
                  id="disputeReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the issue — e.g., task requirements changed, non-responsive agent, payment concerns..."
                  maxLength={1000}
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid rgba(0,0,0,0.08)',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#888888' }}>
                  {reason.length}/1000
                </span>
              </div>

              {error && (
                <p style={{ color: '#FF5F57', fontSize: '13px', margin: '8px 0' }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid rgba(0,0,0,0.08)',
                    background: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason.trim()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: loading || !reason.trim() ? '#ccc' : '#E8853D',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading || !reason.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Submitting...' : 'File Dispute'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
