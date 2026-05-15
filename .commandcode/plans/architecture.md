# TableOpen — Implementation Blueprint

## 0. Repository Architecture

```
tableopen/
├── .commandcode/
│   └── plans/                    # Implementation plans (this document + phase docs)
├── docs/
│   ├── decisions/                # Architecture Decision Records (ADRs)
│   ├── architecture.md           # This document
│   ├── standards.md              # Coding standards, review process, performance targets
│   ├── backend-README.md         # Backend-specific: setup, test commands, conventions
│   ├── frontend-README.md        # Frontend-specific: setup, test commands, conventions
│   ├── types-README.md           # Type system: IPC contract, serialization rules
│   ├── roadmap.md               # Staged implementation phases
│   └── contributing.md           # Contributor onboarding
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # Typecheck, lint, test, build
│   │   └── release.yml           # Build + package + publish
│   └── CODEOWNERS                # Review assignment by path
├── src-tauri/                    # Rust backend (Backend Systems Engineer)
│   ├── Cargo.toml
│   ├── Cargo.lock                # Committed
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/                    # App icons
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── lib.rs                # Tauri builder, state, command registration
│   │   ├── commands/             # IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs     # connect_sqlite, connect_postgres, disconnect, test_connection
│   │   │   ├── query.rs          # execute_query, cancel_query
│   │   │   ├── schema.rs         # get_tables, get_columns, get_primary_keys
│   │   │   ├── row_edit.rs       # update_row, delete_row, insert_row
│   │   │   ├── history.rs        # get_history, search_history
│   │   │   └── export.rs         # export_csv
│   │   ├── services/             # Business logic (commands delegate here)
│   │   │   ├── mod.rs
│   │   │   ├── connection_service.rs
│   │   │   ├── query_service.rs
│   │   │   ├── schema_service.rs
│   │   │   ├── mutation_service.rs
│   │   │   ├── export_service.rs
│   │   │   ├── history_service.rs
│   │   │   └── ssh_service.rs
│   │   ├── db/                   # Database drivers
│   │   │   ├── mod.rs
│   │   │   ├── pool.rs           # ConnectionPool enum
│   │   │   ├── sqlite.rs         # r2d2-sqlite pool
│   │   │   ├── postgres.rs       # deadpool-postgres pool
│   │   │   └── ssh.rs            # SSH tunnel (ssh2)
│   │   ├── models/               # Shared data types
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs     # ConnectionConfig, PgConfig, ConnectionInfo
│   │   │   ├── query.rs          # QueryResult, ColumnMeta, CellValue
│   │   │   ├── schema.rs         # TableInfo, ColumnInfo, PrimaryKeyInfo
│   │   │   └── history.rs        # HistoryEntry, HistoryStatus
│   │   ├── store/                # App-level persistence
│   │   │   ├── mod.rs
│   │   │   └── app_db.rs         # SQLite-backed: history, connections, preferences
│   │   └── error.rs              # Unified AppError type
│   └── tests/
│       ├── integration/          # Integration tests per service
│       └── fixtures/             # Test database files
├── src/                          # React frontend (Frontend UX Engineer)
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Root: theme provider, error boundary, view routing
│   ├── types/                    # TypeScript types (mirror Rust models)
│   │   ├── connection.ts
│   │   ├── query.ts              # CellValue discriminated union
│   │   ├── schema.ts
│   │   └── history.ts
│   ├── ipc/                      # Typed IPC bridge
│   │   ├── commands.ts           # All invoke() wrappers
│   │   └── types.ts              # IPC argument/return type defs
│   ├── stores/                   # Zustand state
│   │   ├── connection-store.ts
│   │   ├── schema-store.ts
│   │   ├── editor-store.ts
│   │   ├── query-store.ts
│   │   ├── history-store.ts
│   │   └── ui-store.ts
│   ├── hooks/
│   │   ├── use-keyboard.ts       # Global keyboard registry
│   │   ├── use-query.ts
│   │   ├── use-schema.ts
│   │   └── use-resize.ts
│   ├── components/
│   │   ├── layout/               # App shell, toolbar, status bar, sidebar
│   │   ├── connection/           # Connection screen, forms
│   │   ├── editor/               # Monaco editor wrapper
│   │   ├── grid/                 # VirtualGrid, cells, inline editor, diff
│   │   ├── schema/               # Table browser, column inspector
│   │   ├── history/              # Query history panel
│   │   ├── workspace/            # Main workspace layout
│   │   └── shared/               # Design system components, ErrorBoundary
│   ├── lib/                      # Pure utilities (no React, no state)
│   │   ├── cell-utils.ts         # CellValue display, compare, parse
│   │   ├── csv.ts
│   │   ├── fuzzy.ts              # Lightweight fuzzy search
│   │   └── clipboard.ts          # Copy as INSERT/UPDATE/JSON
│   └── styles/
│       ├── index.css             # Tailwind + design tokens
│       ├── tokens.css             # Light + dark theme tokens
│       └── monaco.css             # Monaco theme overrides
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── tailwind.config.ts
├── .gitignore
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

---

## 8. Competitive Feature Architecture

### Multi-Connection Tabs

The app supports multiple simultaneous database connections. Each connection has its own schema context, query tabs, and result history.

**State model:**
```typescript
interface ConnectionTab {
  connectionId: string;
  connectionInfo: ConnectionInfo;
  queryTabs: QueryTab[];
  activeQueryTabId: string;
}

