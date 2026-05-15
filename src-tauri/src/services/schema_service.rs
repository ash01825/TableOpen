//! Schema introspection service for querying database metadata.

use crate::error::AppError;
use crate::models::schema::{ColumnInfo, TableInfo};
use rusqlite::Connection;

/// Retrieve all user tables from the database.
///
/// Excludes SQLite internal tables (those starting with `sqlite_`).
/// Each table includes an approximate row count.
pub fn get_tables(conn: &Connection) -> Result<Vec<TableInfo>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )?;

    let table_names: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let mut tables = Vec::with_capacity(table_names.len());
    for name in table_names {
        let row_count = get_approximate_row_count(conn, &name)?;
        tables.push(TableInfo {
            name,
            schema: "main".to_string(),
            row_count: Some(row_count),
        });
    }

    Ok(tables)
}

/// Get the approximate row count for a table using `COUNT(*)`.
fn get_approximate_row_count(conn: &Connection, table: &str) -> Result<i64, AppError> {
    let sql = format!("SELECT COUNT(*) FROM \"{}\"", table);
    let count: i64 = conn.query_row(&sql, [], |row| row.get(0))?;
    Ok(count)
}

/// Retrieve column information for a given table using `PRAGMA table_info`.
///
/// Note: In SQLite, `INTEGER PRIMARY KEY` columns have `notnull = 0` in
/// PRAGMA table_info because they serve as aliases for the rowid and
/// auto-generate values when NULL is inserted.
pub fn get_columns(conn: &Connection, table: &str) -> Result<Vec<ColumnInfo>, AppError> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{}\")", table))?;

    let columns = stmt
        .query_map([], |row| {
            let _cid: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            let data_type: String = row.get(2)?;
            let not_null: bool = row.get::<_, i32>(3)? != 0;
            let default: Option<String> = row.get(4)?;
            let pk: i32 = row.get(5)?;

            Ok(ColumnInfo {
                name,
                data_type: if data_type.is_empty() { "TEXT".to_string() } else { data_type },
                nullable: !not_null,
                default,
                is_primary_key: pk > 0,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(columns)
}

/// Get the primary key column names for a table, ordered by `pk` ordinal.
pub fn get_primary_keys(conn: &Connection, table: &str) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{}\")", table))?;

    let mut pks: Vec<(i32, String)> = stmt
        .query_map([], |row| {
            let name: String = row.get(1)?;
            let pk: i32 = row.get(5)?;
            Ok((pk, name))
        })?
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .filter(|(pk, _)| *pk > 0)
        .collect();

    pks.sort_by_key(|(pk, _)| *pk);

    Ok(pks.into_iter().map(|(_, name)| name).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::integration::create_test_db;

    #[test]
    fn test_get_tables_returns_user_tables() {
        let conn = create_test_db();
        let tables = get_tables(&conn).unwrap();

        assert_eq!(tables.len(), 2);
        let names: Vec<&str> = tables.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"users"));
        assert!(names.contains(&"orders"));
    }

    #[test]
    fn test_get_tables_excludes_sqlite_internal() {
        let conn = create_test_db();
        let tables = get_tables(&conn).unwrap();

        for table in &tables {
            assert!(!table.name.starts_with("sqlite_"));
        }
    }

    #[test]
    fn test_get_tables_has_row_counts() {
        let conn = create_test_db();
        let tables = get_tables(&conn).unwrap();

        for table in &tables {
            assert!(table.row_count.is_some());
        }
    }

    #[test]
    fn test_get_columns_returns_column_info() {
        let conn = create_test_db();
        let columns = get_columns(&conn, "users").unwrap();

        assert_eq!(columns.len(), 4);

        // Note: In SQLite, INTEGER PRIMARY KEY columns have `notnull = 0`
        // (nullable=true) because they auto-generate when NULL is inserted.
        let id_col = columns.iter().find(|c| c.name == "id").unwrap();
        assert!(id_col.is_primary_key);

        let name_col = columns.iter().find(|c| c.name == "name").unwrap();
        assert!(!name_col.is_primary_key);
        assert!(!name_col.nullable);

        let email_col = columns.iter().find(|c| c.name == "email").unwrap();
        assert!(!email_col.is_primary_key);
        assert!(!email_col.nullable);
    }

    #[test]
    fn test_get_primary_keys_returns_pk() {
        let conn = create_test_db();

        let pks = get_primary_keys(&conn, "users").unwrap();
        assert_eq!(pks, vec!["id"]);
    }

    #[test]
    fn test_get_columns_orders_has_correct_structure() {
        let conn = create_test_db();
        let columns = get_columns(&conn, "orders").unwrap();

        assert_eq!(columns.len(), 5);

        let total_col = columns.iter().find(|c| c.name == "total").unwrap();
        assert_eq!(total_col.data_type, "REAL");
    }
}
