import { useCallback, useRef, useState } from "react";
import { useConnectionStore } from "../../stores/connection-store";
import { Input } from "../shared/Input";
import { Button } from "../shared/Button";
import { parseDatabaseUrl } from "../../lib/parse-database-url";
import type { PgConfig } from "../../types";

type FormMode = "select" | "sqlite" | "postgres";

export function ConnectionScreen() {
  const { recentConnections, connectSqlite, loading, error, savedConnections } = useConnectionStore();
  const [mode, setMode] = useState<FormMode>("select");
  const [sqlitePath, setSqlitePath] = useState("");
  const [sqliteName, setSqliteName] = useState("");
  const [sqliteGroup, setSqliteGroup] = useState("");

  const [pgHost, setPgHost] = useState("localhost");
  const [pgPort, setPgPort] = useState("5432");
  const [pgUser, setPgUser] = useState("");
  const [pgPassword, setPgPassword] = useState("");
  const [pgDatabase, setPgDatabase] = useState("");
  const [pgSslMode, setPgSslMode] = useState<"disable" | "prefer" | "require">("prefer");
  const [pgName, setPgName] = useState("");
  const [pgGroup, setPgGroup] = useState("");

  const [envImportError, setEnvImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSqliteConnect = useCallback(async () => {
    if (!sqlitePath || !sqliteName.trim()) return;
    await connectSqlite(sqlitePath, sqliteName.trim(), sqliteGroup.trim() || undefined);
  }, [sqlitePath, sqliteName, sqliteGroup, connectSqlite]);

  const handlePostgresConnect = useCallback(async () => {
    if (!pgName.trim() || !pgDatabase.trim()) return;
    const config: PgConfig = {
      host: pgHost,
      port: parseInt(pgPort, 10) || 5432,
      user: pgUser,
      password: pgPassword,
      database: pgDatabase,
      ssl_mode: pgSslMode,
    };
    // connectPostgres is a stub in Phase 1b — shows error
    const store = useConnectionStore.getState();
    await store.connectPostgres(config, pgName.trim(), pgGroup.trim() || undefined);
  }, [pgHost, pgPort, pgUser, pgPassword, pgDatabase, pgSslMode, pgName, pgGroup]);

  const handleReconnect = useCallback(
    async (info: typeof recentConnections[number]) => {
      if (info.db_type === "sqlite" && info.file_path) {
        await connectSqlite(info.file_path, info.name, info.group ?? undefined);
      } else if (info.db_type === "postgres" && info.pg_config) {
        const store = useConnectionStore.getState();
        await store.connectPostgres(info.pg_config, info.name, info.group ?? undefined);
      }
    },
    [connectSqlite],
  );

  const handleEnvImport = useCallback(async () => {
    setEnvImportError(null);
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...valParts] = trimmed.split("=");
        const value = valParts.join("=").trim();
        if (key.trim().toUpperCase() === "DATABASE_URL") {
          const parsed = parseDatabaseUrl(value);
          if (parsed) {
            setPgHost(parsed.host);
            setPgPort(String(parsed.port));
            setPgUser(parsed.user);
            setPgPassword(parsed.password);
            setPgDatabase(parsed.database);
            setPgSslMode(parsed.ssl_mode);
            setPgName(parsed.database || "postgres");
            setEnvImportError(null);
            return;
          }
        }
      }
      setEnvImportError("No valid DATABASE_URL found in clipboard");
    } catch {
      setEnvImportError("Could not read clipboard. Copy your DATABASE_URL and click the clipboard button.");
    }
  }, []);

  const handlePickFile = useCallback(async () => {
    try {
      // Use Tauri dialog if available, fallback to native file input
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3", "db3"] }],
      });
      if (selected) {
        setSqlitePath(selected);
        if (!sqliteName.trim()) {
          // Extract filename without extension as default name
          const parts = selected.replace(/\\/g, "/").split("/").pop()?.split(".") ?? [];
          setSqliteName(parts[0] || selected);
        }
      }
    } catch {
      // Fallback to native input if Tauri dialog fails (e.g. in browser dev mode)
      fileInputRef.current?.click();
    }
  }, [sqliteName]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In browser dev mode, just show the file name
      setSqlitePath(file.name);
      if (!sqliteName.trim()) {
        setSqliteName(file.name.replace(/\.[^.]+$/, ""));
      }
    }
  }, [sqliteName]);

  // Show connection screen when no active connection
  return (
    <div className="h-full w-full flex items-center justify-center bg-surface-0">
      <div className="w-full max-w-lg mx-auto px-8 py-12">
        {/* Logo / Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <svg className="w-7 h-7 text-accent-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-text-primary">TableOpen</h1>
          <p className="text-sm text-text-muted mt-1">Connect to a database to get started</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-md bg-[var(--color-danger-muted)] border border-[var(--color-danger)]">
            <p className="text-xs text-semantic-danger">{error}</p>
          </div>
        )}

        {/* Recent connections */}
        {recentConnections.length > 0 && mode === "select" && (
          <div className="mb-8">
            <h2 className="text-xs font-medium text-text-muted mb-3 uppercase tracking-wide">Recent</h2>
            <div className="flex flex-col gap-1">
              {recentConnections.map((conn) => (
                <button
                  key={conn.id}
                  onClick={() => handleReconnect(conn)}
                  className="flex items-center gap-3 w-full h-10 px-3 rounded-md text-left hover:bg-surface-2 transition-colors group"
                >
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-semantic-success" />
                  <span className="flex-1 text-sm text-text-primary truncate">{conn.name}</span>
                  <span className="text-xs text-text-muted">
                    {conn.db_type === "sqlite" ? "SQLite" : "PostgreSQL"}
                  </span>
                  <svg className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connection mode selector */}
        {mode === "select" && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-medium text-text-muted uppercase tracking-wide">New Connection</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setMode("sqlite")}
                className="flex-1 h-16 flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-surface-1 transition-colors text-sm text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                SQLite
              </button>
              <button
                onClick={() => setMode("postgres")}
                className="flex-1 h-16 flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-surface-1 transition-colors text-sm text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                PostgreSQL
              </button>
            </div>

            {savedConnections.length > 0 && (
              <>
                <h2 className="text-xs font-medium text-text-muted mt-6 uppercase tracking-wide">Saved</h2>
                <div className="flex flex-col gap-1">
                  {savedConnections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => handleReconnect(conn)}
                      className="flex items-center gap-3 w-full h-10 px-3 rounded-md text-left hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-semantic-success" />
                      <span className="flex-1 text-sm text-text-primary truncate">{conn.name}</span>
                      <span className="text-xs text-text-muted">{conn.db_type}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* SQLite form */}
        {mode === "sqlite" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode("select")}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors self-start"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-sm font-medium text-text-primary">Connect to SQLite</h2>

            <div>
              <button
                onClick={handlePickFile}
                className="w-full h-[44px] flex items-center justify-center gap-2 px-4 text-sm rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-surface-1 transition-colors text-text-secondary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {sqlitePath ? sqlitePath.split("/").pop() || sqlitePath : "Choose Database File"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.sqlite,.sqlite3,.db3"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            <Input
              label="Connection Name"
              placeholder="My Database"
              value={sqliteName}
              onChange={(e) => setSqliteName(e.target.value)}
            />
            <Input
              label="Group (optional)"
              placeholder="e.g. Work, Personal"
              value={sqliteGroup}
              onChange={(e) => setSqliteGroup(e.target.value)}
            />

            <Button
              onClick={handleSqliteConnect}
              loading={loading}
              disabled={!sqlitePath || !sqliteName.trim()}
              className="mt-2"
            >
              Connect
            </Button>
          </div>
        )}

        {/* PostgreSQL form */}
        {mode === "postgres" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode("select")}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors self-start"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-primary">Connect to PostgreSQL</h2>
              <button
                onClick={handleEnvImport}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                title="Import DATABASE_URL from clipboard"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Import .env
              </button>
            </div>

            {envImportError && (
              <p className="text-xs text-semantic-danger">{envImportError}</p>
            )}

            <Input
              label="Connection Name"
              placeholder="My Postgres"
              value={pgName}
              onChange={(e) => setPgName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Host"
                placeholder="localhost"
                value={pgHost}
                onChange={(e) => setPgHost(e.target.value)}
              />
              <Input
                label="Port"
                placeholder="5432"
                value={pgPort}
                onChange={(e) => setPgPort(e.target.value)}
              />
            </div>
            <Input
              label="Database"
              placeholder="mydb"
              value={pgDatabase}
              onChange={(e) => setPgDatabase(e.target.value)}
            />
            <Input
              label="Username"
              placeholder="user"
              value={pgUser}
              onChange={(e) => setPgUser(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={pgPassword}
              onChange={(e) => setPgPassword(e.target.value)}
            />
            <Input
              label="Group (optional)"
              placeholder="e.g. Production, Staging"
              value={pgGroup}
              onChange={(e) => setPgGroup(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-secondary font-medium">SSL Mode</label>
              <select
                value={pgSslMode}
                onChange={(e) => setPgSslMode(e.target.value as "disable" | "prefer" | "require")}
                className="h-[44px] px-3 text-sm rounded-md bg-surface-1 text-text-primary border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <option value="prefer">Prefer (default)</option>
                <option value="require">Require</option>
                <option value="disable">Disable</option>
              </select>
              <p className="text-xs text-text-muted">Encrypted connections coming in Phase 6</p>
            </div>

            <Button
              onClick={handlePostgresConnect}
              loading={loading}
              disabled={!pgName.trim() || !pgDatabase.trim()}
              className="mt-2"
            >
              Connect
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
