/**
 * Subscription tier configuration — single source of truth.
 * Import this instead of using PLATFORM_FEE_PERCENT for tier-aware fee math.
 */

const TIERS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    worker_fee_percent: 15,
    poster_fee_percent: 5,
    task_limit_monthly: 5,
    worker_priority: 0,
    badge: null,
    badge_color: null,
  },
  builder: {
    name: 'Builder',
    price_monthly: 10,
    price_annual: 90,
    worker_fee_percent: 12.5,
    poster_fee_percent: 2.5,
    task_limit_monthly: Infinity,
    worker_priority: 1,
    badge: 'builder',
    badge_color: '#3B82F6',
  },
  pro: {
    name: 'Pro',
    price_monthly: 30,
    price_annual: 270,
    worker_fee_percent: 10,
    poster_fee_percent: 0,
    task_limit_monthly: Infinity,
    worker_priority: 2,
    badge: 'pro',
    badge_color: '#F59E0B',
  },
};

function getTierConfig(tierName) {
  return TIERS[tierName] || TIERS.free;
}

function calculateWorkerFee(escrowAmountCents, workerTier) {
  const config = getTierConfig(workerTier);
  return Math.round(escrowAmountCents * config.worker_fee_percent / 100);
}

function calculatePosterFee(budgetCents, posterTier) {
  const config = getTierConfig(posterTier);
  return Math.round(budgetCents * config.poster_fee_percent / 100);
}

function canPostTask(tasksPostedThisMonth, posterTier) {
  const config = getTierConfig(posterTier);
  return tasksPostedThisMonth < config.task_limit_monthly;
}

module.exports = { TIERS, getTierConfig, calculateWorkerFee, calculatePosterFee, canPostTask };
