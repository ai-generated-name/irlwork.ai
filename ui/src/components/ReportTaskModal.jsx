import React, { useState } from 'react';
import { AlertTriangle, Ban } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.irlwork.ai';

const REPORT_REASONS = [
  { value: 'scam_fraud', label: 'Scam / Fraud', icon: '🚨' },
  { value: 'misleading', label: 'Misleading', Icon: AlertTriangle },
  { value: 'inappropriate', label: 'Inappropriate', Icon: Ban },
  { value: 'spam', label: 'Spam', icon: '📧' },
  { value: 'illegal', label: 'Illegal activity', icon: '⛔' },
  { value: 'harassment', label: 'Harassment', icon: '😡' },
  { value: 'other', label: 'Other', icon: '❓' },
];

export default function ReportTaskModal({
  task,
  isOpen,
  onClose,
  onSuccess,
  userToken,
}) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/tasks/${task.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken || '',
        },
        body: JSON.stringify({
          reason,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(task.id);
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="quick-apply-modal-overlay" onClick={handleClose}>
      <div className="quick-apply-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
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
            <h3>Report Submitted</h3>
            <p>Thank you for helping keep irlwork.ai safe. Our team will review this report.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="quick-apply-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5F57" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                <h2>Report Task</h2>
              </div>
              <p style={{ fontSize: '14px', color: '#888888', marginTop: '4px' }}>
                Help keep the marketplace safe by reporting suspicious tasks.
              </p>
            </div>

            {/* Task reference */}
            <div className="quick-apply-modal-task">
              <h3 className="quick-apply-modal-task-title">{task.title}</h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Reason selection */}
              <div className="quick-apply-modal-field">
                <label>Reason *</label>
                <div className="report-reason-grid">
                  {REPORT_REASONS.map((r) => {
                    const IconComp = r.Icon;
                    return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: reason === r.value ? '2px solid #FF5F57' : '2px solid rgba(0,0,0,0.08)',
                        background: reason === r.value ? 'rgba(220,38,38,0.05)' : 'rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: reason === r.value ? '600' : '500',
                        color: reason === r.value ? '#FF5F57' : '#333333',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      <span>{IconComp ? <IconComp size={14} /> : r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                    );
                  })}
                </div>
              </div>

              {/* Description textarea */}
              <div className="quick-apply-modal-field">
                <label htmlFor="reportDescription">
                  Describe the issue * ({description.length}/2000)
                </label>
                <textarea
                  id="reportDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about why this task should be reviewed..."
                  rows={4}
                  maxLength={2000}
                  required
                />
              </div>

              {error && (
                <div className="quick-apply-modal-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="quick-apply-modal-actions">
                <button
                  type="button"
                  className="quick-apply-modal-btn secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="quick-apply-modal-btn primary"
                  disabled={loading || !reason || !description.trim()}
                  style={{ backgroundColor: '#FF5F57' }}
                >
                  {loading ? (
                    <>
                      <span className="quick-apply-modal-spinner" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
