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
  const { connections, activeConnectionId, addQueryTab, executeQuery } =
    useConnectionStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();

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

  const handleExecuteQuery = useCallback(() => {
    if (activeConnectionId && activeTab) {
      executeQuery(activeConnectionId, activeTab.id, activeTab.content);
    }
  }, [activeConnectionId, activeTab, executeQuery]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  // Register global keyboard shortcuts
  useAppKeyboardShortcuts({
    onNewQueryTab: handleNewQueryTab,
    onCloseQueryTab: handleCloseQueryTab,
    onExecuteQuery: handleExecuteQuery,
    onToggleSidebar: handleToggleSidebar,
  });

  // If no connections exist, show the connection screen
  if (connections.length === 0) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-surface-0 text-text-primary font-sans">
        <ConnectionScreen />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-0 text-text-primary font-sans">
      <div className="h-full w-full flex flex-col">
        {/* Toolbar */}
        <ErrorBoundary>
          <Toolbar />
        </ErrorBoundary>

        {/* Main area: sidebar + editor/results */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          {sidebarOpen && (
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
          )}

          {/* Editor + Results */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <ErrorBoundary>
              <WorkspaceArea />
            </ErrorBoundary>
          </div>
        </div>

        {/* Status bar */}
        <ErrorBoundary>
          <StatusBar />
        </ErrorBoundary>
      </div>
    </div>
  );
}
