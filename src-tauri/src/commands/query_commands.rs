//! Commands for querying database schema and executing SQL.

use crate::db::state::ConnectionManager;
use crate::error::AppError;
use crate::models::query::QueryResult;
use crate::models::schema::{ColumnInfo, TableInfo};
use crate::services::{query_service, schema_service};
use std::sync::Mutex;
use tauri::State;

/// Retrieve a list of tables for the given connection.
#[tauri::command]
pub fn get_tables(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
) -> Result<Vec<TableInfo>, String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    let tables = schema_service::get_tables(&conn)?;
    Ok(tables)
}

/// Retrieve column information for a specific table.
#[tauri::command]
pub fn get_columns(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
    table: String,
) -> Result<Vec<ColumnInfo>, String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    let columns = schema_service::get_columns(&conn, &table)?;
    Ok(columns)
}

/// Retrieve the primary key columns for a specific table.
#[tauri::command]
pub fn get_primary_keys(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
    table: String,
) -> Result<Vec<String>, String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    let pks = schema_service::get_primary_keys(&conn, &table)?;
    Ok(pks)
}

/// Execute a SQL query and return the result.
#[tauri::command]
pub fn execute_query(
    state: State<'_, Mutex<ConnectionManager>>,
    connection_id: String,
    sql: String,
) -> Result<QueryResult, String> {
    let manager = state.lock().map_err(|e| AppError::General(e.to_string()))?;
    let conn_state = manager
        .get(&connection_id)
        .ok_or_else(|| AppError::ConnectionNotFound(connection_id))?;

    let conn = conn_state.pool.get_conn()?;
    let result = query_service::execute(&conn, &sql)?;
    Ok(result)
}
