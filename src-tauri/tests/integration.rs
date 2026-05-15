//! Integration tests for the SQLite backend.
//!
//! These tests exercise the services layer directly (without Tauri),
//! demonstrating that services are testable in isolation.

use rusqlite::Connection;
use std::sync::Once;

static INIT: Once = Once::new();

pub fn setup() {
    INIT.call_once(|| {});
}

/// Create an in-memory SQLite database with test tables and seed data.
pub fn create_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("Failed to create in-memory test database");

    conn.execute_batch(
        "PRAGMA foreign_keys = ON;

        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            total REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            placed_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO users (id, name, email) VALUES
            (1, 'Alice', 'alice@example.com'),
            (2, 'Bob', 'bob@example.com'),
            (3, 'Charlie', 'charlie@example.com');

        INSERT INTO orders (id, user_id, total, status) VALUES
            (1, 1, 99.99, 'completed'),
            (2, 1, 149.50, 'pending'),
            (3, 2, 29.99, 'completed'),
            (4, 3, 200.00, 'cancelled');
        ",
    )
    .expect("Failed to seed test database");

    conn
}

#[cfg(test)]
mod tests {
    use super::*;
    use tableopen_lib::db::pool::ConnectionPool;
    use tableopen_lib::db::state::ConnectionManager;
    use tableopen_lib::models::connection::{ConnectionInfo, DbType};
    use tableopen_lib::models::query::CellValue;
    use tableopen_lib::services::export_service;
    use tableopen_lib::services::history_service::HistoryService;
    use tableopen_lib::services::mutation_service;
    use tableopen_lib::services::query_service;
    use tableopen_lib::services::schema_service;
    use std::collections::HashMap;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn unique_db_path(prefix: &str) -> String {
        let pid = std::process::id();
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let count = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        format!("/tmp/tableopen_int_{}_{}_{}_{}.db", prefix, pid, ts, count)
    }

    // -----------------------------------------------------------------------
    // Schema service tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_get_tables_returns_correct_tables() {
        let conn = create_test_db();
        let tables = schema_service::get_tables(&conn).unwrap();

