-- HVT Climbing Tracker - Seed Data
-- Provides initial data for testing and development

-- Insert class list options (FR-004)
INSERT INTO class_lists (class_name, display_order) VALUES
  ('5a', 10),
  ('5b', 20),
  ('5c', 30),
  ('6a', 40),
  ('6a+', 50),
  ('6b', 60),
  ('6b+', 70),
  ('6c', 80),
  ('6c+', 90),
  ('7a', 100),
  ('7a+', 110),
  ('7b', 120),
  ('7b+', 130),
  ('7c', 140),
  ('7c+', 150),
  ('8a', 160),
  ('8a+', 170),
  ('8b', 180),
  ('8b+', 190),
  ('8c', 200)
ON CONFLICT (class_name) DO NOTHING;

-- Sample climbers for testing
INSERT INTO climbers (id, name, class) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Alice Johnson', '6b'),
  ('22222222-2222-2222-2222-222222222222', 'Bob Smith', '7a'),
  ('33333333-3333-3333-3333-333333333333', 'Carol Williams', '6a+'),
  ('44444444-4444-4444-4444-444444444444', 'David Brown', '7b'),
  ('55555555-5555-5555-5555-555555555555', 'Eve Davis', '6c')
ON CONFLICT (name) DO NOTHING;

-- Sample session for testing
INSERT INTO sessions (id, name, date, location, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Session 2025-01-15', '2025-01-15', 'Boulder Hall Downtown', 'completed')
ON CONFLICT (id) DO NOTHING;

-- Link climbers to test session
INSERT INTO session_climbers (session_id, climber_id, total_points, rank) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 0, NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 0, NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 0, NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 0, NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 0, NULL)
ON CONFLICT (session_id, climber_id) DO NOTHING;

-- Sample attempts for test session
-- Alice: 2 climbs (flash 6a + top 6b) = 1000 + 800 = 1800 points
INSERT INTO attempts (session_id, climber_id, climb_number, grade, status, points) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1, '6a', 'flash', 1000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 2, '6b', 'top', 800)
ON CONFLICT (session_id, climber_id, climb_number) DO NOTHING;

-- Bob: 3 climbs (flash 7a + flash 7a+ + top 7b) = 1000 + 1000 + 800 = 2800 points
INSERT INTO attempts (session_id, climber_id, climb_number, grade, status, points) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 1, '7a', 'flash', 1000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 2, '7a+', 'flash', 1000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 3, '7b', 'top', 800)
ON CONFLICT (session_id, climber_id, climb_number) DO NOTHING;

-- Carol: 1 climb (top 6a) = 800 points
INSERT INTO attempts (session_id, climber_id, climb_number, grade, status, points) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 1, '6a', 'top', 800)
ON CONFLICT (session_id, climber_id, climb_number) DO NOTHING;

-- David: 2 climbs (fail 7c + flash 7b) = 100 + 1000 = 1100 points
INSERT INTO attempts (session_id, climber_id, climb_number, grade, status, points) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 1, '7c', 'fail', 100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 2, '7b', 'flash', 1000)
ON CONFLICT (session_id, climber_id, climb_number) DO NOTHING;

-- Eve: 0 attempts (should be hidden from leaderboard per FR-021)

-- Trigger score recalculation for the test session
-- This will set: Bob (2800, rank 1), Alice (1800, rank 2), David (1100, rank 3), Carol (800, rank 4), Eve (0, NULL)
SELECT calculate_climber_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');
SELECT calculate_climber_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');
SELECT calculate_climber_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333');
SELECT calculate_climber_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444');
SELECT calculate_climber_score('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555');
