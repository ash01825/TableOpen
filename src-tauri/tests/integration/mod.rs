use rusqlite::Connection;
use std::sync::Once;

static INIT: Once = Once::new();

pub fn setup() {
    INIT.call_once(|| {});
}

pub fn create_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("Failed to create in-memory test database");

    conn.execute_batch(
        "
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_db_has_tables() {
        let conn = create_test_db();

        let table_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(table_count, 2);
    }

    #[test]
    fn test_users_table_has_data() {
        let conn = create_test_db();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap();

        assert_eq!(count, 3);
    }

    #[test]
    fn test_orders_table_has_data() {
        let conn = create_test_db();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM orders", [], |row| row.get(0))
            .unwrap();

        assert_eq!(count, 4);
    }
}
