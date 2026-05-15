import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  demoConnection,
  recentConnections,
  usersQueryResult,
  ordersQueryResult,
  type DemoConnection,
  type DemoTable,
  type DemoQueryResult,
  type DemoColumn,
} from "./demo-data";

type CellValue =
  | { type: "Null" }
  | { type: "Text"; value: string }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "Bool"; value: boolean };

type View = "connections" | "workspace";

function cellToString(cell: CellValue): string {
  switch (cell.type) {
    case "Null":
      return "NULL";
    case "Text":
      return cell.value;
    case "Integer":
      return String(cell.value);
    case "Float":
      return cell.value.toFixed(2);
    case "Bool":
      return cell.value ? "true" : "false";
  }
}

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function RunIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ---------- Connection Screen ----------

function ConnectionScreen({ onConnect }: { onConnect: () => void }) {
  const [activeGroup, setActiveGroup] = useState<string | null>("Work");

  const groups = useMemo(() => {
    const map = new Map<string, DemoConnection[]>();
    for (const c of recentConnections) {
      const list = map.get(c.group) || [];
      list.push(c);
      map.set(c.group, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <h1 className="text-lg font-medium text-text-primary tracking-tight mb-1">TableOpen</h1>
        <p className="text-sm text-text-muted mb-8">Open-source database GUI</p>

        <div className="mb-6">
          <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Recent Connections</h2>
          <div className="space-y-1">
            {groups.map(([group, conns]) => (
              <div key={group}>
                <button
                  onClick={() => setActiveGroup(activeGroup === group ? null : group)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
                >
                  <span className={`transition-transform ${activeGroup === group ? "rotate-90" : ""}`}>
                    <ChevronDownIcon />
                  </span>
                  {group}
                </button>
                {activeGroup === group &&
                  conns.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={onConnect}
                      className="w-full flex items-center gap-3 px-6 py-2.5 rounded-lg hover:bg-surface-2 transition-colors text-left group"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${conn.dbType === "postgres" ? "bg-info" : "bg-warning"}`} />
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary font-medium truncate">{conn.name}</div>
                        <div className="text-xs text-text-muted truncate">{conn.host}</div>
                      </div>
                      <div className="ml-auto text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        {conn.dbType === "postgres" ? "PostgreSQL" : "SQLite"}
                      </div>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-sm text-text-secondary transition-colors">
            <PlusIcon />
            New Connection
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-sm text-text-secondary transition-colors">
            Import from .env
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Sidebar ----------

function Sidebar({
  connection,
  searchQuery,
  onSearchChange,
  selectedTable,
  onSelectTable,
}: {
  connection: DemoConnection;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTable: string | null;
  onSelectTable: (name: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"tables" | "history">("tables");
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(() => {
    const schemas = new Set(connection.tables.map((t) => t.schema));
    return schemas;
  });

  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return connection.tables;
    const q = searchQuery.toLowerCase();
    return connection.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.schema.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [connection.tables, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, DemoTable[]>();
    for (const t of filteredTables) {
      const list = map.get(t.schema) || [];
      list.push(t);
      map.set(t.schema, list);
    }
    return [...map.entries()];
  }, [filteredTables]);

  const toggleSchema = (schema: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(schema)) next.delete(schema);
      else next.add(schema);
      return next;
    });
  };

  return (
    <div className="w-64 h-full bg-surface-1 border-r border-border flex flex-col shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("tables")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === "tables"
              ? "text-text-primary border-b border-accent"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Tables
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === "history"
              ? "text-text-primary border-b border-accent"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          History
        </button>
      </div>

      {activeTab === "tables" && (
        <>
          {/* Search */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-2 border border-border">
              <SearchIcon />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tables..."
                className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted outline-none"
              />
            </div>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-y-auto">
            {grouped.map(([schema, tables]) => (
              <div key={schema}>
                <button
                  onClick={() => toggleSchema(schema)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors sticky top-0 bg-surface-1"
                >
                  <span className={`transition-transform ${expandedSchemas.has(schema) ? "rotate-90" : ""}`}>
                    <ChevronDownIcon />
                  </span>
                  {schema}
                  <span className="ml-auto text-text-muted/50">{tables.length}</span>
                </button>
                {expandedSchemas.has(schema) &&
                  tables.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => onSelectTable(table.name)}
                      className={`w-full flex items-center gap-2 px-6 py-1.5 text-xs transition-colors ${
                        selectedTable === table.name
                          ? "text-text-primary bg-accent-muted border-l-1.5 border-accent"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                      }`}
                    >
                      <TableIcon />
                      <span className="truncate">{table.name}</span>
                      <span className="ml-auto text-text-muted/40 text-[10px]">
                        {table.columns.length} cols
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-text-muted text-center">
            Query history appears here after execution.
            <br />
            Searchable by SQL content.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Toolbar ----------

function Toolbar({
  connection,
  onDisconnect,
  queryTabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
}: {
  connection: DemoConnection;
  onDisconnect: () => void;
  queryTabs: { id: string; title: string }[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
}) {
  return (
    <div className="h-9 bg-surface-1 border-b border-border flex items-center px-2 gap-1 shrink-0">
      {/* Connection badge */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs mr-2 shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${connection.dbType === "postgres" ? "bg-info" : "bg-warning"}`} />
        <span className="text-text-primary font-medium">{connection.name}</span>
        <span className="text-text-muted">{connection.host}</span>
      </div>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Query tabs */}
      <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
        {queryTabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-t-md text-xs cursor-pointer transition-colors shrink-0 ${
              tab.id === activeTabId
                ? "text-text-primary bg-surface-0 border-t border-l border-r border-border"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
            }`}
          >
            <span className="max-w-[120px] truncate">{tab.title}</span>
            {queryTabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="hover:text-text-primary transition-colors"
              >
                <XIcon />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onNewTab}
        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors ml-1"
        title="New query tab (Cmd+T)"
      >
        <PlusIcon />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        onClick={onDisconnect}
        className="text-xs text-text-muted hover:text-text-secondary px-2 transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}

// ---------- Status Bar ----------

function StatusBar({
  rowCount,
  executionTimeMs,
  queryText,
}: {
  rowCount: number | null;
  executionTimeMs: number | null;
  queryText: string;
}) {
  return (
    <div className="h-6 bg-accent-muted border-t border-border flex items-center px-3 gap-4 text-[11px] text-text-secondary shrink-0">
      {rowCount !== null && (
        <span>
          <span className="text-text-primary font-medium">{rowCount.toLocaleString()}</span> rows
        </span>
      )}
      {executionTimeMs !== null && (
        <span>
          <span className="text-text-primary font-medium">{executionTimeMs}ms</span>
        </span>
      )}
      <span className="ml-auto text-text-muted truncate max-w-[400px]">{queryText}</span>
      <span className="text-text-muted">PostgreSQL 16</span>
    </div>
  );
}

// ---------- Grid Cell ----------

function GridCell({
  value,
  colType,
  isEditing,
  editValue,
  onEditChange,
  onDoubleClick,
}: {
  value: CellValue;
  colType: string;
  isEditing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onDoubleClick: () => void;
}) {
  if (value.type === "Null") {
    return (
      <div
        className="h-7 px-3 flex items-center text-xs italic text-text-muted bg-[var(--color-null-bg)]"
        onDoubleClick={onDoubleClick}
        title="NULL"
      >
        NULL
      </div>
    );
  }

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => onEditChange(e.target.value)}
        className="h-7 px-3 bg-surface-0 border-1 border-accent outline-none text-xs text-text-primary w-full"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    );
  }

  const align =
    value.type === "Integer" || value.type === "Float" || colType === "integer" || colType.includes("int")
      ? "text-right"
      : "text-left";

  const display = value.type === "Bool" ? (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
        value.value ? "bg-success-muted text-success" : "bg-surface-2 text-text-muted"
      }`}
    >
      {value.value ? "true" : "false"}
    </span>
  ) : value.type === "Float" ? (
    value.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ) : value.type === "Integer" ? (
    value.value.toLocaleString()
  ) : (
    cellToString(value)
  );

  return (
    <div
      className={`h-7 px-3 flex items-center text-xs text-text-primary ${align} cursor-default`}
      onDoubleClick={onDoubleClick}
    >
      <span className="truncate">{display}</span>
    </div>
  );
}

// ---------- Grid ----------

function ResultGrid({
  result,
  columns,
}: {
  result: DemoQueryResult;
  columns: DemoColumn[];
}) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const startEdit = (row: number, col: number) => {
    const cell = result.rows[row][col];
    setEditingCell({ row, col });
    setEditValue(cell.type === "Null" ? "" : cellToString(cell));
  };

  useEffect(() => {
    if (editingCell) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setEditingCell(null);
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [editingCell]);

  return (
    <div className="flex-1 min-h-0 overflow-auto" ref={scrollRef}>
      <table className="border-collapse table-auto min-w-full">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="h-7 px-3 text-left text-[11px] font-medium text-text-muted bg-surface-2 border-b border-border w-12">
              #
            </th>
            {result.columns.map((name, i) => (
              <th
                key={name}
                className="h-7 px-3 text-left text-[11px] font-medium text-text-muted bg-surface-2 border-b border-border hover:text-text-secondary cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate">{name}</span>
                  <span className="text-text-muted/40 font-normal text-[10px]">{columns[i]?.type}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-surface-2/50 transition-colors"
            >
              <td className="h-7 px-3 text-right text-[11px] text-text-muted border-b border-border/50 tabular-nums select-none">
                {rowIdx + 1}
              </td>
              {row.map((cell, colIdx) => (
                <td
                  key={colIdx}
                  className={`border-b border-border/50 ${editingCell?.row === rowIdx && editingCell?.col === colIdx ? "p-0" : ""}`}
                >
                  <GridCell
                    value={cell}
                    colType={columns[colIdx]?.type || ""}
                    isEditing={editingCell?.row === rowIdx && editingCell?.col === colIdx}
                    editValue={editValue}
                    onEditChange={setEditValue}
                    onDoubleClick={() => startEdit(rowIdx, colIdx)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Editor ----------

function Editor({
  value,
  onChange,
  onRun,
  isExecuting,
  connected,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  isExecuting: boolean;
  connected: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onRun();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRun]);

  return (
    <div className="flex-1 min-h-0 flex flex-col border-b border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-1 border-b border-border shrink-0">
        <span className="text-[11px] text-text-muted font-medium">
          SQL Editor
          <span className="ml-2 text-text-muted/50">Cmd+Enter to run</span>
        </span>
        <button
          onClick={onRun}
          disabled={isExecuting || !value.trim()}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            isExecuting || !connected
              ? "bg-surface-2 text-text-muted cursor-not-allowed"
              : "bg-accent text-accent-text hover:bg-accent-hover active:scale-[0.98]"
          }`}
        >
          {isExecuting ? (
            <span className="w-3 h-3 border-1.5 border-text-muted border-t-transparent rounded-full animate-spin" />
          ) : (
            <RunIcon />
          )}
          {isExecuting ? "Running..." : "Run"}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Line numbers */}
        <div className="w-10 shrink-0 bg-surface-1 border-r border-border pt-3 select-none">
          {value.split("\n").map((_, i) => (
            <div key={i} className="h-5 flex items-center justify-end pr-2 text-[11px] text-text-muted/50 tabular-nums">
              {i + 1}
            </div>
          ))}
        </div>
        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-text-primary font-mono p-3 outline-none resize-none leading-5"
          placeholder="SELECT * FROM users WHERE is_active = true"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// ---------- Command Palette ----------

function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo(
    () => [
      { label: "Run Query", shortcut: "⌘↵" },
      { label: "New Query Tab", shortcut: "⌘T" },
      { label: "Close Tab", shortcut: "⌘W" },
      { label: "Toggle Sidebar", shortcut: "⌘\\" },
      { label: "Focus Editor", shortcut: "⌘L" },
      { label: "Export CSV", shortcut: "⌘⇧E" },
      { label: "New Connection", shortcut: "⌘N" },
      { label: "Toggle Theme", shortcut: "⌘⇧T" },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [query, actions]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[520px] rounded-xl bg-surface-1 border border-border shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.map((action) => (
            <div
              key={action.label}
              className="flex items-center justify-between px-4 py-2 text-sm text-text-primary hover:bg-surface-2 cursor-pointer transition-colors"
            >
              <span>{action.label}</span>
              <span className="text-xs text-text-muted">{action.shortcut}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-muted">No results</div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-text-muted">
          ↑↓ Navigate &nbsp; ↵ Select &nbsp; Esc Close
        </div>
      </div>
    </div>
  );
}

// ---------- Main Demo App ----------

export function DemoApp() {
  const [view, setView] = useState<View>("connections");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [result, setResult] = useState<DemoQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [queryTabs, setQueryTabs] = useState([{ id: "tab-1", title: "Query 1" }]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  let tabCounter = useRef(1);

  // Handle connect
  const handleConnect = useCallback(() => {
    setView("workspace");
    setSelectedTable(null);
    setEditorContent("");
    setResult(null);
    setSearchQuery("");
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    setView("connections");
    setResult(null);
    setEditorContent("");
  }, []);

  // Handle table select
  const handleSelectTable = useCallback(
    (name: string) => {
      setSelectedTable(name);
      setSearchQuery("");
      const query = `SELECT * FROM ${name} LIMIT 100`;
      setEditorContent(query);

      // Auto-run after selecting
      setIsExecuting(true);
      setTimeout(() => {
        if (name === "users") {
          setResult(usersQueryResult);
        } else if (name === "orders") {
          setResult(ordersQueryResult);
        } else {
          setResult(usersQueryResult);
        }
        setIsExecuting(false);
      }, 400);
    },
    []
  );

  // Handle run
  const handleRun = useCallback(() => {
    if (!editorContent.trim()) return;
    setIsExecuting(true);
    setResult(null);

    setTimeout(() => {
      const sql = editorContent.toLowerCase();
      if (sql.includes("orders")) {
        setResult(ordersQueryResult);
      } else {
        setResult(usersQueryResult);
      }
      setIsExecuting(false);
    }, 500);
  }, [editorContent]);

  // Handle new tab
  const handleNewTab = useCallback(() => {
    tabCounter.current += 1;
    const id = `tab-${tabCounter.current}`;
    setQueryTabs((prev) => [...prev, { id, title: `Query ${tabCounter.current}` }]);
    setActiveTabId(id);
    setEditorContent("");
    setResult(null);
  }, []);

  // Handle close tab
  const handleCloseTab = useCallback(
    (id: string) => {
      if (queryTabs.length <= 1) return;
      setQueryTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          setActiveTabId(next[0]?.id || "");
        }
        return next;
      });
    },
    [queryTabs, activeTabId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      if (mod && e.key === "t") {
        e.preventDefault();
        handleNewTab();
      }
      if (mod && e.key === "w") {
        e.preventDefault();
        if (queryTabs.length > 1) {
          handleCloseTab(activeTabId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewTab, handleCloseTab, activeTabId, queryTabs]);

  if (view === "connections" || !demoConnection) {
    return (
      <div className="h-screen w-screen bg-surface-0 text-text-primary font-sans overflow-hidden">
        <ConnectionScreen onConnect={handleConnect} />
      </div>
    );
  }

  const selectedTableData = demoConnection.tables.find((t) => t.name === selectedTable);

  return (
    <div className="h-screen w-screen bg-surface-0 text-text-primary font-sans overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        connection={demoConnection}
        onDisconnect={handleDisconnect}
        queryTabs={queryTabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
      />

      <div className="flex flex-1" style={{ height: "calc(100vh - 60px)" }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar
            connection={demoConnection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTable={selectedTable}
            onSelectTable={handleSelectTable}
          />
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Editor */}
          <div className="flex flex-col" style={{ height: sidebarOpen ? "45%" : "50%" }}>
            <Editor
              value={editorContent}
              onChange={setEditorContent}
              onRun={handleRun}
              isExecuting={isExecuting}
              connected={true}
            />
          </div>

          {/* Results */}
          <div className="flex-1 min-h-0 flex flex-col">
            {result ? (
              <ResultGrid result={result} columns={selectedTableData?.columns || usersQueryResult.columns.map((name) => ({
                name,
                type: "text",
                nullable: true,
                isPk: false,
              }))} />
            ) : isExecuting ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-text-muted">Executing query...</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-text-muted mb-1">No results yet</p>
                  <p className="text-xs text-text-muted/50">Write a query and press Cmd+Enter to run</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        rowCount={result?.rowCount ?? null}
        executionTimeMs={result?.executionTimeMs ?? null}
        queryText={editorContent}
      />

      {/* Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}
