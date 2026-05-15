export type CellValue =
  | { type: "Null" }
  | { type: "Text"; value: string }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "Bool"; value: boolean };

export interface ColumnMeta {
  name: string;
  data_type: string;
}

export interface QueryResult {
  columns: ColumnMeta[];
  rows: CellValue[][];
  execution_time_ms: number;
  total_row_count: number | null;
}
