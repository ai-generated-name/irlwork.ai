-- ROLLBACK: No down migration. To rollback: DROP TABLE IF EXISTS task_type_registry CASCADE;
-- This will also drop the FK reference from tasks.task_type_id. Manual SQL required.

-- Task Type Registry: configurable registry of all supported task types and their validation rules.
-- Adding a new task type = adding a config row, not new code.

CREATE TABLE IF NOT EXISTS task_type_registry (
  id VARCHAR(50) PRIMARY KEY,                       -- e.g. 'cleaning', 'delivery'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,                   -- maps to existing task categories
  required_fields JSONB NOT NULL DEFAULT '[]',      -- field names required beyond base fields
  optional_fields JSONB NOT NULL DEFAULT '[]',      -- optional field names
  field_schemas JSONB NOT NULL DEFAULT '{}',         -- validation rules per field
  minimum_budget_usd DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  maximum_duration_hr DECIMAL(5,2) DEFAULT 168,
  prohibited_keywords JSONB NOT NULL DEFAULT '[]',
  requires_address BOOLEAN NOT NULL DEFAULT true,   -- whether private address is needed post-acceptance
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_type_registry_category ON task_type_registry(category);
CREATE INDEX IF NOT EXISTS idx_task_type_registry_active ON task_type_registry(is_active);
