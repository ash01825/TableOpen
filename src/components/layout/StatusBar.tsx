import { useConnectionStore } from "../../stores/connection-store";

export function StatusBar() {
  const { connections, activeConnectionId } = useConnectionStore();

  const activeConnection = connections.find((c) => c.connectionId === activeConnectionId);
  const activeTab = activeConnection?.queryTabs.find(
    (t) => t.id === activeConnection.activeQueryTabId,
  );

  return (
    <footer
      className="flex items-center justify-between px-3 border-t border-[var(--color-border)] bg-surface-1"
      style={{ height: 24 }}
    >
      {/* Left side: connection info */}
      <div className="flex items-center gap-2">
        {activeConnection ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-semantic-success" />
              <span className="text-xs text-text-muted">{activeConnection.connectionInfo.name}</span>
              {activeConnection.connectionInfo.db_type === "sqlite" && (
                <span className="text-xs text-text-muted">SQLite</span>
              )}
              {activeConnection.connectionInfo.db_type === "postgres" && (
                <span className="text-xs text-text-muted">PostgreSQL</span>
              )}
            </span>
          </>
        ) : (
          <span className="text-xs text-text-muted">No active connection</span>
        )}
      </div>

      {/* Right side: query info */}
      <div className="flex items-center gap-3">
        {activeTab?.isExecuting && (
          <span className="text-xs text-accent">Running...</span>
        )}
        {activeTab?.error && (
          <span className="text-xs text-semantic-danger">Error</span>
        )}
        {activeTab?.rowCount !== null && activeTab?.rowCount !== undefined && !activeTab.isExecuting && (
          <span className="text-xs text-text-muted">
            {activeTab.rowCount} row{activeTab.rowCount !== 1 ? "s" : ""}
          </span>
        )}
        {activeTab?.executionTimeMs !== null && activeTab?.executionTimeMs !== undefined && !activeTab.isExecuting && (
          <span className="text-xs text-text-muted">
            {activeTab.executionTimeMs}ms
          </span>
        )}
      </div>
    </footer>
  );
}
