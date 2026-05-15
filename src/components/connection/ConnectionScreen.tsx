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
    const store = useConnectionStore.getState();
    await store.connectPostgres(config, pgName.trim(), pgGroup.trim() || undefined);
  }, [pgHost, pgPort, pgUser, pgPassword, pgDatabase, pgSslMode, pgName, pgGroup]);

  const handleReconnect = useCallback(
    async (info: (typeof recentConnections)[number]) => {
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
      setEnvImportError("Could not read clipboard. Copy your DATABASE_URL and try again.");
    }
  }, []);

  const handlePickFile = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3", "db3"] }],
      });
      if (selected) {
        setSqlitePath(selected);
        if (!sqliteName.trim()) {
          const parts = selected.replace(/\\/g, "/").split("/").pop()?.split(".") ?? [];
          setSqliteName(parts[0] || selected);
        }
      }
    } catch {
      fileInputRef.current?.click();
    }
  }, [sqliteName]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSqlitePath(file.name);
        if (!sqliteName.trim()) {
          setSqliteName(file.name.replace(/\.[^.]+$/, ""));
        }
      }
    },
    [sqliteName],
  );

  return (
    <div className="h-full w-full flex items-center justify-center select-none">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-5">
            <div className="w-14 h-14 rounded-[14px] bg-accent flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_-4px_rgba(0,0,0,0.4)]">
              <svg className="w-8 h-8 text-accent-text" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="7" cy="8" r="1" fill="currentColor" />
                <circle cx="10" cy="8" r="1" fill="currentColor" />
              </svg>
            </div>
          </div>
          <h1 className="text-[17px] font-semibold text-text-primary tracking-tight">TableOpen</h1>
          <p className="text-[13px] text-text-muted mt-1 leading-relaxed">
            Connect a database to get started
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-3.5 py-2.5 rounded-lg bg-[var(--color-danger-muted)] border border-[var(--color-danger)]/30">
            <p className="text-[13px] text-semantic-danger">{error}</p>
          </div>
        )}

        {/* Recent Connections */}
        {recentConnections.length > 0 && mode === "select" && (
          <div className="mb-7">
            <p className="text-[11px] font-medium text-text-muted mb-2.5 tracking-wide uppercase">
              Recent
            </p>
            <div className="flex flex-col gap-1">
              {recentConnections.map((conn) => (
                <button
                  key={conn.id}
                  onClick={() => handleReconnect(conn)}
                  className="group flex items-center gap-3 w-full h-9 px-3 rounded-lg text-left hover:bg-surface-2 transition-all duration-150"
                >
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-semantic-success" />
                  <span className="flex-1 text-[13px] text-text-primary truncate">{conn.name}</span>
                  <span className="text-[11px] text-text-muted font-medium">
                    {conn.db_type === "sqlite" ? "SQLite" : "PG"}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity -ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* New Connection */}
        {mode === "select" && (
          <div>
            <p className="text-[11px] font-medium text-text-muted mb-2.5 tracking-wide uppercase">
              New Connection
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMode("sqlite")}
                className="group flex items-center gap-3 h-12 px-4 rounded-xl border border-border hover:border-border-strong hover:bg-surface-1 transition-all duration-150"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-2 group-hover:bg-surface-3 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-text-primary font-medium">SQLite</p>
                  <p className="text-[11px] text-text-muted">Connect to a local database file</p>
                </div>
                <svg className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => setMode("postgres")}
                className="group flex items-center gap-3 h-12 px-4 rounded-xl border border-border hover:border-border-strong hover:bg-surface-1 transition-all duration-150"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-2 group-hover:bg-surface-3 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-text-primary font-medium">PostgreSQL</p>
                  <p className="text-[11px] text-text-muted">Connect to a remote or local server</p>
                </div>
                <svg className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {savedConnections.length > 0 && (
              <div className="mt-7">
                <p className="text-[11px] font-medium text-text-muted mb-2.5 tracking-wide uppercase">
                  Saved
                </p>
                <div className="flex flex-col gap-1">
                  {savedConnections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => handleReconnect(conn)}
                      className="flex items-center gap-3 w-full h-9 px-3 rounded-lg text-left hover:bg-surface-2 transition-all"
                    >
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-semantic-success" />
                      <span className="flex-1 text-[13px] text-text-primary truncate">{conn.name}</span>
                      <span className="text-[11px] text-text-muted font-medium">{conn.db_type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SQLite Form */}
        {mode === "sqlite" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode("select")}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors self-start h-8"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-sm font-semibold text-text-primary tracking-tight">Connect to SQLite</h2>

            <div>
              <button
                onClick={handlePickFile}
                className="w-full h-11 flex items-center justify-center gap-2 px-4 text-sm rounded-lg border border-border hover:border-border-strong hover:bg-surface-1 transition-all text-text-secondary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {sqlitePath ? sqlitePath.split("/").pop() || sqlitePath : "Choose Database File"}
              </button>
              <input ref={fileInputRef} type="file" accept=".db,.sqlite,.sqlite3,.db3" className="hidden" onChange={handleFileInputChange} />
            </div>

            <Input label="Connection Name" placeholder="My Database" value={sqliteName} onChange={(e) => setSqliteName(e.target.value)} />
            <Input label="Group (optional)" placeholder="e.g. Work, Personal" value={sqliteGroup} onChange={(e) => setSqliteGroup(e.target.value)} />
            <Button onClick={handleSqliteConnect} loading={loading} disabled={!sqlitePath || !sqliteName.trim()} className="mt-1">
              Connect
            </Button>
          </div>
        )}

        {/* PostgreSQL Form */}
        {mode === "postgres" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode("select")}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors self-start h-8"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary tracking-tight">Connect to PostgreSQL</h2>
              <button
                onClick={handleEnvImport}
                className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors h-7 px-2 rounded-md hover:bg-surface-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Import .env
              </button>
            </div>
            {envImportError && <p className="text-xs text-semantic-danger">{envImportError}</p>}

            <Input label="Connection Name" placeholder="My Postgres" value={pgName} onChange={(e) => setPgName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Host" placeholder="localhost" value={pgHost} onChange={(e) => setPgHost(e.target.value)} />
              <Input label="Port" placeholder="5432" value={pgPort} onChange={(e) => setPgPort(e.target.value)} />
            </div>
            <Input label="Database" placeholder="mydb" value={pgDatabase} onChange={(e) => setPgDatabase(e.target.value)} />
            <Input label="Username" placeholder="user" value={pgUser} onChange={(e) => setPgUser(e.target.value)} />
            <Input label="Password" type="password" placeholder="Enter password" value={pgPassword} onChange={(e) => setPgPassword(e.target.value)} />
            <Input label="Group (optional)" placeholder="e.g. Production, Staging" value={pgGroup} onChange={(e) => setPgGroup(e.target.value)} />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-secondary font-medium">SSL Mode</label>
              <select
                value={pgSslMode}
                onChange={(e) => setPgSslMode(e.target.value as "disable" | "prefer" | "require")}
                className="h-11 px-3 text-sm rounded-lg bg-surface-1 text-text-primary border border-border hover:border-border-strong transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent appearance-none"
              >
                <option value="prefer">Prefer (default)</option>
                <option value="require">Require</option>
                <option value="disable">Disable</option>
              </select>
              <p className="text-[11px] text-text-muted">Encrypted connections coming in Phase 6</p>
            </div>

            <Button onClick={handlePostgresConnect} loading={loading} disabled={!pgName.trim() || !pgDatabase.trim()} className="mt-1">
              Connect
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