interface QueryTab {
  id: string;
  title: string;              // "Query 1", or user-renamed
  content: string;            // SQL editor content
  results: QueryResult | null;
  isDirty: boolean;           // unsaved changes indicator
}
```

**Connection store structure:**
```typescript
interface ConnectionState {
  connections: ConnectionTab[];     // all open connections
  activeConnectionId: string | null;
  savedConnections: SavedConnection[];  // persisted to app DB
  recentConnections: SavedConnection[];  // sorted by lastUsedAt
}
```

**Behavior:**
- Cmd+N opens a new connection tab
- Cmd+W closes the active connection tab (disconnects)
- Switching connections switches the entire workspace (sidebar, editor tabs, results)
- Recent connections screen shows on app open if no active connections

### Multi-Query Tabs

Each connection supports multiple query tabs. Each tab has its own editor content, execution state, and result set.

**Behavior:**
- Cmd+T opens a new query tab in the active connection
- Cmd+W closes the active query tab
- Cmd+Shift+[ / ] cycles through query tabs
- Tabs show title (editable) and dirty indicator (dot)
- Executing a query in one tab doesn't affect other tabs
- Closing a connection closes all its query tabs

### Schema Autocomplete

Monaco Editor is configured with a completion provider that reads from the schema store.

**Data flow:**
1. On connection, `schema-store.loadTables()` fetches all tables and columns
2. `lib/autocomplete.ts` builds a Monaco `CompletionItem[]` from the schema data
3. Monaco's `registerCompletionItemProvider` is configured when the editor mounts
4. Context-aware suggestions:
   - After `FROM` / `JOIN` → table names
   - After `WHERE` / `ON` / `SET` → column names (scoped to referenced tables when possible)
   - After `INSERT INTO` → table names
   - Always available: SQL keywords, function names

**Implementation:**
```typescript
// lib/autocomplete.ts
export function createCompletionProvider(
  tables: TableInfo[],
  columns: ColumnInfo[]
): monaco.languages.CompletionItemProvider {
  return {
    provideCompletionItems: (model, position) => {
      // Analyze token before cursor to determine context
      // Return table names, column names, or SQL keywords based on context
    }
  };
}
```

### Result Pagination

Large result sets are not loaded entirely into memory. The grid loads in pages and fetches more as the user scrolls.

**Architecture:**
- Initial query: `SELECT ... LIMIT 1000 OFFSET 0`
- When user scrolls to bottom 20% of loaded rows, fetch next page: `LIMIT 1000 OFFSET 1000`
- Rows are appended to the existing result set
- Loading indicator at bottom of grid during fetch
- Total row count is approximate (fast count via `COUNT(*)` or estimate)
- Virtualizer `count` updates as new pages arrive

**State model:**
```typescript
interface QueryState {
  result: QueryResult | null;
  allRows: CellValue[][];        // accumulated across pages
  hasMore: boolean;              // true if more pages may exist
  loadingPage: boolean;          // fetching next page
  totalRowCount: number | null;  // approximate
}
```

### Connection Groups in UI

The connection list is organized by groups. Groups are user-defined strings.

**State model:**
```typescript
interface SavedConnection {
  id: string;
  name: string;
  group: string;                // "Work", "Personal", "Client Projects"
  dbType: "sqlite" | "postgres";
  filePath?: string;
  pgConfig?: PgConfig;
  lastUsedAt: string;
}
```

**UI:**
- Sidebar shows collapsible group headers
- "Ungrouped" section for connections without a group
- Drag connection between groups (v1 stretch)
- New connection form includes group selector (dropdown + free-text)

### .env Import

Parse `DATABASE_URL` format and auto-fill the PostgreSQL connection form.

**Implementation:**
```typescript
function parseDatabaseUrl(url: string): PgConfig | null {
  // postgres://user:password@host:port/database?sslmode=require
  const parsed = new URL(url);
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') return null;
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 5432,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
    ssl_mode: parsed.searchParams.get('sslmode') === 'require' ? 'require' : 'prefer',
  };
}
```

**UI:**
- "Import from .env" button on the connection screen
- Opens file picker for `.env` file
- Parses `DATABASE_URL` variable
- Auto-fills the PostgreSQL form
- User can edit before connecting

## 1. Subsystem Ownership

### Backend Systems (Rust)
**Owner:** Backend Systems Engineer  
**Responsible sub-agents:** `rust-engineer`, `postgres-pro`, `sql-pro`, `performance-engineer`  
**Branch:** `feat/backend`

**Owns:**
- `src-tauri/src/` — all Rust code
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/tests/`

