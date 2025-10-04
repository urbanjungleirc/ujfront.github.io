# Implementation Plan: High Volume Training Climbing Session Tracker

**Branch**: `001-project-description-md` | **Date**: 2025-10-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-project-description-md/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Loaded successfully - 62 functional requirements identified
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → All clarifications resolved in spec
   → Technical constraints provided: Supabase (free tier), JavaScript, GitHub Pages, Docker portability
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → Constitution template not yet customized - proceeding with standard web app practices
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → Research technical decisions for offline-first, real-time updates, Supabase integration
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

A climbing training session tracker enabling coaches to record 10-20 climbers' performance across V0-V17 grades with Flash/Top/Attempt classifications. Features include:
- **Input UI**: Touch-optimized rapid data entry with offline-first support
- **Results Dashboard**: Real-time public display with mixed charts and rankings
- **Session Management**: Clone, reset, archive with configurable scoring
- **Technical Approach**: Static SPA with Supabase backend, GitHub Pages deployment, offline-capable with sync queue

## Technical Context

**Language/Version**: JavaScript (ES2022+), Node.js 20+
**Primary Dependencies**:
- Frontend: React 18, Vite, TanStack Query, Zustand (state), Chart.js
- Backend: Supabase (PostgreSQL + Realtime), Supabase JS Client v2
- Offline: Workbox (service worker), IndexedDB for local queue

**Storage**: Supabase PostgreSQL (free tier) with Realtime subscriptions; portable to self-hosted PostgreSQL + Docker
**Testing**: Vitest, React Testing Library, Playwright (E2E)
**Target Platform**: Modern browsers (Chrome/Safari/Firefox last 2 versions), responsive 360px-1920px
**Project Type**: Web (SPA frontend + Supabase backend)
**Performance Goals**:
- <100ms UI feedback on input
- 30-60s dashboard refresh latency acceptable
- Support 20 concurrent climbers × 18 grades = 360 cells responsive interaction
- Offline queue sync within 5s of reconnection

**Constraints**:
- Supabase free tier: 500MB database, 2GB bandwidth, 50k realtime messages/month
- GitHub Pages: Static hosting only, no server-side rendering
- Offline-first: Queue updates locally, sync on reconnect (FR-027)
- Single active session constraint (FR-010)
- External auth only via Cloudflare Zero Trust (FR-048)

**Scale/Scope**:
- 10-20 climbers per session
- 18 grades (V0-V17) × 3 send types = 54 data points per climber
- Indefinite session retention (FR-005)
- Target: 50-100 sessions over 6 months

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution template not customized yet. Proceeding with standard web application best practices:

✅ **Separation of Concerns**: Frontend (React SPA) + Backend (Supabase) cleanly separated
✅ **Offline-First Architecture**: Required by FR-027, using service worker + IndexedDB queue
✅ **Test Coverage**: Contract tests for API, integration tests for user flows, E2E for critical paths
✅ **Portability**: Supabase abstraction layer allows migration to self-hosted PostgreSQL/Docker
✅ **Performance**: Debouncing (200-300ms), optimistic updates, realtime subscriptions for efficiency

**Potential Complexity Areas**:
- Offline sync conflict resolution (FR-029: merge different fields, last-write-wins same field)
- Real-time updates with Supabase Realtime while supporting offline queue
- Retroactive scoring recalculation (FR-032)

## Project Structure

### Documentation (this feature)
```
specs/001-project-description-md/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── sessions.openapi.yaml
│   ├── attempts.openapi.yaml
│   └── class-lists.openapi.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application structure (frontend + Supabase backend)

src/
├── components/          # React components
│   ├── input/          # Coach input UI components
│   ├── dashboard/      # Results dashboard components
│   └── session/        # Session management components
├── lib/
│   ├── supabase.js     # Supabase client + abstraction
│   ├── offline-queue.js # IndexedDB sync queue
│   └── scoring.js      # Scoring calculation engine
├── hooks/              # React hooks for data fetching
├── stores/             # Zustand state management
├── services/           # Business logic layer
│   ├── session-service.js
│   ├── attempt-service.js
│   └── sync-service.js
└── main.jsx            # Entry point

supabase/
├── migrations/         # SQL migrations
├── seed.sql           # Test data
└── config.toml        # Local development config

tests/
├── contract/          # API contract tests
├── integration/       # User flow integration tests
└── e2e/              # Playwright end-to-end tests

public/
└── sw.js             # Service worker for offline support

.github/
└── workflows/
    └── deploy.yml    # GitHub Actions for Pages deployment
```

**Structure Decision**: Web application with React SPA frontend and Supabase backend. Static deployment to GitHub Pages with service worker for offline capability. Supabase client abstraction layer ensures portability to self-hosted PostgreSQL in Docker.

## Phase 0: Outline & Research

