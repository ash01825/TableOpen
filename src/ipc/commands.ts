import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionInfo,
  PgConfig,
  TableInfo,
  ColumnInfo,
  QueryResult,
  HistoryEntry,
  CellValue,
} from "../types";

export async function connectSqlite(args: {
  path: string;
  name: string;
  group?: string;
}): Promise<ConnectionInfo> {
  return invoke<ConnectionInfo>("connect_sqlite", args);
}

export async function connectPostgres(args: {
  config: PgConfig;
  name: string;
  group?: string;
}): Promise<ConnectionInfo> {
  return invoke<ConnectionInfo>("connect_postgres", args);
}

export async function disconnect(args: {
  connectionId: string;
}): Promise<void> {
  return invoke<void>("disconnect", args);
}

export async function listConnections(args: {}): Promise<ConnectionInfo[]> {
  return invoke<ConnectionInfo[]>("list_connections", args);
}

export async function testConnection(args: {
  config: PgConfig;
}): Promise<boolean> {
  return invoke<boolean>("test_connection", args);
}

export async function getTables(args: {
  connectionId: string;
}): Promise<TableInfo[]> {
  return invoke<TableInfo[]>("get_tables", args);
}

export async function getColumns(args: {
  connectionId: string;
  table: string;
}): Promise<ColumnInfo[]> {
  return invoke<ColumnInfo[]>("get_columns", args);
}

export async function getPrimaryKeys(args: {
  connectionId: string;
  table: string;
}): Promise<string[]> {
  return invoke<string[]>("get_primary_keys", args);
}

export async function executeQuery(args: {
  connectionId: string;
  sql: string;
}): Promise<QueryResult> {
  return invoke<QueryResult>("execute_query", args);
}

export async function cancelQuery(args: {
  connectionId: string;
}): Promise<void> {
  return invoke<void>("cancel_query", args);
}

export async function updateRow(args: {
  connectionId: string;
  table: string;
  pkColumns: Record<string, CellValue>;
  changes: Record<string, CellValue>;
}): Promise<void> {
  return invoke<void>("update_row", args);
}

export async function deleteRow(args: {
  connectionId: string;
  table: string;
  pkColumns: Record<string, CellValue>;
}): Promise<void> {
  return invoke<void>("delete_row", args);
}

export async function insertRow(args: {
  connectionId: string;
  table: string;
  values: Record<string, CellValue>;
}): Promise<void> {
  return invoke<void>("insert_row", args);
}

export async function getHistory(args: {
  limit?: number;
  offset?: number;
}): Promise<HistoryEntry[]> {
  return invoke<HistoryEntry[]>("get_history", args);
}

export async function saveHistory(args: {
  entry: HistoryEntry;
}): Promise<void> {
  return invoke<void>("save_history", args);
}

export async function searchHistory(args: {
  query: string;
}): Promise<HistoryEntry[]> {
  return invoke<HistoryEntry[]>("search_history", args);
}

export async function exportCsv(args: {
  connectionId: string;
  sql: string;
  path: string;
}): Promise<void> {
  return invoke<void>("export_csv", args);
}
