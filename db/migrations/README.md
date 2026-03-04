# Database Migrations

Numbered SQL migration files for the irlwork.ai platform. Each file is **idempotent** — safe to run multiple times using `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `COALESCE` guards.

## Run Order

Migrations must be run in numerical order:

| # | File | Description |
|---|------|-------------|
| 001 | `../api/migrations/001_add_auto_release.sql` | Auto-release timer columns (proof_submitted_at, review_deadline) |
| 002 | `002_escrow_and_cancellation.sql` | Auth-hold escrow model, revision system, reputation tracking, status constraints |
| 003 | `003_attachments_and_webhooks.sql` | Message attachments, instructions attachments, webhook retry queue |
| 004 | `004_deadline_enforcement.sql` | Extension requests table, submitted_late flag, deadline_warning_sent tiered integer |

## How to Run

Against your Supabase project via the SQL Editor:

```bash
# Copy and paste each file's contents into the Supabase SQL Editor
# Run them in order: 001 → 002 → 003
```

Or via `psql`:

```bash
psql $DATABASE_URL -f db/migrations/002_escrow_and_cancellation.sql
psql $DATABASE_URL -f db/migrations/003_attachments_and_webhooks.sql
```

## Idempotency

All migrations are designed to be re-runnable:

- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — won't fail if column exists
- `CREATE TABLE IF NOT EXISTS` — won't fail if table exists
- `CREATE INDEX IF NOT EXISTS` — won't fail if index exists
- `CREATE OR REPLACE FUNCTION` — overwrites existing function safely
- `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER` — prevents duplicate triggers
- Backfill `UPDATE` statements use `WHERE ... = 0` guards to prevent re-incrementing

## Adding New Migrations

1. Create a new file: `004_description.sql`
2. Use idempotent patterns (IF NOT EXISTS, etc.)
3. Add the file to the run order table above
4. Test by running the migration twice — second run should be a no-op
