# Project: High Volume Training (climbing session tracker)

## Goal
Build a responsive web app used on phones/tablets to log climbers’ session results (Flash/Top/Attempt across grades V0–V17) and a desktop display to show near-real-time scores on a TV. Support 10–30 climbers per session, fast touch input, configurable scoring per session, and a public read-only results screen.

## Key Requirements
- Input UI
  - Table of climbers (columns) × grades V0–V17 (rows) with inner-columns per send type (Flash/Top/Attempt). 
  - Option to swipe left/right to switch climbers or select a climber from a list.
  - Large touch targets (+1, +3, +5, –1) with fast feedback and debounce; smooth on low-end tablets/phones.
  - One active/selected climber state for quick row updates. 
  - Imediate feedback on score update.
- Scoring & Config
  - Per-session configurable point values for each send type and grade.
  - Total score; can be exampeled as = Σ(count × gradeValue × sendTypeValue).
  - Multiple classes/sessions; clone previous session config; reset/archive session data.
  - Customizable session name, date.
- Results UI
  - Public, read-only dashboard for large screens (Chromecast friendly).
  - Mixed chart (bars per send type + line for total) AND a ranked list with totals.
  - Near-real-time updates; 30–60s latency is OK.
- Auth & Access
  - No in-app auth. Site will sit behind Cloudflare Zero Trust (UJ Google Workspace users only).
- Data & Infra
  - Frontend: JavaScript (vanilla or minimal framework), static deploy on GitHub Pages at tools.urbanjungleirc.com/staff/.
  - Backend: start on a free-tier cloud DB (prefer Supabase/Postgres). Keep portability to self-hosted Postgres in Docker later.
  - Sync: simple polling (e.g., 30s) or light realtime; no offline mode needed.

## Non-Goals (MVP)
- No student login.
- Email summaries are optional (nice-to-have stub).

## Constraints & Preferences
- Australian English, fast UX, minimal dependencies, simple build (ideally no heavy bundler).
- Brandable (we’ll apply Urban Jungle styles later).
- Keep data-access logic modular to swap Supabase → self-hosted Postgres later.

## Deliverables
- Clear spec for: screens, data model, scoring rules, update cadence, error states, reset/clone flow, and deploy shape (static + env config).
- Acceptance tests that verify scoring, latency (<60s to dashboard), responsive touch input, and session lifecycle (create/clone/reset/archive).

## Plan the MVP delivery in phases with crisp acceptance criteria.

Phase 1 — Foundations
- Decide minimal frontend approach (vanilla JS + modules; no framework unless essential).
- Project scaffolding; environment config loader; simple router (two views: Input, Results).
- Acceptance: repo builds to a static site; routes work via hash or query param without server.

Phase 2 — Data Model & Integration
- Choose Supabase (Postgres); create tables: sessions, climbers, attempts (session_id, climber_id, grade, send_type, count), scoring_config.
- Write a small data layer (CRUD functions) abstracted behind an interface for future Postgres migration.
- Acceptance: can create a session, add climbers, persist/update attempts, fetch session state.

Phase 3 — Input UI (Coach)
- Dynamic table: climbers × grades; per send type cells with +/– and debounced updates.
- Selected-row behaviour; loading/disabled states; error toasts.
- Session setup modal (create; clone previous; set scoring and grade range); reset/archive action.
- Acceptance: log events smoothly on mobile; 10–20 climbers remains responsive.

Phase 4 — Scoring Engine
- Compute totals client-side from counts + scoring_config; shared utility for both views.
- Unit tests for edge cases (no sends; only attempts; high grades).
- Acceptance: totals match formula; changing config affects totals immediately.

Phase 5 — Results Dashboard
- Chart.js mixed chart (bars: Flash/Top/Attempt; line: total).
- Ranked table; auto-refresh via polling (default 30s) + manual refresh.
- Fullscreen toggle helper; typography sized for TV.
- Acceptance: dashboard refreshes without reload; latency ≤60s.

Phase 6 — Deploy & Access
- GitHub Pages deploy under /staff/ path; base URLs verified.
- Cloudflare Zero Trust rule documented (org-only).
- Acceptance: site loads via custom domain; env keys safe; CORS OK.

Phase 7 — Extensibility & Migration Prep
- Document data-layer interface; config constants; theming hooks.
- Migration note: steps to swap Supabase for self-hosted Postgres or add an API layer.
- Acceptance: dev can point data layer at a different backend with minimal edits.

Optional Phase 8 — Email Summaries (Stub)
- Prepare summary generator (per-climber + overall).
- Hook for Supabase Edge Function or similar mailer; UI button gated behind feature flag.
- Acceptance: mock/send to test inbox with sample results.

Cross-Cutting
- Performance: keep DOM ops cheap; batch updates; debounce 200–300ms.
- QA checklists for phones/tablets; accessibility (focus states; hit areas ≥44px).

## Create a simple milestone roadmap with outcomes.

Milestone A — Spec & Scaffolding
Outcome: Static app shell (Input/Results routes), env config, CI build.

Milestone B — Data Backbone
Outcome: Supabase schema + data layer abstraction; session CRUD working.

Milestone C — Coach Input UI
Outcome: Touch-first table, fast +/– updates, session setup/clone/reset.

Milestone D — Scoring Engine
Outcome: Shared scoring utilities; tests pass; totals consistent.

