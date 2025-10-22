# Tasks: High Volume Training Climbing Session Tracker

**Input**: Design documents from `/specs/001-project-description-md/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: React 18, Vite, Supabase, Service Worker, Chart.js
   → Structure: Web app (frontend + Supabase backend)
2. Load optional design documents:
   → data-model.md: 5 entities (sessions, climbers, attempts, session_climbers, class_lists)
   → contracts/: 3 OpenAPI files (sessions, attempts, class-lists)
   → research.md: 8 technical decisions documented
   → quickstart.md: 6 test scenarios extracted
3. Generate tasks by category:
   → Setup: Vite project, Supabase config, testing infrastructure
   → Tests: 3 contract test suites, 6 integration tests
   → Core: 5 data models, services, scoring engine
   → UI: Input components, dashboard, session management
   → Integration: Offline queue, realtime subscriptions
   → Polish: Performance tests, E2E tests, documentation
4. Apply task rules:
   → Different files = marked [P] for parallel
   → Contract tests before implementation (TDD)
   → Models before services before UI
5. Numbered T001-T052 (52 tasks total)
6. Validated: All contracts tested, all entities modeled
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Web app structure (per plan.md):
- Frontend: `src/` (React components, lib, hooks, stores, services)
- Supabase: `supabase/migrations/`, `supabase/seed.sql`
- Tests: `tests/contract/`, `tests/integration/`, `tests/e2e/`
- Config: Root-level config files (vite.config.js, vitest.config.js, etc.)

---

## Phase 3.1: Setup & Infrastructure

- [ ] **T001** Initialize Vite + React project with TypeScript support
  - Files: `package.json`, `vite.config.js`, `tsconfig.json`, `index.html`
  - Dependencies: `react@18`, `react-dom@18`, `vite@5`, `typescript@5`
  - Verify: `npm run dev` starts on port 5173

- [ ] **T002** Configure Supabase client and environment variables
  - Files: `src/lib/supabase.ts`, `.env.example`, `.env.local`
  - Install: `@supabase/supabase-js@2`
  - Create Supabase client singleton with type safety
  - Verify: Client connects to Supabase project

- [ ] **T003** [P] Setup testing infrastructure (Vitest + React Testing Library)
  - Files: `vitest.config.js`, `tests/setup.ts`
  - Install: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - Configure: DOM environment, test globals, coverage
  - Verify: `npm run test` executes successfully

- [ ] **T004** [P] Setup Playwright for E2E testing
  - Files: `playwright.config.ts`, `tests/e2e/setup.ts`
  - Install: `@playwright/test`
  - Configure: Browsers (chromium, webkit), baseURL, screenshots
  - Verify: `npx playwright test --list` shows tests

- [ ] **T005** [P] Configure ESLint and Prettier
  - Files: `.eslintrc.cjs`, `.prettierrc`, `.prettierignore`
  - Install: `eslint`, `prettier`, `eslint-config-prettier`, `eslint-plugin-react-hooks`
  - Add npm scripts: `lint`, `format`
  - Verify: `npm run lint` passes on empty project

- [ ] **T006** Setup GitHub Actions deployment workflow
  - Files: `.github/workflows/deploy.yml`, `.github/workflows/test.yml`
  - Configure: Build on push to main, deploy to GitHub Pages
  - Include: Run tests, build Vite app, copy `index.html` to `404.html` for SPA routing
  - Verify: Workflow syntax valid (use `act` or push to test)

---

## Phase 3.2: Database & Migrations ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: Database schema MUST exist before writing tests or implementation**

- [ ] **T007** Create initial Supabase migration (001_initial_schema.sql)
  - File: `supabase/migrations/001_initial_schema.sql`
  - Implement: All 5 tables per data-model.md (sessions, climbers, session_climbers, attempts, class_lists)
  - Include: Indexes, constraints, RLS policies, triggers, `calculate_climber_score()` function
  - Verify: `supabase db push` applies migration without errors

- [ ] **T008** Create seed data for testing
  - File: `supabase/seed.sql`
  - Create: 2 test climbers (Alice, Bob), 1 active session, sample attempts
  - Include: Realistic scoring config, grade range V0-V10
  - Verify: `supabase db reset` seeds data successfully

- [ ] **T009** [P] Create database abstraction layer interface
  - File: `src/lib/db-adapter.ts`
  - Define: `DatabaseAdapter` interface with `query()`, `subscribe()`, `unsubscribe()` methods
  - Purpose: Enable future migration to self-hosted PostgreSQL (per research.md)
  - Verify: TypeScript compiles, interface exported

- [ ] **T010** [P] Implement Supabase database adapter
  - File: `src/lib/supabase-adapter.ts`
  - Implement: `SupabaseAdapter` class extending `DatabaseAdapter`
  - Include: Query execution, Realtime subscription wrapper, error handling
  - Verify: Unit tests pass for adapter methods

---

## Phase 3.3: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T011** [P] Contract test for sessions API (sessions.openapi.yaml)
  - File: `tests/contract/sessions.test.ts`
  - Test endpoints: POST /sessions, GET /sessions, GET /sessions/{id}, PATCH /sessions/{id}, DELETE /sessions/{id}, POST /sessions/{id}/clone, POST /sessions/{id}/archive, POST /sessions/{id}/reset
  - Validate: Request/response schemas against OpenAPI spec
  - Verify: All tests FAIL (no implementation yet)

- [ ] **T012** [P] Contract test for attempts API (attempts.openapi.yaml)
  - File: `tests/contract/attempts.test.ts`
  - Test endpoints: GET /attempts, PUT /attempts (batch upsert), POST /attempts/increment, POST /rpc/calculate_session_scores
  - Validate: Conflict resolution behavior (FR-029)
  - Verify: All tests FAIL (no implementation yet)

- [ ] **T013** [P] Contract test for class lists API (class-lists.openapi.yaml)
  - File: `tests/contract/class-lists.test.ts`
  - Test endpoints: GET /class_lists, POST /class_lists, GET /class_lists/{id}, PUT /class_lists/{id}, DELETE /class_lists/{id}, GET /climbers, POST /climbers
  - Validate: Climber ID array constraints
  - Verify: All tests FAIL (no implementation yet)

---

## Phase 3.4: Data Models & Business Logic (ONLY after tests are failing)

- [ ] **T014** [P] Create Session model and types
  - File: `src/models/session.ts`
  - Define: TypeScript types for Session entity per data-model.md
  - Include: Validation for grade_range, scoring_config, status enum
  - Export: `Session`, `CreateSessionRequest`, `UpdateSessionRequest` types
  - Verify: TypeScript compiles, types align with OpenAPI schemas

- [ ] **T015** [P] Create Climber model and types
  - File: `src/models/climber.ts`
  - Define: TypeScript types for Climber entity
  - Include: Email validation regex
  - Export: `Climber`, `CreateClimberRequest` types
  - Verify: TypeScript compiles

- [ ] **T016** [P] Create Attempt model and types
  - File: `src/models/attempt.ts`
  - Define: TypeScript types for Attempt entity
  - Include: Grade pattern validation (V0-V17), send_type enum
  - Export: `Attempt`, `AttemptUpsert` types
  - Verify: TypeScript compiles

- [ ] **T017** [P] Create ClassList model and types
  - File: `src/models/class-list.ts`
  - Define: TypeScript types for ClassList entity
  - Include: Climber IDs array validation
  - Export: `ClassList`, `CreateClassListRequest`, `UpdateClassListRequest` types
  - Verify: TypeScript compiles

- [ ] **T018** [P] Implement scoring calculation engine
  - File: `src/lib/scoring.ts`
  - Implement: `calculateClimberScore(attempts, scoringConfig)` function per FR-030
  - Handle: Retroactive recalculation logic (FR-032)
  - Include: Edge cases (zero sends, high counts)
  - Verify: Unit tests pass for scoring formula

---

## Phase 3.5: Service Layer

- [ ] **T019** Implement SessionService for CRUD operations
  - File: `src/services/session-service.ts`
  - Methods: `createSession()`, `getSession()`, `listSessions()`, `updateScoringConfig()`, `archiveSession()`, `deleteSession()`
  - Enforce: Single active session constraint (FR-010)
  - Use: Database adapter from T009/T010
  - Verify: Contract tests T011 start passing

- [ ] **T020** Implement session cloning logic
  - File: `src/services/session-service.ts` (add method)
  - Method: `cloneSession(sourceId, newName, newDate)`
  - Copy: scoring_config, grade_range, climber roster (FR-002)
  - Verify: Cloned session has zero attempts

- [ ] **T021** Implement session reset logic
  - File: `src/services/session-service.ts` (add method)
  - Method: `resetSession(sessionId, confirmationName)`
  - Archive: Current session with all data (FR-003)
  - Create: New session with same config, zero attempts
  - Require: Typed confirmation name (FR-003)
  - Verify: Contract test T011 passes for reset endpoint

- [ ] **T022** Implement AttemptService for performance tracking
  - File: `src/services/attempt-service.ts`
  - Methods: `upsertAttempt()`, `batchUpsertAttempts()`, `getAttemptsBySession()`, `incrementAttempt()`, `decrementAttempt()`
  - Include: Timestamp-based conflict resolution (FR-029)
  - Validate: Grade is in session's grade_range (FR-012, FR-053)
  - Verify: Contract tests T012 start passing

- [ ] **T023** Implement ClassListService
  - File: `src/services/class-list-service.ts`
  - Methods: `createClassList()`, `getClassList()`, `listClassLists()`, `updateClassList()`, `deleteClassList()`
  - Include: Climber ID validation (ensure all IDs exist)
  - Verify: Contract tests T013 pass

- [ ] **T024** Implement ClimberService
  - File: `src/services/climber-service.ts`
  - Methods: `createClimber()`, `getClimber()`, `listClimbers()`, `searchClimbers()`
  - Include: Email validation, duplicate check (name + email unique)
  - Verify: Can create climbers via API

---

## Phase 3.6: Offline Sync Infrastructure

- [ ] **T025** Implement IndexedDB queue for offline storage
  - File: `src/lib/offline-queue.ts`
  - Use: `idb` library (Jake Archibald's wrapper)
  - Schema: `{ id, timestamp, operation, table, data, retries }`
  - Methods: `enqueue()`, `dequeue()`, `peekAll()`, `clear()`
  - Include: Max queue size limit (1000 items)
  - Verify: Unit tests for queue operations

- [ ] **T026** Implement offline sync service
  - File: `src/services/sync-service.ts`
  - Methods: `syncQueue()`, `handleOnline()`, `handleOffline()`, `getQueueStatus()`
  - Logic: Drain queue on reconnect, apply conflict resolution per FR-029
  - Events: Listen to `online`/`offline` browser events
  - Verify: Integration test syncs queued attempts after reconnect

- [ ] **T027** Setup service worker with Workbox
  - File: `public/sw.js`, `src/lib/register-sw.ts`
  - Install: `workbox-webpack-plugin` or Vite PWA plugin
  - Configure: Cache-first for assets, network-first for API
  - Register: Service worker in `main.tsx`
  - Verify: `npm run build` generates sw.js, offline mode works

---

## Phase 3.7: State Management & Hooks

- [ ] **T028** [P] Create Zustand store for session state
  - File: `src/stores/session-store.ts`
  - State: `activeSession`, `sessions`, `loading`, `error`
  - Actions: `setActiveSession()`, `loadSessions()`, `createSession()`, `archiveSession()`
  - Persist: Active session ID to localStorage
  - Verify: Store updates trigger re-renders

- [ ] **T029** [P] Create Zustand store for attempts state
  - File: `src/stores/attempts-store.ts`
  - State: `attemptsBySession`, `syncStatus`, `queueCount`, `offlineMode`
  - Actions: `upsertAttempt()`, `incrementAttempt()`, `syncAttempts()`
  - Optimistic updates: Update local state immediately (FR-019)
  - Verify: Store handles optimistic + confirmed updates

- [ ] **T030** [P] Create React hooks for data fetching
  - File: `src/hooks/use-sessions.ts`, `src/hooks/use-attempts.ts`, `src/hooks/use-climbers.ts`
  - Use: TanStack Query (React Query) for caching + refetching
  - Queries: `useSession()`, `useSessions()`, `useAttempts()`, `useClimbers()`
  - Mutations: `useCreateSession()`, `useUpsertAttempt()`
  - Verify: Queries cache data, mutations invalidate cache

- [ ] **T031** [P] Create Realtime subscription hook
  - File: `src/hooks/use-realtime.ts`
  - Hook: `useRealtimeAttempts(sessionId)`
  - Subscribe: Supabase Realtime channel for `attempts` table filtered by session_id
  - Update: Attempts store on INSERT/UPDATE/DELETE events
  - Cleanup: Unsubscribe on unmount
  - Verify: Dashboard updates when data changes in another tab

---

## Phase 3.8: Session Management UI

- [ ] **T032** Create SessionList component
  - File: `src/components/session/SessionList.tsx`
  - Display: List of sessions sorted by date (active first)
  - Actions: Create, Clone, View, Delete buttons
  - Filter: Show active vs archived sessions
  - Verify: Renders session list from store

- [ ] **T033** Create SessionForm component
  - File: `src/components/session/SessionForm.tsx`
  - Fields: Name, date, grade range (multi-select V0-V17), scoring config, climber selection
  - Validation: At least 1 climber, at least 1 grade, scoring values ≥ 0 (FR-004)
  - Submit: Calls `createSession()` mutation
  - Verify: Form validates and creates session

- [ ] **T034** Create SessionCloneDialog component
  - File: `src/components/session/SessionCloneDialog.tsx`
  - Pre-fill: Scoring config, grade range, climbers from source session
  - Fields: New name, new date (editable)
  - Submit: Calls `cloneSession()` (FR-002)
  - Verify: Clones session with same config

- [ ] **T035** Create SessionArchiveDialog component
  - File: `src/components/session/SessionArchiveDialog.tsx`
  - Confirmation: Require typing exact session name (FR-003)
  - Warning: Show danger indication (FR-025)
  - Options: Archive or Reset (archive + create new)
  - Verify: Prevents accidental archive, validates name match

- [ ] **T036** Create ClassListSelector component
  - File: `src/components/session/ClassListSelector.tsx`
  - Display: Dropdown of available class lists (FR-051)
  - Action: Load class list to populate session roster
  - Verify: Selecting class list adds climbers to form

---

## Phase 3.9: Input UI (Coach Interface)

- [ ] **T037** Create InputTable component (main layout)
  - File: `src/components/input/InputTable.tsx`
  - Layout: Table with climbers as columns, grades as rows (FR-011)
  - Sticky: First column (roster) and header row (FR-057)
  - Responsive: Horizontal scroll on mobile (FR-056)
  - Cell structure: 3 sub-columns per grade (Flash/Top/Attempt)
  - Verify: Table renders with correct dimensions (climbers × grades × send types)

- [ ] **T038** Create AttemptCell component with increment/decrement buttons
  - File: `src/components/input/AttemptCell.tsx`
  - Buttons: +1, +3, +5, – (FR-016)
  - Size: 44×44px minimum hit targets (FR-016)
  - Feedback: Active state on tap, optimistic update (FR-017, FR-019)
  - Debounce: 200-300ms batching (FR-018)
  - Disable: During save with loading spinner (FR-021)
  - Verify: Buttons responsive, debouncing works

- [ ] **T039** Create ClimberSelector component
  - File: `src/components/input/ClimberSelector.tsx`
  - Interaction: Tap column header to select climber (FR-014)
  - Visual: Highlight selected climber column (FR-015)
  - Alternative: Swipe gesture to switch climbers (mobile)
  - Verify: Selecting climber highlights column

- [ ] **T040** Create SyncStatus component
  - File: `src/components/input/SyncStatus.tsx`
  - Display: Sync state (Saved/Retrying/Error), last updated timestamp (FR-023)
  - Offline mode: Show offline indicator (🔴) + queued count (FR-028)
  - Position: Top-right corner (FR-022)
  - Verify: Updates based on sync store state

- [ ] **T041** Create ScoreDisplay component
  - File: `src/components/input/ScoreDisplay.tsx`
  - Calculate: Total score per climber using scoring engine (FR-019, FR-030)
  - Update: Immediately on count change (optimistic)
  - Position: Below climber name in column header
  - Verify: Score recalculates on attempt updates

- [ ] **T042** Create GradeVisibilityToggle component
  - File: `src/components/input/GradeVisibilityToggle.tsx`
  - Action: Show/hide individual grade rows (FR-013)
  - Persist: Hidden grades to session config or localStorage
  - UI: Checkbox or toggle per grade in settings menu
  - Verify: Hiding grade removes row from table, data preserved

---

## Phase 3.10: Results Dashboard (Public View)

- [ ] **T043** Create ResultsDashboard page component
  - File: `src/pages/ResultsDashboard.tsx`
  - Layout: Mixed chart + ranked list side-by-side (desktop) or stacked (mobile)
  - Fullscreen: Toggle button (⛶) expands to fullscreen (FR-044)
  - Typography: ≥24px base size in fullscreen mode (FR-045)
  - Auto-refresh: 30s polling via React Query (FR-040)
  - Verify: Renders chart and rankings

- [ ] **T044** Create MixedChart component with Chart.js
  - File: `src/components/dashboard/MixedChart.tsx`
  - Use: `react-chartjs-2` + `chart.js`
  - Type: Grouped bar chart (Flash/Top/Attempt per climber) + line overlay (totals) (FR-036)
  - Data: Fetch attempts, calculate scores using scoring engine
  - Performance: Disable animations on update, decimation if >100 points
  - Accessibility: Color contrast ≥4.5:1, legend with labels (FR-047, FR-058)
  - Verify: Renders chart with 20 climbers in <500ms

- [ ] **T045** Create RankedList component
  - File: `src/components/dashboard/RankedList.tsx`
  - Display: Position, name, total score sorted descending (FR-037)
  - Tie handling: Shared position with gap (e.g., #2, #2, #4) (FR-038)
  - Filter: Hide climbers with 0 points (FR-039)
  - Update: On data change from Realtime subscription (FR-041)
  - Verify: Handles ties correctly, filters zero scores

- [ ] **T046** Create RefreshIndicator component
  - File: `src/components/dashboard/RefreshIndicator.tsx`
  - Display: Visual indicator when data updates (FR-043)
  - Manual refresh: Button to trigger immediate refetch (FR-042)
  - Auto-refresh timer: Show countdown to next auto-refresh
  - Verify: Indicator shows on data update

---

## Phase 3.11: Integration Tests ⚠️ MUST USE REAL TEST SCENARIOS

- [ ] **T047** [P] Integration test: Create session flow (Scenario 1 from quickstart.md)
  - File: `tests/integration/create-session.test.ts`
  - Steps: Navigate to new session → Fill form → Add climbers → Create
  - Verify: Session created, redirects to input UI, table displays correctly
  - Maps to: Quickstart Scenario 1

- [ ] **T048** [P] Integration test: Record attempts flow (Scenario 2 from quickstart.md)
  - File: `tests/integration/record-attempts.test.ts`
  - Steps: Select climber → Tap increment buttons → Verify debouncing → Switch climbers
  - Verify: Counters update, scores calculate, sync status shows saved
  - Maps to: Quickstart Scenario 2

- [ ] **T049** [P] Integration test: Results dashboard flow (Scenario 3 from quickstart.md)
  - File: `tests/integration/results-dashboard.test.ts`
  - Steps: Record attempts → Open dashboard → Verify chart + rankings → Test auto-refresh
  - Verify: Dashboard displays correct data, auto-refreshes within 30-60s
  - Maps to: Quickstart Scenario 3

- [ ] **T050** [P] Integration test: Offline sync flow (Scenario 4 from quickstart.md)
  - File: `tests/integration/offline-sync.test.ts`
  - Steps: Go offline → Record attempts → Verify queue → Reconnect → Verify sync
  - Verify: Offline indicator shows, queue persists, syncs on reconnect
  - Maps to: Quickstart Scenario 4 (FR-027, FR-028)

- [ ] **T051** [P] Integration test: Session cloning flow (Scenario 5 from quickstart.md)
  - File: `tests/integration/clone-session.test.ts`
  - Steps: Archive session → Clone → Verify config copied → Verify zero attempts
  - Verify: Cloned session has same scoring, roster, grade range (FR-002)
  - Maps to: Quickstart Scenario 5

- [ ] **T052** [P] Integration test: Retroactive scoring change (Scenario 6 from quickstart.md)
  - File: `tests/integration/scoring-recalculation.test.ts`
  - Steps: Record attempts → Change scoring config → Verify scores recalculate
  - Verify: Total scores update retroactively for all climbers (FR-032)
  - Maps to: Quickstart Scenario 6

---

## Phase 3.12: End-to-End Tests

- [ ] **T053** [P] E2E test: Full user journey (Coach creates session → Records data → Views dashboard)
  - File: `tests/e2e/user-journey.spec.ts`
  - Use: Playwright with real Supabase instance
  - Steps: Create session → Add 3 climbers → Record 10 attempts → Open dashboard → Verify chart
  - Verify: Complete flow works end-to-end

- [ ] **T054** [P] E2E test: Concurrent coaches editing same session
  - File: `tests/e2e/concurrent-edits.spec.ts`
  - Use: Playwright with 2 browser contexts
  - Steps: Both coaches update different cells → Verify merge (FR-029)
  - Steps: Both update same cell → Verify last-write-wins
  - Verify: No data loss, conflict resolution works

---

## Phase 3.13: Polish & Performance

- [ ] **T055** [P] Unit tests for scoring engine
  - File: `tests/unit/scoring.test.ts`
  - Test cases: Zero sends, only attempts, high counts, edge grades (V0, V17)
  - Test retroactive recalculation logic
  - Verify: 100% coverage for scoring.ts

- [ ] **T056** [P] Unit tests for offline queue
  - File: `tests/unit/offline-queue.test.ts`
  - Test cases: Enqueue, dequeue, max size limit, persistence across page refresh
  - Verify: Queue operations atomic, no data loss

- [ ] **T057** Performance test: Input UI responsiveness
  - File: `tests/performance/input-ui.test.ts`
  - Benchmark: Button tap to UI update <100ms
  - Benchmark: Debounced save <300ms after last input
  - Test on: Simulated low-end device (CPU throttling)
  - Verify: Meets FR-024 (<100ms feedback)

- [ ] **T058** Performance test: Dashboard rendering
  - File: `tests/performance/dashboard.test.ts`
  - Benchmark: Chart render (20 climbers) <500ms
  - Benchmark: Chart update on data change <100ms
  - Use: Chrome DevTools Performance profiling
  - Verify: Meets performance goals from plan.md

- [ ] **T059** [P] Accessibility audit
  - File: `tests/accessibility/a11y.test.ts`
  - Use: `axe-core` or `@axe-core/playwright`
  - Check: Color contrast ≥4.5:1 (FR-058), keyboard navigation (FR-059), ARIA labels (FR-060)
  - Verify: No critical accessibility violations

- [ ] **T060** [P] Update README.md with setup instructions
  - File: `README.md`
  - Sections: Prerequisites, Setup, Development, Testing, Deployment
  - Include: Supabase setup, environment variables, GitHub Pages deployment
  - Link to: quickstart.md for detailed guide

- [ ] **T061** [P] Add inline code documentation
  - Files: All `src/` files
  - Add: JSDoc comments for public APIs, complex functions
  - Document: Conflict resolution logic (FR-029), scoring calculations (FR-030)
  - Verify: TypeScript IntelliSense shows documentation

- [ ] **T062** Run manual testing checklist from quickstart.md
  - File: Manual testing (no code file)
  - Execute: All 6 scenarios from quickstart.md on real device
  - Devices: Desktop browser, mobile browser (iOS/Android), tablet
  - Verify: All functional requirements met

---

## Dependencies

### Critical Path (Sequential)
1. **Setup** (T001-T006) → **Database** (T007-T010) → **Contract Tests** (T011-T013)
2. **Contract Tests** → **Models** (T014-T017) → **Services** (T019-T024)
3. **Services** → **Offline Sync** (T025-T027) → **State** (T028-T031)
4. **State** → **UI Components** (T032-T046)
5. **UI Components** → **Integration Tests** (T047-T052) → **E2E** (T053-T054)

### Parallel Groups
- **Setup tools**: T003, T004, T005 can run concurrently
- **Models**: T014-T017 can run concurrently (different files)
- **Contract tests**: T011-T013 can run concurrently (different files)
- **State stores**: T028-T031 can run concurrently (different files)
- **Session UI**: T032-T036 can run concurrently (different files)
- **Dashboard**: T044-T046 can run concurrently (different files)
- **Integration tests**: T047-T052 can run concurrently (different test files)
- **E2E tests**: T053-T054 can run concurrently (different specs)
- **Polish**: T055-T061 can run concurrently (different files/concerns)

### Blockers
- T007 (migrations) blocks all service layer tasks (T019-T024)
- T019-T024 (services) block UI tasks (T032-T046)
- T025-T027 (offline sync) blocks T029 (attempts store)
- T011-T013 (contract tests) must FAIL before T019-T024 (implementation)
- T037-T042 (input UI) block T047-T048 (integration tests)
- T043-T046 (dashboard) block T049 (dashboard integration test)

---

## Parallel Execution Examples

### Phase 3.2: Run contract tests in parallel
```bash
# All tests MUST fail initially (TDD)
npm run test tests/contract/sessions.test.ts &
npm run test tests/contract/attempts.test.ts &
npm run test tests/contract/class-lists.test.ts &
wait
```

### Phase 3.4: Create models in parallel
```bash
# Different files = safe to parallelize
npm run task:generate src/models/session.ts &
npm run task:generate src/models/climber.ts &
npm run task:generate src/models/attempt.ts &
npm run task:generate src/models/class-list.ts &
wait
```

### Phase 3.11: Run integration tests in parallel
```bash
npm run test:integration tests/integration/create-session.test.ts &
npm run test:integration tests/integration/record-attempts.test.ts &
npm run test:integration tests/integration/results-dashboard.test.ts &
npm run test:integration tests/integration/offline-sync.test.ts &
npm run test:integration tests/integration/clone-session.test.ts &
npm run test:integration tests/integration/scoring-recalculation.test.ts &
wait
```

---

## Validation Checklist
*GATE: Verified before task execution*

- [x] All contracts have corresponding tests (T011-T013)
- [x] All entities have model tasks (T014-T017: sessions, climbers, attempts, class_lists)
- [x] All tests come before implementation (T011-T013 before T019-T024)
- [x] Parallel tasks truly independent (different files, verified)
- [x] Each task specifies exact file path (all tasks include file paths)
- [x] No task modifies same file as another [P] task (verified per-file)
- [x] All 6 quickstart scenarios have integration tests (T047-T052)
- [x] Test coverage: 3 contract tests, 6 integration tests, 2 E2E tests, 2 unit test suites

---

## Task Execution Strategy

### TDD Order (Recommended)
1. **Phase 3.1-3.2**: Setup + Database (T001-T010)
2. **Phase 3.3**: Write ALL contract tests (T011-T013) - verify they FAIL
3. **Phase 3.4-3.5**: Implement models + services (T014-T024) - tests start passing
4. **Phase 3.6-3.7**: Offline + state (T025-T031)
5. **Phase 3.8-3.10**: UI components (T032-T046)
6. **Phase 3.11-3.12**: Integration + E2E tests (T047-T054)
7. **Phase 3.13**: Polish (T055-T062)

### Time Estimates
- **Setup** (T001-T006): ~2 hours
- **Database** (T007-T010): ~2 hours
- **Tests** (T011-T013): ~3 hours
- **Models + Services** (T014-T024): ~8 hours
- **Offline + State** (T025-T031): ~6 hours
- **UI Components** (T032-T046): ~12 hours
- **Integration Tests** (T047-T052): ~4 hours
- **E2E Tests** (T053-T054): ~2 hours
- **Polish** (T055-T062): ~4 hours

**Total**: ~43 hours (1 week at 8 hours/day, assuming parallelization)

---

## Notes
- **[P] tasks**: Can be parallelized (different files, no dependencies)
- **TDD**: Verify tests fail before implementing (phases 3.3 → 3.4-3.5)
- **Commits**: Commit after each completed task with message `feat: T0XX - <description>`
- **Avoid**: Modifying same file in parallel tasks, skipping test failures
- **Supabase**: Use local Supabase instance for tests (not production)
- **Performance**: Test on iPad Air 2 (2014) as low-end baseline

---

**Tasks Ready for Execution** ✅

Total tasks: 62 (T001-T062)
Parallelizable: 28 tasks marked [P]
Critical path: ~35 sequential tasks
