//! Commands for row-level data mutations.

use crate::db::state::ConnectionManager;
use crate::error::AppError;
use crate::models::query::CellValue;
use crate::services::mutation_service;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

/// Update a row identified by its primary key columns.
#[tauri::command]
pub fn update_row(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
    table: String,
    pk_columns: HashMap<String, CellValue>,
    changes: HashMap<String, CellValue>,
) -> Result<(), String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    mutation_service::update_row(&conn, &table, pk_columns, changes)?;
    Ok(())
}

/// Delete a row identified by its primary key columns.
#[tauri::command]
pub fn delete_row(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
    table: String,
    pk_columns: HashMap<String, CellValue>,
) -> Result<(), String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    mutation_service::delete_row(&conn, &table, pk_columns)?;
    Ok(())
}

/// Insert a new row with the given column values.
#[tauri::command]
pub fn insert_row(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
    table: String,
    values: HashMap<String, CellValue>,
) -> Result<(), String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    mutation_service::insert_row(&conn, &table, values)?;
    Ok(())
}
