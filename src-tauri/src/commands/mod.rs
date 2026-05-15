//! Tauri IPC command handlers.
//!
//! Commands are thin wrappers that:
//! 1. Deserialize IPC arguments (already done by Tauri)
//! 2. Acquire the relevant connection from state
//! 3. Call the corresponding service function
//! 4. Return `Result<T, String>` which Tauri converts to promise resolve/reject

pub mod connect_commands;
pub mod export_commands;
pub mod history_commands;
pub mod mutation_commands;
pub mod query_commands;
