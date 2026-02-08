-- Blind Rating Window Implementation
-- Creates a ratings table where ratings are hidden until both parties rate or 72 hours pass

CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ratee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_score INTEGER NOT NULL CHECK (rating_score >= 1 AND rating_score <= 5),
    comment TEXT,
    visible_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure each party can only rate once per task
    UNIQUE(task_id, rater_id),

    -- Ensure you can't rate yourself
    CHECK (rater_id != ratee_id)
);

-- Index for finding ratings by task (to check if both parties have rated)
CREATE INDEX IF NOT EXISTS idx_ratings_task_id ON ratings(task_id);

-- Index for finding ratings by ratee (to calculate user ratings)
CREATE INDEX IF NOT EXISTS idx_ratings_ratee_id ON ratings(ratee_id);

-- Index for finding ratings by rater
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON ratings(rater_id);

-- Index for finding ratings that need visibility updates (for cron job)
CREATE INDEX IF NOT EXISTS idx_ratings_visibility
    ON ratings(created_at)
    WHERE visible_at IS NULL;

-- Function to update visible_at when second rating comes in
CREATE OR REPLACE FUNCTION update_rating_visibility()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is the second rating for this task
    IF (SELECT COUNT(*) FROM ratings WHERE task_id = NEW.task_id) = 2 THEN
        -- Both parties have rated, make both ratings visible immediately
        UPDATE ratings
        SET visible_at = NOW()
        WHERE task_id = NEW.task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update visibility when second rating comes in
DROP TRIGGER IF EXISTS trigger_update_rating_visibility ON ratings;
CREATE TRIGGER trigger_update_rating_visibility
    AFTER INSERT ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_rating_visibility();

-- Add index to track if a task is eligible for rating
-- (task must be paid or have dispute resolved)
CREATE INDEX IF NOT EXISTS idx_tasks_rating_eligible
    ON tasks(status, proof_submitted_at)
    WHERE status IN ('paid', 'disputed');
