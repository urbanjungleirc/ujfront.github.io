# Data Model: HVT Climbing Session Tracker

**Date**: 2025-10-04
**Database**: PostgreSQL (via Supabase or self-hosted)

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌────────────┐
│ ClassLists  │         │    Sessions      │         │  Climbers  │
│─────────────│         │──────────────────│         │────────────│
│ id          │         │ id               │         │ id         │
│ name        │         │ name             │         │ name       │
│ climber_ids │────────┐│ date             │┌────────│ email      │
│ created_at  │        ││ grade_range      ││        │ created_at │
│ updated_at  │        ││ scoring_config   ││        └────────────┘
└─────────────┘        ││ status           ││               │
                       ││ created_at       ││               │
                       ││ updated_at       ││               │
                       │└──────────────────┘│               │
                       │         │          │               │
                       │         │          │               │
                       │    ┌────▼──────────▼────┐          │
                       │    │ SessionClimbers    │          │
                       │    │────────────────────│          │
                       └───▶│ session_id (FK)    │◀─────────┘
                            │ climber_id (FK)    │
                            │ joined_at          │
                            └────────────────────┘
                                     │
                                     │
                            ┌────────▼────────┐
                            │    Attempts     │
                            │─────────────────│
                            │ id              │
                            │ session_id (FK) │
                            │ climber_id (FK) │
                            │ grade           │
                            │ send_type       │
                            │ count           │
                            │ updated_at      │
                            └─────────────────┘
```

## Table Definitions

### 1. sessions

Represents a climbing training session with configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique session identifier |
| name | text | NOT NULL | Session name (e.g., "Monday HVT") |
| date | date | NOT NULL | Session date |
| grade_range | text[] | NOT NULL, CHECK (array_length >= 1) | Array of enabled grades (e.g., ['V0','V1'...'V10']) |
| scoring_config | jsonb | NOT NULL | Scoring point values: `{ "V5": { "flash": 10, "top": 5, "attempt": 1 }, ... }` |
| status | text | NOT NULL, DEFAULT 'active', CHECK (status IN ('active', 'archived')) | Session state |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_sessions_status` ON `status` (filter active session - FR-010)
- `idx_sessions_date` ON `date DESC` (list sessions by date)

**Constraints**:
- CHECK: Only one session with `status='active'` at a time (FR-010) - enforced via unique partial index
- CHECK: `array_length(grade_range, 1) >= 1` (FR-004: at least one grade)
- CHECK: `scoring_config` validates all grades have all send types with values >= 0

**Row-Level Security (RLS)**:
- Policy: Allow all authenticated users (Cloudflare provides auth)
- Future: Restrict by organization if multi-tenancy added

### 2. climbers

Represents individual climbers (reusable across sessions).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique climber identifier |
| name | text | NOT NULL | Climber name |
| email | text | NULL | Optional email address (FR-050) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_climbers_name` ON `name` (search by name)

**Constraints**:
- UNIQUE: `(name, email)` - prevent duplicate climbers
- CHECK: `email ~ '^[^@]+@[^@]+\.[^@]+$'` if not null (basic email validation)

**RLS**: Same as sessions

### 3. session_climbers

Junction table linking sessions and climbers (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| session_id | uuid | NOT NULL, REFERENCES sessions(id) ON DELETE CASCADE | Session reference |
| climber_id | uuid | NOT NULL, REFERENCES climbers(id) ON DELETE RESTRICT | Climber reference |
| joined_at | timestamptz | NOT NULL, DEFAULT now() | When climber added to session |

**Indexes**:
- PRIMARY KEY: `(session_id, climber_id)`
- `idx_session_climbers_session` ON `session_id` (lookup climbers in session)

**Constraints**:
- Foreign keys cascade on session delete, restrict on climber delete (preserve data)

**RLS**: Same as sessions

### 4. attempts

Records climber performance data within a session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique attempt identifier |
| session_id | uuid | NOT NULL, REFERENCES sessions(id) ON DELETE CASCADE | Session reference |
| climber_id | uuid | NOT NULL, REFERENCES climbers(id) ON DELETE CASCADE | Climber reference |
| grade | text | NOT NULL, CHECK (grade ~ '^V([0-9]|1[0-7])$') | Boulder grade (V0-V17) |
| send_type | text | NOT NULL, CHECK (send_type IN ('flash', 'top', 'attempt')) | Send classification |
| count | integer | NOT NULL, DEFAULT 0, CHECK (count >= 0) | Number of occurrences |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update (for conflict resolution - FR-029) |

**Indexes**:
- `idx_attempts_session` ON `session_id` (get all attempts for session)
- `idx_attempts_composite` ON `(session_id, climber_id, grade, send_type)` (upsert key)
- `idx_attempts_updated` ON `updated_at DESC` (conflict resolution)

**Constraints**:
- UNIQUE: `(session_id, climber_id, grade, send_type)` - one row per combination
- Foreign keys cascade delete (attempts deleted with session/climber)

**RLS**: Same as sessions

**Triggers**:
- `update_updated_at_column` BEFORE UPDATE - set `updated_at = now()`

### 5. class_lists

Pre-defined groups of climbers for quick roster loading (FR-051, FR-052).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique class list identifier |
| name | text | NOT NULL, UNIQUE | Class list name (e.g., "Advanced Tuesday") |
| climber_ids | uuid[] | NOT NULL, CHECK (array_length >= 1) | Array of climber UUIDs |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_class_lists_name` ON `name` (search by name)
- `idx_class_lists_climber_ids` GIN `(climber_ids)` (contains search)

