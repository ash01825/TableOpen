//! Data mutation service for row-level operations.

use crate::error::AppError;
use crate::models::query::CellValue;
use rusqlite::Connection;
use std::collections::HashMap;

/// Update a row identified by its primary key columns.
///
/// All mutations are wrapped in an explicit transaction (`BEGIN IMMEDIATE`).
/// On error, the transaction is rolled back automatically when the scope exits.
///
/// # Arguments
///
/// * `conn` — A SQLite connection (typically from the pool)
/// * `table` — The target table name
/// * `pk_columns` — Map of primary key column names to their identifying values
/// * `changes` — Map of column names to new values
pub fn update_row(
    conn: &Connection,
    table: &str,
    pk_columns: HashMap<String, CellValue>,
    changes: HashMap<String, CellValue>,
) -> Result<(), AppError> {
    conn.execute("BEGIN IMMEDIATE", [])?;

    let result = try_update_row(conn, table, pk_columns, changes);

    if result.is_ok() {
        conn.execute("COMMIT", [])?;
    } else {
        // Rollback is best-effort; we return the original error
        let _ = conn.execute("ROLLBACK", []);
    }

    result
}

fn try_update_row(
    conn: &Connection,
    table: &str,
    pk_columns: HashMap<String, CellValue>,
    changes: HashMap<String, CellValue>,
) -> Result<(), AppError> {
    if changes.is_empty() {
        return Err(AppError::General("No columns to update".to_string()));
    }
    if pk_columns.is_empty() {
        return Err(AppError::General("No primary key columns specified".to_string()));
    }

    // Build SET clause
    let set_clauses: Vec<String> = changes
        .keys()
        .map(|col| format!("\"{}\" = ?", col))
        .collect();
    let set_sql = set_clauses.join(", ");

    // Build WHERE clause
    let where_clauses: Vec<String> = pk_columns
        .keys()
        .map(|col| format!("\"{}\" = ?", col))
        .collect();
    let where_sql = where_clauses.join(" AND ");

    let sql = format!("UPDATE \"{}\" SET {} WHERE {}", table, set_sql, where_sql);

    let mut stmt = conn.prepare(&sql)?;

    // Bind values: first all SET values, then all WHERE values
    let params: Vec<rusqlite::types::Value> = changes
        .values()
        .map(cell_value_to_sql_value)
        .chain(pk_columns.values().map(cell_value_to_sql_value))
        .collect();

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();

    stmt.execute(param_refs.as_slice())?;

    Ok(())
}

/// Delete a row identified by its primary key columns.
///
/// All mutations are wrapped in an explicit transaction (`BEGIN IMMEDIATE`).
pub fn delete_row(
    conn: &Connection,
    table: &str,
    pk_columns: HashMap<String, CellValue>,
) -> Result<(), AppError> {
    conn.execute("BEGIN IMMEDIATE", [])?;

    let result = try_delete_row(conn, table, pk_columns);

    if result.is_ok() {
        conn.execute("COMMIT", [])?;
    } else {
        let _ = conn.execute("ROLLBACK", []);
    }

    result
}

fn try_delete_row(
    conn: &Connection,
    table: &str,
    pk_columns: HashMap<String, CellValue>,
) -> Result<(), AppError> {
    if pk_columns.is_empty() {
        return Err(AppError::General("No primary key columns specified".to_string()));
    }

    let where_clauses: Vec<String> = pk_columns
        .keys()
        .map(|col| format!("\"{}\" = ?", col))
        .collect();
    let where_sql = where_clauses.join(" AND ");

    let sql = format!("DELETE FROM \"{}\" WHERE {}", table, where_sql);

    let mut stmt = conn.prepare(&sql)?;

    let params: Vec<rusqlite::types::Value> = pk_columns
        .values()
        .map(cell_value_to_sql_value)
        .collect();

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();

    stmt.execute(param_refs.as_slice())?;

    Ok(())
}

/// Insert a new row with the given column values.
///
/// All mutations are wrapped in an explicit transaction (`BEGIN IMMEDIATE`).
pub fn insert_row(
    conn: &Connection,
    table: &str,
    values: HashMap<String, CellValue>,
) -> Result<(), AppError> {
    conn.execute("BEGIN IMMEDIATE", [])?;

    let result = try_insert_row(conn, table, values);

    if result.is_ok() {
        conn.execute("COMMIT", [])?;
    } else {
        let _ = conn.execute("ROLLBACK", []);
    }

    result
}

