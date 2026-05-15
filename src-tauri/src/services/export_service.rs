//! Data export service for writing query results to CSV files.

use crate::error::AppError;
use csv::Writer;
use rusqlite::Connection;
use std::fs::File;

/// Execute a SQL query and write the results to a CSV file at `path`.
///
/// The CSV output includes:
/// - A header row with column names
/// - Data rows with proper escaping of special characters
///
/// # Arguments
///
/// * `conn` — A SQLite connection to execute the query against
/// * `sql` — The SQL query to execute (parameterized via `conn.prepare`)
/// * `path` — The filesystem path where the CSV file will be written
pub fn export_csv(conn: &Connection, sql: &str, path: &str) -> Result<(), AppError> {
    let mut stmt = conn.prepare(sql)?;

    let col_count = stmt.column_count();
    let column_names: Vec<String> = (0..col_count)
        .map(|i| stmt.column_name(i).unwrap_or(&format!("col_{}", i)).to_string())
        .collect();

    let file = File::create(path)?;
    let mut writer = Writer::from_writer(file);

    // Write header
    writer.write_record(&column_names)?;

    // Write data rows
    let rows = stmt.query_map([], |row| {
        let mut record = Vec::with_capacity(col_count);
        for i in 0..col_count {
            let cell = value_ref_to_csv_string(row.get_ref(i)?);
            record.push(cell);
        }
        Ok(record)
    })?;

    for row_result in rows {
        let record = row_result?;
        writer.write_record(&record)?;
    }

    writer.flush()?;

    Ok(())
}

/// Convert a `rusqlite::types::ValueRef` to a CSV-ready string.
fn value_ref_to_csv_string(value: rusqlite::types::ValueRef<'_>) -> String {
    match value {
        rusqlite::types::ValueRef::Null => String::new(),
        rusqlite::types::ValueRef::Integer(i) => i.to_string(),
        rusqlite::types::ValueRef::Real(f) => f.to_string(),
        rusqlite::types::ValueRef::Text(t) => String::from_utf8_lossy(t).to_string(),
        rusqlite::types::ValueRef::Blob(b) => {
            let hex: String = b.iter().map(|byte| format!("{:02x}", byte)).collect();
            hex
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::integration::create_test_db;
    use std::io::Read;

    #[test]
    fn test_export_csv_creates_file() {
        let conn = create_test_db();
        let path = format!("/tmp/tableopen_csv_test_{}.csv", std::process::id());

        export_csv(&conn, "SELECT id, name, email FROM users ORDER BY id", &path).unwrap();

        let mut file = File::open(&path).unwrap();
        let mut contents = String::new();
        file.read_to_string(&mut contents).unwrap();

        assert!(contents.contains("id,name,email"));
        assert!(contents.contains("1,Alice,alice@example.com"));
        assert!(contents.contains("2,Bob,bob@example.com"));
        assert!(contents.contains("3,Charlie,charlie@example.com"));

        // Clean up
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_export_csv_with_special_chars() {
        let conn = create_test_db();

        // Insert a name with a comma and quotes
        conn.execute(
            "INSERT INTO users (name, email) VALUES ('\"Quote,User\"', 'quote@example.com')",
            [],
        )
        .unwrap();

        let path = format!("/tmp/tableopen_csv_special_{}.csv", std::process::id());

        export_csv(
            &conn,
            "SELECT name, email FROM users WHERE email = 'quote@example.com'",
            &path,
        )
        .unwrap();

        let mut file = File::open(&path).unwrap();
        let mut contents = String::new();
        file.read_to_string(&mut contents).unwrap();

        // CSV should properly escape the quotes and comma
        assert!(contents.contains("\"Quote,User\""));

        // Clean up
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_export_csv_empty_result() {
        let conn = create_test_db();
        let path = format!("/tmp/tableopen_csv_empty_{}.csv", std::process::id());

        export_csv(
            &conn,
            "SELECT * FROM users WHERE 1=0",
            &path,
        )
        .unwrap();

        let mut file = File::open(&path).unwrap();
        let mut contents = String::new();
        file.read_to_string(&mut contents).unwrap();

        // Should only have the header
        assert!(contents.contains("id"));
        assert!(contents.contains("name"));
        assert!(contents.contains("email"));
        assert!(contents.contains("created_at"));

        // Clean up
        let _ = std::fs::remove_file(&path);
    }
}