**Constraints**:
- CHECK: `array_length(climber_ids, 1) >= 1` (at least one climber)
- Foreign key validation: Ensure all climber_ids exist (via trigger or app logic)

**RLS**: Same as sessions

## Validation Rules

### Session Creation (FR-004)
```sql
-- Enforced via CHECK constraints and app logic
- name: NOT NULL, length 1-100
- date: NOT NULL, valid date
- grade_range: NOT NULL, array length >= 1, all values match '^V([0-9]|1[0-7])$'
- scoring_config: NOT NULL, JSONB with structure:
  {
    "V0": { "flash": number >= 0, "top": number >= 0, "attempt": number >= 0 },
    "V1": { ... },
    ...
  }
- At least one climber in session_climbers (enforced app-side)
```

### Attempt Updates (FR-018, FR-027)
```sql
-- Upsert pattern for offline sync
INSERT INTO attempts (session_id, climber_id, grade, send_type, count, updated_at)
VALUES ($1, $2, $3, $4, $5, now())
ON CONFLICT (session_id, climber_id, grade, send_type)
DO UPDATE SET
  count = EXCLUDED.count,
  updated_at = EXCLUDED.updated_at
WHERE attempts.updated_at < EXCLUDED.updated_at; -- Conflict resolution (FR-029)
```

### Single Active Session (FR-010)
```sql
-- Unique partial index enforces one active session
CREATE UNIQUE INDEX idx_single_active_session
ON sessions (status)
WHERE status = 'active';

-- Attempting to create second active session raises error:
-- ERROR: duplicate key value violates unique constraint "idx_single_active_session"
```

### Grade Range Enforcement (FR-012, FR-053)
```sql
-- Check grade is in session's grade_range (app-side before insert)
SELECT grade = ANY(grade_range)
FROM sessions
WHERE id = $session_id;
```

## Scoring Calculation (FR-030, FR-032)

**Formula**: `Total Score = Σ (count × grade_point_value × send_type_multiplier)`

**Implementation** (as database function for consistency):

```sql
CREATE OR REPLACE FUNCTION calculate_climber_score(
  p_session_id uuid,
  p_climber_id uuid
) RETURNS numeric AS $$
DECLARE
  v_total numeric := 0;
  v_attempt RECORD;
  v_scoring_config jsonb;
BEGIN
  -- Get scoring config
  SELECT scoring_config INTO v_scoring_config
  FROM sessions
  WHERE id = p_session_id;

  -- Sum scores for all attempts
  FOR v_attempt IN
    SELECT grade, send_type, count
    FROM attempts
    WHERE session_id = p_session_id
      AND climber_id = p_climber_id
  LOOP
    v_total := v_total + (
      v_attempt.count *
      (v_scoring_config -> v_attempt.grade ->> v_attempt.send_type)::numeric
    );
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Retroactive Recalculation** (FR-032):
- Triggered when `scoring_config` updated on `sessions` table
- App recalculates all scores by calling `calculate_climber_score()` for each climber
- Results dashboard subscribed to `attempts` table updates, reflects new totals

## State Transitions

### Session Lifecycle

```
    [create]
       │
       ▼
  ┌─────────┐
  │ active  │◀──┐
  └─────────┘   │
       │        │
       │ [archive]  [reset]
       ▼        │
  ┌─────────┐  │
  │archived │──┘
  └─────────┘
       │
       │ [delete]
       ▼
   [deleted]
```

**Rules**:
- `active → archived`: Archive session (FR-003)
- `active → active` (reset): Archive current, create new with same config (FR-003)
- `archived → deleted`: Manual deletion (FR-007)
- `archived → active`: NOT ALLOWED (FR-006)

### Attempt Lifecycle

```
  [record]
     │
     ▼
