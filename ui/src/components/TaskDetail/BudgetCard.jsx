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
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-4 sm:p-6 shadow-sm">
      {/* Budget amount */}
      <div className="text-center mb-3 sm:mb-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl sm:text-4xl font-bold text-[#059669] font-mono">
            ${budget}
          </span>
          {isHourly && <span className="text-base sm:text-lg text-[#525252]">/hr</span>}
        </div>
        <div className="text-xs sm:text-sm text-[#8A8A8A] mt-1">USDC</div>
      </div>

      {/* Estimated hours and total for hourly tasks */}
      {isHourly && durationHours > 0 && (
        <div className="border-t border-[rgba(26,26,26,0.08)] pt-2 sm:pt-3 mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-[#525252]">Estimated hours</span>
            <span className="text-[#1A1A1A] font-medium">~{durationHours}h</span>
          </div>
          {estimatedTotal && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-[#525252]">Est. total</span>
              <span className="text-[#1A1A1A] font-medium">${estimatedTotal.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Fixed price label */}
      {!isHourly && (
        <div className="text-center text-xs sm:text-sm text-[#525252]">Fixed Price</div>
      )}

      {/* Posted date */}
      {task.created_at && (
        <div className="border-t border-[rgba(26,26,26,0.08)] mt-3 sm:mt-4 pt-2 sm:pt-3 text-center">
          <span className="text-xs text-[#8A8A8A]">
            Posted {new Date(task.created_at).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Apply button */}
      {canApply && (
        <button
          onClick={onApply}
          className="w-full mt-3 sm:mt-5 py-2.5 sm:py-3 bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold rounded-xl transition-colors text-sm sm:text-base shadow-md"
        >
          Apply for This Task
        </button>
      )}

      {showSignIn && (
        <a
          href="/auth"
          className="block w-full mt-3 sm:mt-5 py-2.5 sm:py-3 bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold rounded-xl transition-colors text-sm sm:text-base shadow-md text-center no-underline"
        >
          Sign In to Apply
        </a>
      )}
    </div>
  );
}
