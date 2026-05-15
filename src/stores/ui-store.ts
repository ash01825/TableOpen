import { create } from "zustand";

type Theme = "dark" | "light" | "system";
type SidebarTab = "tables" | "history";

interface UiState {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  editorPanelSize: number; // percentage of vertical split (editor vs results)

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  setEditorPanelSize: (size: number) => void;
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "dark" | "light") {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(resolved);
}

export const useUiStore = create<UiState>((set, get) => {
  const initialTheme = (localStorage.getItem("tableopen-theme") as Theme) || "dark";
  const initialResolved = initialTheme === "system" ? getSystemTheme() : initialTheme;
  applyTheme(initialResolved);

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,
    sidebarOpen: true,
    sidebarTab: "tables" as SidebarTab,
    sidebarWidth: 240,
    editorPanelSize: 60,

    toggleTheme: () => {
      const current = get().theme;
      const next: Theme = current === "dark" ? "light" : current === "light" ? "system" : "dark";
      const resolved = next === "system" ? getSystemTheme() : next;
      applyTheme(resolved);
      localStorage.setItem("tableopen-theme", next);
      set({ theme: next, resolvedTheme: resolved });
    },

    setTheme: (theme: Theme) => {
      const resolved = theme === "system" ? getSystemTheme() : theme;
      applyTheme(resolved);
      localStorage.setItem("tableopen-theme", theme);
      set({ theme, resolvedTheme: resolved });
    },

    toggleSidebar: () => {
      set((state) => ({ sidebarOpen: !state.sidebarOpen }));
    },

    setSidebarOpen: (open: boolean) => {
      set({ sidebarOpen: open });
    },

    setSidebarTab: (tab: SidebarTab) => {
      set({ sidebarTab: tab });
    },

    setSidebarWidth: (width: number) => {
      set({ sidebarWidth: Math.max(180, Math.min(400, width)) });
    },

    setEditorPanelSize: (size: number) => {
      set({ editorPanelSize: Math.max(20, Math.min(80, size)) });
    },
  };
});
