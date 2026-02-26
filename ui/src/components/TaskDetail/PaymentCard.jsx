import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import EscrowBadge from '../EscrowBadge';
import API_URL from '../../config/api';

export default function PaymentCard({ task, user, isParticipant, onApply, taskId }) {
  const [stats, setStats] = useState(null);

  // Fetch stats inline
  useEffect(() => {
    const id = taskId || task?.id;
    if (!id) return;
    fetch(`${API_URL}/tasks/${id}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});
  }, [taskId, task?.id]);

  if (!task) return null;

  const isHourly = task.budget_type === 'hourly';
  const budget = Number(task.budget) || 0;
  const durationHours = Number(task.duration_hours) || 0;
  const estimatedTotal = isHourly && durationHours > 0 ? budget * durationHours : null;
  const currencyLabel = task.payment_method === 'stripe' ? 'USD' : 'USDC';
  const quantity = task.quantity || 1;
  const spotsFilled = task.spots_filled || (task.human_ids ? task.human_ids.length : (task.human_id ? 1 : 0));

  const isOwner = user && task.agent_id === user.id;
  const canApply = task.status === 'open' && user && !isOwner && !isParticipant;
  const showSignIn = task.status === 'open' && !user;

  // Escrow status logic (participant only)
  const escrowStatus = task.escrow_status || 'pending';
  const escrowAmount = task.escrow_amount || task.budget;

  const getStatusMessage = () => {
    switch (escrowStatus) {
      case 'deposited':
        return { icon: '✓', text: 'Funds secured in escrow. Work can begin safely.', color: 'text-[#16A34A]' };
      case 'released':
        return { icon: '✓', text: 'Payment has been released to you.', color: 'text-[#16A34A]' };
      case 'unfunded':
        return { icon: '⏳', text: 'Card will be charged when you accept. No charge until then.', color: 'text-[#FEBC2E]' };
      case 'pending':
        return { icon: '⏳', text: 'Waiting for agent to fund escrow...', color: 'text-[#FEBC2E]' };
      case 'refunded':
        return { icon: '↩', text: 'Funds returned to agent.', color: 'text-[#333333]' };
      default:
        return { icon: '⏳', text: 'Escrow status pending...', color: 'text-[#333333]' };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-6 shadow-sm">
      {/* Budget amount */}
      <div className="text-center mb-3 sm:mb-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl sm:text-4xl font-bold text-[#16A34A] font-mono">
            ${budget}
          </span>
          {isHourly && <span className="text-base sm:text-lg text-[#333333]">/hr</span>}
        </div>
        <div className="text-xs sm:text-sm text-[#888888] mt-1">
          {currencyLabel} {!isHourly ? '· Fixed Price' : ''}
        </div>
      </div>

      {/* Slots info for multi-person tasks */}
      {quantity > 1 && (
        <div className="border-t border-[rgba(0,0,0,0.08)] pt-2 sm:pt-3 mt-2 sm:mt-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-[#333333] flex items-center gap-1.5">
              <Users size={14} />
              Spots
            </span>
            <span className="font-semibold" style={{ color: spotsFilled >= quantity ? '#16A34A' : '#2563EB' }}>
              {spotsFilled}/{quantity} filled
            </span>
          </div>
          {budget > 0 && (
            <div className="flex items-center justify-between text-xs sm:text-sm mt-1.5">
              <span className="text-[#333333]">Per person</span>
              <span className="text-[#1A1A1A] font-medium">${budget} {currencyLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* Estimated hours and total for hourly tasks */}
      {isHourly && durationHours > 0 && (
        <div className="border-t border-[rgba(0,0,0,0.08)] pt-2 sm:pt-3 mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[#333333]">Estimated hours</span>
            <span className="text-[#1A1A1A] font-medium">~{durationHours}h</span>
          </div>
          {estimatedTotal && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-[#333333]">Est. total</span>
              <span className="text-[#1A1A1A] font-medium">${estimatedTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Apply button — public view only */}
      {canApply && (
        <button
          onClick={onApply}
          className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 bg-[#E8853D] hover:bg-[#D4703A] text-white font-bold rounded-xl transition-colors text-sm sm:text-base shadow-md"
        >
          Apply for This Task
        </button>
      )}

      {showSignIn && (
        <a
          href="/auth"
          className="block w-full mt-3 sm:mt-4 py-2.5 sm:py-3 bg-[#E8853D] hover:bg-[#D4703A] text-white font-bold rounded-xl transition-colors text-sm sm:text-base shadow-md text-center no-underline"
        >
          Sign In to Apply
        </a>
      )}

      {/* Inline stats */}
      {stats && (
        <div className="mt-3 sm:mt-4 text-center">
          <span className="text-xs text-[#888888]">
            {stats.applications} applicant{stats.applications !== 1 ? 's' : ''} · {stats.views} view{stats.views !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Payment Status — participant only */}
      {isParticipant && (
        <div className="border-t border-[rgba(0,0,0,0.08)] mt-3 sm:mt-4 pt-3 sm:pt-4">
          <h4 className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-2.5 sm:mb-3">
            Payment Status
          </h4>

          {/* Escrow Badge */}
          <div className="mb-2.5 sm:mb-3">
            <EscrowBadge
              status={escrowStatus}
              amount={escrowAmount}
              showDetails={true}
              paymentMethod={task.payment_method}
            />
          </div>

          {/* Status Message */}
          <div className="flex items-start gap-2">
            <span className={`text-base sm:text-lg ${statusMessage.color}`}>{statusMessage.icon}</span>
            <div className="flex-1">
              <p className={`text-xs sm:text-sm ${statusMessage.color}`}>
                {statusMessage.text}
              </p>
              {task.escrow_deposited_at && (
                <p className="text-[#888888] text-xs mt-1.5">
                  Deposited {new Date(task.escrow_deposited_at).toLocaleDateString()}
                </p>
              )}
              {task.escrow_released_at && (
                <p className="text-[#888888] text-xs mt-1.5">
                  Released {new Date(task.escrow_released_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Security Note */}
          {escrowStatus === 'deposited' && (
            <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.08)]">
              <div className="text-xs text-[#888888]">
                Payment protected. Funds released on proof approval or after the dispute window.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
