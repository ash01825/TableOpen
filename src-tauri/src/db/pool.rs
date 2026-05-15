//! Connection pooling for database backends.

use crate::error::AppError;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

/// Enum of supported connection pool variants.
pub enum ConnectionPool {
    /// SQLite connection pool backed by r2d2.
    Sqlite(Pool<SqliteConnectionManager>),
}

impl ConnectionPool {
    /// Create a new SQLite connection pool with WAL mode and busy timeout.
    ///
    /// The pool is configured with a minimum of 1 and maximum of 4 connections.
    /// Each connection is initialized with:
    /// - `PRAGMA journal_mode=WAL` — for better concurrent read performance
    /// - `PRAGMA busy_timeout=5000` — wait up to 5 seconds instead of failing
    pub fn new_sqlite(path: &str) -> Result<Self, AppError> {
        let manager = SqliteConnectionManager::file(path);
        let pool = Pool::builder()
            .min_idle(Some(1))
            .max_size(4)
            .build(manager)?;

        // Initialize each connection in the pool with WAL mode and busy timeout
        {
            let conn = pool.get()?;
            conn.execute_batch(
                "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
            )?;
        }

        Ok(ConnectionPool::Sqlite(pool))
    }

    /// Get a connection from the pool.
    pub fn get_conn(&self) -> Result<r2d2::PooledConnection<SqliteConnectionManager>, AppError> {
        match self {
            ConnectionPool::Sqlite(pool) => Ok(pool.get()?),
        }
    }
}
