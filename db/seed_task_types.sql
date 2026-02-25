-- ROLLBACK: No down migration. To rollback:
--   DELETE FROM task_type_registry WHERE id IN ('cleaning','delivery','handyman','photography','personal_assistant','errands','tech_setup');
-- Uses ON CONFLICT DO NOTHING so re-running is safe.

-- Seed initial task types for the validation system.

INSERT INTO task_type_registry (id, display_name, description, category, required_fields, optional_fields, field_schemas, minimum_budget_usd, maximum_duration_hr, prohibited_keywords, requires_address, is_active)
VALUES

-- Cleaning
('cleaning', 'Home Cleaning', 'House cleaning, apartment cleaning, or specialty cleaning services', 'cleaning',
  '["title", "description", "datetime_start", "duration_hours", "budget_usd", "location_zone"]',
  '["skills_required", "requirements", "private_address", "private_notes", "private_contact"]',
  '{
    "duration_hours": { "type": "number", "min": 1, "max": 12 },
    "budget_usd": { "type": "number", "min": 15 },
    "skills_required": {
      "type": "array",
      "allowed_values": ["standard_clean", "deep_clean", "move_out_clean", "laundry", "dishes", "windows", "organizing"]
    },
    "requirements": {
      "type": "array",
      "allowed_values": ["supplies_provided", "supplies_needed", "pet_friendly", "no_pets", "parking_available"]
    },
    "description": { "type": "string", "min_length": 20, "max_length": 1000 },
    "title": { "type": "string", "min_length": 5, "max_length": 200 }
  }',
  15.00, 12, '[]', true, true),

-- Delivery / Errand
('delivery', 'Delivery / Errand', 'Package delivery, grocery pickup, or general errands', 'errands',
  '["title", "description", "datetime_start", "budget_usd", "location_zone"]',
  '["duration_hours", "skills_required", "requirements", "private_address", "private_notes", "private_contact"]',
  '{
    "budget_usd": { "type": "number", "min": 5 },
    "duration_hours": { "type": "number", "min": 0.5, "max": 8 },
    "description": { "type": "string", "min_length": 20, "max_length": 1000 },
    "title": { "type": "string", "min_length": 5, "max_length": 200 }
  }',
  5.00, 8, '[]', true, true),

-- Handyman / Repairs
('handyman', 'Handyman / Repairs', 'Home repairs, furniture assembly, plumbing, electrical, and general maintenance', 'home_services',
  '["title", "description", "datetime_start", "duration_hours", "budget_usd", "location_zone", "skills_required"]',
  '["requirements", "private_address", "private_notes", "private_contact"]',
  '{
    "duration_hours": { "type": "number", "min": 1, "max": 8 },
    "budget_usd": { "type": "number", "min": 25 },
    "skills_required": {
      "type": "array",
      "min_items": 1,
      "allowed_values": ["plumbing", "electrical", "carpentry", "painting", "furniture_assembly", "appliance_repair", "general"]
    },
    "description": { "type": "string", "min_length": 30, "max_length": 1500 },
    "title": { "type": "string", "min_length": 5, "max_length": 200 }
  }',
  25.00, 8, '[]', true, true),

-- Photography
('photography', 'Photography', 'Event photography, portrait sessions, product photography, and real estate photography', 'professional',
  '["title", "description", "datetime_start", "duration_hours", "budget_usd", "location_zone"]',
  '["skills_required", "requirements", "private_address", "private_notes", "private_contact"]',
  '{
    "duration_hours": { "type": "number", "min": 1, "max": 12 },
    "budget_usd": { "type": "number", "min": 25 },
    "skills_required": {
      "type": "array",
      "allowed_values": ["portrait", "event", "product", "real_estate", "food", "fashion", "wedding", "headshots"]
    },
    "requirements": {
      "type": "array",
      "allowed_values": ["own_equipment", "studio_provided", "outdoor", "indoor", "editing_included", "raw_files"]
    },
    "description": { "type": "string", "min_length": 20, "max_length": 1500 },
    "title": { "type": "string", "min_length": 5, "max_length": 200 }
  }',
  25.00, 12, '[]', true, true),

-- Personal Assistant
('personal_assistant', 'Personal Assistant', 'Administrative tasks, scheduling, research, data entry, and general assistance', 'professional',
  '["title", "description", "datetime_start", "budget_usd"]',
  '["duration_hours", "skills_required", "requirements", "location_zone", "private_address", "private_notes", "private_contact"]',
  '{
    "budget_usd": { "type": "number", "min": 15 },
    "duration_hours": { "type": "number", "min": 1, "max": 168 },
    "skills_required": {
      "type": "array",
      "allowed_values": ["scheduling", "data_entry", "research", "email_management", "phone_calls", "filing", "translation", "social_media"]
    },
    "description": { "type": "string", "min_length": 20, "max_length": 2000 },
    "title": { "type": "string", "min_length": 5, "max_length": 200 }
  }',
  15.00, 168, '[]', false, true),

-- Errands
('errands', 'Errands', 'General errands including shopping, returns, waiting in line, and miscellaneous tasks', 'errands',
  '["title", "description", "datetime_start", "budget_usd", "location_zone"]',
  '["duration_hours", "requirements", "private_address", "private_notes", "private_contact"]',
  '{
    "budget_usd": { "type": "number", "min": 10 },
    "duration_hours": { "type": "number", "min": 0.5, "max": 8 },
    "description": { "type": "string", "min_length": 20, "max_length": 1000 },
    "title": { "type": "string", "min_length": 5, "max_length": 200 }
  }',
  10.00, 8, '[]', true, true),

-- Tech Setup
('tech_setup', 'Tech Setup / IT Support', 'Computer setup, network configuration, smart home installation, and tech troubleshooting', 'professional',
  '["title", "description", "datetime_start", "duration_hours", "budget_usd"]',
  '["skills_required", "requirements", "location_zone", "private_address", "private_notes", "private_contact"]',
  '{
    "duration_hours": { "type": "number", "min": 1, "max": 12 },
    "budget_usd": { "type": "number", "min": 20 },
    "skills_required": {
      "type": "array",
      "allowed_values": ["computer_setup", "network", "smart_home", "printer", "software_install", "data_recovery", "troubleshooting"]
    },
    "description": { "type": "string", "min_length": 20, "max_length": 1500 },
    "title": { "type": "string", "min_length": 5, "max_length": 200 }
  }',
  20.00, 12, '[]', false, true)

ON CONFLICT (id) DO NOTHING;
