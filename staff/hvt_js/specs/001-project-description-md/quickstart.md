# Quickstart Guide: HVT Climbing Session Tracker

**Prerequisites**:
- Node.js 20+ and npm
- Supabase account (free tier)
- Git

## Setup (5 minutes)

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/your-org/hvt_js.git
cd hvt_js
npm install
```

### 2. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `hvt-climbing`
   - Database Password: (generate strong password)
   - Region: (choose closest to users)
4. Wait ~2 minutes for project creation

### 3. Run Database Migrations

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Run migrations
npm run db:migrate
```

**Note**: Get your Supabase URL and anon key from:
- Dashboard → Settings → API → Project URL
- Dashboard → Settings → API → Project API keys → `anon` key

### 4. Seed Test Data (Optional)

```bash
npm run db:seed
```

This creates:
- 2 test climbers (Alice, Bob)
- 1 active session "Test Session" with V0-V5 grades
- Sample attempts data

### 5. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Test Flow (10 minutes)

### Scenario 1: Create a New Session

1. **Navigate to Sessions**:
   - Click "New Session" button
   - Fill form:
     - Name: "Monday HVT"
     - Date: (select today)
     - Grades: Select V0-V10 (use multi-select)
     - Scoring: Flash=10, Top=5, Attempt=1 (defaults)
   - Click "Add Climbers":
     - Select Alice and Bob from dropdown
     - Or create new climber: "Charlie" + optional email
   - Click "Create Session"

2. **Verify**:
   - Redirects to Input UI
   - Table displays: 2 climber columns × 11 grade rows
   - Each cell has 3 sub-columns (Flash/Top/Attempt)
   - ✅ FR-001: Session created with config

### Scenario 2: Record Attempts (Input UI)

1. **Select Climber**:
   - Click/tap "Alice" column header (highlights in blue)
   - ✅ FR-014, FR-015: Climber selection + highlight

2. **Log Performance**:
   - Tap "+5" button on V5 Flash row
   - Observe:
     - Counter increments to 5 immediately
     - Loading spinner appears briefly
     - Total score updates (50 points = 5 × 10)
     - Sync status shows "Saved" with timestamp
   - ✅ FR-016, FR-017, FR-019: Immediate feedback + score update

3. **Rapid Input (Test Debouncing)**:
   - Tap "+3" on V3 Flash 5 times quickly
   - Observe:
     - Counter increments each tap (15 total)
     - Only 1 save operation after 250ms pause
   - ✅ FR-018: Debouncing batches updates

4. **Decrement**:
   - Tap "–" button on V3 Flash
   - Counter decrements to 14
   - ✅ Decrement works

5. **Switch Climbers**:
   - Swipe right (mobile) or click "Bob" header
   - Bob column highlighted
   - Tap "+5" on V2 Top
   - Bob's total updates (25 points = 5 × 5)
   - ✅ FR-014: Multi-climber support

### Scenario 3: View Results Dashboard

1. **Open Dashboard**:
   - Click "View Results" link in top-right
   - Opens in new tab (or same tab on mobile)

2. **Verify Display**:
   - Mixed chart shows:
     - Alice: Green bar (flash=50)
     - Bob: Blue bar (top=25)
     - Line overlay connects total scores
   - Ranked list:
     - #1 Alice - 50 points
     - #2 Bob - 25 points
   - Session name "Monday HVT" in header
   - ✅ FR-036, FR-037, FR-046: Chart + rankings + display

3. **Test Auto-Refresh**:
   - Return to Input UI tab
   - Add V4 Flash +5 to Alice (total now 90)
   - Wait ~30 seconds
   - Check Dashboard tab auto-updates (no reload)
   - ✅ FR-040, FR-041: Auto-refresh within 30-60s

4. **Fullscreen Mode** (on tablet/TV):
   - Click fullscreen icon (⛶)
   - Chart expands to fill screen
   - Typography increases (≥24px)
   - ✅ FR-044, FR-045: Fullscreen + large text

### Scenario 4: Test Offline Sync

1. **Go Offline**:
   - Open DevTools (F12)
   - Network tab → Throttling → "Offline"
   - Observe offline indicator appears (🔴 Offline badge)

2. **Record Attempts Offline**:
   - Add V6 Flash +3 to Alice
   - See:
     - UI updates immediately (optimistic)
     - Sync status shows "Queued (1 pending)"
     - Yellow warning indicator
   - Add V7 Top +5 to Bob
   - Status shows "Queued (2 pending)"
   - ✅ FR-027, FR-028: Offline queue + indicator

