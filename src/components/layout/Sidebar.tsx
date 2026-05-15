import { useUiStore } from "../../stores/ui-store";
import { useConnectionStore } from "../../stores/connection-store";

export function Sidebar() {
  const { sidebarTab, setSidebarTab, sidebarWidth } = useUiStore();
  const { connections, activeConnectionId } = useConnectionStore();

  const activeConnection = connections.find((c) => c.connectionId === activeConnectionId);

  return (
    <aside
      className="flex flex-col border-r border-[var(--color-border)] bg-surface-1 overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border)] flex-shrink-0">
        <button
          onClick={() => setSidebarTab("tables")}
          className={`
            flex-1 h-9 text-xs font-medium transition-colors
            ${
              sidebarTab === "tables"
                ? "text-text-primary border-b-2 border-b-accent bg-surface-2"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-1"
            }
          `}
        >
          Tables
        </button>
        <button
          onClick={() => setSidebarTab("history")}
          className={`
            flex-1 h-9 text-xs font-medium transition-colors
            ${
              sidebarTab === "history"
                ? "text-text-primary border-b-2 border-b-accent bg-surface-2"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-1"
            }
          `}
        >
          History
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-3">
        {sidebarTab === "tables" && (
          <TablesContent hasConnection={!!activeConnection} />
        )}
        {sidebarTab === "history" && <HistoryContent />}
      </div>
    </aside>
  );
}

function TablesContent({ hasConnection }: { hasConnection: boolean }) {
  if (!hasConnection) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <svg
          className="w-8 h-8 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
        <p className="text-xs text-text-muted">Connect to a database to browse tables</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">Tables will appear here once the schema is loaded.</p>
    </div>
  );
}

function HistoryContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-2">
      <svg
        className="w-8 h-8 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-xs text-text-muted">Query history will appear here</p>
    </div>
  );
}
