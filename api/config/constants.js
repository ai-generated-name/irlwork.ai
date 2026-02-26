/**
 * Shared constants for the irlwork.ai platform
 * Single source of truth — import this instead of redefining values.
 */

// Platform fee as an integer percentage.
// Usage: Math.round(amount * PLATFORM_FEE_PERCENT) / 100
const PLATFORM_FEE_PERCENT = 10;

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

// NOTE: The authoritative tier config is in api/config/tiers.js (getTierConfig).
// This is kept for backwards compatibility but tiers.js should be preferred.
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    platformFeePercent: 15,
    posterFeePercent: 5,
    taskLimitMonthly: 5,
  },
  builder: {
    name: 'Builder',
    monthlyPriceCents: 1000, // $10/mo
    yearlyPriceCents: 9000,  // $90/yr ($7.50/mo)
    platformFeePercent: 12.5,
    posterFeePercent: 2.5,
    taskLimitMonthly: Infinity,
  },
  pro: {
    name: 'Pro',
    monthlyPriceCents: 3000, // $30/mo
    yearlyPriceCents: 27000, // $270/yr ($22.50/mo)
    platformFeePercent: 10,
    posterFeePercent: 0,
    taskLimitMonthly: Infinity,
  },
};

/**
 * Get the effective platform fee for a user's subscription tier.
 */
function getPlatformFeeForTier(tier) {
  return SUBSCRIPTION_TIERS[tier]?.platformFeePercent ?? PLATFORM_FEE_PERCENT;
}

module.exports = {
  PLATFORM_FEE_PERCENT,
  SUBSCRIPTION_TIERS,
  getPlatformFeeForTier,
};
