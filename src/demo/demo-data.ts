export interface DemoColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPk: boolean;
}

export interface DemoTable {
  name: string;
  schema: string;
  columns: DemoColumn[];
}

export interface DemoConnection {
  id: string;
  name: string;
  group: string;
  dbType: "postgres" | "sqlite";
  host: string;
  tables: DemoTable[];
}

type CellValue =
  | { type: "Null" }
  | { type: "Text"; value: string }
  | { type: "Integer"; value: number }
  | { type: "Float"; value: number }
  | { type: "Bool"; value: boolean };

export interface DemoQueryResult {
  columns: string[];
  columnTypes: string[];
  rows: CellValue[][];
  rowCount: number;
  executionTimeMs: number;
}

const usersColumns: DemoColumn[] = [
  { name: "id", type: "integer", nullable: false, isPk: true },
  { name: "email", type: "varchar(255)", nullable: false, isPk: false },
  { name: "name", type: "varchar(100)", nullable: false, isPk: false },
  { name: "role", type: "varchar(20)", nullable: false, isPk: false },
  { name: "last_login", type: "timestamptz", nullable: true, isPk: false },
  { name: "is_active", type: "boolean", nullable: false, isPk: false },
  { name: "login_count", type: "integer", nullable: false, isPk: false },
  { name: "avatar_url", type: "text", nullable: true, isPk: false },
];

const ordersColumns: DemoColumn[] = [
  { name: "id", type: "integer", nullable: false, isPk: true },
  { name: "user_id", type: "integer", nullable: false, isPk: false },
  { name: "status", type: "varchar(20)", nullable: false, isPk: false },
  { name: "total_cents", type: "integer", nullable: false, isPk: false },
  { name: "shipping_address", type: "text", nullable: true, isPk: false },
  { name: "created_at", type: "timestamptz", nullable: false, isPk: false },
];

const productsColumns: DemoColumn[] = [
  { name: "id", type: "integer", nullable: false, isPk: true },
  { name: "name", type: "varchar(200)", nullable: false, isPk: false },
  { name: "sku", type: "varchar(50)", nullable: false, isPk: false },
  { name: "price_cents", type: "integer", nullable: false, isPk: false },
  { name: "description", type: "text", nullable: true, isPk: false },
  { name: "inventory_count", type: "integer", nullable: false, isPk: false },
  { name: "is_published", type: "boolean", nullable: false, isPk: false },
];

export const demoConnection: DemoConnection = {
  id: "conn-prod-1",
  name: "Production DB",
  group: "Work",
  dbType: "postgres",
  host: "db.production.internal",
  tables: [
    {
      name: "users",
      schema: "public",
      columns: usersColumns,
    },
    {
      name: "user_sessions",
      schema: "public",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPk: true },
        { name: "user_id", type: "integer", nullable: false, isPk: false },
        { name: "token", type: "varchar(255)", nullable: false, isPk: false },
        { name: "ip_address", type: "inet", nullable: true, isPk: false },
        { name: "expires_at", type: "timestamptz", nullable: false, isPk: false },
      ],
    },
    {
      name: "orders",
      schema: "public",
      columns: ordersColumns,
    },
    {
      name: "order_items",
      schema: "public",
      columns: [
        { name: "id", type: "integer", nullable: false, isPk: true },
        { name: "order_id", type: "integer", nullable: false, isPk: false },
        { name: "product_id", type: "integer", nullable: false, isPk: false },
        { name: "quantity", type: "integer", nullable: false, isPk: false },
        { name: "unit_price_cents", type: "integer", nullable: false, isPk: false },
      ],
    },
    {
      name: "products",
      schema: "public",
      columns: productsColumns,
    },
    {
      name: "categories",
      schema: "public",
      columns: [
        { name: "id", type: "integer", nullable: false, isPk: true },
        { name: "name", type: "varchar(100)", nullable: false, isPk: false },
        { name: "slug", type: "varchar(100)", nullable: false, isPk: false },
        { name: "parent_id", type: "integer", nullable: true, isPk: false },
      ],
    },
    {
      name: "payments",
      schema: "billing",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPk: true },
        { name: "order_id", type: "integer", nullable: false, isPk: false },
        { name: "amount_cents", type: "integer", nullable: false, isPk: false },
        { name: "stripe_id", type: "varchar(255)", nullable: true, isPk: false },
        { name: "status", type: "varchar(20)", nullable: false, isPk: false },
        { name: "paid_at", type: "timestamptz", nullable: true, isPk: false },
      ],
    },
    {
      name: "subscriptions",
      schema: "billing",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPk: true },
        { name: "user_id", type: "integer", nullable: false, isPk: false },
        { name: "plan", type: "varchar(50)", nullable: false, isPk: false },
        { name: "status", type: "varchar(20)", nullable: false, isPk: false },
        { name: "current_period_end", type: "timestamptz", nullable: false, isPk: false },
      ],
    },
  ],
};

