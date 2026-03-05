/**
 * Shared constants for the irlwork.ai platform
 * Single source of truth — import this instead of redefining values.
 */

// Default platform fee (free tier). Use getTierConfig() for tier-aware fee math.
const PLATFORM_FEE_PERCENT = 15;

module.exports = {
  PLATFORM_FEE_PERCENT,
};
