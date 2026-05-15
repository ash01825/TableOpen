//! TableOpen — Tauri v2 desktop database GUI.
//!
//! This crate provides the Rust backend for the TableOpen application,
//! managing database connections, query execution, schema introspection,
//! and data export.

pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;

#[cfg(test)]
mod tests;

use db::state::ConnectionManager;
use services::history_service::HistoryService;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize history service with a file in a reasonable location.
    let history_path = get_history_db_path();

    let history_service = HistoryService::new(&history_path).unwrap_or_else(|e| {
        eprintln!(
            "Warning: Failed to initialize history service at {}: {}",
            history_path, e
        );
        // Create an in-memory fallback
        HistoryService::new(":memory:")
            .expect("Failed to create in-memory history service")
    });

    tauri::Builder::default()
        .manage(Mutex::new(ConnectionManager::new()))
        .manage(Mutex::new(history_service))
        .invoke_handler(tauri::generate_handler![
            commands::connect_commands::connect_sqlite,
            commands::connect_commands::disconnect,
            commands::connect_commands::list_connections,
            commands::query_commands::get_tables,
            commands::query_commands::get_columns,
            commands::query_commands::get_primary_keys,
            commands::query_commands::execute_query,
            commands::mutation_commands::update_row,
            commands::mutation_commands::delete_row,
            commands::mutation_commands::insert_row,
            commands::history_commands::get_history,
            commands::history_commands::search_history,
            commands::export_commands::export_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Determine the path for the history database file.
///
/// Uses the home directory's `.tableopen` folder if available,
/// falling back to a local file in the current working directory.
fn get_history_db_path() -> String {
    // Try ~/.tableopen/ directory
    if let Some(home) = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
    {
        let mut app_dir = std::path::PathBuf::from(home);
        app_dir.push(".tableopen");
        let _ = std::fs::create_dir_all(&app_dir);
        return app_dir
            .join("history.db")
            .to_string_lossy()
            .to_string();
    }

    // Fallback: current working directory
    "tableopen_history.db".to_string()
}
