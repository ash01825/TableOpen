use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "message", rename_all = "snake_case")]
pub enum HistoryStatus {
    Success,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub connection_name: String,
    pub sql: String,
    pub status: HistoryStatus,
    pub row_count: Option<i64>,
    pub execution_time_ms: Option<u64>,
    pub created_at: String,
}
