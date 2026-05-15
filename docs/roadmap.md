# TableOpen — Implementation Roadmap

## Total Scope: 9 Phases, ~28 hours

This roadmap produces a genuinely competitive database GUI. The target is a tool a developer would switch to from TablePlus — not "good for open-source," not "impressive for a prototype." Every phase assumes the design system, type contract, and CI are already in place from Phase 0.

**Before starting each phase:** `git fetch origin && git merge origin/main`. This ensures type changes and design tokens are current on your branch. Stale types or tokens are a blocker — do not proceed without merging.

---

## Phase 0: Project Scaffold
**Duration:** ~1 hour  
**Parallelism:** All roles work simultaneously  
**Goal:** Empty project that compiles with zero warnings.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 0.1 | Type System Architect | `feat/types` | Rust models, TypeScript types, IPC bridge |
| 0.2 | UI Designer | `feat/design` | Design tokens, CSS, all shared components (Button, Input, Select, Modal, ConfirmDialog, ErrorBoundary, Spinner, Skeleton) |
| 0.3 | Build & QA Engineer | `feat/build` | Tauri scaffold, all configs, CI pipeline, test fixtures |

**Gate:** `cargo check` + `npm run build` + `npx tsc --noEmit` all pass.

---

## Phase 1a: Backend Core (SQLite)
**Duration:** ~6 hours  
**Parallelism:** Develops in parallel with Phase 1b  
**Goal:** SQLite fully working — connect, browse schema, execute queries with type coercion, edit rows transactionally, persist history, export CSV.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 1.1 | Backend | `feat/backend` | r2d2-sqlite pool with WAL mode, busy timeout 5s |
| 1.2 | Backend | `feat/backend` | ConnectionManager: add/remove/list connections |
| 1.3 | Backend | `feat/backend` | Schema service: get_tables, get_columns, get_primary_keys, get_foreign_keys |
| 1.4 | Backend | `feat/backend` | Query service: SELECT + DML execution, explicit type coercion to CellValue |
| 1.5 | Backend | `feat/backend` | Mutation service: transactional INSERT/UPDATE/DELETE with schema-discovered PKs (composite key support) |
| 1.6 | Backend | `feat/backend` | History service: save, get(limit, offset), search(query) |
| 1.7 | Backend | `feat/backend` | Export service: streaming CSV write |
| 1.8 | Backend | `feat/backend` | Connection persistence: save/load connections from app DB |
| 1.9 | Backend | `feat/backend` | All IPC commands registered in lib.rs |
| 1.10 | Backend | `feat/backend` | Integration tests against fixture SQLite database |

**Gate:** All SQLite operations pass `cargo test`. Query → edit → re-query confirms persistence.

---

## Phase 1b: Frontend Shell with Multi-Connection Architecture
**Duration:** ~6 hours  
**Parallelism:** Develops in parallel with Phase 1a  
**Goal:** Complete app shell, connection management with groups and recent list, multi-tab architecture (connections AND queries), theme system, keyboard registry.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 1.10 | Frontend | `feat/frontend` | App shell layout: toolbar, sidebar, editor area, results area, status bar |
| 1.11 | Frontend | `feat/frontend` | **Connection management**: SQLite file picker, Postgres form, connection list with groups, recent connections with timestamps |
| 1.12 | Frontend | `feat/frontend` | **Multi-connection architecture**: open multiple databases simultaneously, switch via tabs or sidebar |
| 1.13 | Frontend | `feat/frontend` | **Recent connections** screen: shows last-used connections on app open, not blank connect form |
| 1.14 | Frontend | `feat/frontend` | **.env import**: parse DATABASE_URL, auto-fill Postgres form |
| 1.15 | Frontend | `feat/frontend` | All 6 Zustand stores with proper state transitions, connection-scoped state |
| 1.16 | Frontend | `feat/frontend` | **Multi-tab query architecture**: Monaco editor with tab bar, multiple query tabs per connection |
| 1.17 | Frontend | `feat/frontend` | Sidebar with Tables/History tabs |
| 1.18 | Frontend | `feat/frontend` | Theme toggle (dark/light, follows system preference) |
| 1.19 | Frontend | `feat/frontend` | ErrorBoundary at each panel |
| 1.20 | Frontend | `feat/frontend` | Global keyboard registry (Cmd+K placeholder) |
| 1.21 | Frontend | `feat/frontend` | Wire all IPC calls to Zustand stores |

