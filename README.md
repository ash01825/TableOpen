# TableOpen

The open-source database GUI that is actually better than the paid tools.

TablePlus-quality experience. Zero cost. No feature gating. MIT licensed.

---

## The problem

Every developer touches a database. The best tool for the job — TablePlus — costs $59 per year per device. DBeaver is free but launches in 5-8 seconds and carries a 2012 Eclipse plugin aesthetic into every interaction. Beekeeper Studio tags itself open-source but its Community Edition deliberately withholds MySQL stored procedures, PostgreSQL view editing, and multi-tab queries to push paid upgrades.

There is no polished, fast, genuinely free database GUI. Developers who can't justify $59/year for a tool they open 20 times a day settle for tools that actively slow them down. This is a solved problem in every other developer tool category. It is not solved for databases.

TableOpen exists because UX quality should not be gated behind a subscription for a tool this fundamental to daily development.

---

## What TableOpen is

A desktop database GUI built for developers who live in their database. Sub-second cold launch. Premium dark interface. Virtualized result grid that handles 100,000 rows without perceptible lag. NULL values rendered visually distinct from empty strings because confusing the two is a data integrity bug, not a display preference. Editing is transactional with a side-by-side diff before any mutation commits. The command palette gives you fuzzy search over every action in the app. Keyboard shortcuts for everything — you should never need to reach for the mouse.

PostgreSQL and SQLite in v1. The constraint is intentional. Every additional database type added early is weeks of driver edge cases, type coercion bugs, and SSL mode variations that quietly destroy the UX quality the project is built around.

---

## Architecture

Built on Tauri, not Electron. This is the single most important technical decision in the project. Tauri apps cold-start in under a second. Electron apps take three to five. A database GUI that opens slowly already failed its first interaction — no amount of feature depth recovers from that.

**Backend:** Rust. `tokio-postgres` for PostgreSQL with async connection pooling. `rusqlite` via `r2d2` for SQLite with WAL mode. `ssh2` for SSH tunnel support — production database access is the most important workflow. Every mutation path is transactional. Schema introspection reads primary keys from the database, not from heuristics. Type coercion from `pg_type` to a strict `CellValue` tagged enum means the frontend never guesses what a value is.

**Frontend:** React 19 with TypeScript strict mode. Zustand for state — six stores covering connections, schema, editor, query execution, history, and UI. Monaco Editor for the SQL workspace with a completion provider that reads the live schema. TanStack Virtual for the result grid — the hardest component in the application, targeting 60fps on 100,000 rows with column sorting, resizing, inline editing, and NULL-aware rendering.

**IPC contract:** Every type crossing the Rust-TypeScript boundary is a tagged discriminated union. `CellValue` is `Null | Text(String) | Integer(i64) | Float(f64) | Bool(bool)` — identical in both languages, verified at compile time. No `any` in the data pipeline. A type mismatch between backend and frontend is a build failure, not a runtime surprise.

**Design system:** Premium dark-first visual language built on CSS custom properties. Geist typeface. Tinted shadows — no pure black, no generic defaults. One accent color. WCAG AA contrast in both themes. Complete state coverage on every component — default, hover, active, focus, disabled, loading, empty, error. The bar is "this looks like a tool people would pay for," not "this looks good for open-source."

---

## What exists now

The full architecture is designed and documented. The project scaffold is built — Tauri configuration, Rust workspace, React application with Vite, Tailwind design system with complete token definitions, typed IPC bridge, Zustand state management, component library, and a fully interactive frontend demo with virtualized grid, command palette, inline editing, and schema browsing.

The backend connection layer and query execution engine are in active development. SQLite support ships first. PostgreSQL with SSH tunnel support follows immediately after.

---

## Roadmap

**Phase 1 — SQLite Core (in progress):** Connection pooling, schema introspection, query execution with type coercion, transactional row editing, query history with full-text search.

**Phase 2 — PostgreSQL:** Full PostgreSQL support with SSL modes, SSH tunnels, schema browsing across multiple schemas, copy-as-statement generation.

**Phase 3 — Polish:** Command palette, global keyboard shortcuts, resizable panels, column width persistence, export to CSV and JSON, `.env` file connection import.

The v1 ships with PostgreSQL and SQLite only. MySQL, MongoDB, ERD diagrams, and plugin architecture are explicitly deferred. Serving every database type in v1 is how you end up with DBeaver — a tool that does everything and feels like nothing.

---

## Why this can win

The gap between DBeaver and TablePlus is enormous and universally acknowledged. Every developer who has used both knows it. No open-source project has filled it because the work is unglamorous — SSL connection modes, type coercion edge cases, SSH tunnel reliability, result set pagination. That work does not generate conference talks. It generates GitHub issues.

TableOpen wins by doing the unglamorous work with obsessive quality while maintaining the visual discipline that commercial tools use as a moat. The Immich analogy is precise: Immich did not beat Google Photos by having more features. It won by being open-source, self-hostable, and genuinely good at the core workflows. It has 55,000 GitHub stars. TableOpen has the same opportunity in database tooling — a category every developer touches daily where the best free option is objectively painful.

---

## License

MIT. No CLA. No contributor license agreement. No "Community Edition" vs "Pro." Everything is free, forever.
