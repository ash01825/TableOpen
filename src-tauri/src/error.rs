//! Application error types for TableOpen.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Connection not found: {0}")]
    ConnectionNotFound(String),

    #[error("SQL error: {0}")]
    SqlError(#[from] rusqlite::Error),

    #[error("Pool error: {0}")]
    PoolError(#[from] r2d2::Error),

    #[error("CSV error: {0}")]
    CsvError(#[from] csv::Error),

    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("{0}")]
    General(String),
}

impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}