**Gate:** App starts. Recent connections show. Open SQLite file. Theme toggles. Multiple query tabs open. No crashes anywhere.

**UX Gate (human):** Open the running app. Does it look premium? Are the proportions right? Does the theme feel expensive, not generic? File UX issues before proceeding to Phase 2.

---

## Phase 2: Query Execution & Virtualized Grid
**Duration:** ~5 hours (expanded for autocomplete and pagination)  
**Dependency:** Phase 1a + 1b complete  
**Goal:** Type SQL with schema autocomplete, see results in 60fps virtualized grid with server-side pagination.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 2.1 | Frontend | `feat/frontend` | Wire query execution: editor → Cmd+Enter → IPC → store → grid |
| 2.2 | Frontend | `feat/frontend` | **Schema autocomplete**: feed tables + columns to Monaco completion provider. SELECT * FROM [table suggestions]. WHERE [column suggestions]. JOIN [table suggestions]. |
| 2.3 | Frontend | `feat/frontend` | Virtualized result grid (TanStack Virtual, 28px rows, overscan 15) |
| 2.4 | Frontend | `feat/frontend` | GridHeader with sortable, resizable columns |
| 2.5 | Frontend | `feat/frontend` | GridCell with NULL-aware, type-appropriate rendering (numbers right, text left, bool badge) |
| 2.6 | Frontend | `feat/frontend` | Row numbers column (right-aligned, muted) |
| 2.7 | Frontend | `feat/frontend` | **Result pagination**: initial fetch LIMIT 1000, scroll-to-bottom triggers OFFSET N to load more, seamless append |
| 2.8 | Backend | `feat/backend` | Paginated query support: execute_query with limit/offset parameters |
| 2.9 | Frontend | `feat/frontend` | Client-side sort for loaded rows, server-side sort via re-query for paginated sets |
| 2.10 | Frontend | `feat/frontend` | Loading skeleton, error display, empty state |
| 2.11 | Frontend | `feat/frontend` | Query history recording (fire-and-forget, doesn't block UI) |

**Gate:** Open SQLite → type query with autocomplete help → Cmd+Enter → results in grid at 60fps. Sort by clicking headers. Scroll to load more. NULLs visually distinct.

**UX Gate (human):** Open the running app with a real database. Does the grid feel premium and precise? Are NULLs immediately distinguishable from empty strings? Does scrolling feel native, not like a web component? Does the data presentation make you trust the tool? File UX issues before proceeding.

---

## Phase 3: Row Editing with Diff and Undo
**Duration:** ~2 hours  
**Dependency:** Phase 2 complete  
**Goal:** Double-click cell, edit, see side-by-side diff, confirm. Undo supported.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 3.1 | Frontend | `feat/frontend` | InlineEditor: double-click to edit, Tab/Shift+Tab navigate cells |
| 3.2 | Frontend | `feat/frontend` | **RowDiff modal**: original vs new side-by-side, column by column, before any commit |
| 3.3 | Frontend | `feat/frontend` | ConfirmDialog with affected row preview and "This will modify production data" warning |
| 3.4 | Frontend | `feat/frontend` | **Undo support**: track last committed edit, allow single-level undo via re-query of original values |
| 3.5 | Frontend | `feat/frontend` | Wire to mutation IPC commands (uses schema-discovered PKs from backend) |
| 3.6 | Frontend | `feat/frontend` | Edit mode keyboard nav: Enter commit, Escape cancel, Tab next cell |
| 3.7 | Frontend | `feat/frontend` | Visual feedback: edited cells highlight briefly after commit |

**Gate:** Double-click → change → Enter → diff → confirm → row updates → re-query confirms → undo works.

---

## Phase 4: Table Browser, History, and Column Inspector
**Duration:** ~2 hours  
**Dependency:** Phase 2 complete  
**Goal:** Browse tables with fuzzy search, inspect columns, browse and re-run history.

Parallel with Phase 5.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 4.1 | Frontend | `feat/frontend` | **TableBrowser with fuzzy search** (uFuzzy, ~2KB). "usr" finds "users" before "user_sessions" |
| 4.2 | Frontend | `feat/frontend` | Click table → SELECT * FROM table LIMIT 1000 (paginated) |
| 4.3 | Frontend | `feat/frontend` | **ColumnInspector**: sidebar panel showing column name, type, nullable, default, PK status, FK references |
| 4.4 | Frontend | `feat/frontend` | **HistoryPanel** with search: filter by SQL content, connection, time range |
| 4.5 | Frontend | `feat/frontend` | History entries show SQL preview (first 80 chars), execution time, row count, timestamp |
| 4.6 | Frontend | `feat/frontend` | **Re-run from history**: click entry → fills current query tab → auto-executes (configurable) |

**Gate:** Search "usr" → "users" appears first. Click table → grid shows data. Search history → click → editor fills → re-run.

---

## Phase 5: Keyboard Architecture & Polish
**Duration:** ~2 hours  
**Dependency:** Phase 2 complete  
**Goal:** Every action discoverable and keyboard-accessible. Visual polish complete.

Parallel with Phase 4.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 5.1 | Frontend | `feat/frontend` | **Command palette** (Cmd+K): fuzzy search all actions, ranked by frequency. Shows keyboard shortcut beside each action. |
| 5.2 | Frontend | `feat/frontend` | **Full keyboard shortcuts**: Cmd+N new connection, Cmd+T new query tab, Cmd+W close tab, Cmd+L focus editor, Cmd+\ toggle sidebar, Cmd+Shift+E export, Cmd+, preferences placeholder |
| 5.3 | Frontend | `feat/frontend` | Grid keyboard navigation: arrow keys, Enter edit, Escape cancel, Tab next cell, Space select row |
| 5.4 | Frontend | `feat/frontend` | Copy cell value: Cmd+C (TSV format for multi-cell selection) |
| 5.5 | Frontend | `feat/frontend` | Resizable panels: drag to resize sidebar, editor/results split |
| 5.6 | Frontend | `feat/frontend` | Column width persistence per table (stored in UI store, survives tab switches) |
| 5.7 | Frontend | `feat/frontend` | Loading skeletons (not spinners): text block skeleton for editor, row skeletons for grid |
| 5.8 | Frontend | `feat/frontend` | Visual polish pass: spacing consistency, hover states complete, focus rings visible, no dead gray-on-gray |
| 5.9 | UI Designer | `feat/design` | Review all components against design tokens. Fix any hardcoded values. |

**Gate:** Cmd+K → every action discoverable. Grid navigable without mouse. Panels resize smoothly. Theme correct in both dark and light.

**UX Gate (human):** Full app review. Open the running app. Does it feel like a tool you'd pay for? Command palette should feel like Raycast. Every interaction should feel precise. Dark and light themes both polished. Grid, editor, sidebar, modals — all premium. File UX issues before proceeding to Phase 6.

---

## Phase 6: PostgreSQL & SSH Tunnels
**Duration:** ~4 hours (expanded for full feature parity with SQLite)  
**Dependency:** Phase 3 complete  
**Goal:** PostgreSQL fully working with SSH tunnel support, at feature parity with SQLite.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 6.1 | Backend | `feat/backend` | deadpool-postgres pool with SSL config (disable/prefer/require) |
| 6.2 | Backend | `feat/backend` | Schema service: information_schema queries for tables, columns, PKs, FKs, schemas |
| 6.3 | Backend | `feat/backend` | Query service: async query execution, pg_type → CellValue type coercion for all common types |
| 6.4 | Backend | `feat/backend` | **SSH tunnel service**: ssh2 crate, key-based auth, tunnel creation per connection |
| 6.5 | Backend | `feat/backend` | **Test connection** that actually pings the database and returns success/failure with specific error |
| 6.6 | Backend | `feat/backend` | Connection persistence: save/load PostgreSQL connections from app DB |
| 6.7 | Frontend | `feat/frontend` | **PostgresForm** with all fields, SSL mode selector, SSH toggle, test button |
| 6.8 | Frontend | `feat/frontend` | PostgreSQL schema display: schemas as top-level in table browser (public, custom schemas) |
| 6.9 | Backend | `feat/backend` | PostgreSQL integration tests against a local or Docker Postgres instance |

**Gate:** Connect to PostgreSQL locally and via SSH tunnel. Browse tables across schemas. Run queries. Edit rows. Test connection works.

---

## Phase 7: Export, Clipboard & Data Portability
**Duration:** ~2 hours (expanded for more copy formats)  
**Dependency:** Phase 4 + 5 complete  
**Goal:** Export results to CSV. Copy rows as INSERT, UPDATE, DELETE, JSON statements.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 7.1 | Backend | `feat/backend` | Export service: streaming CSV with proper escaping, streaming JSON array |
| 7.2 | Frontend | `feat/frontend` | CSV export via native save dialog |
| 7.3 | Frontend | `feat/frontend` | JSON export via native save dialog |
| 7.4 | Frontend | `feat/frontend` | **Copy row as INSERT**: `INSERT INTO "users" ("id", "name") VALUES (1, 'Alice');` |
| 7.5 | Frontend | `feat/frontend` | **Copy row as UPDATE**: `UPDATE "users" SET "name" = 'Alice' WHERE "id" = 1;` |
| 7.6 | Frontend | `feat/frontend` | **Copy row as DELETE**: `DELETE FROM "users" WHERE "id" = 1;` |
| 7.7 | Frontend | `feat/frontend` | **Copy row as JSON**: `{"id": 1, "name": "Alice"}` |
| 7.8 | Frontend | `feat/frontend` | **Copy cell as value** (plain text, for pasting into code) |
| 7.9 | Frontend | `feat/frontend` | Export/context menu on right-click in grid |

**Gate:** Export → valid CSV/JSON. Right-click row → Copy as INSERT → valid SQL. Copy as JSON → valid JSON. All copy formats tested with NULL, strings with quotes, special characters.

---

## Phase 8: Stabilization & Packaging
**Duration:** ~3 hours  
**Dependency:** All phases complete  
**Goal:** Production-ready build. All tests pass. Performance targets met. Ready to ship.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 8.1 | Build & QA | `feat/build` | Full integration test suite pass (Rust + React) |
| 8.2 | Build & QA | `feat/build` | Performance benchmarks: startup < 1s, grid 60fps on 100k rows, query < 100ms for 10k rows |
| 8.3 | Build & QA | `feat/build` | Build for all platforms: macOS arm64 + x86_64, Linux, Windows |
| 8.4 | Build & QA | `feat/build` | macOS code signing + notarization |
| 8.5 | Build & QA | `feat/build` | Bundle size verification: JS < 500KB gzipped, binary < 20MB |
| 8.6 | Build & QA | `feat/build` | Memory profiling: < 100MB idle, < 300MB with 100k rows loaded |
| 8.7 | Build & QA | `feat/build` | Code review pass: safety, correctness, standards |
| 8.8 | Build & QA | `feat/build` | README, CONTRIBUTING, LICENSE finalized |
| 8.9 | Build & QA | `feat/build` | App icons generated for all platforms |

**Gate:** All tests pass. `tauri build` produces a working, signed app. All performance targets met. Ready for release.

---

## Phase 9: Launch Preparation
**Duration:** ~1 hour  
**Dependency:** Phase 8 complete  
**Goal:** Repository ready for public visibility.

| # | Role | Branch | Output |
|---|------|--------|--------|
| 9.1 | Build & QA | `feat/build` | GitHub Release created with binaries for all platforms |
| 9.2 | Build & QA | `feat/build` | Launch screenshot (dark theme, query in grid, editor, sidebar visible) |
| 9.3 | Build & QA | `feat/build` | Website or landing page (minimal: screenshot + download + quick start) |
| 9.4 | All | `main` | Final review: every feature works, no known bugs, no crashes |

**Gate:** Public-ready. A developer can clone, build, and use the tool in under 5 minutes.

---

## What This Actually Ships

At the end of Phase 9, TableOpen ships with:

- **SQLite + PostgreSQL** with SSH tunnel support
- **Multi-connection architecture**: open multiple databases simultaneously, switch between them
- **Multi-tab query editor**: multiple query tabs per connection, Monaco with schema autocomplete
- **60fps virtualized result grid** with server-side pagination for large result sets
- **Transactional row editing** with diff-before-commit, composite PK support, undo
- **Table browser** with fuzzy search and column inspector
- **Connection management** with groups, recent connections, .env import
- **Query history** searchable by content, re-runnable
- **Command palette** (Cmd+K) with fuzzy search for every action
- **Full keyboard navigation**: every operation possible without mouse
- **Export to CSV and JSON**
- **Copy as INSERT, UPDATE, DELETE, JSON**
- **Dark and light themes** with system preference detection
- **Resizable panels** with column width persistence
- **Sub-second launch** on modern hardware
