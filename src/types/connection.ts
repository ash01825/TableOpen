export type DbType = "sqlite" | "postgres";

export type SslMode = "disable" | "prefer" | "require";

export interface PgConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl_mode: SslMode;
}

export interface ConnectionInfo {
  id: string;
  name: string;
  db_type: DbType;
  group: string | null;
  file_path: string | null;
  pg_config: PgConfig | null;
  last_used_at: string | null;
}
