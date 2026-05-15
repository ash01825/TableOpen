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

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleNewConnection = useCallback(() => {
    // If there's an active connection, disconnect. If not, do nothing (shown by default)
    if (connections.length > 0) {
      useConnectionStore.getState().disconnect(activeConnectionId!);
    }
  }, [activeConnectionId, connections.length]);

  const handleFocusEditor = useCallback(() => {
    // Focus is handled by Monaco's onMount — trigger by clicking the editor area
    const editorEl = document.querySelector("[data-monaco-editor]") as HTMLElement | null;
    editorEl?.focus();
  }, []);

  // Register global keyboard shortcuts
  // Cmd+Enter is NOT registered here — EditorPanel handles it directly
  useAppKeyboardShortcuts({
    onNewQueryTab: handleNewQueryTab,
    onCloseQueryTab: handleCloseQueryTab,
    onToggleSidebar: handleToggleSidebar,
    onNewConnection: handleNewConnection,
    onFocusEditor: handleFocusEditor,
  });

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
