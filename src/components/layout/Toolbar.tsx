import { useCallback } from "react";
import { useConnectionStore } from "../../stores/connection-store";
import { useUiStore } from "../../stores/ui-store";

export function Toolbar() {
  const { connections, activeConnectionId, setActiveConnection, executeQuery } =
    useConnectionStore();
  const { theme, toggleTheme } = useUiStore();

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

      {/* Spacer */}
      <div className="flex-1" />

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

        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-7 h-7 rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
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
      </div>
    </header>
  );
}