**Must coordinate with:** Type System Architect (for model types and IPC signatures)

**Independent decisions:**
- Database driver selection and configuration
- Connection pooling strategy
- Query execution model (threading, async)
- SSH tunnel implementation
- Error handling patterns
- Transaction management

**Cannot override:**
- Model types (defined by Type System Architect)
- IPC command signatures (defined by Type System Architect)
- User-facing error messages (reviewed by Frontend UX Engineer)

**Expected output:**
- Working SQLite and PostgreSQL connections with real pooling
- Full query execution with proper type coercion to CellValue
- Transactional row editing with schema-discovered primary keys
- Schema introspection (tables, columns, primary keys, foreign keys)
- Query history persistence with search
- Streaming CSV export
- SSH tunnel support for PostgreSQL
- Integration tests for all critical paths

### Frontend UX (React + TypeScript)
**Owner:** Frontend UX Engineer  
**Responsible sub-agents:** `react-specialist`, `ui-ux-tester`, `performance-engineer`  
**Branch:** `feat/frontend`

**Owns:**
- `src/` — all React code
- Zustand stores
- Component architecture
- Keyboard navigation
- State management patterns

**Must coordinate with:** UI Designer (for design system usage), Type System Architect (for type imports), Backend Systems Engineer (for IPC contract)

**Independent decisions:**
- Component architecture and composition
- State management patterns
- Keyboard shortcut assignments
- Grid interaction model (selection, editing, navigation)
- Loading state UX

**Cannot override:**
- Design tokens (defined by UI Designer)
- IPC types (defined by Type System Architect)
- Backend behavior

**Expected output:**
- App shell with toolbar, sidebar, status bar
- Connection screen (SQLite file picker, Postgres form)
- Monaco editor with Cmd+Enter execution
- Virtualized result grid at 60fps on 100k rows
- Inline cell editing with diff-before-commit confirmation
- Table browser with fuzzy search
- Query history panel with search and re-run
- Command palette (Cmd+K) with all actions
- Global keyboard shortcuts
- Error boundaries at every major panel
- Dark/light theme following system preference

