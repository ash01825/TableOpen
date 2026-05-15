import { create } from "zustand";
import type { ConnectionInfo, PgConfig, QueryResult } from "../types";
import * as commands from "../ipc/commands";

export interface QueryTab {
  id: string;
  title: string;
  content: string;
  results: QueryResult | null;
  isDirty: boolean;
  error: string | null;
  executionTimeMs: number | null;
  rowCount: number | null;
  isExecuting: boolean;
}

export interface ConnectionTab {
  connectionId: string;
  connectionInfo: ConnectionInfo;
  queryTabs: QueryTab[];
  activeQueryTabId: string;
}

interface ConnectionState {
  connections: ConnectionTab[];
  activeConnectionId: string | null;
  savedConnections: ConnectionInfo[];
  recentConnections: ConnectionInfo[];
  loading: boolean;
  error: string | null;

  connectSqlite: (path: string, name: string, group?: string) => Promise<void>;
  connectPostgres: (config: PgConfig, name: string, group?: string) => Promise<void>;
  disconnect: (connectionId: string) => Promise<void>;
  setActiveConnection: (connectionId: string) => void;
  addQueryTab: (connectionId: string) => void;
  closeQueryTab: (connectionId: string, tabId: string) => void;
  setActiveQueryTab: (connectionId: string, tabId: string) => void;
  updateQueryContent: (connectionId: string, tabId: string, content: string) => void;
  setQueryResults: (connectionId: string, tabId: string, results: QueryResult | null) => void;
  setQueryError: (connectionId: string, tabId: string, error: string | null) => void;
  setQueryExecuting: (connectionId: string, tabId: string, executing: boolean) => void;
  loadSavedConnections: () => Promise<void>;
  addRecentConnection: (info: ConnectionInfo) => void;
  executeQuery: (connectionId: string, tabId: string, sql: string) => Promise<void>;
}

let tabCounter = 0;
function generateTabId(): string {
  tabCounter += 1;
  return `qt-${Date.now()}-${tabCounter}`;
}

