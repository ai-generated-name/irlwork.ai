-- Migration: Add billing_period to subscriptions table
-- Supports monthly and annual billing intervals

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_period VARCHAR(10) DEFAULT 'monthly';

-- Backfill: all existing subscriptions are monthly
UPDATE subscriptions SET billing_period = 'monthly' WHERE billing_period IS NULL;