### Type System (Shared Contracts)
**Owner:** Type System Architect  
**Responsible sub-agents:** `typescript-pro`  
**Branch:** `feat/types`

**Owns:**
- `src/types/` — TypeScript type definitions
- `src/ipc/` — Typed IPC bridge
- `src-tauri/src/models/` — Rust model types

**Must coordinate with:** Both Backend and Frontend

**Independent decisions:**
- Type structure and naming
- Serialization format (serde attributes)
- Discriminated union design
- IPC argument and return type signatures

**Expected output:**
- All Rust model types with correct serde attributes
- All TypeScript type definitions mirroring Rust types exactly
- Typed IPC bridge (`ipc/commands.ts`) with no `any` types
- CellValue tagged enum consistent across Rust and TypeScript
- HistoryStatus tagged enum consistent across Rust and TypeScript
- IPC contract document listing every command, its arguments, and return type

### Design System (Visual Language)
**Owner:** UI Designer  
**Responsible sub-agents:** `ui-designer`, `ui-ux-tester`  
**Branch:** `feat/design`

**Owns:**
- `src/styles/` — CSS, design tokens, themes
- `src/components/shared/` — Button, Input, Modal, ErrorBoundary, ConfirmDialog

**Must coordinate with:** Frontend UX Engineer (components use the design system)

**Independent decisions:**
- Color palette and token naming
- Spacing scale
- Typography (font families, sizes, weights)
- Border radius
- Shadow system
- Animation curves and durations
- Dark/light theme token values

**Expected output:**
- CSS custom properties for all design tokens
- `.dark` and `.light` classes with complete token sets
- Shared UI components (Button, Input, Modal, Select, ConfirmDialog, ErrorBoundary)
- Monaco theme overrides matching the app theme
- Visual polish that makes a TablePlus user say "this feels right"

### Build & QA (CI/CD, Testing, Packaging)
**Owner:** Build & QA Engineer  
**Responsible sub-agents:** `build-engineer`, `code-reviewer`, `debugger`, `performance-engineer`  
**Branch:** `feat/build`

**Owns:**
- `.github/workflows/`
- CI/CD pipelines
- Test infrastructure
- Build configuration
- Packaging and distribution
- Code review process enforcement

**Must coordinate with:** All roles (verifies their output)

**Expected output:**
- CI pipeline: typecheck, lint, test, build on every PR
- Release pipeline: build + package + publish to GitHub Releases
- Test harness for Rust integration tests and React component tests
- Performance benchmarks (startup time, grid FPS, query execution)
- Bundle size tracking
- Branch protection rules and review enforcement

---

## 2. Execution Sequencing

### Phase 0: Project Scaffold (parallel, ~1 hour)
**Goal:** Empty project that compiles with zero warnings.

**Tasks:**
1. **Type System Architect** (`feat/types`): Create all Rust models, TypeScript types, IPC bridge
2. **UI Designer** (`feat/design`): Create design tokens, CSS, shared components
3. **Build & QA Engineer** (`feat/build`): Tauri scaffold, Cargo.toml with deps, package.json, Vite, Tailwind, CI config

**Merge order:** Types → Design → Build  
**Gate:** `cargo check` passes, `npm run build` passes, `npx tsc --noEmit` passes

### Phase 1: Backend Core (parallel with Phase 1b, ~6 hours)
**Goal:** SQLite fully working. Connect, browse, query, edit, export.

**Tasks:**
4. **Backend Systems Engineer** (`feat/backend`):
   - r2d2-sqlite connection pool with WAL mode, busy timeout
   - ConnectionManager: add/remove/list connections
   - Schema service: get_tables, get_columns, get_primary_keys (PRAGMA)
   - Query service: execute SELECT/PRAGMA, execute DML, type coercion to CellValue
   - Mutation service: transactional INSERT/UPDATE/DELETE with schema-discovered PKs
   - Export service: streaming CSV
   - History service: persist and search
   - IPC command registration
   - Rust-side only: integration tests against a fixture SQLite database

