import { useConnectionStore } from "../../stores/connection-store";
import { Skeleton } from "../shared/Skeleton";

export function ResultPanel() {
  const { connections, activeConnectionId } = useConnectionStore();

  const activeConnection = connections.find((c) => c.connectionId === activeConnectionId);
  const activeTab = activeConnection?.queryTabs.find(
    (t) => t.id === activeConnection.activeQueryTabId,
  );

  // Empty state — no query has been run
  if (!activeTab || (!activeTab.results && !activeTab.isExecuting && !activeTab.error)) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1 border-t border-[var(--color-border)]">
        <div className="text-center px-6">
          <svg
            className="w-8 h-8 text-text-muted mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
            />
          </svg>
          <p className="text-sm text-text-muted">Run a query to see results</p>
          <p className="text-xs text-text-muted mt-1">
            Press <kbd className="px-1 py-0.5 rounded-xs bg-surface-2 border border-[var(--color-border)] text-xs font-mono">Cmd</kbd> +{" "}
            <kbd className="px-1 py-0.5 rounded-xs bg-surface-2 border border-[var(--color-border)] text-xs font-mono">Enter</kbd> to execute
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (activeTab.isExecuting) {
    return (
      <div className="flex-1 flex flex-col gap-2 p-4 bg-surface-1 border-t border-[var(--color-border)]">
        <Skeleton variant="row" className="mb-1" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
    );
  }

  // Error state
  if (activeTab.error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-1 border-t border-[var(--color-border)]">
        <div className="text-center px-6 max-w-md">
          <svg
            className="w-8 h-8 text-semantic-danger mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-semantic-danger font-medium">Query Error</p>
          <p className="text-xs text-text-muted mt-1 font-mono break-all">
            {activeTab.error}
          </p>
        </div>
      </div>
    );
  }

  // Results state (placeholder grid — full implementation in Phase 2)
  if (activeTab.results) {
    return (
      <div className="flex-1 flex flex-col bg-surface-1 border-t border-[var(--color-border)]">
        {/* Result toolbar */}
        <div className="flex items-center justify-between px-3 h-8 border-b border-[var(--color-border)] bg-surface-2">
          <span className="text-xs text-text-muted">
            {activeTab.results.rows.length} row{activeTab.results.rows.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-text-muted">
            {activeTab.results.execution_time_ms}ms
          </span>
        </div>

        {/* Placeholder for data grid (Phase 2) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-text-muted">
              Query returned {activeTab.results.rows.length} rows
            </p>
            <p className="text-xs text-text-muted mt-1">
              {activeTab.results.columns.length} column{activeTab.results.columns.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => {
                // Placeholder for future data grid
              }}
              className="mt-3 h-7 px-3 text-xs rounded-sm bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors"
            >
              View in grid (Phase 2)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
