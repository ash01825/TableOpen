//! Commands for query history management.

use crate::error::AppError;
use crate::models::history::HistoryEntry;
use crate::services::history_service::HistoryService;
use std::sync::Mutex;
use tauri::State;

/// Retrieve query history entries with pagination.
#[tauri::command]
pub fn get_history(
    history: State<'_, Mutex<HistoryService>>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<HistoryEntry>, String> {
    let svc = history.lock().map_err(|e| AppError::General(e.to_string()))?;
    let entries = svc.get_history(limit.unwrap_or(50), offset.unwrap_or(0))?;
    Ok(entries)
}

/// Search query history by SQL text.
#[tauri::command]
pub fn search_history(
    history: State<'_, Mutex<HistoryService>>,
    query: String,
) -> Result<Vec<HistoryEntry>, String> {
    let svc = history.lock().map_err(|e| AppError::General(e.to_string()))?;
    let entries = svc.search_history(&query)?;
    Ok(entries)
}

/// Save a query history entry (fire-and-forget from frontend).
#[tauri::command]
pub fn save_history(
    history: State<'_, Mutex<HistoryService>>,
    entry: HistoryEntry,
) -> Result<(), String> {
    let svc = history.lock().map_err(|e| AppError::General(e.to_string()))?;
    svc.save(&entry).map_err(|e| e.to_string())?;
    Ok(())
}