**Gate:** All SQLite operations work via `cargo test`. Query → edit → re-query confirms persistence.

### Phase 1b: Frontend Shell (parallel with Phase 1, ~6 hours)
**Goal:** Empty app shell with navigation, themes, keyboard architecture, empty panels.

**Tasks:**
5. **Frontend UX Engineer** (`feat/frontend`):
   - App shell layout (toolbar, sidebar, editor area, results area, status bar)
   - Connection screen (SQLite file picker via Tauri dialog plugin)
   - Zustand stores (all 6, with proper state transitions)
   - Monaco editor wrapper (editor panel with run button)
   - Empty result panel with placeholder
   - Empty sidebar with tabs (Tables, History)
   - Theme toggle (dark/light)
   - ErrorBoundary at each panel
   - Global keyboard registry (Cmd+K placeholder)
   - Wire IPC calls to Zustand stores

**Gate:** App starts, connection screen shows, theme toggles, no crashes. IPC calls work (backend must be ready). Then **UX-G1**: Human opens the app and verifies premium look and feel — correct proportions, theme polish, no visual slop.

### Phase 2: Query Execution & Grid (sequential, ~4 hours)
**Goal:** Type SQL, see results in grid.

**Tasks:**
6. **Frontend UX Engineer** (`feat/frontend`):
   - Wire query execution: editor → Cmd+Enter → IPC → store → grid
   - Virtualized result grid (TanStack Virtual, 28px rows, overscan 15)
   - GridHeader with sortable columns
   - GridCell with NULL-aware rendering (italic, muted, distinct)
   - Type-appropriate alignment (numbers right, text left)
   - Row numbers column
   - Client-side sort for < 10k rows
   - Loading state, error display
   - Query history recording in sidebar

**Gate:** Open SQLite file → write query → Cmd+Enter → results in grid → sort by clicking headers. NULLs distinct. Then **UX-G2**: Human opens the app with real data — grid feels premium, NULLs immediately distinguishable, scrolling feels native, data presentation inspires trust.

### Phase 3: Row Editing (sequential, ~2 hours)
**Goal:** Double-click cell, edit, see diff, commit safely.

**Tasks:**
7. **Frontend UX Engineer** (`feat/frontend`):
   - InlineEditor: double-click to edit, Tab/Shift+Tab to navigate cells
   - RowDiff modal: shows original vs new value side by side before commit
   - ConfirmDialog: "Are you sure?" with affected row preview
   - Wire to mutation IPC commands
   - Keyboard navigation in edit mode (Enter to commit, Escape to cancel)

**Gate:** Double-click cell → change value → Enter → diff appears → confirm → row updates → re-query confirms.

### Phase 4: Table Browser & History (parallel with Phase 5, ~2 hours)
**Goal:** Click tables in sidebar, search, browse query history.

**Tasks:**
8. **Frontend UX Engineer** (`feat/frontend`):
   - TableBrowser: fuzzy search, click to SELECT * FROM table
   - ColumnInspector: shows column details on table click
   - HistoryPanel: searchable, click to re-run query
   - History entries show SQL preview, execution time, row count

**Gate:** Click table → grid shows data. Search history → click entry → editor fills → re-run.

### Phase 5: Polish & Keyboard (parallel with Phase 4, ~2 hours)
**Goal:** Keyboard-first UX, visual polish.

**Tasks:**
9. **Frontend UX Engineer** (`feat/frontend`):
   - Command palette: Cmd+K, fuzzy search all actions
   - Keyboard shortcuts: Cmd+L (focus editor), Cmd+\ (toggle sidebar), Cmd+K (palette)
   - Grid keyboard navigation: arrows, Enter to edit, Escape to cancel
   - Copy cell value: Cmd+C
   - Resizable panels: drag to resize sidebar, editor/results split
   - Column width persistence per table
   - Loading skeletons instead of spinners

**Gate:** Every action discoverable via Cmd+K. Grid navigable without mouse. Panels resizable. Then **UX-G5**: Human does full app review — does it feel like a tool you'd pay for? Command palette like Raycast. Every interaction precise. Both themes polished. Premium across all surfaces.