**Research Tasks**:
1. **Supabase Free Tier Limits & Realtime**: Validate 50k messages/month supports 20 users × 54 cells × updates
2. **Offline-First Architecture**: Research service worker + IndexedDB queue patterns for Supabase
3. **Conflict Resolution Strategies**: Field-level merge vs last-write-wins with Supabase Realtime
4. **GitHub Pages + SPA Routing**: Configure for client-side routing without 404s
5. **Supabase to PostgreSQL Migration Path**: Document abstraction layer for Docker portability
6. **Chart.js Performance**: Validate 20-bar mixed chart with line overlay responsiveness
7. **Touch Optimization**: 44×44px hit targets, debouncing patterns, optimistic UI updates
8. **Cloudflare Zero Trust Integration**: Ensure compatibility with static GitHub Pages deployment

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

**Tasks**:
1. **Data Model** (`data-model.md`):
   - Sessions table (id, name, date, grade_range, scoring_config, status, created_at)
   - Climbers table (id, name, email)
   - SessionClimbers junction (session_id, climber_id)
   - Attempts table (id, session_id, climber_id, grade, send_type, count, updated_at)
   - ClassLists table (id, name, climber_ids[])
   - Postgres schema + Supabase migrations
   - RLS policies for Cloudflare auth

2. **API Contracts** (`/contracts/`):
   - **sessions.openapi.yaml**:
     - POST /sessions (create)
     - POST /sessions/{id}/clone (clone)
     - PUT /sessions/{id}/archive (archive)
     - GET /sessions (list)
     - GET /sessions/{id} (get active)
     - DELETE /sessions/{id} (delete archived)
   - **attempts.openapi.yaml**:
     - PUT /attempts (upsert batch - offline sync)
     - GET /attempts?session_id={id} (get all for session)
     - Realtime subscription contract
   - **class-lists.openapi.yaml**:
     - GET /class-lists (list)
     - POST /class-lists (create)
     - PUT /class-lists/{id} (update)

3. **Contract Tests**:
   - One test file per endpoint
   - Validate request/response schemas against OpenAPI
   - Tests initially fail (no implementation)

4. **Quickstart** (`quickstart.md`):
   - Setup: Supabase project, env vars, npm install
   - Run: dev server, run migrations
   - Test flow: Create session → Record attempts → View dashboard
   - Offline test: Disconnect → Record → Reconnect → Verify sync

5. **Agent Context** (`CLAUDE.md`):
   - Tech stack: React, Supabase, Vite, Vitest
   - Offline-first patterns, conflict resolution
   - Recent changes (keep last 3)
   - <150 lines for token efficiency

**Output**: data-model.md, /contracts/*.openapi.yaml, failing contract tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Setup & Infrastructure** (1-5):
   - Initialize Vite + React project
   - Configure Supabase client + migrations
   - Setup testing infrastructure (Vitest, Playwright)
   - Implement service worker + offline queue
   - GitHub Actions deployment pipeline

2. **Data Layer** (6-12):
   - Create Postgres schema migrations
   - Implement Supabase abstraction layer
   - Scoring engine (FR-030, FR-032)
   - Offline sync service (FR-027, FR-029)
   - Contract tests for all API endpoints

3. **Session Management** (13-18):
   - Session creation UI + logic
   - Session cloning (FR-002)
   - Archive/reset with confirmation (FR-003, FR-008)
   - Class list loading (FR-051)
   - Active session enforcement (FR-010)

4. **Input UI** (19-30):
   - Table layout with sticky headers (FR-011, FR-057)
   - Touch-optimized increment/decrement buttons (FR-016)
   - Climber selection + highlight (FR-014, FR-015)
   - Debounced save with optimistic updates (FR-018, FR-019)
   - Offline indicator + sync status (FR-023, FR-028)
   - Grade hide/show (FR-013)

5. **Results Dashboard** (31-38):
   - Mixed chart (bars + line) with Chart.js (FR-036)
   - Ranked list with tie handling (FR-037, FR-038)
   - Auto-refresh (30s polling) (FR-040)
   - Fullscreen mode (FR-044, FR-045)
   - Hide 0-point climbers (FR-039)

6. **Integration & E2E Tests** (39-45):
   - User story → integration test mapping
   - Offline sync test scenario
   - Concurrent update merge test
   - E2E: Create session → Record → View dashboard

**Ordering Strategy**:
- TDD: Contract tests → Data layer → UI components
- Dependencies: Migrations → Services → Components → Integration tests
- Parallel: Independent components marked [P]

**Estimated Output**: 45-50 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Offline queue + realtime sync | FR-027 requires offline-first with sync; FR-041 requires 30-60s updates | Simple polling insufficient - conflicts on reconnect, poor UX |
| Field-level conflict resolution | FR-029 requires merging different fields, last-write-wins same field | Row-level locking impossible with offline queue; full conflict reject breaks UX |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (template not customized - using web best practices)
- [x] Post-Design Constitution Check: PASS (separation of concerns, portability maintained)
- [x] All NEEDS CLARIFICATION resolved (9/9 clarifications in spec)
- [x] Complexity deviations documented (offline sync, conflict resolution justified)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
