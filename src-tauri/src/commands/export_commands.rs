//! Commands for exporting query results.

use crate::db::state::ConnectionManager;
use crate::error::AppError;
use crate::services::export_service;
use std::sync::Mutex;
use tauri::State;

/// Execute a SQL query and export the results to a CSV file.
#[tauri::command]
pub fn export_csv(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
    sql: String,
    path: String,
) -> Result<(), String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    export_service::export_csv(&conn, &sql, &path)?;
    Ok(())
}