### Phase 6: PostgreSQL & SSH (sequential, ~3 hours)
**Goal:** PostgreSQL connections with SSH tunnel support.

**Tasks:**
10. **Backend Systems Engineer** (`feat/backend`):
    - deadpool-postgres pool with SSL config
    - Schema service: information_schema queries for tables, columns, PKs
    - Query service: async query execution with proper type coercion (pg_type → CellValue)
    - SSH tunnel service: ssh2 crate, key-based auth
    - PostgresForm: SSL mode selector, test connection button that actually pings
    - Connection persistence: save/load from app DB

**Gate:** Connect to PostgreSQL (local and remote via SSH). Browse tables, run queries, edit rows.

### Phase 7: Export & Clipboard (sequential, ~1 hour)
**Goal:** Export results, copy rows as SQL.

**Tasks:**
11. **Frontend UX Engineer** (`feat/frontend`) + **Backend Systems Engineer** (`feat/backend`):
    - CSV export: save dialog, streaming write
    - Copy row as INSERT statement
    - Copy row as JSON
    - Export button in result panel

**Gate:** Click Export → choose file → valid CSV written. Right-click row → Copy as INSERT → valid SQL in clipboard.

### Phase 8: Stabilization & Packaging (~3 hours)
**Goal:** Production-ready build, tests pass, performance targets met.

**Tasks:**
12. **Build & QA Engineer** (`feat/build`):
    - Full integration test suite pass
    - Performance benchmarks: startup < 1s, grid 60fps, query < 100ms for 10k rows
    - Build for all platforms (macOS arm64 minimum, x86_64, Linux, Windows if possible)
    - Code signing for macOS
    - Bundle size check
    - README, CONTRIBUTING, LICENSE
    - App icons

**Gate:** All tests pass. `tauri build` produces a working app. Performance targets met.

---

## 3. Sub-Agent Execution Plan

### How Sub-Agents Are Used

Each role delegates implementation to sub-agents. The orchestrator (you) reviews output and merges. Sub-agents do NOT merge directly — they produce code on their branch, then the orchestrator reviews and integrates.

### Per-Phase Agent Assignments

#### Phase 0: Project Scaffold

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Type System Architect | `feat/types` | `typescript-pro` | Rust models + TS types + IPC bridge |
| UI Designer | `feat/design` | `ui-designer` | Design tokens + CSS + shared components |
| Build & QA Engineer | `feat/build` | `build-engineer` | Project scaffold, configs, CI |

#### Phase 1: Backend Core

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Backend Systems Engineer | `feat/backend` | `rust-engineer` | Connection pools, schema, query, mutations |
| | | `sql-pro` | Copy-as-SQL formatting, autocomplete keyword list |
| | | `performance-engineer` | Pool sizing, query profiling |

#### Phase 1b: Frontend Shell

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Frontend UX Engineer | `feat/frontend` | `react-specialist` | App shell, stores, Monaco integration, keyboard |
| | | `ui-ux-tester` | Verify layout, theme toggle, keyboard shortcuts |

#### Phase 2: Query Execution & Grid

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Frontend UX Engineer | `feat/frontend` | `react-specialist` | VirtualGrid, GridCell, sorting, NULL rendering |
| | | `performance-engineer` | Grid scroll profiling, 60fps verification |
| | | `ui-ux-tester` | Grid interaction quality, cell display |

#### Phase 3: Row Editing

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Frontend UX Engineer | `feat/frontend` | `react-specialist` | InlineEditor, RowDiff, ConfirmDialog |
| | | `ui-ux-tester` | Edit flow quality, diff clarity, keyboard nav |

#### Phase 4: Table Browser & History

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Frontend UX Engineer | `feat/frontend` | `react-specialist` | TableBrowser, fuzzy search, HistoryPanel |

#### Phase 5: Polish & Keyboard

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Frontend UX Engineer | `feat/frontend` | `react-specialist` | Command palette, keyboard shortcuts, resize |
| | | `ui-ux-tester` | Full keyboard navigation pass |