function createInitialQueryTab(): QueryTab {
  const id = generateTabId();
  return {
    id,
    title: "Query 1",
    content: "",
    results: null,
    isDirty: false,
    error: null,
    executionTimeMs: null,
    rowCount: null,
    isExecuting: false,
  };
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  savedConnections: [],
  recentConnections: [],
  loading: false,
  error: null,

  connectSqlite: async (path: string, name: string, group?: string) => {
    set({ loading: true, error: null });
    try {
      const info = await commands.connectSqlite({ path, name, group });
      const connectionId = info.id;
      const initialTab = createInitialQueryTab();
      const connectionTab: ConnectionTab = {
        connectionId,
        connectionInfo: info,
        queryTabs: [initialTab],
        activeQueryTabId: initialTab.id,
      };
      set((state) => ({
        connections: [...state.connections, connectionTab],
        activeConnectionId: connectionId,
        loading: false,
        error: null,
      }));
      get().addRecentConnection(info);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },

  connectPostgres: async (_config: PgConfig, _name: string, _group?: string) => {
    set({ error: "PostgreSQL connections are not yet supported (coming in Phase 6)." });
  },

  disconnect: async (connectionId: string) => {
    try {
      await commands.disconnect({ connection_id: connectionId });
    } catch {
      // Proceed with local cleanup even if backend call fails
    }
    set((state) => ({
      connections: state.connections.filter((c) => c.connectionId !== connectionId),
      activeConnectionId:
        state.activeConnectionId === connectionId
          ? state.connections.find((c) => c.connectionId !== connectionId)?.connectionId ?? null
          : state.activeConnectionId,
    }));
  },

  setActiveConnection: (connectionId: string) => {
    set({ activeConnectionId: connectionId });
  },

  addQueryTab: (connectionId: string) => {
    set((state) => {
      const updatedConnections = state.connections.map((conn) => {
        if (conn.connectionId !== connectionId) return conn;
        const num = conn.queryTabs.length + 1;
        const newTab: QueryTab = {
          id: generateTabId(),
          title: `Query ${num}`,
          content: "",
          results: null,
          isDirty: false,
          error: null,
          executionTimeMs: null,
          rowCount: null,
          isExecuting: false,
        };
        return {
          ...conn,
          queryTabs: [...conn.queryTabs, newTab],
          activeQueryTabId: newTab.id,
        };
      });
      return { connections: updatedConnections };
    });
  },

  closeQueryTab: (connectionId: string, tabId: string) => {
    set((state) => {
      const updatedConnections = state.connections.map((conn) => {
        if (conn.connectionId !== connectionId) return conn;
        const filteredTabs = conn.queryTabs.filter((t) => t.id !== tabId);
        if (filteredTabs.length === 0) {
          const newTab = createInitialQueryTab();
          return {
            ...conn,
            queryTabs: [newTab],
            activeQueryTabId: newTab.id,
          };
        }
        let newActiveId = conn.activeQueryTabId;
        if (newActiveId === tabId) {
          const idx = conn.queryTabs.findIndex((t) => t.id === tabId);
          newActiveId = filteredTabs[Math.min(idx, filteredTabs.length - 1)]?.id ?? filteredTabs[0].id;
        }
        return {
          ...conn,
          queryTabs: filteredTabs,
          activeQueryTabId: newActiveId,
        };
      });
      return { connections: updatedConnections };
    });
  },

  setActiveQueryTab: (connectionId: string, tabId: string) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.connectionId === connectionId
          ? { ...conn, activeQueryTabId: tabId }
          : conn,
      ),
    }));
  },

  updateQueryContent: (connectionId: string, tabId: string, content: string) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.connectionId === connectionId
          ? {
              ...conn,
              queryTabs: conn.queryTabs.map((tab) =>
                tab.id === tabId ? { ...tab, content, isDirty: true } : tab,
              ),
            }
          : conn,
      ),
    }));
  },

  setQueryResults: (connectionId: string, tabId: string, results: QueryResult | null) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.connectionId === connectionId
          ? {
              ...conn,
              queryTabs: conn.queryTabs.map((tab) =>
                tab.id === tabId
                  ? {
                      ...tab,
                      results,
                      rowCount: results?.total_row_count ?? results?.rows.length ?? null,
                      executionTimeMs: results?.execution_time_ms ?? null,
                      isDirty: false,
                      error: null,
                    }
                  : tab,
              ),
            }
          : conn,
      ),
    }));
  },

  setQueryError: (connectionId: string, tabId: string, error: string | null) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.connectionId === connectionId
          ? {
              ...conn,
              queryTabs: conn.queryTabs.map((tab) =>
                tab.id === tabId ? { ...tab, error, isExecuting: false } : tab,
              ),
            }
          : conn,
      ),
    }));
  },

  setQueryExecuting: (connectionId: string, tabId: string, executing: boolean) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.connectionId === connectionId
          ? {
              ...conn,
              queryTabs: conn.queryTabs.map((tab) =>
                tab.id === tabId ? { ...tab, isExecuting: executing } : tab,
              ),
            }
          : conn,
      ),
    }));
  },

  loadSavedConnections: async () => {
    try {
      const connections = await commands.listConnections({});
      set({ savedConnections: connections });
    } catch {
      // Silently fail
    }
  },

  addRecentConnection: (info: ConnectionInfo) => {
    set((state) => ({
      recentConnections: [
        info,
        ...state.recentConnections.filter((c) => c.id !== info.id),
      ].slice(0, 10),
    }));
  },

  executeQuery: async (connectionId: string, tabId: string, sql: string) => {
    const state = get();
    const conn = state.connections.find((c) => c.connectionId === connectionId);
    if (!conn) return;

    state.setQueryExecuting(connectionId, tabId, true);
    state.setQueryError(connectionId, tabId, null);

    try {
      const result = await commands.executeQuery({ connection_id: connectionId, sql });
      state.setQueryResults(connectionId, tabId, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      state.setQueryError(connectionId, tabId, message);
    } finally {
      state.setQueryExecuting(connectionId, tabId, false);
    }
  },
}));