┌──────────┐
│ count=N  │
└──────────┘
     │
     │ [increment/decrement]
     ▼
┌──────────┐
│ count=M  │
└──────────┘
     │
     │ [session archived]
     ▼
  [frozen]
```

**Rules**:
- Attempts for `active` session: Can be updated (FR-011-FR-020)
- Attempts for `archived` session: Read-only (FR-006)
- Decrement blocked at count=0 (app validation)

## Migration Script (Supabase)

```sql
-- migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  grade_range text[] NOT NULL,
  scoring_config jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_grade_range_length CHECK (array_length(grade_range, 1) >= 1),
  CONSTRAINT chk_status CHECK (status IN ('active', 'archived'))
);

CREATE TABLE climbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_email CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT unq_climber UNIQUE (name, email)
);

CREATE TABLE session_climbers (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  climber_id uuid NOT NULL REFERENCES climbers(id) ON DELETE RESTRICT,
  joined_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (session_id, climber_id)
);

CREATE TABLE attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  climber_id uuid NOT NULL REFERENCES climbers(id) ON DELETE CASCADE,
  grade text NOT NULL,
  send_type text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_grade CHECK (grade ~ '^V([0-9]|1[0-7])$'),
  CONSTRAINT chk_send_type CHECK (send_type IN ('flash', 'top', 'attempt')),
  CONSTRAINT chk_count CHECK (count >= 0),
  CONSTRAINT unq_attempt UNIQUE (session_id, climber_id, grade, send_type)
);

CREATE TABLE class_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  climber_ids uuid[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_climber_ids_length CHECK (array_length(climber_ids, 1) >= 1)
);

-- Create indexes
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_date ON sessions(date DESC);
CREATE UNIQUE INDEX idx_single_active_session ON sessions(status) WHERE status = 'active';

CREATE INDEX idx_climbers_name ON climbers(name);

CREATE INDEX idx_session_climbers_session ON session_climbers(session_id);

CREATE INDEX idx_attempts_session ON attempts(session_id);
CREATE INDEX idx_attempts_composite ON attempts(session_id, climber_id, grade, send_type);
CREATE INDEX idx_attempts_updated ON attempts(updated_at DESC);

CREATE INDEX idx_class_lists_name ON class_lists(name);
CREATE INDEX idx_class_lists_climber_ids ON class_lists USING GIN (climber_ids);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_climbers_updated_at BEFORE UPDATE ON climbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_lists_updated_at BEFORE UPDATE ON class_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: attempts.updated_at set explicitly in upsert for conflict resolution

-- Create scoring calculation function
CREATE OR REPLACE FUNCTION calculate_climber_score(
  p_session_id uuid,
  p_climber_id uuid
) RETURNS numeric AS $$
DECLARE
  v_total numeric := 0;
  v_attempt RECORD;
  v_scoring_config jsonb;
BEGIN
  SELECT scoring_config INTO v_scoring_config
  FROM sessions WHERE id = p_session_id;

  FOR v_attempt IN
    SELECT grade, send_type, count
    FROM attempts
    WHERE session_id = p_session_id AND climber_id = p_climber_id
  LOOP
    v_total := v_total + (
      v_attempt.count *
      (v_scoring_config -> v_attempt.grade ->> v_attempt.send_type)::numeric
    );
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable Row-Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE climbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_climbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated users - Cloudflare provides auth)
CREATE POLICY "Allow authenticated access" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON climbers FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON session_climbers FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON attempts FOR ALL USING (true);
CREATE POLICY "Allow authenticated access" ON class_lists FOR ALL USING (true);
```

## Data Size Estimates

**Assumptions**:
- 100 sessions over 6 months
- 15 climbers/session average
- 50 attempts/climber/session average (18 grades × 3 types, ~30% utilized)

**Storage**:
- Sessions: 100 rows × 1KB = 100KB
- Climbers: 50 unique × 0.5KB = 25KB
- SessionClimbers: 100 sessions × 15 climbers = 1,500 rows × 100B = 150KB
- Attempts: 100 × 15 × 50 = 75,000 rows × 200B = 15MB
- ClassLists: 10 lists × 1KB = 10KB

**Total**: ~15MB (well within 500MB Supabase free tier)

**Realtime Messages** (debounced):
- 20 active climbers × 50 updates/session × 0.3 (30% debounce reduction) = ~300 messages/session
- 20 sessions/month × 300 = 6,000 messages/month
- Dashboard subscriptions: ~500 messages/month (30s polling × 20 sessions)
- **Total**: ~6,500 messages/month (within 50k limit)

---

**Data Model Status**: COMPLETE ✅
**Next**: Generate API contracts (OpenAPI)
