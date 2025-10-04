-- HVT Climbing Tracker - Initial Schema Migration
-- Creates all tables, indexes, and constraints for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique partial index to enforce single active session (FR-010)
CREATE UNIQUE INDEX idx_sessions_single_active
  ON sessions (status)
  WHERE status = 'active';

-- Index for common queries
CREATE INDEX idx_sessions_date ON sessions (date DESC);
CREATE INDEX idx_sessions_status ON sessions (status);

-- Climbers table
CREATE TABLE climbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  class TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for class filtering
CREATE INDEX idx_climbers_class ON climbers (class);

-- Session climbers (many-to-many with scores)
CREATE TABLE session_climbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  climber_id UUID NOT NULL REFERENCES climbers(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, climber_id)
);

-- Indexes for queries and joins
CREATE INDEX idx_session_climbers_session ON session_climbers (session_id);
CREATE INDEX idx_session_climbers_climber ON session_climbers (climber_id);
CREATE INDEX idx_session_climbers_rank ON session_climbers (session_id, rank);

-- Attempts table
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  climber_id UUID NOT NULL REFERENCES climbers(id) ON DELETE CASCADE,
  climb_number INTEGER NOT NULL,
  grade TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('flash', 'top', 'fail')),
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, climber_id, climb_number)
);

-- Indexes for queries and aggregation
CREATE INDEX idx_attempts_session_climber ON attempts (session_id, climber_id);
CREATE INDEX idx_attempts_climb_number ON attempts (session_id, climb_number);

-- Class lists table (for dropdown options)
CREATE TABLE class_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_class_lists_order ON class_lists (display_order);

-- Trigger function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climbers_updated_at
  BEFORE UPDATE ON climbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_climbers_updated_at
  BEFORE UPDATE ON session_climbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attempts_updated_at
  BEFORE UPDATE ON attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_lists_updated_at
  BEFORE UPDATE ON class_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Note: Using Cloudflare Zero Trust auth, but RLS provides defense in depth

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE climbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_climbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_lists ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (Cloudflare handles auth)
CREATE POLICY sessions_policy ON sessions FOR ALL USING (true);
CREATE POLICY climbers_policy ON climbers FOR ALL USING (true);
CREATE POLICY session_climbers_policy ON session_climbers FOR ALL USING (true);
CREATE POLICY attempts_policy ON attempts FOR ALL USING (true);
CREATE POLICY class_lists_policy ON class_lists FOR ALL USING (true);
