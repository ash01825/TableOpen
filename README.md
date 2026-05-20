<div align="center">

# TableOpen

**The open-source database GUI that ships at TablePlus quality. Free. Forever.**

</div>

---

## What is this?

TableOpen is a desktop database client. You connect to a database, browse tables, write queries, edit rows, and export results — in a tool that opens instantly and looks like someone cared.

It is built for developers who touch a database every day and are tired of choosing between paying $59/year for something fast and beautiful, or using something free that launched during the Obama administration.

---

## The problem it solves

| Tool | Fast? | Beautiful? | Free? | Open source? |
|------|-------|-----------|-------|--------------|
| TablePlus | Yes | Yes | $59/yr | No |
| Beekeeper Studio | Yes | Yes | Freemium | Partially |
| DBeaver | No | No | Yes | Yes |
| pgAdmin | No | No | Yes | Yes |
| **TableOpen** | **Yes** | **Yes** | **Yes** | **Yes** |

Every row above TableOpen is a compromise. You either pay, or you tolerate a tool that feels bad to use. There is no row where "Fast," "Beautiful," "Free," and "Open Source" all say yes at the same time.

TableOpen is that row.

---

## What makes it different

### Instant launch
Tauri, not Electron. Cold start under one second on any modern machine. A database GUI that opens slowly has already failed its first interaction.

### Premium design
Dark-first visual language built with the same attention to detail as Linear and Raycast. Geist typeface. Tinted shadows. One accent color. No generic Tailwind defaults. No purple glows. No AI slop. The bar is "this looks like a paid product" — not "this looks good for open source."

### The grid is the product
Virtualized rendering at 60fps on 100,000 rows. NULL values are italic, muted, and visually distinct from empty strings — because confusing the two is a data integrity bug, not a display preference. Numbers are right-aligned in tabular format. Booleans are badges. Every data type is handled with intent.

### Safe by default
Every row edit shows a side-by-side diff before it commits. Mutations are transactional. Primary keys are discovered from the schema, not guessed. If editing production data doesn't feel safe, developers stop using the tool — so the tool makes it feel safe.

### Keyboard-first
Command palette with fuzzy search over every action. Global keyboard shortcuts. Full grid navigation without touching the mouse. Built for developers who resent reaching for a trackpad.

### Nothing is gated
MIT licensed. No Community vs Pro edition. No features withheld. No contributor license agreement. Every feature ships to every user.

---

## Architecture

TableOpen is built on four principles: speed, safety, type precision, and visual discipline.

### Rust backend via Tauri

```
src-tauri/
├── src/
│   ├── commands/     → Thin IPC handlers — deserialize, delegate, serialize
│   ├── services/     → Business logic — testable without Tauri
│   ├── db/           → Connection pools (r2d2-sqlite, deadpool-postgres)
│   └── models/       → Shared types — CellValue, QueryResult, ConnectionInfo
└── tests/
    └── integration/  → Service-level tests against real SQLite fixtures
```

Database drivers are chosen for performance and maturity. `rusqlite` with WAL mode and busy timeout for SQLite. `tokio-postgres` with `deadpool` for async PostgreSQL connections. `ssh2` for SSH tunnel support — because production databases are behind jump hosts and the tool needs to handle that transparently.

Every mutation path is wrapped in `BEGIN IMMEDIATE` → `COMMIT` with explicit rollback on failure. Schema introspection queries `PRAGMA table_info` on SQLite and `information_schema` on PostgreSQL — primary keys, foreign keys, column types, nullability. No heuristics. No guessing.

### React frontend with strict TypeScript

```
src/
├── components/
│   ├── layout/       → AppShell, Toolbar, Sidebar, StatusBar
│   ├── connection/   → Connection screen, PostgreSQL form, SQLite picker
│   ├── editor/       → Monaco editor wrapper with schema autocomplete
│   ├── grid/         → VirtualGrid, GridCell, InlineEditor, RowDiff
│   ├── schema/       → Table browser with fuzzy search, column inspector
│   └── shared/       → Button, Input, Modal, ErrorBoundary, Skeleton
├── stores/           → Zustand — connection, schema, editor, query, history, UI
├── ipc/              → Typed invoke wrappers — no `any` anywhere
└── types/            → TypeScript mirrors of Rust models — exact match, compile-time verified
```

