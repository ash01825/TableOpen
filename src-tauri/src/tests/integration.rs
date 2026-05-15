//! Test helpers for creating test databases.
//!
//! This module provides a shared `create_test_db()` function used by
//! unit tests across the services crate.

use rusqlite::Connection;

/// Create an in-memory SQLite database with test tables and seed data.
///
/// Schema:
/// - `users` (id INTEGER PK, name TEXT, email TEXT, created_at TEXT)
/// - `orders` (id INTEGER PK, user_id INTEGER FK, total REAL, status TEXT, placed_at TEXT)
///
/// Foreign keys are enabled.
///
/// Seed data:
/// - 3 users (Alice, Bob, Charlie)
/// - 4 orders linked to users
pub fn create_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("Failed to create in-memory test database");

    conn.execute_batch(
        "PRAGMA foreign_keys = ON;

        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            total REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            placed_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO users (id, name, email) VALUES
            (1, 'Alice', 'alice@example.com'),
            (2, 'Bob', 'bob@example.com'),
            (3, 'Charlie', 'charlie@example.com');

        INSERT INTO orders (id, user_id, total, status) VALUES
            (1, 1, 99.99, 'completed'),
            (2, 1, 149.50, 'pending'),
            (3, 2, 29.99, 'completed'),
            (4, 3, 200.00, 'cancelled');
        ",
    )
    .expect("Failed to seed test database");

    conn
}
