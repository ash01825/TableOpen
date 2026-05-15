# TableOpen — Project Standards

## Performance Requirements

| Metric | Target | Enforcement |
|--------|--------|-------------|
| Cold app launch | < 1 second | CI benchmark, alert if > 1.2s |
| SQLite file open (100MB) | < 200ms | Integration test |
| Query result first paint (10k rows) | < 100ms | Component test |
| Grid scroll framerate | 60fps on 100k rows | React Profiler |
| Cell edit commit latency | < 50ms | Integration test |
| Theme toggle | < 16ms (no flicker) | Manual visual check |
| JS bundle (gzipped) | < 500KB | CI check |
| Rust binary (uncompressed) | < 20MB | CI check |
| Memory (idle) | < 100MB | Manual check |
| Memory (100k rows loaded) | < 300MB | Manual check |

## Code Quality

### Rust

- Edition 2021. `cargo fmt` and `cargo clippy` pass with zero warnings.
- No `unwrap()` or `expect()` outside of tests and compile-time invariants.
- All `Result` handled with `?` or explicit `match`. No silent error swallowing.
- Functions target < 40 lines. Extract helpers for history recording, type coercion, etc.
- `unsafe` is banned unless explicitly approved.
- All public items have doc comments explaining their purpose.

### TypeScript

- Strict mode enabled. `noUnusedLocals`, `noUnusedParameters`, `strictNullChecks`.
- No `any` anywhere in the data pipeline (IPC calls, stores, components). `unknown` is acceptable at boundaries with type guards.
- Functions target < 40 lines. Extract hooks for side effects, utils for pure logic.
- Components are named exports. No default exports except in page entry points.
- Imports ordered: React → third-party → local stores/hooks → local components → types.
- `as` casts only when TypeScript cannot infer the type. Prefer type guards.

### CSS

- Design token values only via CSS custom properties. No hardcoded colors, spacing, or radii in component styles.
- Tailwind utility classes for layout, spacing, typography. Custom properties for theming.
- `.dark` and `.light` classes define all token overrides. No inline `style` for colors.
- Media queries only for `prefers-color-scheme` or responsive layout. Not for theme colors.

### General

- No `console.log` in production code. Use a logging utility if needed.
- No commented-out code. Delete it or restore it, don't leave it.
- File names: kebab-case for components (`table-browser.tsx`), kebab-case for hooks (`use-keyboard.ts`), kebab-case for stores (`connection-store.ts`), snake_case for Rust (`connection_service.rs`).
- Import paths: relative for same-directory, absolute for cross-directory where it improves readability.

## Git Conventions

### Branch Names

```
feat/<role>/<description>       # New feature
fix/<role>/<description>        # Bug fix
chore/<role>/<description>      # Tooling, config, CI
docs/<role>/<description>       # Documentation only
test/<role>/<description>       # Tests only
refactor/<role>/<description>   # No behavior change
```

### Commit Messages

Conventional commits. Format: `type(scope): description`

```
feat(backend): add PostgreSQL query execution with type coercion
fix(grid): NULL cells rendered as empty string for Text type
chore(ci): add macOS code signing to release pipeline
docs(readme): add architecture overview section
test(query): add integration test for composite PK updates
refactor(types): extract CellValue utilities to lib/
perf(grid): inline cell render to reduce function call overhead
```

### Pull Requests

- Title: conventional commit format
- Description: what changed, why, how to test
- Must pass CI before review
- At least one approval from a different role
- Author merges after approval (squash merge)

## Review Checklist

### Safety
- [ ] No SQL injection (all identifiers parameterized)
- [ ] No data corruption paths (transactions on mutations)
- [ ] Error handling correct (no silent swallows)
- [ ] Type consistency between Rust and TypeScript

### Correctness
- [ ] IPC command signatures match contract
- [ ] State transitions valid (no impossible states)
- [ ] Edge cases handled (empty results, NULL values, connection drops)

### Standards
- [ ] Performance targets met
- [ ] No `any` types in data pipeline
- [ ] Design tokens used, not hardcoded values
- [ ] No dead code, no commented-out code

### Architecture
- [ ] No scope creep (in-scope features only)
- [ ] No duplicate implementations
- [ ] Clean module boundaries respected

## Testing Requirements

### Every IPC Command
- At least one integration test with a real SQLite fixture database
- Error case tests (invalid SQL, missing table, wrong connection ID)

### Grid Component
- Renders NULL distinctly from empty string
- Renders each CellValue type correctly
- Sorting works for all types
- Editing commits persist after re-query

### Row Editing
- UPDATE with single-column PK
- UPDATE with composite PK
- DELETE with PK
- INSERT with all column types
- Transaction rollback on error

### Performance
- Grid renders 10k rows in < 100ms
- Grid scrolls at 60fps on 100k rows (manual verification)

## UX Consistency

### Premium Design Quality

The visual bar is TablePlus or better. Every UI surface must look like a tool people would pay for — not like a default component library. These rules are non-negotiable.

- **No AI slop patterns.** Banned: Inter font, purple/blue glows, generic drop shadows (`shadow-md`), centered hero sections, 3-column feature cards, linear transitions, default Tailwind colors.
- **Premium fonts only.** Geist, Satoshi, Cabinet Grotesk, or equivalent. No system fonts for display text. No Inter. No Roboto. No Arial.
- **Shadows are tinted.** Use surface-colored shadows, not pure black. Dark mode shadows are lighter, not darker.
- **Accent is one color.** One primary accent. Saturation under 80%. No gradients on text. No decorative color usage.
- **Focus rings are visible.** A distinct accent-colored focus indicator on every interactive element. No invisible focus states.
- **Transitions are premium.** Custom cubic-bezier curves for all transitions. No `linear`. No default `ease-in-out`. Spring physics for modals, command palette, and overlays. 150ms for hover states, 200-300ms for panels.
- **Loading states use skeletons.** Skeleton shapes match content they replace. Spinners only for sub-300ms operations.
- **Dark theme is default.** Screenshots, README, first-run experience are dark. Light theme is available and equally polished.
- **Theme toggle is instant.** Must complete in under 16ms. No flicker, no flash of wrong theme.

### Data Display Rules

### Data Display Rules

- NULL: italic, muted color, distinct background tint
- Empty string: normal weight, no background, rendered as invisible or "" if needed
- Numbers: right-aligned, tabular-nums
- Text: left-aligned
- Booleans: badge-style (green for true, muted for false)
- Blobs: "[BLOB]" in muted color (until v2 binary handling)
- Error messages: passed through from database driver, not wrapped in generic text
- Loading: skeleton or spinner, never blank screen
- No operation should appear "stuck" — if it takes > 500ms, show progress
- Destructive actions: confirmation dialog with preview of affected rows