Six Zustand stores with clear boundaries. The grid uses TanStack Virtual with overscan of 15 rows — the scroll experience stays smooth even as new pages stream in from the backend. Monaco Editor is configured with a completion provider that reads live schema data — after `FROM` you get table names, after `WHERE` you get column names scoped to referenced tables.

Every panel is wrapped in an ErrorBoundary. A grid crash does not kill the editor. An editor crash does not kill the sidebar.

### Typed IPC contract

The `CellValue` type is a tagged discriminated union, identical in Rust and TypeScript:

```rust
// Rust
#[serde(tag = "type", content = "value")]
pub enum CellValue { Null, Text(String), Integer(i64), Float(f64), Bool(bool) }
```

```typescript
// TypeScript
type CellValue = 
  | { type: "Null" }
  | { type: "Text"; value: string }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "Bool"; value: boolean };
```

A type mismatch between backend and frontend is caught at compile time — `cargo check` and `npx tsc --noEmit` both run in CI. No runtime type surprises. No `any` in the data pipeline.

### Design system

CSS custom properties for every visual decision. No hardcoded colors, spacing values, or radii in any component. The design tokens define a complete system across both themes — dark (default) and light — with WCAG AA contrast minimums verified independently.

```
--color-surface-0 through surface-3   → Background hierarchy
--color-text-primary/secondary/muted  → Content hierarchy
--color-accent + hover/active/muted   → One accent, four states
--color-success/danger/warning/info   → Semantic colors with muted backgrounds
--color-border/border-strong          → Structural chrome
--font-sans (Geist) / --font-mono (Geist Mono)
--space-1 through space-16            → 4px increment scale
--radius-sm/md/lg/full                → Squircle corners
--shadow-sm/md/lg                     → Tinted, surface-aware
```

---

## What ships in v1

- PostgreSQL connection with SSL modes and SSH tunnels
- SQLite file opening
- Table browser with fuzzy search across names, columns, and schemas
- SQL editor with schema-aware autocomplete and syntax highlighting
- Virtualized result grid at 60fps on 100,000 rows
- NULL rendering visually distinct from empty strings
- Inline row editing with side-by-side diff before commit
- Query history searchable by SQL content with execution metadata
- Command palette with fuzzy search over every action
- Full keyboard navigation — no mouse required
- Connection management with groups and `.env` import
- Export to CSV and JSON
- Copy row as INSERT, UPDATE, DELETE, or JSON statement
- Dark and light themes with system preference detection

### What is intentionally not in v1

MySQL support. MongoDB. ERD diagrams. Query plan visualization. Stored procedure editing. Trigger management. Index management. Schema migration tools. Multi-database simultaneous connections. Plugin architecture. Charting. AI query suggestions.

Every one of those is weeks of driver edge cases, type coercion variations, and platform-specific behavior that would dilute the UX quality of the core workflows. The project's competitive advantage is focus. Adding MySQL in v1 means dividing attention across two query engines with different type systems, collation rules, and SSL handshake behavior — and doing both at 80% quality instead of one at 95%.

---

## Status

TableOpen is in active development. The architecture is fully designed and documented. The frontend shell, design system, typed IPC contract, component library, and state management are built. The SQLite backend connection layer and query execution engine are in progress. PostgreSQL support and SSH tunnels follow.

This is not a finished product. It is a project with a clear architecture, a deliberate scope, and a quality bar that does not get negotiated down.

---

## Why this can work

The gap between DBeaver and TablePlus is universally acknowledged. Every developer who has used both knows exactly what I am describing. No open-source project has closed that gap because the work required is unglamorous — SSL certificate chains, PostgreSQL type coercion, SSH keep-alive behavior, result set pagination edge cases. That work does not produce conference talks. It produces GitHub issues.

TableOpen exists to do that work with the same obsessive quality that commercial tools use as a moat, plus the visual discipline that makes a developer reach for a tool every morning because it feels good to use, not because there is no alternative.

The Immich analogy is precise. Immich did not beat Google Photos by having more features. It won by being open-source, self-hostable, and genuinely good at the core photo workflows. It has 55,000 GitHub stars. TableOpen has the same opportunity in database tooling — a category every developer touches daily, where the best free option is a Java application that launches in 6 seconds and looks like it was designed during the first Obama term.

---

## License

MIT. No CLA. No contributor license agreement. No features gated behind a paid tier. Everything is free, forever.

Check the working here
https://drive.google.com/file/d/13B_SN143MNpwvvTDM0b3PdloSGaUxlP8/view?usp=sharing