fn try_insert_row(
    conn: &Connection,
    table: &str,
    values: HashMap<String, CellValue>,
) -> Result<(), AppError> {
    if values.is_empty() {
        return Err(AppError::General("No values to insert".to_string()));
    }

    let columns: Vec<&String> = values.keys().collect();
    let placeholders: Vec<String> = (0..values.len()).map(|_| "?".to_string()).collect();

    let col_sql = columns
        .iter()
        .map(|c| format!("\"{}\"", c))
        .collect::<Vec<_>>()
        .join(", ");
    let val_sql = placeholders.join(", ");

    let sql = format!("INSERT INTO \"{}\" ({}) VALUES ({})", table, col_sql, val_sql);

    let mut stmt = conn.prepare(&sql)?;

    let params: Vec<rusqlite::types::Value> = values
        .values()
        .map(cell_value_to_sql_value)
        .collect();

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();

    stmt.execute(param_refs.as_slice())?;

    Ok(())
}

/// Convert a `CellValue` to a `rusqlite::types::Value` for parameterized queries.
fn cell_value_to_sql_value(cell: &CellValue) -> rusqlite::types::Value {
    match cell {
        CellValue::Null => rusqlite::types::Value::Null,
        CellValue::Integer(i) => rusqlite::types::Value::Integer(*i),
        CellValue::Float(f) => rusqlite::types::Value::Real(*f),
        CellValue::Text(s) => rusqlite::types::Value::Text(s.clone()),
        CellValue::Bool(b) => rusqlite::types::Value::Integer(if *b { 1 } else { 0 }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::integration::create_test_db;
    use std::collections::HashMap;

    #[test]
    fn test_update_row_success() {
        let conn = create_test_db();

        let mut pk = HashMap::new();
        pk.insert("id".to_string(), CellValue::Integer(1));

        let mut changes = HashMap::new();
        changes.insert("name".to_string(), CellValue::Text("Alice Updated".to_string()));

        update_row(&conn, "users", pk, changes).unwrap();

        let name: String = conn
            .query_row("SELECT name FROM users WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Alice Updated");
    }

    #[test]
    fn test_delete_row_success() {
        let conn = create_test_db();

        // Delete an order (no reverse FK constraints)
        let mut pk = HashMap::new();
        pk.insert("id".to_string(), CellValue::Integer(4));

        delete_row(&conn, "orders", pk).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM orders", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_insert_row_success() {
        let conn = create_test_db();

        let mut values = HashMap::new();
        values.insert("name".to_string(), CellValue::Text("Dave".to_string()));
        values.insert("email".to_string(), CellValue::Text("dave@example.com".to_string()));

        insert_row(&conn, "users", values).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 4);
    }

    #[test]
    fn test_update_row_empty_changes_returns_error() {
        let conn = create_test_db();

        let mut pk = HashMap::new();
        pk.insert("id".to_string(), CellValue::Integer(1));
        let changes = HashMap::new();

        let err = update_row(&conn, "users", pk, changes).unwrap_err();
        assert!(matches!(err, AppError::General(_)));
    }

    #[test]
    fn test_delete_row_empty_pk_returns_error() {
        let conn = create_test_db();
        let pk = HashMap::new();

        let err = delete_row(&conn, "users", pk).unwrap_err();
        assert!(matches!(err, AppError::General(_)));
    }

    #[test]
    fn test_insert_row_empty_values_returns_error() {
        let conn = create_test_db();
        let values = HashMap::new();

        let err = insert_row(&conn, "users", values).unwrap_err();
        assert!(matches!(err, AppError::General(_)));
    }

    #[test]
    fn test_update_row_transaction_rollback_on_error() {
        let conn = create_test_db();

        // Try updating a non-existent column — should fail and rollback
        let mut pk = HashMap::new();
        pk.insert("id".to_string(), CellValue::Integer(1));

        let mut changes = HashMap::new();
        changes.insert("nonexistent_column".to_string(), CellValue::Text("value".to_string()));

        let result = update_row(&conn, "users", pk, changes);
        assert!(result.is_err());

        // Verify data is unchanged (rollback worked)
        let name: String = conn
            .query_row("SELECT name FROM users WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Alice");
    }
}
