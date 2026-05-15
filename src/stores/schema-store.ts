import { create } from "zustand";
import type { TableInfo, ColumnInfo } from "../types";
import * as commands from "../ipc/commands";

interface SchemaState {
  tables: Record<string, TableInfo[]>;
  columns: Record<string, ColumnInfo[]>;
  primaryKeys: Record<string, string[]>;
  loading: boolean;
  error: string | null;

  loadTables: (connectionId: string) => Promise<void>;
  loadColumns: (connectionId: string, table: string) => Promise<void>;
  loadPrimaryKeys: (connectionId: string, table: string) => Promise<void>;
}

export const useSchemaStore = create<SchemaState>((set) => ({
  tables: {},
  columns: {},
  primaryKeys: {},
  loading: false,
  error: null,

  loadTables: async (connectionId: string) => {
    set({ loading: true, error: null });
    try {
      const tables = await commands.getTables({ connection_id: connectionId });
      set((state) => ({
        tables: { ...state.tables, [connectionId]: tables },
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },

  loadColumns: async (connectionId: string, table: string) => {
    set({ loading: true, error: null });
    try {
      const columns = await commands.getColumns({ connection_id: connectionId, table });
      const key = `${connectionId}:${table}`;
      set((state) => ({
        columns: { ...state.columns, [key]: columns },
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },

  loadPrimaryKeys: async (connectionId: string, table: string) => {
    set({ loading: true, error: null });
    try {
      const pks = await commands.getPrimaryKeys({ connection_id: connectionId, table });
      const key = `${connectionId}:${table}`;
      set((state) => ({
        primaryKeys: { ...state.primaryKeys, [key]: pks },
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },
}));
