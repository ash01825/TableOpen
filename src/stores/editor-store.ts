import { create } from "zustand";

type ExecutionState = "idle" | "running" | "error";

interface EditorState {
  activeContent: string;
  executionState: ExecutionState;
  serializedState: string | null;

  setContent: (content: string) => void;
  setExecuting: () => void;
  setError: () => void;
  setIdle: () => void;
  setSerializedState: (state: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeContent: "",
  executionState: "idle" as ExecutionState,
  serializedState: null,

  setContent: (content: string) => {
    set({ activeContent: content });
  },

  setExecuting: () => {
    set({ executionState: "running" });
  },

  setError: () => {
    set({ executionState: "error" });
  },

  setIdle: () => {
    set({ executionState: "idle" });
  },

  setSerializedState: (state: string | null) => {
    set({ serializedState: state });
  },
}));
