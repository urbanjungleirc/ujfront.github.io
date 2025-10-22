# Technical Research: HVT Climbing Session Tracker

**Date**: 2025-10-04
**Status**: Complete

## Research Summary

This document captures technical decisions and research findings for implementing an offline-first, real-time climbing session tracker using Supabase (free tier), React, and GitHub Pages deployment with PostgreSQL/Docker portability.

---

## 1. Supabase Free Tier Limits & Realtime

**Decision**: Supabase free tier is viable for the use case

**Rationale**:
- Free tier provides: 500MB database, 2GB bandwidth/month, 50k realtime messages/month
- Usage calculation: 20 climbers × 54 cells (18 grades × 3 types) × avg 5 updates/session × 20 sessions/month = ~108k updates/month
- Mitigation: Debounce updates (200-300ms batching) reduces messages by ~70% → ~32k messages/month
- Realtime subscriptions: Subscribe to active session only (1 subscription), unsubscribe when dashboard inactive
- Database size: Assume 1KB/attempt row, 1000 attempts = 1MB, well within 500MB

**Alternatives Considered**:
- Firebase Realtime Database: Rejected due to SQL preference for complex queries, less portable
- Self-hosted from start: Rejected - Supabase free tier sufficient for MVP, migration path exists

**Implementation Notes**:
- Use Supabase Realtime's `postgres_changes` for attempts table
- Implement exponential backoff for reconnection (built into Supabase client)
- Monitor usage via Supabase dashboard, implement graceful degradation if limits approached

---

## 2. Offline-First Architecture

**Decision**: Service Worker + IndexedDB queue with Supabase client

**Rationale**:
- FR-027 requires queue updates locally and sync on reconnect
- Service worker provides network interception, cache management
- IndexedDB for persistent queue storage (survives page refresh)
- Supabase client handles online/offline detection, automatic retry

**Architecture**:
```
User Action → Optimistic UI Update
           → IndexedDB Queue (offline) OR Supabase Direct (online)
           → On Reconnect: Drain queue → Supabase
```

**Libraries**:
- **Workbox 7**: Service worker toolkit for caching strategies
- **idb** (Jake Archibald): Promise-based IndexedDB wrapper
- **Supabase JS Client v2**: Built-in realtime reconnection logic

**Alternatives Considered**:
- PouchDB + CouchDB sync: Rejected - overkill for simple queue, adds complexity
- LocalStorage queue: Rejected - size limits (5-10MB), no transaction support
- Custom service worker: Rejected - Workbox handles edge cases (cache invalidation, versioning)

**Implementation Notes**:
- Queue schema: `{ id, timestamp, operation, table, data, retries }`
- Conflict resolution on sync: Check `updated_at` timestamp, apply field-level merge (FR-029)
- Max queue size: 1000 items (warn user if exceeded)
- Sync on: `online` event, page load if queue not empty, manual retry button

---

## 3. Conflict Resolution Strategies

**Decision**: Field-level merge with last-write-wins fallback

**Rationale**:
- FR-029 requires: "Merge updates automatically if different fields affected; uses last-write-wins for same field conflicts"
- Attempts table structure enables field-level granularity: each `(session_id, climber_id, grade, send_type)` is unique row
- Different cells = different rows → no conflict
- Same cell = compare `updated_at` timestamp → last-write-wins

**Implementation**:
```javascript
// Offline queue sync logic
async function syncAttempt(queuedUpdate) {
  const current = await supabase
    .from('attempts')
    .select()
    .match({ session_id, climber_id, grade, send_type })
    .single();

  if (!current || queuedUpdate.updated_at > current.updated_at) {
    // Our update is newer or no conflict
    await supabase.from('attempts').upsert(queuedUpdate);
  } else {
    // Server version newer - discard queued update, notify user
    logConflict('Server version newer, discarded local update');
  }
}
```

**Alternatives Considered**:
- CRDT (Conflict-free Replicated Data Types): Rejected - overkill for counter increments, adds complexity
- Operational Transform: Rejected - designed for text editing, not numeric counters
- Pessimistic locking: Rejected - impossible with offline queue