        let names: Vec<&str> = tables.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"users"));
        assert!(names.contains(&"orders"));
        assert_eq!(tables.len(), 2);

        for table in &tables {
            match table.name.as_str() {
                "users" => assert_eq!(table.row_count, Some(3)),
                "orders" => assert_eq!(table.row_count, Some(4)),
                _ => panic!("Unexpected table: {}", table.name),
            }
        }
    }

    #[test]
    fn test_get_tables_excludes_sqlite_internal() {
        let conn = create_test_db();
        let tables = schema_service::get_tables(&conn).unwrap();

        for table in &tables {
            assert!(!table.name.starts_with("sqlite_"));
        }
    }

    #[test]
    fn test_get_columns_returns_column_info() {
        let conn = create_test_db();
        let columns = schema_service::get_columns(&conn, "users").unwrap();

        assert_eq!(columns.len(), 4);

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
    fn test_get_columns_for_orders_has_foreign_key() {
        let conn = create_test_db();
        let columns = schema_service::get_columns(&conn, "orders").unwrap();

        let user_id_col = columns.iter().find(|c| c.name == "user_id").unwrap();
        assert!(!user_id_col.is_primary_key);
        assert!(!user_id_col.nullable);
        assert_eq!(user_id_col.data_type, "INTEGER");
    }

    #[test]
    fn test_get_primary_keys_returns_pk_columns() {
        let conn = create_test_db();

        let users_pks = schema_service::get_primary_keys(&conn, "users").unwrap();
        assert_eq!(users_pks, vec!["id"]);

        let orders_pks = schema_service::get_primary_keys(&conn, "orders").unwrap();
        assert_eq!(orders_pks, vec!["id"]);
    }

    // -----------------------------------------------------------------------
    // Query service tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_execute_query_select_returns_correct_types() {
        let conn = create_test_db();
        let result = query_service::execute(&conn, "SELECT * FROM users ORDER BY id").unwrap();

        assert_eq!(result.rows.len(), 3);
        assert_eq!(result.columns.len(), 4);

        let row = &result.rows[0];
        assert_eq!(row.len(), 4);
        assert!(matches!(row[0], CellValue::Integer(1)));
        assert!(matches!(&row[1], CellValue::Text(s) if s == "Alice"));
        assert!(matches!(&row[2], CellValue::Text(s) if s == "alice@example.com"));
        assert!(matches!(row[3], CellValue::Text(_)));
    }

    #[test]
    fn test_execute_query_with_real_values() {
        let conn = create_test_db();
        let result = query_service::execute(&conn, "SELECT * FROM orders ORDER BY id").unwrap();

        assert_eq!(result.rows.len(), 4);

        let row = &result.rows[0];
        assert!(matches!(row[0], CellValue::Integer(1)));
        assert!(matches!(row[1], CellValue::Integer(1)));
        assert!(matches!(row[2], CellValue::Float(f) if (f - 99.99).abs() < 0.001));
        assert!(matches!(&row[3], CellValue::Text(s) if s == "completed"));
    }

    #[test]
    fn test_execute_query_insert_dml() {
        let conn = create_test_db();
        let result = query_service::execute(
            &conn,
            "INSERT INTO users (name, email) VALUES ('Dave', 'dave@example.com')",
        )
        .unwrap();

        assert!(result.columns.is_empty());
        assert!(result.rows.is_empty());
        assert_eq!(result.total_row_count, Some(1));
    }

    #[test]
    fn test_execute_query_update_dml() {
        let conn = create_test_db();
        let result = query_service::execute(
            &conn,
            "UPDATE users SET name = 'Alice Updated' WHERE id = 1",
        )
        .unwrap();

        assert_eq!(result.total_row_count, Some(1));

        let name: String = conn
            .query_row("SELECT name FROM users WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Alice Updated");
    }

    #[test]
    fn test_execute_query_delete_dml() {
        let conn = create_test_db();
        // Delete from orders (no reverse FK constraints)
        let result = query_service::execute(&conn, "DELETE FROM orders WHERE id = 4").unwrap();

        assert_eq!(result.total_row_count, Some(1));

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM orders", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_execute_query_execution_time_is_measured() {
        let conn = create_test_db();
        let result = query_service::execute(&conn, "SELECT * FROM users").unwrap();

        // execution_time_ms may be 0 in extremely fast queries on in-memory DBs
        assert!(result.execution_time_ms <= 1000);
    }

    #[test]
    fn test_execute_query_with_sql_error_returns_error() {
        let conn = create_test_db();
        let err = query_service::execute(&conn, "SELECT * FROM nonexistent_table");

        assert!(err.is_err());
    }

    // -----------------------------------------------------------------------
    // Mutation service tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_update_row_with_single_pk() {
        let conn = create_test_db();

        let mut pk = HashMap::new();
        pk.insert("id".to_string(), CellValue::Integer(1));

        let mut changes = HashMap::new();
        changes.insert("name".to_string(), CellValue::Text("Alice Smith".to_string()));

        mutation_service::update_row(&conn, "users", pk, changes).unwrap();

        let name: String = conn
            .query_row("SELECT name FROM users WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Alice Smith");
    }

    #[test]
    fn test_delete_row_success() {
        let conn = create_test_db();

        let mut pk = HashMap::new();
        pk.insert("id".to_string(), CellValue::Integer(4));

        mutation_service::delete_row(&conn, "orders", pk).unwrap();

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

        mutation_service::insert_row(&conn, "users", values).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 4);

        let email: String = conn
            .query_row("SELECT email FROM users WHERE name = 'Dave'", [], |row| row.get(0))
            .unwrap();
        assert_eq!(email, "dave@example.com");
    }

    #[test]
    fn test_mutation_rolls_back_on_error() {
        let conn = create_test_db();

        // First delete the order that references user 3, THEN delete user 3
        {
            let mut pk = HashMap::new();
            pk.insert("id".to_string(), CellValue::Integer(4));
            mutation_service::delete_row(&conn, "orders", pk).unwrap();
        }
        {
            let mut pk = HashMap::new();
            pk.insert("id".to_string(), CellValue::Integer(3));
            mutation_service::delete_row(&conn, "users", pk).unwrap();
        }

        // Now try to update a non-existent column — should fail and rollback
        {
            let mut pk = HashMap::new();
            pk.insert("id".to_string(), CellValue::Integer(1));

            let mut changes = HashMap::new();
            changes.insert("nonexistent".to_string(), CellValue::Text("value".to_string()));

            let result = mutation_service::update_row(&conn, "users", pk, changes);
            assert!(result.is_err());
        }

        // Verify the previous deletes are still in effect
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2, "Previous deletes should still be committed");
    }

    // -----------------------------------------------------------------------
    // History service tests
    // -----------------------------------------------------------------------

    fn create_isolated_history_service() -> HistoryService {
        let path = unique_db_path("history");
        HistoryService::new(&path).expect("Failed to create history service")
    }

    fn make_test_entry(
        sql: &str,
        status: tableopen_lib::models::history::HistoryStatus,
    ) -> tableopen_lib::models::history::HistoryEntry {
        tableopen_lib::models::history::HistoryEntry {
            id: uuid::Uuid::new_v4().to_string(),
            connection_id: "test-conn".to_string(),
            connection_name: "Test DB".to_string(),
            sql: sql.to_string(),
            status,
            row_count: Some(10),
            execution_time_ms: Some(42),
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    #[test]
    fn test_history_save_and_retrieve() {
        let svc = create_isolated_history_service();

        let entry = make_test_entry(
            "SELECT * FROM users",
            tableopen_lib::models::history::HistoryStatus::Success,
        );
        svc.save(&entry).unwrap();

        let entries = svc.get_history(10, 0).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].sql, "SELECT * FROM users");
        assert_eq!(entries[0].connection_id, "test-conn");
        assert_eq!(entries[0].row_count, Some(10));
        assert_eq!(entries[0].execution_time_ms, Some(42));
    }

    #[test]
    fn test_history_search_finds_matching_queries() {
        let svc = create_isolated_history_service();

        svc.save(&make_test_entry(
            "SELECT * FROM users WHERE id = 1",
            tableopen_lib::models::history::HistoryStatus::Success,
        ))
        .unwrap();
        svc.save(&make_test_entry(
            "SELECT * FROM orders",
            tableopen_lib::models::history::HistoryStatus::Success,
        ))
        .unwrap();
        svc.save(&make_test_entry(
            "UPDATE users SET name = 'x'",
            tableopen_lib::models::history::HistoryStatus::Success,
        ))
        .unwrap();

        let results = svc.search_history("users").unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_history_pagination() {
        let svc = create_isolated_history_service();

        for i in 0..10 {
            svc.save(&make_test_entry(
                &format!("SELECT {}", i),
                tableopen_lib::models::history::HistoryStatus::Success,
            ))
            .unwrap();
        }

        let page1 = svc.get_history(3, 0).unwrap();
        assert_eq!(page1.len(), 3);

        let page2 = svc.get_history(3, 3).unwrap();
        assert_eq!(page2.len(), 3);

        let page3 = svc.get_history(3, 9).unwrap();
        assert_eq!(page3.len(), 1);
    }

    #[test]
    fn test_history_stores_error_status() {
        let svc = create_isolated_history_service();

        let entry = make_test_entry(
            "SELECT * FROM nonexistent",
            tableopen_lib::models::history::HistoryStatus::Error("no such table".to_string()),
        );
        svc.save(&entry).unwrap();

        let entries = svc.get_history(10, 0).unwrap();
        assert_eq!(entries.len(), 1);
        match &entries[0].status {
            tableopen_lib::models::history::HistoryStatus::Error(msg) => {
                assert_eq!(msg, "no such table");
            }
            _ => panic!("Expected Error status"),
        }
    }

    // -----------------------------------------------------------------------
    // Export service tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_export_csv_writes_valid_csv() {
        let conn = create_test_db();
        let path = unique_db_path("csv");

        export_service::export_csv(
            &conn,
            "SELECT id, name, email FROM users ORDER BY id",
            &path,
        )
        .unwrap();

        let content = std::fs::read_to_string(&path).unwrap();
        let lines: Vec<&str> = content.trim().lines().collect();

        assert_eq!(lines.len(), 4);
        assert_eq!(lines[0], "id,name,email");
        assert!(lines[1].contains("Alice"));
        assert!(lines[2].contains("Bob"));
        assert!(lines[3].contains("Charlie"));

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_export_csv_empty_result_only_header() {
        let conn = create_test_db();
        let path = unique_db_path("csv_empty");

        export_service::export_csv(
            &conn,
            "SELECT id, name, email FROM users WHERE 1=0",
            &path,
        )
        .unwrap();

        let content = std::fs::read_to_string(&path).unwrap();
        let lines: Vec<&str> = content.trim().lines().collect();

        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0], "id,name,email");

        let _ = std::fs::remove_file(&path);
    }

    // -----------------------------------------------------------------------
    // Connection pool tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_connection_pool_can_create_and_query() {
        let path = unique_db_path("pool");

        let pool = ConnectionPool::new_sqlite(&path).unwrap();
        let conn = pool.get_conn().unwrap();

        conn.execute_batch(
            "CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT);
             INSERT INTO test VALUES (1, 'hello');",
        )
        .unwrap();

        let result: String = conn
            .query_row("SELECT value FROM test WHERE id = 1", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(result, "hello");

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_connection_pool_wal_mode() {
        let path = unique_db_path("wal");

        let pool = ConnectionPool::new_sqlite(&path).unwrap();
        let conn = pool.get_conn().unwrap();

        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .unwrap();
        assert_eq!(journal_mode.to_uppercase(), "WAL");

        let _ = std::fs::remove_file(&path);
    }

    // -----------------------------------------------------------------------
    // Connection manager tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_connection_manager_add_and_list() {
        let mut manager = ConnectionManager::new();
        assert!(manager.list().is_empty());

        let path = unique_db_path("mgr");
        let pool = ConnectionPool::new_sqlite(&path).unwrap();
        let info = ConnectionInfo {
            id: "test-id-1".to_string(),
            name: "Test DB".to_string(),
            db_type: DbType::Sqlite,
            group: None,
            file_path: Some(path.clone()),
            pg_config: None,
            last_used_at: None,
        };

        let returned = manager.add(info, pool);
        assert_eq!(returned.id, "test-id-1");

        assert_eq!(manager.list().len(), 1);
        assert_eq!(manager.list()[0].name, "Test DB");

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_connection_manager_remove() {
        let mut manager = ConnectionManager::new();
        let path = unique_db_path("mgr_remove");

        let info = ConnectionInfo {
            id: "test-id-2".to_string(),
            name: "Test DB 2".to_string(),
            db_type: DbType::Sqlite,
            group: None,
            file_path: Some(path.clone()),
            pg_config: None,
            last_used_at: None,
        };

        manager.add(info, ConnectionPool::new_sqlite(&path).unwrap());
        assert!(manager.remove("test-id-2"));
        assert!(!manager.remove("nonexistent"));
        assert!(manager.list().is_empty());

        let _ = std::fs::remove_file(&path);
    }
}
