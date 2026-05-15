import type { PgConfig } from "../types";

/**
 * Parse a PostgreSQL DATABASE_URL (e.g. postgres://user:password@host:port/database?sslmode=require)
 * Returns null if the URL cannot be parsed or doesn't match the postgres:// pattern.
 */
export function parseDatabaseUrl(url: string): PgConfig | null {
  try {
    const trimmed = url.trim();

    // Support both postgres:// and postgresql:// schemes
    if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
      return null;
    }

    const parsed = new URL(trimmed);

    const host = parsed.hostname || "localhost";
    const portStr = parsed.port || "5432";
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return null;
    }

    const user = decodeURIComponent(parsed.username || "");
    const password = decodeURIComponent(parsed.password || "");
    const database = parsed.pathname.replace(/^\//, "") || "";

    const sslModeParam = parsed.searchParams.get("sslmode") || parsed.searchParams.get("ssl");
    let ssl_mode: "disable" | "prefer" | "require" = "prefer";

    if (sslModeParam === "disable" || sslModeParam === "0" || sslModeParam === "false") {
      ssl_mode = "disable";
    } else if (sslModeParam === "require" || sslModeParam === "1" || sslModeParam === "true") {
      ssl_mode = "require";
    } else if (sslModeParam === "prefer") {
      ssl_mode = "prefer";
    }

    return {
      host,
      port,
      user,
      password,
      database,
      ssl_mode,
    };
  } catch {
    return null;
  }
}
