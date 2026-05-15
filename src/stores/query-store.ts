import { create } from "zustand";
import type { QueryResult } from "../types";
import * as commands from "../ipc/commands";

interface SortState {
  column: string;
  direction: "asc" | "desc";
}

interface QueryState {
  results: Record<string, QueryResult | null>;
  sortStates: Record<string, SortState | null>;
  pagination: Record<string, { offset: number; limit: number }>;
  loading: boolean;
  error: string | null;

  executeQuery: (connectionId: string, tabId: string, sql: string) => Promise<void>;
  setResults: (tabKey: string, results: QueryResult | null) => void;
  sortBy: (tabKey: string, column: string) => void;
  loadNextPage: (connectionId: string, tabId: string, sql: string) => Promise<void>;
}

export const useQueryStore = create<QueryState>((set, get) => ({
  results: {},
  sortStates: {},
  pagination: {},
  loading: false,
  error: null,

  executeQuery: async (connectionId: string, tabId: string, sql: string) => {
    const tabKey = `${connectionId}:${tabId}`;
    set({ loading: true, error: null });
    try {
      const result = await commands.executeQuery({ connection_id: connectionId, sql });
      set((state) => ({
        results: { ...state.results, [tabKey]: result },
        pagination: { ...state.pagination, [tabKey]: { offset: 0, limit: 100 } },
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },

  setResults: (tabKey: string, results: QueryResult | null) => {
    set((state) => ({
      results: { ...state.results, [tabKey]: results },
    }));
  },

  sortBy: (tabKey: string, column: string) => {
    set((state) => {
      const current = state.sortStates[tabKey];
      let direction: "asc" | "desc" = "asc";
      if (current?.column === column) {
        direction = current.direction === "asc" ? "desc" : "asc";
      }
      return {
        sortStates: { ...state.sortStates, [tabKey]: { column, direction } },
      };
    });
  },

  loadNextPage: async (connectionId: string, tabId: string, sql: string) => {
    const tabKey = `${connectionId}:${tabId}`;
    const state = get();
    const currentPagination = state.pagination[tabKey] ?? { offset: 0, limit: 100 };

    set({ loading: true, error: null });
    try {
      const nextOffset = currentPagination.offset + currentPagination.limit;
      const paginatedSql = `${sql} LIMIT ${currentPagination.limit} OFFSET ${nextOffset}`;
      const result = await commands.executeQuery({ connection_id: connectionId, sql: paginatedSql });
      const existingResults = state.results[tabKey];
      if (existingResults && result) {
        const merged: QueryResult = {
          columns: result.columns,
          rows: [...existingResults.rows, ...result.rows],
          execution_time_ms: result.execution_time_ms,
          total_row_count: result.total_row_count,
        };
        set((s) => ({
          results: { ...s.results, [tabKey]: merged },
          pagination: { ...s.pagination, [tabKey]: { ...currentPagination, offset: nextOffset } },
          loading: false,
        }));
      } else {
        set((s) => ({
          results: { ...s.results, [tabKey]: result },
          loading: false,
        }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },
}));
