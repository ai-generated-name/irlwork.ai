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

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    platformFeePercent: 15,
    features: {
      maxActiveTasks: 3,
      prioritySupport: false,
      featuredProfile: false,
      advancedAnalytics: false,
      customBranding: false,
      apiAccess: false,
      reducedFees: false,
      unlimitedTasks: false,
    },
  },
  pro: {
    name: 'Pro',
    monthlyPriceCents: 1999, // $19.99/mo
    yearlyPriceCents: 19188, // $15.99/mo billed yearly ($191.88/yr)
    platformFeePercent: 10,
    features: {
      maxActiveTasks: 15,
      prioritySupport: true,
      featuredProfile: true,
      advancedAnalytics: true,
      customBranding: false,
      apiAccess: true,
      reducedFees: true,
      unlimitedTasks: false,
    },
  },
  business: {
    name: 'Business',
    monthlyPriceCents: 4999, // $49.99/mo
    yearlyPriceCents: 47988, // $39.99/mo billed yearly ($479.88/yr)
    platformFeePercent: 5,
    features: {
      maxActiveTasks: Infinity,
      prioritySupport: true,
      featuredProfile: true,
      advancedAnalytics: true,
      customBranding: true,
      apiAccess: true,
      reducedFees: true,
      unlimitedTasks: true,
    },
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
