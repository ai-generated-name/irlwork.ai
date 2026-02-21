/**
 * Shared constants for the irlwork.ai platform
 * Single source of truth — import this instead of redefining values.
 */

// Platform fee as an integer percentage.
// Usage: Math.round(amount * PLATFORM_FEE_PERCENT) / 100
const PLATFORM_FEE_PERCENT = 10;

module.exports = { PLATFORM_FEE_PERCENT };