3. **Reconnect**:
   - Network tab → Throttling → "Online"
   - Observe:
     - Sync status changes to "Syncing..."
     - After 2-3 seconds: "Saved ✓"
     - Queue count resets to 0
   - Refresh Dashboard → See updated scores
   - ✅ FR-027: Queue sync on reconnect

4. **Verify Data Persisted**:
   - Refresh browser (F5)
   - All offline-recorded attempts still present
   - ✅ IndexedDB queue + persistence works

### Scenario 5: Clone Session

1. **Archive Current Session**:
   - Click "Archive Session" button
   - Confirmation modal appears
   - Type "Monday HVT" exactly (case-sensitive)
   - Click "Archive"
   - Session status changes to "archived"
   - ✅ FR-003: Archive with confirmation

2. **Clone Session**:
   - Go to Sessions list
   - Click "Clone" button on "Monday HVT"
   - Pre-filled form with:
     - Name: "Monday HVT (Copy)"
     - Same grade range (V0-V10)
     - Same scoring config
     - Same climbers (Alice, Bob, Charlie)
   - Change name to "Tuesday HVT"
   - Click "Create"
   - New session created with 0 attempts
   - ✅ FR-002: Clone session config + roster

### Scenario 6: Mid-Session Scoring Change

1. **Update Scoring Config**:
   - In active "Tuesday HVT" session
   - Click "Edit Scoring" button
   - Change V5 Flash from 10 → 15 points
   - Click "Save"

2. **Verify Retroactive Recalculation**:
   - Alice's V5 Flash (5 occurrences) recalculates:
     - Old: 5 × 10 = 50 points
     - New: 5 × 15 = 75 points
   - Total score updates immediately
   - Dashboard reflects new scores
   - ✅ FR-032: Retroactive recalculation

## Performance Benchmarks

Run on iPad Air 2 (2014) - low-end target:

```bash
npm run test:perf
```

**Expected Results**:
- ✅ UI feedback: <100ms on button tap
- ✅ Chart render (20 climbers): <500ms
- ✅ Dashboard update: <100ms on data change
- ✅ Offline sync (100 queued items): <5s

## Deploy to GitHub Pages

### 1. Configure Repository

```bash
# In .env.production
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Build and Deploy

```bash
npm run build
npm run deploy
```

Or via GitHub Actions (auto-deploys on push to main):

```yaml
# .github/workflows/deploy.yml already configured
git add .
git commit -m "Initial deployment"
git push origin main
```

App deployed to: `https://your-username.github.io/hvt_js/`

### 3. Setup Cloudflare Zero Trust (External Auth)

1. Add custom domain to GitHub Pages:
   - Repo Settings → Pages → Custom domain: `hvt.urbanjungle.com`

2. Configure Cloudflare Access:
   - Dashboard → Zero Trust → Access → Applications → Add
   - Application name: "HVT Tracker"
   - Domain: `hvt.urbanjungle.com`
   - Policy: Allow Google Workspace users with `@urbanjungle.com` emails

3. For public results dashboard (optional):
   - Subdomain: `results.hvt.urbanjungle.com`
   - Route `/dashboard` to this subdomain
   - Policy: Allow all (or specific viewer group)

**Note**: Cloudflare handles all authentication; no code changes needed (FR-048, FR-049).

## Troubleshooting

### Issue: "No active session" on Input UI

**Solution**:
```bash
# Check active session count
npm run db:query "SELECT COUNT(*) FROM sessions WHERE status='active';"

# If >1 active session (violates FR-010):
npm run db:fix-active-sessions
```

### Issue: Offline sync conflicts

**Solution**:
- Check browser console for conflict reports
- Last-write-wins by `updated_at` timestamp (FR-029)
- Conflicts logged but updates proceed

### Issue: Chart not rendering

**Solution**:
```bash
# Clear Chart.js cache
npm run clean
npm install
npm run dev
```

### Issue: Supabase RLS blocking queries

**Solution**:
```sql
-- In Supabase SQL Editor:
-- Verify RLS policies allow authenticated users
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

## Next Steps

- [ ] Run integration tests: `npm run test:integration`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Setup Sentry error tracking (optional)
- [ ] Configure analytics (optional)
- [ ] Review [data-model.md](data-model.md) for schema details
- [ ] Review [contracts/](contracts/) for API specs

## Support

- 🐛 Report issues: https://github.com/your-org/hvt_js/issues
- 📖 Full docs: [README.md](../README.md)
- 💬 Questions: Slack #hvt-support channel

---

**Quickstart Complete!** ✅

You've tested:
- Session creation (FR-001)
- Input recording (FR-011-FR-020)
- Offline sync (FR-027)
- Results dashboard (FR-035-FR-047)
- Session cloning (FR-002)
- Retroactive scoring (FR-032)

Continue to `/tasks` command to generate implementation tasks.