#### Phase 6: PostgreSQL & SSH

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Backend Systems Engineer | `feat/backend` | `rust-engineer` | PostgreSQL pool, schema, queries, SSH tunnels |
| | | `postgres-pro` | Type coercion, SSL modes, information_schema queries |

#### Phase 7: Export & Clipboard

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Frontend UX Engineer | `feat/frontend` | `react-specialist` | Export UI, clipboard |
| Backend Systems Engineer | `feat/backend` | `rust-engineer` | Streaming CSV, INSERT statement generation |

#### Phase 8: Stabilization

| Role | Branch | Sub-Agents | Task |
|------|--------|-----------|------|
| Build & QA Engineer | `feat/build` | `build-engineer` | CI/CD, packaging, code signing |
| | | `code-reviewer` | Full codebase review for safety |
| | | `debugger` | Fix any integration test failures |
| | | `performance-engineer` | Benchmarks, regression check |

---

## 4. Branch Strategy

### Branches

```
main                    # Production-ready, protected
  ├── feat/types        # Type System Architect
  ├── feat/design       # UI Designer
  ├── feat/backend      # Backend Systems Engineer
  ├── feat/frontend     # Frontend UX Engineer
  └── feat/build        # Build & QA Engineer
```

### Merge Flow

1. `feat/types` merges first — all other branches depend on shared types
2. `feat/design` merges next — frontend components reference design tokens
3. `feat/backend` and `feat/frontend` develop in parallel after types are merged
4. Backend merges before frontend for each feature (e.g., query execution merges, then grid wires to it)
5. `feat/build` runs continuously — CI pipeline exists from Phase 0

### Merge Criteria

- CI passes: `npx tsc --noEmit`, `cargo check`, `cargo test`, `npm run build`
- At least one code review approval (from a different role)
- No performance regressions (startup time, grid FPS)
- No new warnings
- Conventional commit message

### Branch Naming

```
feat/<role>/<short-description>     # New feature
fix/<role>/<short-description>      # Bug fix
chore/<role>/<short-description>    # Tooling, config, CI
docs/<role>/<short-description>     # Documentation only
test/<role>/<short-description>     # Tests only
refactor/<role>/<short-description> # No behavior change
```

### Coordination Rules

1. **Merge latest main before starting each phase.** `git fetch origin && git merge origin/main`. This ensures type changes from `feat/types` are available and no branch drifts.
2. **Type changes propagate immediately.** If the Type System Architect adds/modifies types after Phase 0, they must notify all active roles. Backend and Frontend must merge within the same working session. Stale types on a branch are a blocker.
3. **Breaking IPC changes require coordination.** If a command signature changes, the Backend Systems Engineer and Frontend UX Engineer must agree on the new contract before implementation. Type System Architect documents the change.
4. **No merging without review.** At least one approval from a different role. CI must pass. No performance regressions.

### Human UX Review Gates

Certain phases require a human review before proceeding. The orchestrator can delegate internal reviews to sub-agents, but these gates require a person to open the running app and judge it.

| Gate | After Phase | What to Verify |
|------|------------|----------------|
| **UX-G1** | Phase 1b (Frontend Shell) | App launches. Theme toggles feel premium. Connection screen is welcoming. Layout has the right proportions. No visual slop. |
| **UX-G2** | Phase 2 (Grid) | Grid renders smoothly. NULLs are visually distinct. Scrolling feels native. Data presentation is clean. A TablePlus user would nod. |
| **UX-G5** | Phase 5 (Polish & Keyboard) | Full app review. Command palette feels like Raycast. Every action keyboard-accessible. Visual polish across all surfaces. Dark and light themes verified. |

**Gate process:** Human opens the app, tests the specified checks, approves or files issues. Issues are fixed before the next phase begins. No gate is skippable. If the human is unavailable, the phase is blocked — do not proceed.

---

## 5. IPC Contract

Every command returns `Result<T, AppError>` where `AppError` serializes as a string.

### Connection Commands

