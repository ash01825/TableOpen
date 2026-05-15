//! Query history persistence service.
//!
//! Stores query history in the app's internal SQLite database.
//! History persistence is fire-and-forget: it never blocks the main query path.

use crate::error::AppError;
use crate::models::history::{HistoryEntry, HistoryStatus};
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;

/// Service for persisting and retrieving query history.
pub struct HistoryService {
    pool: Pool<SqliteConnectionManager>,
}

impl HistoryService {
    /// Create a new history service backed by a SQLite database at the given path.
    ///
    /// The `query_history` table is created if it doesn't exist.
    ///
    /// For in-memory databases that work with connection pools, use the special
    /// URI `file::memory:?cache=shared` which creates a shared in-memory database
    /// accessible across all connections in the pool.
    pub fn new(db_path: &str) -> Result<Self, AppError> {
        let manager = SqliteConnectionManager::file(db_path);
        let pool = Pool::builder()
            .min_idle(Some(1))
            .max_size(2)
            .build(manager)?;

        // Initialize the database schema
        let conn = pool.get()?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS query_history (
                id TEXT PRIMARY KEY,
                connection_id TEXT NOT NULL,
                connection_name TEXT NOT NULL,
                sql TEXT NOT NULL,
                status TEXT NOT NULL,
                row_count INTEGER,
                execution_time_ms INTEGER,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_history_created_at ON query_history(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_history_sql_search ON query_history(sql);",
        )?;

        Ok(Self { pool })
    }

    /// Save a history entry. This is fire-and-forget — errors are logged but not propagated.
    pub fn save(&self, entry: &HistoryEntry) -> Result<(), AppError> {
        let conn = self.pool.get()?;

        // Encode the status: for Success we store "success", for Error we store the
        // actual error message so it can be fully recovered.
        let status_value = match &entry.status {
            HistoryStatus::Success => "success".to_string(),
            HistoryStatus::Error(msg) => msg.clone(),
        };

        conn.execute(
            "INSERT INTO query_history (id, connection_id, connection_name, sql, status, row_count, execution_time_ms, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                entry.id,
                entry.connection_id,
                entry.connection_name,
                entry.sql,
                status_value,
                entry.row_count,
                entry.execution_time_ms,
                entry.created_at,
            ],
        )?;

        Ok(())
    }

    /// Retrieve history entries with pagination.
    pub fn get_history(&self, limit: i64, offset: i64) -> Result<Vec<HistoryEntry>, AppError> {
        let conn = self.pool.get()?;

        let mut stmt = conn.prepare(
            "SELECT id, connection_id, connection_name, sql, status, row_count, execution_time_ms, created_at
             FROM query_history
             ORDER BY created_at DESC
             LIMIT ?1 OFFSET ?2",
        )?;

        let entries = stmt
            .query_map(params![limit, offset], |row| {
                let id: String = row.get(0)?;
                let connection_id: String = row.get(1)?;
                let connection_name: String = row.get(2)?;
                let sql: String = row.get(3)?;
                let status_str: String = row.get(4)?;
                let row_count: Option<i64> = row.get(5)?;
                let execution_time_ms: Option<u64> = row.get(6)?;
                let created_at: String = row.get(7)?;

                let status = if status_str == "success" {
                    HistoryStatus::Success
                } else {
                    HistoryStatus::Error(status_str)
                };

                Ok(HistoryEntry {
                    id,
                    connection_id,
                    connection_name,
                    sql,
                    status,
                    row_count,
                    execution_time_ms,
                    created_at,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// Search history entries by SQL text (LIKE search).
    pub fn search_history(&self, query: &str) -> Result<Vec<HistoryEntry>, AppError> {
        let conn = self.pool.get()?;

        let pattern = format!("%{}%", query);

        let mut stmt = conn.prepare(
            "SELECT id, connection_id, connection_name, sql, status, row_count, execution_time_ms, created_at
             FROM query_history
             WHERE sql LIKE ?1
             ORDER BY created_at DESC
             LIMIT 100",
        )?;

        let entries = stmt
            .query_map(params![pattern], |row| {
                let id: String = row.get(0)?;
                let connection_id: String = row.get(1)?;
                let connection_name: String = row.get(2)?;
                let sql: String = row.get(3)?;
                let status_str: String = row.get(4)?;
                let row_count: Option<i64> = row.get(5)?;
                let execution_time_ms: Option<u64> = row.get(6)?;
                let created_at: String = row.get(7)?;

                let status = if status_str == "success" {
                    HistoryStatus::Success
                } else {
                    HistoryStatus::Error(status_str)
                };

                Ok(HistoryEntry {
                    id,
                    connection_id,
                    connection_name,
                    sql,
                    status,
                    row_count,
                    execution_time_ms,
                    created_at,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::history::{HistoryEntry, HistoryStatus};
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    /// Create a history service with a truly unique temporary database path.
    /// Each test gets an isolated database to prevent parallel test interference.
    fn create_isolated_history_service() -> HistoryService {
        let pid = std::process::id();
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let count = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let path = format!("/tmp/tableopen_history_{}_{}_{}.db", pid, ts, count);
        // Do NOT clean up during tests — let the OS temp cleaner handle it
        HistoryService::new(&path).expect("Failed to create history service")
    }

    fn make_entry(sql: &str, status: HistoryStatus) -> HistoryEntry {
        HistoryEntry {
            id: uuid::Uuid::new_v4().to_string(),
            connection_id: "conn-1".to_string(),
            connection_name: "Test DB".to_string(),
            sql: sql.to_string(),
            status,
            row_count: Some(5),
            execution_time_ms: Some(42),
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    #[test]
    fn test_save_and_get_history() {
        let svc = create_isolated_history_service();
        let entry = make_entry("SELECT * FROM users", HistoryStatus::Success);
        svc.save(&entry).unwrap();

        let entries = svc.get_history(10, 0).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].sql, "SELECT * FROM users");
        assert!(matches!(entries[0].status, HistoryStatus::Success));
    }

    #[test]
    fn test_save_error_status() {
        let svc = create_isolated_history_service();
        let entry = make_entry(
            "SELECT * FROM nonexistent",
            HistoryStatus::Error("no such table".to_string()),
        );
        svc.save(&entry).unwrap();

        let entries = svc.get_history(10, 0).unwrap();
        assert_eq!(entries.len(), 1);
        match &entries[0].status {
            HistoryStatus::Error(msg) => assert_eq!(msg, "no such table"),
            _ => panic!("Expected Error status"),
        }
    }

    #[test]
    fn test_search_history() {
        let svc = create_isolated_history_service();

        let entry1 = make_entry("SELECT * FROM users WHERE id = 1", HistoryStatus::Success);
        let entry2 = make_entry("SELECT * FROM orders", HistoryStatus::Success);
        let entry3 = make_entry("UPDATE users SET name = 'test'", HistoryStatus::Success);

        svc.save(&entry1).unwrap();
        svc.save(&entry2).unwrap();
        svc.save(&entry3).unwrap();

        let results = svc.search_history("users").unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_pagination() {
        let svc = create_isolated_history_service();

        for i in 0..5 {
            let entry = make_entry(
                &format!("SELECT {} as val", i),
                HistoryStatus::Success,
            );
            svc.save(&entry).unwrap();
        }

        let page1 = svc.get_history(2, 0).unwrap();
        assert_eq!(page1.len(), 2);

        let page2 = svc.get_history(2, 2).unwrap();
        assert_eq!(page2.len(), 2);

        let page3 = svc.get_history(2, 4).unwrap();
        assert_eq!(page3.len(), 1);
    }
}
