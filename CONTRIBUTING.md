# Contributing to TableOpen

TableOpen is an open-source database GUI built with Tauri, Rust, and React. We aim to match the UX quality of the best paid tools while being completely free.

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs) (1.86+)
- [Node.js](https://nodejs.org) (22+)
- macOS, Linux, or Windows

### Setup

```bash
git clone https://github.com/tableopen/tableopen.git
cd tableopen
npm install
```

### Run in Development

```bash
npm run tauri:dev
```

This starts the Vite dev server and opens the Tauri window. The Rust backend recompiles on changes.

### Run Tests

```bash
# Rust tests
cd src-tauri && cargo test

# TypeScript typecheck
npx tsc --noEmit

# React component tests
npm run test
```

## Architecture

Read `docs/architecture.md` for the full project blueprint. The short version:

- **`src-tauri/`**: Rust backend. Connection pooling, query execution, schema introspection, row editing, SSH tunnels.
- **`src/`**: React frontend. Monaco editor, virtualized result grid, table browser, history, keyboard shortcuts.
- **`docs/`**: Architecture docs, standards, roadmaps, decision records.
- **`.commandcode/plans/`**: Implementation plans.

## Branch Workflow

We use feature branches with role-based naming:

```
feat/<role>/<description>
fix/<role>/<description>
chore/<role>/<description>
```

Roles: `backend`, `frontend`, `types`, `design`, `build`.

Example: `feat/backend/postgres-query-execution`

## Pull Requests

1. Create a branch from `main`
2. Make your changes, following `docs/standards.md`
3. Run tests and typechecks locally
4. Open a PR with a conventional commit title
5. CI must pass before review
6. At least one approval required
7. Squash merge to `main`

## Commit Conventions

```
feat(scope): description
fix(scope): description
chore(scope): description
docs(scope): description
test(scope): description
refactor(scope): description
```

Scopes: `backend`, `frontend`, `types`, `design`, `build`, `grid`, `editor`, `connection`, `ci`.

## Code Standards

- **No `any` in TypeScript data pipeline**
- **No `unwrap()` in Rust outside tests**
- **Transactions on all mutations**
- **NULL visually distinct from empty string**
- **All destructive actions confirmed**
- **Functions < 40 lines where possible**
- **Tests for all critical paths**

Full standards: `docs/standards.md`

## Finding Work

Issues labeled `good first issue` are small, self-contained tasks suitable for new contributors. Issues labeled `help wanted` are higher priority and need community help.

## Communication

- Bug reports: GitHub Issues
- Feature requests: GitHub Issues with `enhancement` label
- Questions: GitHub Discussions

## License

MIT. See `LICENSE`.