export const recentConnections: DemoConnection[] = [
  demoConnection,
  {
    id: "conn-staging-1",
    name: "Staging DB",
    group: "Work",
    dbType: "postgres",
    host: "db.staging.internal",
    tables: [],
  },
  {
    id: "conn-analytics-1",
    name: "Analytics DB",
    group: "Work",
    dbType: "postgres",
    host: "analytics-db.internal",
    tables: [],
  },
  {
    id: "conn-local-1",
    name: "Local Dev (SQLite)",
    group: "Personal",
    dbType: "sqlite",
    host: "~/dev/app.db",
    tables: [],
  },
];

function n(): CellValue {
  return { type: "Null" };
}

function t(value: string): CellValue {
  return { type: "Text", value };
}

function i(value: number): CellValue {
  return { type: "Integer", value };
}

function f(value: number): CellValue {
  return { type: "Float", value };
}

function b(value: boolean): CellValue {
  return { type: "Bool", value };
}

export const usersQueryResult: DemoQueryResult = {
  columns: usersColumns.map((c) => c.name),
  columnTypes: usersColumns.map((c) => c.type),
  rows: [
    [i(1), t("alex@company.com"), t("Alex Chen"), t("admin"), t("2026-05-15 08:42:13"), b(true), i(847), t("https://avatars.example.com/a1")],
    [i(2), t("maya@company.com"), t("Maya Patel"), t("editor"), t("2026-05-15 07:15:09"), b(true), i(312), n()],
    [i(3), t("james@company.com"), t("James Wilson"), t("viewer"), t("2026-05-14 22:03:45"), b(false), i(41), t("https://avatars.example.com/a3")],
    [i(4), t("sarah@company.com"), t("Sarah Kim"), t("editor"), n(), b(true), i(156), n()],
    [i(5), t("omar@company.com"), t("Omar Hassan"), t("admin"), t("2026-05-15 09:30:00"), b(true), i(1203), t("https://avatars.example.com/a5")],
    [i(6), t("lisa@company.com"), t("Lisa Zhang"), t("viewer"), t("2026-05-15 06:55:22"), b(true), i(89), n()],
    [i(7), t("daniel@company.com"), t("Daniel Brown"), t("editor"), t("2026-05-14 18:12:05"), b(true), i(267), t("https://avatars.example.com/a7")],
    [i(8), t("emma@company.com"), t("Emma Davis"), t("viewer"), t("2026-05-15 01:44:37"), b(true), i(23), n()],
    [i(9), t("raj@company.com"), t("Raj Malhotra"), t("admin"), t("2026-05-15 10:01:00"), b(true), i(564), t("https://avatars.example.com/a9")],
    [i(10), t("sophie@company.com"), t("Sophie Laurent"), t("viewer"), n(), b(false), i(7), n()],
    [i(11), t("michael@company.com"), t("Michael Torres"), t("editor"), t("2026-05-14 15:20:45"), b(true), i(198), n()],
    [i(12), t("anna@company.com"), t("Anna Nilsson"), t("admin"), t("2026-05-15 07:55:15"), b(true), i(432), t("https://avatars.example.com/a12")],
    [i(13), t("tom@company.com"), t("Tom Baker"), t("viewer"), n(), b(false), i(3), n()],
    [i(14), t("priya@company.com"), t("Priya Sharma"), t("editor"), t("2026-05-15 08:10:30"), b(true), i(201), t("https://avatars.example.com/a14")],
    [i(15), t("carlos@company.com"), t("Carlos Ruiz"), t("admin"), t("2026-05-15 09:45:00"), b(true), i(678), n()],
  ],
  rowCount: 15234,
  executionTimeMs: 34,
};

export const ordersQueryResult: DemoQueryResult = {
  columns: ordersColumns.map((c) => c.name),
  columnTypes: ordersColumns.map((c) => c.type),
  rows: [
    [i(1001), i(1), t("shipped"), i(4599), t("123 Main St, SF CA 94102"), t("2026-05-14 10:23:00")],
    [i(1002), i(4), t("processing"), i(12850), t("456 Oak Ave, Oakland CA 94607"), t("2026-05-14 14:05:00")],
    [i(1003), i(2), t("delivered"), i(3200), n(), t("2026-05-13 09:15:00")],
    [i(1004), i(7), t("shipped"), i(7800), t("789 Pine St, Berkeley CA 94704"), t("2026-05-15 08:42:00")],
    [i(1005), i(1), t("cancelled"), i(1650), t("123 Main St, SF CA 94102"), t("2026-05-15 11:20:00")],
    [i(1006), i(9), t("processing"), i(44900), t("321 Market St, SF CA 94105"), t("2026-05-15 12:01:00")],
    [i(1007), i(5), t("delivered"), i(9500), t("555 Elm St, San Jose CA 95112"), t("2026-05-12 16:45:00")],
    [i(1008), i(3), t("shipped"), i(2200), n(), t("2026-05-14 20:30:00")],
    [i(1009), i(11), t("delivered"), i(5600), t("88 First Ave, SF CA 94107"), t("2026-05-11 13:10:00")],
    [i(1010), i(6), t("processing"), i(31500), t("222 Divisadero, SF CA 94117"), t("2026-05-15 07:55:00")],
  ],
  rowCount: 4231,
  executionTimeMs: 28,
};
