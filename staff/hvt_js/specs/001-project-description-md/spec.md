# Feature Specification: High Volume Training Climbing Session Tracker

**Feature Branch**: `001-project-description-md`
**Created**: 2025-10-04
**Status**: Draft
**Input**: User description: "@project_description.md"

## Execution Flow (main)
```
1. Parse user description from Input
   → User provided complete project description with requirements
2. Extract key concepts from description
   → Identified: coaches/staff input UI, public results dashboard, session management, scoring system
3. For each unclear aspect:
   → Marked with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → Primary flows defined for coach and public viewer
5. Generate Functional Requirements
   → All requirements testable and derived from description
6. Identify Key Entities (if data involved)
   → Sessions, climbers, attempts, scoring configurations
7. Run Review Checklist
   → Some clarifications needed on edge cases and specific behaviours
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-04
- Q: When network connectivity is lost during input recording, how should the system behave? → A: Queue updates locally and sync when connection restored (optimistic offline-first)
- Q: Can multiple sessions run simultaneously, or is there only one active session at a time? → A: Single active session only - coaches must archive current before creating new
- Q: How should ties in total scores be handled in the ranked list? → A: Shared position (e.g., two climbers tied at #2, next is #4)
- Q: Should climbers with zero recorded sends (no attempts at any grade) appear in results? → A: Hide climbers with 0 points from results display
- Q: When multiple coaches update the same climber's data simultaneously, how should conflicts be resolved? → A: Merge updates automatically if different fields affected
- Q: Can scoring configuration be changed mid-session, and if so, does it apply retroactively? → A: Changes allowed and apply retroactively to recalculate all scores
- Q: Where are class lists stored and managed for loading into session rosters? → A: in database
- Q: What happens when a climber attempts a grade outside the configured session range? → A: Strictly enforce range - block/reject attempts outside configured grades
- Q: What is the data retention duration for archived sessions? → A: keep until manually requested to delete

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

**Coach/Staff Member Using Input UI**:
During a climbing training session with 10–20 climbers, a coach needs to quickly record each climber's performance across different boulder grades (V0–V17). The coach selects a climber, then rapidly taps buttons to log Flash sends, Top sends, or Attempts for each grade the climber tries. The system provides immediate visual feedback and automatically calculates scores based on configurable point values. The coach can switch between climbers by swiping or selecting from a list. Between sessions, the coach can create new sessions, clone previous session configurations (scoring rules and roster), reset current session data, or archive completed sessions.

**Public Viewer Using Results Dashboard**:
Climbers and spectators view a large screen (TV/tablet) displaying real-time or near-real-time session results. They see a mixed chart showing each climber's points by send type (Flash/Top/Attempt) as bars, with a line showing total scores, plus a ranked list of all climbers sorted by total points. The display updates automatically every 30–60 seconds without manual interaction, providing current standings throughout the session.

### Acceptance Scenarios

**Session Management**:
1. **Given** no active session exists, **When** coach creates a new session with name "Monday Session", date, grade range V0–V10, climbers ["Alice", "Bob", "Charlie"], and scoring values, **Then** system creates session and displays input UI with 3 climber columns and 11 grade rows
2. **Given** a previous session exists with 5 climbers and specific scoring rules, **When** coach selects "Clone Previous", **Then** system creates new session with same scoring configuration and roster pre-filled
3. **Given** an active session with recorded data, **When** coach initiates reset and confirms by typing session name, **Then** system archives current data and creates fresh session with same configuration but zero counts

**Input Recording**:
4. **Given** coach has selected climber Alice, **When** coach taps "+5" button for V5 Flash, **Then** system increments Flash count by 5, shows immediate visual feedback, saves to database within debounce window, and updates Alice's total score
5. **Given** climber Bob has 3 Attempts at V7, **When** coach taps "–" button, **Then** system decrements count to 2, updates score, and persists change
6. **Given** coach rapidly taps "+3" multiple times within 300ms, **When** debounce triggers, **Then** system batches updates and saves once with accumulated total
7. **Given** coach is on a low-end tablet with 10 climbers visible, **When** coach scrolls and taps buttons rapidly, **Then** UI remains responsive with smooth feedback and no lag

**Results Display**:
8. **Given** active session with 5 climbers having various scores, **When** public viewer accesses results dashboard, **Then** system displays mixed chart with bars per send type per climber, line overlay for totals, and ranked list with positions
9. **Given** results dashboard is open, **When** coach updates climber data on input UI, **Then** dashboard reflects changes within 30–60 seconds automatically
10. **Given** dashboard is displayed on TV, **When** viewer toggles fullscreen mode, **Then** display expands to fill screen with appropriately sized typography (≥24px)

**Scoring**:
11. **Given** session configured with Flash=10pts, Top=5pts, Attempt=1pt for V5 grade, **When** Alice logs 2 Flashes, 1 Top, 3 Attempts at V5, **Then** system calculates Alice's V5 score as (2×10 + 1×5 + 3×1) = 28 points
12. **Given** mid-session with existing climber data and scoring change to Flash=15pts for V5, **When** coach modifies point values, **Then** system immediately recalculates all totals retroactively based on new values

**Multi-User Access**:
13. **Given** coach viewing input UI and public viewer viewing dashboard simultaneously, **When** coach updates climber data, **Then** both see updated totals within acceptable latency without conflicts

### Edge Cases

**Data & Validation**:
- What happens when a climber has no recorded sends (all zeros)? Climbers with 0 points are hidden from results display
- What happens when there's a tie in total scores? Tied climbers share same position with gap in sequence (e.g., two at #2, next is #4)
- What happens when network connectivity is lost during input? System queues updates locally and syncs when connection restored (optimistic offline-first approach)
- What happens when attempting to decrement a count that's already at 0?
- What happens when scoring configuration has missing values for certain grade/send-type combinations?

**Session Lifecycle**:
- Can archived sessions be restored or viewed? Archived sessions are retained indefinitely until manually deleted; they can be viewed but not restored to active status
- Can multiple sessions run simultaneously? Only one active session allowed at a time; coaches must archive current session before creating new one
- What happens when attempting to archive with unsaved changes? System prompts to save or discard changes before archiving

**Access & Concurrency**:
- What happens when multiple coaches try to update the same climber simultaneously? System merges updates automatically if different grade/send-type fields are affected; uses last-write-wins for same field conflicts
- What happens when results dashboard is accessed but no active session exists?

**Grade Range & Configuration**:
- What happens when a climber attempts a grade outside the configured session range? System strictly enforces configured range; only grades within session range are available for recording
- Can individual grades be hidden/dismissed from view within a session? Yes, individual grades can be hidden/dismissed from UI while maintaining session configuration

---

## Requirements *(mandatory)*

### Functional Requirements

**Session Management**:
- **FR-001**: System MUST allow coaches to create new climbing sessions with configurable session name, date, grade range (V0–V17), send types (Flash/Top/Attempt), scoring values per send type per grade, and roster of climbers
- **FR-002**: System MUST allow coaches to clone previous session configurations including scoring rules and roster into new session
- **FR-003**: System MUST allow coaches to reset active session data after confirmation (requiring typed session name), archiving existing data
- **FR-004**: System MUST validate session creation requires at least one climber, at least one grade, and scoring values ≥0
- **FR-005**: System MUST persist all session configuration and attempt data indefinitely until manual deletion is requested
- **FR-006**: System MUST allow viewing archived sessions but not restoring them to active status
- **FR-007**: System MUST provide manual deletion capability for archived sessions
- **FR-008**: System MUST prompt to save or discard changes when attempting to archive session with unsaved data
- **FR-009**: System MUST support 10–20 climbers per session without performance degradation
- **FR-010**: System MUST enforce single active session at a time, requiring coaches to archive current session before creating new one

**Input UI (Coach Interface)**:
- **FR-011**: System MUST display input interface as table with climbers as columns and only configured session grades as rows, with sub-columns per send type (Flash/Top/Attempt)
- **FR-012**: System MUST strictly enforce configured grade range, preventing input for grades outside session configuration
- **FR-013**: System MUST allow individual grades to be hidden/dismissed from input UI view while retaining in session configuration
- **FR-014**: System MUST provide climber selection mechanism via tap/click or swipe gestures to set active climber
- **FR-015**: System MUST highlight/indicate currently selected climber for quick reference
- **FR-016**: System MUST provide touch-optimised increment buttons (+, +3, +5) and decrement button (–) with minimum 44×44px hit targets
- **FR-017**: System MUST provide immediate visual feedback when buttons are tapped
- **FR-018**: System MUST debounce rapid input (200–300ms) to batch database updates
- **FR-019**: System MUST update climber's total score immediately upon count change
- **FR-020**: System MUST display current count value for each grade/send-type cell
- **FR-021**: System MUST disable input controls during save operations with visual loading state
- **FR-022**: System MUST display error notifications via toasts (top-right, auto-dismiss) when operations fail
- **FR-023**: System MUST show sync status (Saved/Retrying/Error) and last updated timestamp
- **FR-024**: System MUST remain responsive on low-end tablets and phones during rapid input
- **FR-025**: System MUST provide access to reset/archive session controls with danger indication
- **FR-026**: System MUST provide link/navigation to results dashboard
- **FR-027**: System MUST queue updates locally when network connectivity is lost and automatically sync when connection is restored
- **FR-028**: System MUST display offline indicator and queued update count when operating without network connectivity
- **FR-029**: System MUST automatically merge concurrent updates to same climber when different grade/send-type fields are affected, using last-write-wins for same field conflicts

**Scoring Engine**:
- **FR-030**: System MUST calculate climber total score as sum of (count × grade value × send type value) for all attempts
- **FR-031**: System MUST support configurable point values per send type per grade
- **FR-032**: System MUST allow scoring configuration changes mid-session and immediately recalculate all totals retroactively
- **FR-033**: System MUST handle edge cases including zero sends, only attempts, and high grade counts without errors
- **FR-034**: System MUST apply scoring calculations consistently across input UI and results dashboard

**Results Dashboard (Public View)**:
- **FR-035**: System MUST display read-only results dashboard accessible without authentication (protected by external access control)
- **FR-036**: System MUST display mixed chart with bars representing Flash/Top/Attempt points per climber and line overlay showing total scores
- **FR-037**: System MUST display ranked list of climbers sorted by total points showing position, name, and total
- **FR-038**: System MUST handle tied scores by assigning shared position with gap in sequence (e.g., two climbers at #2, next is #4)
- **FR-039**: System MUST hide climbers with 0 total points from results display (chart and ranked list)
- **FR-040**: System MUST auto-refresh results data every 30 seconds by default without page reload
- **FR-041**: System MUST display data updates within 30–60 seconds of input changes (acceptable latency)
- **FR-042**: System MUST provide manual refresh control
- **FR-043**: System MUST provide visual indicator when data updates occur
- **FR-044**: System MUST provide fullscreen toggle for large screen/TV display
- **FR-045**: System MUST display typography at ≥24px base size when in fullscreen/TV mode
- **FR-046**: System MUST display session name in dashboard header
- **FR-047**: System MUST use accessible colour scheme for chart with legend

**Data & Access**:
- **FR-048**: System MUST be protected by external authentication (Cloudflare Zero Trust restricting to Urban Jungle Google Workspace users)
- **FR-049**: System MUST NOT implement in-app user authentication
- **FR-050**: System MUST support roster with climber names and optional email addresses
- **FR-051**: System MUST allow loading pre-defined class lists stored in database into session roster
- **FR-052**: System MUST persist class lists in database for reuse across sessions
- **FR-053**: System MUST support grade range configuration (subset of V0–V17) enforced strictly during input

**Responsive & Performance**:
- **FR-054**: System MUST function correctly on screen sizes 360–768px (phones/tablets) for input UI
- **FR-055**: System MUST display optimally on 1024px+ screens for results dashboard
- **FR-056**: System MUST provide horizontal scrolling for grade columns on mobile devices
- **FR-057**: System MUST maintain sticky first column (roster) and header row in input table
- **FR-058**: System MUST ensure colour contrast ratio ≥4.5:1 for text and controls
- **FR-059**: System MUST provide keyboard operability and focus indicators for accessibility
- **FR-060**: System MUST provide ARIA labels for live regions (sync status, score updates)

**Localisation**:
- **FR-061**: System MUST use Australian English spelling and date formats throughout

**Optional/Future**:
- **FR-062**: System MAY support email summary generation showing per-climber and overall session results with manual send capability (feature-flagged)

### Key Entities *(include if feature involves data)*

- **Session**: Represents a single climbing training event with unique name, date, configured grade range (subset of V0–V17), enabled send types, scoring configuration mapping grade+send-type to point values, roster of participating climbers, and current state (active/archived)

- **Climber**: Represents an individual participant with name and optional email address, associated with one or more sessions, maintains collection of attempts within each session

- **Attempt**: Represents recorded performance data linking climber to specific grade and send type (Flash/Top/Attempt) with count of occurrences, belongs to single session

- **Scoring Configuration**: Defines point values for each combination of grade and send type within a session, used to calculate total scores; supports per-session customisation and cloning between sessions

- **Class List**: Pre-defined group of climbers stored in database that can be loaded into session roster; supports create, read, update operations for reuse across multiple sessions

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 9 clarifications resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified (external auth via Cloudflare Zero Trust)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (all clarifications resolved)

---
