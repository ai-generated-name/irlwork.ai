import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Shield, Package, Camera, BarChart3, Footprints, Sparkles, Truck, Wrench, Search, Monitor, Languages, CheckCircle } from 'lucide-react';

import { getErrorMessage } from '../utils/apiErrors';
import API_URL from '../config/api';
import { trackEvent } from '../utils/analytics';
import ConfirmationModal from './ConfirmationModal';

const PLATFORM_FEE_PERCENT = 15;
const PREMIUM_FEE_PERCENT = 10;

const CATEGORY_ICONS = {
  delivery: <Package size={16} />,
  photography: <Camera size={16} />,
  data_collection: <BarChart3 size={16} />,
  'data-collection': <BarChart3 size={16} />,
  errands: <Footprints size={16} />,
  cleaning: <Sparkles size={16} />,
  moving: <Truck size={16} />,
  manual_labor: <Wrench size={16} />,
  inspection: <Search size={16} />,
  tech: <Monitor size={16} />,
  'tech-setup': <Monitor size={16} />,
  translation: <Languages size={16} />,
  verification: <CheckCircle size={16} />,
  general: <ClipboardList size={16} />,
  other: <ClipboardList size={16} />,
};

export default function QuickApplyModal({
  task,
  isOpen,
  onClose,
  onSuccess,
  userToken,
  isPremium = false,
}) {
  const [whyFit, setWhyFit] = useState('');
  const [availability, setAvailability] = useState('');
  const [questions, setQuestions] = useState('');
  const [counterOffer, setCounterOffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showCounterConfirm, setShowCounterConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Fee calculation — dynamically updates when counter offer changes
  const feeBreakdown = useMemo(() => {
    if (!task) return null;
    const baseAmount = counterOffer ? parseFloat(counterOffer) : Number(task.budget) || 0;
    if (isNaN(baseAmount) || baseAmount <= 0) return null;

    const feeRate = isPremium ? PREMIUM_FEE_PERCENT : PLATFORM_FEE_PERCENT;
    const fee = Math.round(baseAmount * feeRate) / 100;
    const payout = Math.round((baseAmount - fee) * 100) / 100;

    // Calculate what Premium users would earn (for upsell)
    const premiumFee = Math.round(baseAmount * PREMIUM_FEE_PERCENT) / 100;
    const premiumPayout = Math.round((baseAmount - premiumFee) * 100) / 100;
    const savings = Math.round((premiumPayout - payout) * 100) / 100;

    return { baseAmount, feeRate, fee, payout, premiumPayout, savings };
  }, [task, counterOffer, isPremium]);

  if (!isOpen || !task) return null;

  const currencyLabel = task.payment_method === 'stripe' ? 'USD' : 'USDC';
  const canSubmit = whyFit.trim().length > 0 && availability.trim().length > 0;

  // Check if counter offer differs significantly from budget
  const counterOfferDiffPercent = useMemo(() => {
    if (!counterOffer || !task) return 0;
    const budget = Number(task.budget) || 0;
    if (budget === 0) return 0;
    return Math.abs((parseFloat(counterOffer) - budget) / budget) * 100;
  }, [counterOffer, task]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    // If counter offer differs by >20%, ask for confirmation first
    if (counterOffer && counterOfferDiffPercent > 20 && !showCounterConfirm) {
      setShowCounterConfirm(true);
      return;
    }

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
          cover_letter: whyFit.trim(),
          availability: availability.trim(),
          questions: questions.trim() || null,
          proposed_rate: counterOffer ? parseFloat(counterOffer) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Failed to apply'));
      }

      trackEvent('task_applied', { task_id: task.id, source: 'quick_apply' });
      setShowCounterConfirm(false);
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
    setWhyFit('');
    setAvailability('');
    setQuestions('');
    setCounterOffer('');
    setError(null);
    setSuccess(false);
    setShowCounterConfirm(false);
    onClose();
  };

  const categoryIcon = CATEGORY_ICONS[task.category] || <ClipboardList size={16} />;

  return createPortal(
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
            <h3>Application sent</h3>
            <p>The task poster will review your application.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="quick-apply-modal-header">
              <h2>Apply to task</h2>
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
                  ${task.budget || 0} {currencyLabel}
                </span>
                {task.distance_km != null && (
                  <span className="quick-apply-modal-task-distance">
                    {task.distance_km.toFixed(1)} km away
                  </span>
                )}
              </div>
            </div>

            {/* Deadline warning — non-blocking */}
            {task.deadline && (() => {
              const hoursLeft = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60);
              if (hoursLeft > 0 && hoursLeft <= 4) {
                return (
                  <div style={{
                    background: 'rgba(254, 188, 46, 0.15)', border: '1px solid #FEBC2E',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 4, fontSize: 13,
                    color: '#92400E', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FEBC2E" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    This task is due in {hoursLeft < 1 ? 'less than 1 hour' : `${Math.round(hoursLeft)} hour${Math.round(hoursLeft) !== 1 ? 's' : ''}`}. Make sure you can complete it in time.
                  </div>
                );
              }
              return null;
            })()}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* 1. Why you're a good fit (required) */}
              <div className="quick-apply-modal-field">
                <label htmlFor="whyFit">
                  Why you're a good fit <span className="quick-apply-modal-required">*</span>
                </label>
                <textarea
                  id="whyFit"
                  value={whyFit}
                  onChange={(e) => setWhyFit(e.target.value)}
                  placeholder="Share relevant experience, skills, or why you're the right person for this task..."
                  rows={3}
                  maxLength={500}
                />
                <span className="quick-apply-modal-field-hint">
                  {whyFit.length}/500 characters
                </span>
              </div>

              {/* 2. Confirm availability (required) */}
              <div className="quick-apply-modal-field">
                <label htmlFor="availability">
                  Confirm availability <span className="quick-apply-modal-required">*</span>
                </label>
                <textarea
                  id="availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="When can you start? How soon can you complete this?"
                  rows={2}
                  maxLength={200}
                />
                <span className="quick-apply-modal-field-hint">
                  {availability.length}/200 characters
                </span>
              </div>

              {/* 3. Questions about the task (optional) */}
              <div className="quick-apply-modal-field">
                <label htmlFor="questions">Questions about the task</label>
                <textarea
                  id="questions"
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  placeholder="Any questions or clarifications needed?"
                  rows={2}
                  maxLength={300}
                />
                <span className="quick-apply-modal-field-hint">
                  {questions.length}/300 characters
                </span>
              </div>

              {/* 4. Counter offer (optional) */}
              <div className="quick-apply-modal-field">
                <label htmlFor="counterOffer">Counter offer</label>
                <div className="quick-apply-modal-counter-offer">
                  <span className="quick-apply-modal-currency-prefix">$</span>
                  <input
                    id="counterOffer"
                    type="number"
                    min="0"
                    step="0.01"
                    value={counterOffer}
                    onChange={(e) => setCounterOffer(e.target.value)}
                    placeholder={`${task.budget || '0.00'}`}
                    className="quick-apply-modal-counter-input"
                  />
                  <span className="quick-apply-modal-currency-suffix">{currencyLabel}</span>
                </div>
                <span className="quick-apply-modal-field-hint">
                  Leave blank to accept ${task.budget || 0} {currencyLabel}
                </span>
              </div>

              {/* Fee Breakdown */}
              {feeBreakdown && (
                <div className="quick-apply-fee-breakdown">
                  <div className="quick-apply-fee-row">
                    <span className="quick-apply-fee-label">You'll earn</span>
                    <span className="quick-apply-fee-amount quick-apply-fee-payout">
                      ${feeBreakdown.payout.toFixed(2)}
                    </span>
                  </div>
                  <div className="quick-apply-fee-row">
                    <span className="quick-apply-fee-label quick-apply-fee-muted">
                      Platform fee ({feeBreakdown.feeRate}%)
                    </span>
                    <span className="quick-apply-fee-amount quick-apply-fee-muted">
                      -${feeBreakdown.fee.toFixed(2)}
                    </span>
                  </div>
                  {isPremium ? (
                    <div className="quick-apply-fee-premium">
                      <Shield size={14} className="quick-apply-fee-premium-icon" />
                      <span>Premium saved you ${(feeBreakdown.savings > 0 ? (Number(feeBreakdown.baseAmount) * (PLATFORM_FEE_PERCENT - PREMIUM_FEE_PERCENT) / 100).toFixed(2) : '0.00')} on this task</span>
                    </div>
                  ) : feeBreakdown.savings > 0 ? (
                    <div className="quick-apply-fee-upsell">
                      <Shield size={14} className="quick-apply-fee-premium-icon" />
                      <span>
                        With Premium you'd earn ${feeBreakdown.premiumPayout.toFixed(2)}{' '}
                        <a href="/premium" target="_blank" rel="noopener noreferrer" className="quick-apply-fee-upgrade-link">
                          Upgrade
                        </a>
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

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
                  Cancel application
                </button>
                <button
                  type="submit"
                  className="quick-apply-modal-btn primary"
                  disabled={loading || !canSubmit}
                >
                  {loading ? (
                    <>
                      <span className="quick-apply-modal-spinner" />
                      Submitting...
                    </>
                  ) : (
                    'Submit application'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      {/* Counter offer confirmation */}
      <ConfirmationModal
        isOpen={showCounterConfirm}
        onConfirm={handleSubmit}
        onCancel={() => setShowCounterConfirm(false)}
        title="Confirm counter offer"
        description={(() => {
          const budget = Number(task?.budget) || 0;
          const offer = parseFloat(counterOffer) || 0;
          const direction = offer > budget ? 'higher' : 'lower';
          const pct = Math.round(counterOfferDiffPercent);
          return (
            <p>
              You're offering to complete this task for <strong>${offer.toFixed(2)}</strong>, which is {pct}% {direction} than
              the posted budget of ${budget.toFixed(2)}. The task creator will see this amount.
            </p>
          );
        })()}
        confirmLabel="Submit Application"
        variant="info"
        isLoading={loading}
        error={error}
      />
    </div>,
    document.body
  );
}
