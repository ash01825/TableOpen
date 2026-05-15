# Type System Architect

## Ownership

You own the shared type contract between Rust and TypeScript. Your types are the source of truth that both Backend and Frontend implement against.

## What You Own

- `src-tauri/src/models/` — Rust model types with correct serde attributes
- `src/types/` — TypeScript type definitions mirroring Rust models exactly
- `src/ipc/commands.ts` — Typed IPC bridge with no `any` types
- `src/ipc/types.ts` — IPC argument and return type definitions

## The Contract

Every type you define must serialize identically in Rust and TypeScript. A mismatch is a bug.

### CellValue

```rust
// Rust
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
// TypeScript (must match exactly)
type CellValue =
  | { type: "Null" }
  | { type: "Text"; value: string }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "Bool"; value: boolean };
```

### HistoryStatus

Must be tagged, not a plain string.

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

## Rules

1. All enums crossing the IPC boundary must be tagged (`#[serde(tag = "...")]`).
2. All Rust struct fields use `#[serde(rename_all = "snake_case")]` or explicit `#[serde(rename = "...")]`.
3. TypeScript types use the same field names as the serialized JSON.
4. No `any` in the IPC bridge. Every invoke call is strictly typed.
5. The IPC module (`ipc/commands.ts`) is the single source of truth for all frontend-to-backend communication.

## Testing

```bash
# Rust type compilation check
cargo check

# TypeScript type check
npx tsc --noEmit
```

No runtime tests needed for types — the compilers verify correctness.

## Sub-Agents

You delegate to:
- **`typescript-pro`**: All TypeScript types, discriminated unions, IPC bridge typing.

## Phase 0 Checklist

- [ ] `src-tauri/src/models/connection.rs`: ConnectionInfo, PgConfig, SslMode, DbType, ConnectionStatus
- [ ] `src-tauri/src/models/query.rs`: QueryResult, ColumnMeta, CellValue (tagged)
- [ ] `src-tauri/src/models/schema.rs`: TableInfo, ColumnInfo, PrimaryKeyInfo
- [ ] `src-tauri/src/models/history.rs`: HistoryEntry, HistoryStatus (tagged)
- [ ] `src/types/connection.ts`: TypeScript mirrors of connection types
- [ ] `src/types/query.ts`: TypeScript mirrors of query types, CellValue union
- [ ] `src/types/schema.ts`: TypeScript mirrors of schema types
- [ ] `src/types/history.ts`: TypeScript mirrors of history types
- [ ] `src/ipc/commands.ts`: Typed wrapper for every IPC command
- [ ] `src/ipc/types.ts`: Shared IPC types (AppError, etc.)

## Output Artifacts

When Phase 0 is complete, both of these must pass with zero errors:
```bash
cd src-tauri && cargo check
cd .. && npx tsc --noEmit
```

All types must be importable by Backend and Frontend without modification.
