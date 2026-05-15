//! Connection state management for database connections.

use crate::db::pool::ConnectionPool;
use crate::models::connection::ConnectionInfo;
use std::collections::HashMap;

/// Holds the connection pool and metadata for an active database connection.
pub struct ConnectionState {
    /// Connection metadata (id, name, type, path, etc.).
    pub info: ConnectionInfo,
    /// The connection pool for executing queries.
    pub pool: ConnectionPool,
}

impl ConnectionState {
    pub fn new(info: ConnectionInfo, pool: ConnectionPool) -> Self {
        Self { info, pool }
    }
}

/// Manages all active database connections by ID.
pub struct ConnectionManager {
    connections: HashMap<String, ConnectionState>,
}

impl ConnectionManager {
    /// Create a new empty connection manager.
    pub fn new() -> Self {
        Self {
            connections: HashMap::new(),
        }
    }

    /// Add a new connection and return a clone of its info.
    pub fn add(&mut self, info: ConnectionInfo, pool: ConnectionPool) -> ConnectionInfo {
        let id = info.id.clone();
        self.connections
            .insert(id, ConnectionState::new(info.clone(), pool));
        info
    }

    /// Remove a connection by ID. Returns `true` if it existed.
    pub fn remove(&mut self, id: &str) -> bool {
        self.connections.remove(id).is_some()
    }

    /// Get a shared reference to a connection state by ID.
    pub fn get(&self, id: &str) -> Option<&ConnectionState> {
        self.connections.get(id)
    }

    /// List all active connection info entries.
    pub fn list(&self) -> Vec<&ConnectionInfo> {
        self.connections
            .values()
            .map(|state| &state.info)
            .collect()
    }
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}