| Command | Args | Returns |
|---------|------|---------|
| `connect_sqlite` | `{ path: string, name: string, group?: string }` | `ConnectionInfo` |
| `connect_postgres` | `{ config: PgConfig, name: string, group?: string }` | `ConnectionInfo` |
| `disconnect` | `{ connection_id: string }` | `void` |
| `list_connections` | `{}` | `ConnectionInfo[]` |
| `test_connection` | `{ config: PgConfig }` | `boolean` |

### Schema Commands

| Command | Args | Returns |
|---------|------|---------|
| `get_tables` | `{ connection_id: string }` | `TableInfo[]` |
| `get_columns` | `{ connection_id: string, table: string }` | `ColumnInfo[]` |
| `get_primary_keys` | `{ connection_id: string, table: string }` | `string[]` |

### Query Commands

| Command | Args | Returns |
|---------|------|---------|
| `execute_query` | `{ connection_id: string, sql: string }` | `QueryResult` |
| `cancel_query` | `{ connection_id: string }` | `void` |

### Row Edit Commands

| Command | Args | Returns |
|---------|------|---------|
| `update_row` | `{ connection_id: string, table: string, pk_columns: Record<string, CellValue>, changes: Record<string, CellValue> }` | `void` |
| `delete_row` | `{ connection_id: string, table: string, pk_columns: Record<string, CellValue> }` | `void` |
| `insert_row` | `{ connection_id: string, table: string, values: Record<string, CellValue> }` | `void` |

### History Commands

| Command | Args | Returns |
|---------|------|---------|
| `get_history` | `{ limit?: number, offset?: number }` | `HistoryEntry[]` |
| `search_history` | `{ query: string }` | `HistoryEntry[]` |

### Export Commands

| Command | Args | Returns |
|---------|------|---------|
| `export_csv` | `{ connection_id: string, sql: string, path: string }` | `void` |

### CellValue Type (Rust ↔ TypeScript, must be identical)

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum CellValue {
    Null,
    Text(String),
    Integer(i64),
    Float(f64),
    Bool(bool),
}
```

```typescript
type CellValue =
  | { type: "Null" }
  | { type: "Text"; value: string }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "Bool"; value: boolean };
```

### HistoryStatus Type (must be tagged, not plain string)

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum HistoryStatus {
    Success,
    Error(String),
}
```

```typescript
type HistoryStatus =
  | { type: "success" }
  | { type: "error"; message: string };
```

---

## 6. Architecture Decision Records

Key decisions documented in `docs/decisions/`:

1. **Why r2d2-sqlite over deadpool-sqlite:** r2d2 is more mature, has better documentation, and integrates with rusqlite's sync API without Tokio dependency for SQLite queries.

2. **Why client-side sort for small result sets:** Re-querying with ORDER BY adds network latency. For < 10,000 rows, sorting in JavaScript is faster than a server round-trip. Above 10,000, server-side sort via re-query.

3. **Why separate services layer from commands:** Commands are thin Tauri wrappers. Services contain business logic and are testable without Tauri. This separation means integration tests can call services directly.

4. **Why tagged enums for CellValue instead of Option<Value>:** A `Null` variant is explicitly visible in the type system. The frontend can render NULL distinctly without checking sentinel values or string comparisons.

5. **Why TanStack Virtual over react-window:** TanStack Virtual supports horizontal scrolling, sticky headers, and has better TypeScript support. react-window is unmaintained.

---

## 7. Project Standards

See `docs/standards.md` for full coding standards. Key points:

- **No `any` in TypeScript data pipeline.** The CellValue type is strict.
- **No `unwrap()` in Rust outside tests.** All Results handled with `?` or explicit match.
- **Transactions on all mutations.** BEGIN IMMEDIATE → operation → COMMIT.
- **Error boundaries** at every major panel (grid, editor, sidebar).
- **NULL visually distinct** from empty string (italic, muted, different background).
- **Numbers right-aligned**, text left-aligned.
- **All destructive actions confirmed.**
- **Functions < 40 lines** where possible.
- **Tests for all critical paths:** connect → query → edit → verify.