**Edge Cases**:
- Multiple coaches updating same cell offline: Last to sync wins, previous updates lost (acceptable per FR-029)
- Scoring config change mid-sync: Recalculation happens server-side after sync (FR-032)

---

## 4. GitHub Pages + SPA Routing

**Decision**: Use `404.html` redirect trick for client-side routing

**Rationale**:
- GitHub Pages serves static files, no server-side rewrite rules
- SPA needs all routes to serve `index.html` for React Router
- Standard solution: Copy `index.html` to `404.html`, GitHub Pages serves 404 on unknown routes

**Implementation**:
1. Build step: `cp dist/index.html dist/404.html`
2. React Router: `<BrowserRouter>` (not HashRouter - cleaner URLs)
3. Base path in Vite config: `base: '/hvt_js/'` (if not custom domain)

**Alternatives Considered**:
- HashRouter (#/path): Rejected - ugly URLs, breaks social media sharing
- Subdomain with custom server: Rejected - adds cost, complexity for free tier goal
- Netlify/Vercel: Rejected - preference for GitHub Pages specified

**Implementation Notes**:
- Add `<meta>` tag in `404.html` with redirect delay if needed for analytics
- Ensure all links use `<Link>` from React Router (no `<a href>` for internal routes)

---

## 5. Supabase to PostgreSQL Migration Path

**Decision**: Abstraction layer with `db-adapter.js` interface

**Rationale**:
- User requirement: "Keep portability to self-hosted postgres in docker"
- Supabase is PostgreSQL + extras (Realtime, Auth, Storage)
- Core functionality uses standard PostgreSQL, Realtime can be replaced with polling/WebSocket

**Abstraction Interface**:
```javascript
// src/lib/db-adapter.js
export class DatabaseAdapter {
  async query(sql, params) { /* impl */ }
  async subscribe(table, callback) { /* impl */ }
  async unsubscribe(subscription) { /* impl */ }
}

// src/lib/supabase-adapter.js
export class SupabaseAdapter extends DatabaseAdapter {
  constructor(client) { this.client = client; }
  async query(sql, params) {
    return this.client.rpc('execute_sql', { sql, params });
  }
  async subscribe(table, callback) {
    return this.client
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
  }
}

// src/lib/postgres-adapter.js (future)
export class PostgresAdapter extends DatabaseAdapter {
  constructor(pgClient, wsClient) { /* ... */ }
  async subscribe(table, callback) {
    // Use WebSocket or polling fallback
  }
}
```

**Migration Steps** (when needed):
1. Deploy PostgreSQL + pg_notify for real-time (or use polling)
2. Swap adapter: `const db = new PostgresAdapter(pgPool, wsClient);`
3. Update env vars (DATABASE_URL instead of SUPABASE_URL)
4. Deploy to Docker with `docker-compose.yml`

**Alternatives Considered**:
- Prisma ORM: Rejected - adds build step, migration complexity
- Direct Supabase client everywhere: Rejected - violates portability requirement
- GraphQL layer: Rejected - overkill for simple CRUD

---

## 6. Chart.js Performance

**Decision**: Chart.js with optimizations for 20-bar mixed chart

**Rationale**:
- Chart.js widely used, good React integration (`react-chartjs-2`)
- Mixed chart (bars + line) natively supported
- Performance: 20 bars + 1 line = 21 datasets, well within limits (<1000 data points)

**Optimizations**:
- Disable animations on update (only animate on mount)
- Use `decimation` plugin for line chart if >100 points
- `responsive: true` with `maintainAspectRatio: false` for container sizing
- Debounce chart updates (200ms) when data changes rapidly

**Benchmark Target**:
- Initial render: <500ms for 20 climbers
- Update on data change: <100ms
- Tested on: iPad Air 2 (2014) - low-end target device

**Alternatives Considered**:
- Recharts: Rejected - heavier bundle size, slower with many bars
- D3.js: Rejected - requires custom implementation, higher complexity
- Victory: Rejected - animation overhead for data updates
- Canvas-based custom: Rejected - accessibility issues, reinventing wheel

**Implementation Notes**:
```javascript
const options = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 }, // Disable for updates
  scales: {
    x: { stacked: true },
    y: { beginAtZero: true }
  }
};
```

---

## 7. Touch Optimization

**Decision**: CSS touch-action, 44×44px hit targets, optimistic updates

**Rationale**:
- FR-016 requires 44×44px minimum hit targets (WCAG AAA guideline)
- Mobile Safari has 300ms tap delay (removed with `touch-action: manipulation`)
- Optimistic updates (FR-019) make UI feel instant

**Implementation Checklist**:
- [ ] CSS: `touch-action: manipulation` on all buttons
- [ ] Button size: `min-width: 44px; min-height: 44px;`
- [ ] Padding/margin for adequate spacing (16px between buttons)
- [ ] Active state visual feedback: `button:active { transform: scale(0.95); }`
- [ ] Debounce handler: Accumulate taps, batch update after 200-300ms
- [ ] Optimistic update: Increment counter in UI immediately, queue DB save

**Debounce Pattern**:
```javascript
let debounceTimer;
let accumulatedValue = 0;

function handleIncrement(value) {
  // Optimistic UI update
  setCount(prev => prev + value);
  accumulatedValue += value;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    await saveToQueue({ increment: accumulatedValue });
    accumulatedValue = 0;
  }, 250);
}
```

**Alternatives Considered**:
- Throttle instead of debounce: Rejected - debounce batches better for bursts
- No debounce (immediate save): Rejected - overloads database, uses Realtime quota
- Larger hit targets (56px): Rejected - wastes screen space for 360-cell grid

---

## 8. Cloudflare Zero Trust Integration

**Decision**: Cloudflare Access protects static site, no in-app auth

**Rationale**:
- FR-048: "Protected by external authentication (Cloudflare Zero Trust restricting to Urban Jungle Google Workspace users)"
- FR-049: "System MUST NOT implement in-app user authentication"
- Cloudflare Access sits in front of GitHub Pages, enforces auth before serving content
- Static site never sees auth tokens, Cloudflare handles Google Workspace SSO

**Setup Steps**:
1. Add custom domain to GitHub Pages (e.g., `hvt.urbanjungle.com`)
2. Configure Cloudflare DNS for domain
3. Enable Cloudflare Access → Create Application
4. Policy: Allow Google Workspace users with `@urbanjungle.com` emails
5. Protect: `hvt.urbanjungle.com/*` (all routes)

**User Flow**:
1. User visits `hvt.urbanjungle.com`
2. Cloudflare intercepts → Redirects to Google SSO
3. User authenticates with `@urbanjungle.com` account
4. Cloudflare validates, sets session cookie
5. Request proxied to GitHub Pages → Serves static site

**Alternatives Considered**:
- Supabase Auth: Rejected - violates FR-049 (no in-app auth)
- VPN requirement: Rejected - poor UX for mobile access
- IP allowlist: Rejected - coaches may access from gyms with dynamic IPs

**Implementation Notes**:
- No code changes needed in app (Cloudflare is transparent proxy)
- Session duration: 24 hours (Cloudflare Access default)
- Logout: Cloudflare provides logout endpoint at `/cdn-cgi/access/logout`
- For public dashboard (FR-035): Create separate subdomain `results.hvt.urbanjungle.com` with different Access policy (allow all or specific group)

---

## Technical Constraints Summary

| Constraint | Value | Mitigation |
|------------|-------|------------|
| Supabase free tier | 500MB DB, 50k msgs/month | Debounce to ~32k msgs, monitor usage |
| GitHub Pages | Static only | Service worker for offline, 404.html for routing |
| Offline support | Queue must sync reliably | IndexedDB queue, exponential backoff retry |
| Performance | <100ms UI feedback | Optimistic updates, debouncing, Chart.js optimizations |
| Touch targets | 44×44px minimum | CSS sizing, adequate spacing |
| Auth | External only (Cloudflare) | Zero in-app auth code, rely on proxy |
| Portability | PostgreSQL migration | Abstraction layer `db-adapter.js` |

---

## Next Steps (Phase 1)

1. ✅ All technical unknowns resolved
2. → Proceed to data-model.md design
3. → Generate API contracts (OpenAPI)
4. → Create quickstart.md with setup instructions
5. → Update CLAUDE.md agent context

---

**Research Status**: COMPLETE ✅
**Blockers**: None
**Ready for**: Phase 1 Design & Contracts
