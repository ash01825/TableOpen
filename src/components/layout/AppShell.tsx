import { useCallback } from "react";
import { Toolbar } from "./Toolbar";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { WorkspaceArea } from "../workspace/WorkspaceArea";
import { ConnectionScreen } from "../connection/ConnectionScreen";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { useConnectionStore } from "../../stores/connection-store";
import { useUiStore } from "../../stores/ui-store";
import { useAppKeyboardShortcuts } from "../../hooks/use-keyboard";

export function AppShell() {
  const { connections, activeConnectionId, addQueryTab } =
    useConnectionStore();
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUiStore();

  const activeConnection = connections.find((c) => c.connectionId === activeConnectionId);
  const activeTab = activeConnection?.queryTabs.find(
    (t) => t.id === activeConnection.activeQueryTabId,
  );

  const handleNewQueryTab = useCallback(() => {
    if (activeConnectionId) {
      addQueryTab(activeConnectionId);
    }
  }, [activeConnectionId, addQueryTab]);

  const handleCloseQueryTab = useCallback(() => {
    if (activeConnectionId && activeTab) {
      useConnectionStore.getState().closeQueryTab(activeConnectionId, activeTab.id);
    }
  }, [activeConnectionId, activeTab]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleNewConnection = useCallback(() => {
    if (connections.length > 0) {
      useConnectionStore.getState().disconnect(activeConnectionId!);
    }
  }, [activeConnectionId, connections.length]);

  const handleFocusEditor = useCallback(() => {
    const editorEl = document.querySelector("[data-monaco-editor]") as HTMLElement | null;
    editorEl?.focus();
  }, []);

  useAppKeyboardShortcuts({
    onNewQueryTab: handleNewQueryTab,
    onCloseQueryTab: handleCloseQueryTab,
    onToggleSidebar: handleToggleSidebar,
    onNewConnection: handleNewConnection,
    onFocusEditor: handleFocusEditor,
  });

  // Theme toggle button (usable from connection screen too)
  const themeBtn = (
    <button
      onClick={toggleTheme}
      className="fixed top-3 right-3 z-tooltip w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : theme === "light" ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );

  if (connections.length === 0) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-surface-0 text-text-primary font-sans">
        {themeBtn}
        <ConnectionScreen />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-0 text-text-primary font-sans">
      <div className="h-full w-full flex flex-col">
        <ErrorBoundary>
          <Toolbar />
        </ErrorBoundary>

        <div className="flex-1 flex min-h-0">
          {sidebarOpen && (
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <ErrorBoundary>
              <WorkspaceArea />
            </ErrorBoundary>
          </div>
        </div>

        <ErrorBoundary>
          <StatusBar />
        </ErrorBoundary>
      </div>
    </div>
  );
}
