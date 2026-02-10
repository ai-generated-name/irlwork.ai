import React from 'react';

export default function BudgetCard({ task, user, onApply }) {
  if (!task) return null;

  const isHourly = task.budget_type === 'hourly';
  const budget = Number(task.budget) || 0;
  const durationHours = Number(task.duration_hours) || 0;
  const estimatedTotal = isHourly && durationHours > 0 ? budget * durationHours : null;

  const isOwner = user && task.agent_id === user.id;
  const canApply = task.status === 'open' && user && !isOwner;
  const showSignIn = task.status === 'open' && !user;

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-4 shadow-sm">
      {/* Budget amount */}
      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-[#059669] font-mono">
            ${budget}
          </span>
          {isHourly && <span className="text-lg text-[#525252]">/hr</span>}
        </div>
        <div className="text-sm text-[#8A8A8A] mt-1">USDC</div>
      </div>

      {/* Estimated hours and total for hourly tasks */}
      {isHourly && durationHours > 0 && (
        <div className="border-t border-[rgba(26,26,26,0.08)] pt-3 mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#525252]">Estimated hours</span>
            <span className="text-[#1A1A1A] font-medium">~{durationHours}h</span>
          </div>
          {estimatedTotal && (
            <div className="flex justify-between text-sm">
              <span className="text-[#525252]">Est. total</span>
              <span className="text-[#1A1A1A] font-medium">${estimatedTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Fixed price label */}
      {!isHourly && (
        <div className="text-center text-sm text-[#525252]">Fixed Price</div>
      )}

      {/* Apply button */}
      {canApply && (
        <button
          onClick={onApply}
          className="w-full mt-5 py-3 bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold rounded-xl transition-colors text-base shadow-md"
        >
          Apply for This Task
        </button>
      )}

      {showSignIn && (
        <a
          href="/auth"
          className="block w-full mt-5 py-3 bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold rounded-xl transition-colors text-base shadow-md text-center no-underline"
        >
          Sign In to Apply
        </a>
      )}
    </div>
  );
}
