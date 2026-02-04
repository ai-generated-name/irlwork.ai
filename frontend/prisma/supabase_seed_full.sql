-- irlwork.ai - Complete Supabase Setup
-- Run this in your Supabase SQL Editor:
-- https://tqoxllqofxbcwxskguuj.supabase.co/project/sql

-- Step 1: Disable RLS (for development)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- Step 2: Create tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'human',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bio TEXT,
  hourly_rate DECIMAL(10,2),
  skills TEXT,
  availability TEXT,
  location VARCHAR(255),
  timezone VARCHAR(100),
  agent_config TEXT,
  api_key VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  portfolio_urls TEXT,
  languages TEXT,
  response_time INT,
  completed_jobs INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  budget DECIMAL(10,2) NOT NULL,
  budget_type VARCHAR(50) DEFAULT 'fixed',
  estimated_hours DECIMAL(5,2),
  priority VARCHAR(50) DEFAULT 'normal',
  vehicle_type VARCHAR(50),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  required_skills TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  attachments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Step 3: Seed demo data
INSERT INTO users (id, email, password_hash, name, role, is_verified, api_key, agent_config) VALUES
('agent-demo-001', 'agent@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Demo AI Agent', 'agent', true, 'irl_5ced8081639d7991e5f35ae8d2edb923b0dda39a61124c9b', '{"mcpEnabled":true,"autoHire":false}')
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, title, description, completed_jobs, rating, review_count) VALUES
('agent-demo-001', 'AI Task Orchestrator', 'Automated agent that coordinates human workers for real-world tasks.', 47, 4.9, 42)
ON CONFLICT DO NOTHING;

-- Demo humans
INSERT INTO users (id, email, password_hash, name, role, bio, hourly_rate, skills, is_verified) VALUES
('human-001', 'sarah@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Sarah M.', 'human', 'Reliable delivery driver with 3 years experience.', 35, '["delivery","pickup","errands"]', true),
('human-002', 'mike@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Mike T.', 'human', 'Physical task specialist. Moving, assembly, heavy lifting.', 45, '["moving","assembly","cleaning"]', true),
('human-003', 'lisa@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Lisa K.', 'human', 'Pet care expert! Certified veterinary assistant.', 30, '["dog_walking","pet_sitting"]', true),
('human-004', 'james@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'James W.', 'human', 'Tech setup specialist.', 55, '["tech_setup","photography","assembly"]', true),
('human-005', 'emma@demo.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Emma L.', 'human', 'Event staff and promotional work.', 28, '["event_staff","stand_billboard","wait_line"]', true)
ON CONFLICT DO NOTHING;

-- Wallets for humans
INSERT INTO wallets (user_id, balance) VALUES
('human-001', 75),
('human-002', 120),
('human-003', 45),
('human-004', 90),
('human-005', 60)
ON CONFLICT DO NOTHING;

-- Demo jobs
INSERT INTO jobs (title, description, category, budget, priority, creator_id, status) VALUES
('Pickup and deliver Amazon package', 'Pick up a medium-sized package from Amazon Locker in Downtown.', 'delivery', 45, 'normal', 'agent-demo-001', 'open'),
('Stand with startup banner at tech conference', 'Stand with our banner at the tech conference entrance for 4 hours.', 'event_staff', 80, 'high', 'agent-demo-001', 'open'),
('Walk Golden Retriever twice daily', 'Morning and evening walks for a friendly Golden Retriever.', 'dog_walking', 50, 'normal', 'agent-demo-001', 'open'),
('Wait in line for product launch', 'Wait in line at the store for a limited edition product release.', 'wait_line', 100, 'urgent', 'agent-demo-001', 'open'),
('Assemble IKEA wardrobe', 'Assemble a wardrobe closet from IKEA. All tools provided.', 'assembly', 75, 'normal', 'agent-demo-001', 'open'),
('Grocery run for elderly neighbor', 'Pick up groceries from the list and deliver.', 'grocery', 35, 'normal', 'agent-demo-001', 'open'),
('Office cleaning after event', 'Light office cleaning after a corporate event.', 'cleaning', 100, 'normal', 'agent-demo-001', 'open'),
('Real estate photography', 'Take professional photos of a 2-bedroom apartment.', 'photography', 150, 'normal', 'agent-demo-001', 'open')
ON CONFLICT DO NOTHING;

-- API key
INSERT INTO api_keys (id, key, name, user_id) VALUES
('demo-key-001', 'irl_5ced8081639d7991e5f35ae8d2edb923b0dda39a61124c9b', 'Demo Production Key', 'agent-demo-001')
ON CONFLICT DO NOTHING;

-- Verify setup
SELECT 'Users created: ' || COUNT(*) FROM users;
SELECT 'Jobs created: ' || COUNT(*) FROM jobs;
