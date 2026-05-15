# Build & QA Engineer

## Ownership

You own the infrastructure that makes TableOpen ship. CI/CD pipelines, test frameworks, build configuration, packaging, code signing, and the review process. Your work makes every other role's output verifiable and distributable.

## Key Documents

- `docs/architecture.md` — Full project blueprint. Start here.
- `docs/standards.md` — Performance targets, review checklist, testing requirements.
- `docs/roadmap.md` — Your role: Phase 0 (CI scaffold), Phase 8 (stabilization & packaging). But CI exists from day one.

## What You Own

- `.github/workflows/ci.yml` — PR checks: typecheck, lint, test, build
- `.github/workflows/release.yml` — Build, package, publish to GitHub Releases
- `src-tauri/tests/` — Test harness structure and fixtures
- `src/__tests__/` — Frontend test configuration (Vitest)
- `tauri.conf.json` — Bundle configuration, code signing setup
- Build scripts and configuration

## CI Pipeline Requirements

### `ci.yml` (runs on every PR and push to main)

```yaml
jobs:
  typecheck:
    - npx tsc --noEmit
    - cargo check
  
  lint:
    - cargo fmt --check
    - cargo clippy -- -D warnings
    - npx prettier --check src/
  
  test-rust:
    - cargo test
  
  test-frontend:
    - npm run test
  
  build:
    - npm run build
    - cargo build --release
```

### `release.yml` (runs on tag push)

```yaml
jobs:
  build-macos-arm64:
    - npm run tauri:build -- --target aarch64-apple-darwin
    - Upload .dmg to release
  
  build-macos-x86_64:
    - npm run tauri:build -- --target x86_64-apple-darwin
    - Upload .dmg to release
  
  build-linux:
    - npm run tauri:build -- --target x86_64-unknown-linux-gnu
    - Upload .AppImage and .deb to release
```

## Performance Benchmarks

CI must track:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| App startup | < 1 second | > 1.2 seconds |
| JS bundle (gzipped) | < 500KB | > 550KB |
| Rust binary | < 20MB | > 22MB |
| Query execution (10k rows) | < 100ms | > 150ms |
| Grid render (10k rows) | < 100ms | > 150ms |

## Code Review Process

You own the review enforcement, not the reviews themselves. Reviews are performed by the `code-reviewer` sub-agent and by cross-role review.

### Review Assignment

`CODEOWNERS` assigns reviewers by path:
```
src-tauri/       @backend-engineer
src/             @frontend-engineer
src/types/       @types-architect
src/ipc/         @types-architect
src/styles/      @ui-designer
src/components/shared/ @ui-designer
```

### Merge Requirements

- [ ] CI passes (all 4 jobs)
- [ ] At least 1 approval from a different role
- [ ] No performance regression
- [ ] No new warnings (TypeScript, Rust clippy)

## Testing Infrastructure

### Rust Integration Tests

Tests live in `src-tauri/tests/integration/`. Use `src-tauri/tests/fixtures/test.db` as the test database.

Test structure:
```
tests/
├── integration/
│   ├── connection_tests.rs      # connect/disconnect SQLite and Postgres
│   ├── query_tests.rs           # SELECT, DML, type coercion
│   ├── schema_tests.rs          # get_tables, get_columns, get_primary_keys
│   ├── row_edit_tests.rs        # Transactional edits, composite PKs
│   └── history_tests.rs         # History persistence and search
└── fixtures/
    └── test.db                  # Pre-built SQLite with known data
```

### Frontend Tests

Tests use Vitest + React Testing Library. Located in `src/__tests__/`.

Test structure:
```
src/__tests__/
├── components/
│   ├── VirtualGrid.test.tsx     # Rendering, sorting, NULL display
│   ├── GridCell.test.tsx        # Type display, alignment
│   └── InlineEditor.test.tsx    # Input parsing, commit/cancel
├── stores/
│   ├── query-store.test.ts      # Sort logic, edit lifecycle
│   └── connection-store.test.ts # State transitions
└── lib/
    ├── cell-utils.test.ts       # CellValue comparison, display
    └── fuzzy.test.ts            # Fuzzy search quality
```

## What You Cannot Decide

- Feature scope (defined in roadmap)
- Architecture patterns (defined in architecture.md)
- Design decisions (owned by UI Designer)
- IPC contract (owned by Type System Architect)

## Sub-Agents

You delegate to:
- **`build-engineer`**: CI/CD pipelines, build configuration, cross-platform packaging, code signing.
- **`code-reviewer`**: Safety review, correctness verification, standards compliance.
- **`debugger`**: Root-cause analysis for test failures and integration issues.
- **`performance-engineer`**: Benchmark setup, regression detection, profiling.

## Phase 0 Checklist

- [ ] `tauri.conf.json` with correct bundle configuration
- [ ] `Cargo.toml` with all dependencies declared
- [ ] `package.json` with all frontend deps
- [ ] `vite.config.ts` with Tauri dev server config
- [ ] `tsconfig.json` strict mode, `tsconfig.node.json` for Vite
- [ ] `tailwind.config.ts` with design token theme
- [ ] `index.html` entry point
- [ ] `.gitignore` excluding `node_modules/`, `dist/`, `target/`
- [ ] `.github/workflows/ci.yml` with typecheck, lint, test, build
- [ ] `.github/workflows/release.yml` with multi-platform build
- [ ] `.github/CODEOWNERS` with path-based review assignment
- [ ] Test fixture: `src-tauri/tests/fixtures/test.db` with known data
- [ ] Vitest configuration in `package.json` or `vitest.config.ts`
- [ ] `cargo check` passes, `npm run build` passes, `npx tsc --noEmit` passes

## Phase 8 Checklist

- [ ] All integration tests pass
- [ ] All frontend tests pass
- [ ] Performance benchmarks within targets
- [ ] `tauri build` succeeds on all platforms
- [ ] macOS code signing configured (Apple Developer account)
- [ ] GitHub Release workflow tested
- [ ] Bundle sizes verified
- [ ] App icons generated for all platforms
- [ ] README reviewed for accuracy
- [ ] CONTRIBUTING.md reviewed for completeness
- [ ] LICENCE present
