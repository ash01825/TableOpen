//! Commands for connecting to and managing database connections.

use crate::db::pool::ConnectionPool;
use crate::db::state::ConnectionManager;
use crate::error::AppError;
use crate::models::connection::{ConnectionInfo, DbType};
use chrono::Utc;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

/// Connect to a SQLite database at the given path.
///
/// Returns the `ConnectionInfo` for the newly created connection.
#[tauri::command]
pub fn connect_sqlite(
    state: State<'_, Mutex<ConnectionManager>>,
    path: String,
    name: String,
    group: Option<String>,
) -> Result<ConnectionInfo, String> {
    let pool = ConnectionPool::new_sqlite(&path).map_err(|e| e.to_string())?;

    let info = ConnectionInfo {
        id: Uuid::new_v4().to_string(),
        name,
        db_type: DbType::Sqlite,
        group,
        file_path: Some(path),
        pg_config: None,
        last_used_at: Some(Utc::now().to_rfc3339()),
    };

    let info_clone = info.clone();

    let mut manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    manager.add(info, pool);

    Ok(info_clone)
}

/// Disconnect and remove a connection by ID.
#[tauri::command]
pub fn disconnect(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;

    if !manager.remove(&connection_id) {
        return Err(AppError::ConnectionNotFound(connection_id).to_string());
    }

    Ok(())
}

/// List all active connections.
#[tauri::command]
pub fn list_connections(
    state: State<'_, Mutex<ConnectionManager>>,
) -> Result<Vec<ConnectionInfo>, String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let infos: Vec<ConnectionInfo> = manager.list().into_iter().cloned().collect();
    Ok(infos)
}