Milestone E — Results Dashboard
Outcome: Chart.js mixed chart + ranked list; auto-refresh; fullscreen.

Milestone F — Shipping & Gate
Outcome: GitHub Pages live at /staff/; Cloudflare Zero Trust gating.

Milestone G — Hardening & Docs
Outcome: Perf pass (10–20 climbers); migration guide; usage handbook.

Milestone H (Optional) — Email Summaries
Outcome: Summary generator + mail function stub and UX affordance.

## Produce a UI/UX outline with component specs.

### Design Principles
- Fast, finger-friendly, glanceable.
- Minimal chrome; high contrast; large tap targets.
- Works great at 360–768px (phones) and 1024px+ (TV dashboard).

### Views

1) Session Setup (Modal/Screen)
- Fields: Session name/date; grade range (V0–V17 but with having an option to dismiss/hide some grades), send types (Flash/Top/Attempt), scoring values (per send type × per grade), roster (climber names, optional email) have option to load a class list and add climbers to the list.
- Actions: Start Session; Clone Previous; Cancel.
- Validation: at least one climber; at least one grade; scoring numbers ≥0.

2) Coach Input
- Header: Session name; “Results” link; “Reset/Archive” button (danger).
- Roster Column (sticky left): climber names; tap to “select” row (highlight).
- Grade Columns (scrollable horizontally on mobile): for each grade, sub-columns Flash/Top/Attempt, each cell has + and – buttons, current count, disabled state while saving.
- Footer: Sync status (Saved / Retrying); last updated time.
- Empty/Loading states; error toasts.

3) Results Dashboard
- Header: Session name; “Refresh” button; fullscreen toggle.
- Main: Mixed Chart (bars for Flash/Top/Attempt points; line for totals) per climber on X-axis.
- Side/Below: Ranked table: position, climber, total points; optional split by send type.
- Auto-refresh: 30s; manual refresh; visual cue when data updates.

Components
- Button: primary/neutral/danger; min hit 44×44px.
- Toasts: success/error; top-right; auto-dismiss.
- Table: sticky first column and header; responsive overflow on x.
- Chart: Chart.js Mixed chart; accessible colours/legend.

States
- Loading, saving, saved, error.
- Reset confirmation (type session name to confirm).
- Network loss banner with queued updates (optional; no offline mode).

Style
- Neutral base, UJ accents later. Legible fonts; 16–18px base on mobile; ≥24px on TV.
- Iconography optional (e.g., small bolt/flag icons for send types).

Accessibility
- Focus indicators; keyboard operable; ARIA for live regions (sync status).


## Create an actionable task list grouped by area.

Repo & Build
- [ ] Initialise repo; static site skeleton; ES modules; simple dev server.
- [ ] Env loader (JSON or inline script) for Supabase URL/key; guard for prod.
- [ ] Basic router (hash/query): #/input, #/results.

Data & Schema (Supabase)
- [ ] Create tables: sessions, climbers, attempts, scoring_config.
- [ ] Row-level security rules (scoped to anon key use-case) or rely on Zero Trust + restricted tables.
- [ ] Seed script for demo session; SQL views (optional) for totals.

Data Layer (Abstraction)
- [ ] `sessions.create|clone|archive|getActive`
- [ ] `climbers.add|list|remove`
- [ ] `attempts.increment|decrement|getBySession`
- [ ] `scoring.get|set`
- [ ] Swap adapter boundary (Supabase now; Postgres/API later).

Scoring
- [ ] Implement `computeTotals(counts, config)` with tests.
- [ ] Validate per-grade and per-send multipliers.
- [ ] Edge cases: zero data; large counts; missing config.

Coach Input UI
- [ ] Session setup modal (create; clone; config scoring/grades; roster).
- [ ] Dynamic grid render (grades × send types).
- [ ] +/– handlers with debounce; optimistic UI; rollback on failure.
- [ ] Selected-row UX; keyboard shortcuts (optional).
- [ ] Reset/Archive flow with confirmation and archival note.

Results Dashboard
- [ ] Chart.js mixed chart (bars: F/T/A points; line: totals).
- [ ] Ranked list view; sorting; tie handling.
- [ ] Polling service (30s) + manual refresh; visual “updated” cue.
- [ ] Fullscreen toggle.

UX/QA
- [ ] Responsive checks (360–414–768–1024–1920).
- [ ] Tap target audits (≥44px); colour contrast ≥4.5:1.
- [ ] Perf: batch DOM writes; minimal reflow; measure under rapid taps.

Deploy & Gate
- [ ] GitHub Pages config under /staff/ path; base href and asset paths verified.
- [ ] Cloudflare Zero Trust policy docs (restrict to urbanjungleirc.com users).
- [ ] CORS check to Supabase; cache headers for static assets.

Docs & Migration
- [ ] README: env setup, running, deploying, feature flags.
- [ ] Architecture doc: data layer interface; schema; scoring rules.
- [ ] Migration guide: Supabase → self-hosted Postgres/API.
- [ ] (Optional) Email summary stub (Edge Function contract + UI button hidden by flag).

Stretch (Optional)
- [ ] Realtime subscription alternative to polling.
- [ ] Export CSV/PDF of session results.
- [ ] Per-climber email collection and summary dispatch.
