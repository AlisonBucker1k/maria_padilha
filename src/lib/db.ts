import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function getDbConfig(): mysql.PoolOptions {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !password || !database) {
    throw new Error(
      "Variáveis DB_HOST, DB_USER, DB_PASSWORD e DB_NAME são obrigatórias no .env.local.",
    );
  }

  return {
    host,
    port: Number(process.env.DB_PORT ?? 3306),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
  };
}

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }

  return pool;
}
