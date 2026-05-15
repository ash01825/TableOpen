import { create } from "zustand";
import type { HistoryEntry } from "../types";
import * as commands from "../ipc/commands";

interface HistoryState {
  entries: HistoryEntry[];
  searchQuery: string;
  loading: boolean;
  error: string | null;

  loadHistory: () => Promise<void>;
  searchHistory: (query: string) => Promise<void>;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  searchQuery: "",
  loading: false,
  error: null,

  loadHistory: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await commands.getHistory({ limit: 50 });
      set({ entries, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },

  searchHistory: async (query: string) => {
    set({ searchQuery: query, loading: true, error: null });
    if (!query.trim()) {
      get().loadHistory();
      return;
    }
    try {
      const entries = await commands.searchHistory({ query });
      set({ entries, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: message });
    }
  },

  clearHistory: () => {
    set({ entries: [], searchQuery: "" });
  },
}));
