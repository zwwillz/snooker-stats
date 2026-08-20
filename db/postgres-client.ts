import postgres from "postgres";

type GlobalWithSql = typeof globalThis & {
  __snookerSql?: ReturnType<typeof postgres>;
};

export function createPostgresClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL 未配置，请在部署环境中设置 PostgreSQL 连接地址。");
  }

  const globalScope = globalThis as GlobalWithSql;

  if (!globalScope.__snookerSql) {
    globalScope.__snookerSql = postgres(databaseUrl, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
    });
  }

  return globalScope.__snookerSql;
}
