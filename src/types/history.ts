export type HistoryStatus =
  | { type: "success" }
  | { type: "error"; message: string };

export interface HistoryEntry {
  id: string;
  connection_id: string;
  connection_name: string;
  sql: string;
  status: HistoryStatus;
  row_count: number | null;
  execution_time_ms: number | null;
  created_at: string;
}
