-- Atomic USDC balance update + ledger entry
--
-- Prevents read-modify-write races and ensures balance + ledger are always in sync.
-- All server code should call this via supabase.rpc('update_usdc_balance', {...})
-- instead of separate UPDATE users + INSERT usdc_ledger calls.
--
-- Parameters:
--   p_user_id          UUID    - The user whose balance to update
--   p_available_delta  NUMERIC - Amount to add to usdc_available_balance (negative = debit)
--   p_escrow_delta     NUMERIC - Amount to add to usdc_escrow_balance (negative = debit)
--   p_task_id          UUID    - Optional task ID for the ledger entry
--   p_ledger_type      VARCHAR - Ledger entry type (deposit, escrow_lock, escrow_release, payout, withdrawal, refund, platform_fee, escrow_reversal)
--   p_ledger_amount    NUMERIC - The display amount for the ledger (often same as delta, but can differ for escrow ops)
--   p_circle_tx_id     TEXT    - Optional Circle transaction ID
--   p_tx_hash          VARCHAR - Optional on-chain transaction hash
--   p_description      TEXT    - Human-readable description
--
-- Returns: new_available, new_escrow (the updated balance values)
-- Raises: exception if resulting balance would be negative

CREATE OR REPLACE FUNCTION update_usdc_balance(
  p_user_id UUID,
  p_available_delta NUMERIC(18,6) DEFAULT 0,
  p_escrow_delta NUMERIC(18,6) DEFAULT 0,
  p_task_id UUID DEFAULT NULL,
  p_ledger_type VARCHAR(30) DEFAULT NULL,
  p_ledger_amount NUMERIC(18,6) DEFAULT NULL,
  p_circle_tx_id TEXT DEFAULT NULL,
  p_tx_hash VARCHAR(128) DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_available NUMERIC, new_escrow NUMERIC)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_available NUMERIC(18,6);
  v_new_escrow NUMERIC(18,6);
BEGIN
  -- Atomic balance update with row-level lock (SELECT FOR UPDATE via UPDATE RETURNING)
  UPDATE users
  SET usdc_available_balance = COALESCE(usdc_available_balance, 0) + p_available_delta,
      usdc_escrow_balance = COALESCE(usdc_escrow_balance, 0) + p_escrow_delta,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING usdc_available_balance, usdc_escrow_balance
  INTO v_new_available, v_new_escrow;

  -- Guard against negative balances
  IF v_new_available < 0 THEN
    RAISE EXCEPTION 'Insufficient available balance: would be % after delta %', v_new_available, p_available_delta;
  END IF;
  IF v_new_escrow < 0 THEN
    RAISE EXCEPTION 'Insufficient escrow balance: would be % after delta %', v_new_escrow, p_escrow_delta;
  END IF;

  -- Insert ledger entry in the same transaction (if type provided)
  IF p_ledger_type IS NOT NULL THEN
    INSERT INTO usdc_ledger (
      user_id, task_id, type, amount,
      balance_after, escrow_balance_after,
      circle_transaction_id, tx_hash, description
    ) VALUES (
      p_user_id, p_task_id, p_ledger_type, p_ledger_amount,
      v_new_available, v_new_escrow,
      p_circle_tx_id, p_tx_hash, p_description
    );
  END IF;

  new_available := v_new_available;
  new_escrow := v_new_escrow;
  RETURN NEXT;
END;
$$;
