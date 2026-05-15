import { useUiStore } from "../../stores/ui-store";
import { useConnectionStore } from "../../stores/connection-store";
import { useSchemaStore } from "../../stores/schema-store";
import { useHistoryStore } from "../../stores/history-store";
import { useEffect } from "react";

export function Sidebar() {
  const { sidebarTab, setSidebarTab, sidebarWidth } = useUiStore();
  const { connections, activeConnectionId } = useConnectionStore();
  const { tables, loading: schemaLoading } = useSchemaStore();
  const { entries: historyEntries, loadHistory } = useHistoryStore();

  const activeConnection = connections.find((c) => c.connectionId === activeConnectionId);
  const currentTables = activeConnectionId ? tables[activeConnectionId] ?? null : null;

  // Load history when sidebar shows history tab
  useEffect(() => {
    if (sidebarTab === "history") {
      loadHistory();
    }
  }, [sidebarTab, loadHistory]);

  return (
    <aside
      className="flex flex-col border-r border-border bg-surface-1 overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => setSidebarTab("tables")}
          className={[
            "flex-1 h-9 text-xs font-medium transition-colors duration-150",
            sidebarTab === "tables"
              ? "text-text-primary border-b-2 border-b-accent bg-surface-2"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-1",
          ].join(" ")}
        >
          Tables
        </button>
        <button
          onClick={() => setSidebarTab("history")}
          className={[
            "flex-1 h-9 text-xs font-medium transition-colors duration-150",
            sidebarTab === "history"
              ? "text-text-primary border-b-2 border-b-accent bg-surface-2"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-1",
          ].join(" ")}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {sidebarTab === "tables" && renderTables()}
        {sidebarTab === "history" && renderHistory()}
      </div>
    </aside>
  );

  function renderTables() {
    if (!activeConnection) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-2.5 px-4">
          <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">Table browser — browse and search tables in your database.</p>
          <p className="text-xs text-text-muted">Connect to a database to see tables here.</p>
        </div>
      );
    }

    if (schemaLoading) {
      return <p className="text-xs text-text-muted">Loading tables...</p>;
    }

    if (!currentTables || currentTables.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-2.5 px-4">
          <p className="text-xs text-text-muted leading-relaxed">No tables found in this database.</p>
          <p className="text-xs text-text-muted">Create a table to see it appear here.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        {currentTables.map((table) => (
          <div
            key={table.name}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xs text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary cursor-pointer transition-colors"
            onClick={() => {
              // Select table for browsing (Phase 4)
            }}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <span className="truncate">{table.name}</span>
            <span className="ml-auto text-[10px] text-text-muted">{table.row_count ?? "?"}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderHistory() {
    if (!activeConnection) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-2.5 px-4">
          <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">Query history — review and re-run past queries.</p>
          <p className="text-xs text-text-muted">Connect to a database to see history here.</p>
        </div>
      );
    }

    if (historyEntries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-2.5 px-4">
          <p className="text-xs text-text-muted leading-relaxed">Query history — review and re-run past queries.</p>
          <p className="text-xs text-text-muted">Run a query to see it appear here.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {historyEntries.slice(0, 20).map((entry) => {
          const isError = entry.status.type === "error";
          return (
            <div
              key={entry.id}
              className="flex flex-col gap-1 px-2 py-1.5 rounded-xs text-xs cursor-pointer hover:bg-surface-2 transition-colors"
              onClick={() => {
                // Re-run this query (Phase 4)
              }}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isError ? "bg-semantic-danger" : "bg-semantic-success"}`} />
                <span className="truncate text-text-muted font-mono text-[10px]">{entry.sql.slice(0, 60)}{entry.sql.length > 60 ? "..." : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                <span>{new Date(entry.created_at).toLocaleTimeString()}</span>
                {entry.execution_time_ms != null && <span>{entry.execution_time_ms}ms</span>}
                {entry.row_count != null && <span>{entry.row_count} rows</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
