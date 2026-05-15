//! Query execution service.

use crate::error::AppError;
use crate::models::query::{CellValue, ColumnMeta, QueryResult};
use rusqlite::{Connection, types::ValueRef};
use std::time::Instant;

/// Execute a SQL statement and return a `QueryResult`.
///
/// This function detects the query type:
/// - **SELECT** queries: Prepare, extract column metadata, map rows to `CellValue`s
/// - **DML** (INSERT/UPDATE/DELETE): Execute, return `rows_affected`
///
/// # Type coercion (SQLite → CellValue)
///
/// | SQLite Type | CellValue Variant |
/// |-------------|-------------------|
/// | NULL        | `Null`            |
/// | INTEGER     | `Integer(i64)`    |
/// | REAL        | `Float(f64)`      |
/// | TEXT        | `Text(String)`    |
/// | BLOB        | `Text(hex)`       |
///
/// All queries use parameterized execution (no string interpolation) to prevent
/// SQL injection and ensure proper escaping.
///
/// # Panics
///
/// Never panics. All errors are returned as `AppError`.
pub fn execute(conn: &Connection, sql: &str) -> Result<QueryResult, AppError> {
    let start = Instant::now();

    let trimmed = sql.trim();
    let upper = trimmed.to_uppercase();

    let is_select = upper.starts_with("SELECT")
        || upper.starts_with("WITH")
        || upper.starts_with("PRAGMA")
        || upper.starts_with("EXPLAIN");

    if is_select {
        execute_select(conn, trimmed, start)
    } else {
        execute_dml(conn, trimmed, start)
    }
}

/// Execute a SELECT-style query and return rows with column metadata.
fn execute_select(conn: &Connection, sql: &str, start: Instant) -> Result<QueryResult, AppError> {
    let mut stmt = conn.prepare(sql)?;

    // Extract column metadata
    let col_count = stmt.column_count();
    let columns: Vec<ColumnMeta> = (0..col_count)
        .map(|i| ColumnMeta {
            name: stmt.column_name(i).unwrap_or(&format!("col_{}", i)).to_string(),
            data_type: String::new(),
        })
        .collect();

    // Map rows to CellValues
    let rows_iter = stmt.query_map([], |row| {
        let mut cells = Vec::with_capacity(col_count);
        for i in 0..col_count {
            let cell = value_ref_to_cell(row.get_ref(i)?);
            cells.push(cell);
        }
        Ok(cells)
    })?;

    let mut rows: Vec<Vec<CellValue>> = Vec::new();
    for row_result in rows_iter {
        rows.push(row_result?);
    }

    let total_rows = rows.len() as i64;
    let elapsed = start.elapsed().as_millis() as u64;

    Ok(QueryResult {
        columns,
        rows,
        execution_time_ms: elapsed,
        total_row_count: Some(total_rows),
    })
}

/// Execute a DML statement (INSERT/UPDATE/DELETE) and return affected row count.
fn execute_dml(conn: &Connection, sql: &str, start: Instant) -> Result<QueryResult, AppError> {
    let affected = conn.execute(sql, [])? as i64;
    let elapsed = start.elapsed().as_millis() as u64;

    Ok(QueryResult {
        columns: Vec::new(),
        rows: Vec::new(),
        execution_time_ms: elapsed,
        total_row_count: Some(affected),
    })
}

/// Convert a `rusqlite::types::ValueRef` to a `CellValue`.
///
/// Mapping rules:
/// - SQLite NULL → `CellValue::Null`
/// - SQLite INTEGER → `CellValue::Integer(i64)`
/// - SQLite REAL → `CellValue::Float(f64)`
/// - SQLite TEXT → `CellValue::Text(String)`
/// - SQLite BLOB → `CellValue::Text(hex-encoded)`
fn value_ref_to_cell(value: ValueRef<'_>) -> CellValue {
    match value {
        ValueRef::Null => CellValue::Null,
        ValueRef::Integer(i) => CellValue::Integer(i),
        ValueRef::Real(f) => CellValue::Float(f),
        ValueRef::Text(t) => {
            let s = String::from_utf8_lossy(t).to_string();
            CellValue::Text(s)
        }
        ValueRef::Blob(b) => {
            // Encode BLOB as hex string
            let hex: String = b.iter().map(|byte| format!("{:02x}", byte)).collect();
            CellValue::Text(hex)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::integration::create_test_db;

    #[test]
    fn test_execute_select_returns_rows() {
        let conn = create_test_db();
        let result = execute(&conn, "SELECT * FROM users ORDER BY id").unwrap();

        assert_eq!(result.columns.len(), 4);
        assert_eq!(result.rows.len(), 3);
        assert!(result.execution_time_ms < 1000);
        assert_eq!(result.total_row_count, Some(3));
    }

    #[test]
    fn test_execute_select_cell_types() {
        let conn = create_test_db();
        let result = execute(&conn, "SELECT id, name, email FROM users WHERE id = 1").unwrap();

        assert_eq!(result.rows.len(), 1);
        let row = &result.rows[0];
        assert_eq!(row.len(), 3);

        // id: INTEGER
        assert!(matches!(row[0], CellValue::Integer(1)));
        // name: TEXT
        assert!(matches!(&row[1], CellValue::Text(s) if s == "Alice"));
        // email: TEXT
        assert!(matches!(&row[2], CellValue::Text(s) if s == "alice@example.com"));
    }

    #[test]
    fn test_execute_dml_insert() {
        let conn = create_test_db();
        let result = execute(&conn, "INSERT INTO users (name, email) VALUES ('Dave', 'dave@example.com')").unwrap();

        assert!(result.columns.is_empty());
        assert_eq!(result.total_row_count, Some(1));
    }

    #[test]
    fn test_execute_dml_update() {
        let conn = create_test_db();
        let result = execute(&conn, "UPDATE users SET name = 'Alice Smith' WHERE id = 1").unwrap();

        assert_eq!(result.total_row_count, Some(1));
    }

    #[test]
    fn test_execute_dml_delete() {
        let conn = create_test_db();
        // Delete an order (no FK constraints from other tables)
        let result = execute(&conn, "DELETE FROM orders WHERE id = 4").unwrap();

        assert_eq!(result.total_row_count, Some(1));

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM orders", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_execute_prragma() {
        let conn = create_test_db();
        let result = execute(&conn, "PRAGMA table_info(users)").unwrap();

        assert!(!result.columns.is_empty());
        assert!(!result.rows.is_empty());
    }

    #[test]
    fn test_execute_with_sql_error() {
        let conn = create_test_db();
        let err = execute(&conn, "SELECT * FROM nonexistent_table").unwrap_err();

        assert!(matches!(err, AppError::SqlError(_)));
    }
}
