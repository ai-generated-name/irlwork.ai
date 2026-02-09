import React, { useState } from 'react';

import API_URL from '../config/api';

const CATEGORY_ICONS = {
  delivery: '📦',
  photography: '📸',
  'data-collection': '📊',
  errands: '🏃',
  'tech-setup': '💻',
  translation: '🌐',
  verification: '✅',
  other: '📋',
};

export default function QuickApplyModal({
  task,
  isOpen,
  onClose,
  onSuccess,
  userToken,
}) {
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken || '',
        },
        body: JSON.stringify({
          cover_letter: coverLetter.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(task.id);
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCoverLetter('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const categoryIcon = CATEGORY_ICONS[task.category] || '📋';

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
            <h3>Application Sent!</h3>
            <p>The task poster will review your application.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="quick-apply-modal-header">
              <h2>Apply to Task</h2>
            </div>

            {/* Task Summary */}
            <div className="quick-apply-modal-task">
              <div className="quick-apply-modal-task-category">
                <span>{categoryIcon}</span>
                <span>{task.category?.replace('-', ' ') || 'General'}</span>
              </div>
              <h3 className="quick-apply-modal-task-title">{task.title}</h3>
              <div className="quick-apply-modal-task-meta">
                <span className="quick-apply-modal-task-budget">
                  ${task.budget || 0} USDC
                </span>
                {task.distance_km != null && (
                  <span className="quick-apply-modal-task-distance">
                    {task.distance_km.toFixed(1)} km away
                  </span>
                )}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="quick-apply-modal-field">
                <label htmlFor="coverLetter">Message to task poster (optional)</label>
                <textarea
                  id="coverLetter"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Introduce yourself, share relevant experience, or ask questions about the task..."
                  rows={4}
                  maxLength={500}
                />
                <span className="quick-apply-modal-field-hint">
                  {coverLetter.length}/500 characters
                </span>
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
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="quick-apply-modal-spinner" />
                      Applying...
                    </>
                  ) : (
                    'Apply Now'
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
