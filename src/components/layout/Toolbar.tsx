import { useCallback } from "react";
import { useConnectionStore } from "../../stores/connection-store";

export function Toolbar() {
  const { connections, activeConnectionId, setActiveConnection, executeQuery } =
    useConnectionStore();

  const activeConnection = connections.find((c) => c.connectionId === activeConnectionId);
  const activeTab = activeConnection?.queryTabs.find(
    (t) => t.id === activeConnection.activeQueryTabId,
  );

  const handleRunQuery = useCallback(() => {
    if (!activeConnectionId || !activeTab) return;
    executeQuery(activeConnectionId, activeTab.id, activeTab.content);
  }, [activeConnectionId, activeTab, executeQuery]);

  return (
    <header
      className="flex items-center gap-2 px-3 border-b border-[var(--color-border)]"
      style={{ height: 36 }}
    >
      {/* Connection selector */}
      <div className="flex items-center gap-1">
        {connections.length > 0 ? (
          <select
            value={activeConnectionId ?? ""}
            onChange={(e) => setActiveConnection(e.target.value)}
            className="h-7 px-2 text-xs rounded-sm bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent hover:border-[var(--color-border)] appearance-none cursor-pointer transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-w-[160px]"
          >
            {connections.map((conn) => (
              <option key={conn.connectionId} value={conn.connectionId}>
                {conn.connectionInfo.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-text-muted px-2">No connection</span>
        )}
      </div>

      <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

      {/* Query tabs */}
      <div className="flex items-center flex-1 min-w-0 gap-0 overflow-x-auto">
        {activeConnection?.queryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => useConnectionStore.getState().setActiveQueryTab(activeConnection.connectionId, tab.id)}
            className={`
              flex items-center gap-1.5 h-7 px-3 text-xs whitespace-nowrap border-r border-[var(--color-border)]
              transition-colors
              ${
                tab.id === activeConnection.activeQueryTabId
                  ? "bg-surface-2 text-text-primary border-b-2 border-b-accent"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-1"
              }
            `}
          >
            {tab.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted flex-shrink-0" />
            )}
            <span className="truncate max-w-[120px]">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                useConnectionStore.getState().closeQueryTab(activeConnection.connectionId, tab.id);
              }}
              className="ml-1 w-3.5 h-3.5 flex items-center justify-center rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
              aria-label="Close tab"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </button>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleRunQuery}
          disabled={!activeTab || activeTab.isExecuting || !activeTab.content.trim()}
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-sm bg-accent text-accent-text hover:bg-accent-hover active:bg-accent-active transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Run query (Cmd+Enter)"
        >
          {activeTab?.isExecuting ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span>Run</span>
        </button>
      </div>
    </header>
  );
}
