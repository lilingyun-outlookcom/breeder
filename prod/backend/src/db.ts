import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { config } from './config';

export const pool: mysql.Pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true, // DATETIME/DATE 直接返回字符串，避免时区转换
});

/** 幂等迁移：确保表中存在指定列（兼容线上老库，CREATE TABLE IF NOT EXISTS 不会改老表） */
async function ensureColumn(table: string, column: string, ddl: string): Promise<void> {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?',
    [table, column]
  );
  if ((rows as any)[0].c === 0) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

/** 读取 schema.sql 并按语句拆分执行（仅执行 CREATE TABLE IF NOT EXISTS，可重复运行） */
export async function initSchema(): Promise<void> {
  const file = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const statements = sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--')) // 去掉注释行
    .join('\n')
    .split(';\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
  } finally {
    conn.release();
  }

  // 老表增量迁移（列名/DDL 均为代码内常量，无注入风险）
  const migrations: [string, string, string][] = [
    ['animals', 'total', 'total INT NOT NULL DEFAULT 1'],
    ['feeds', 'stock', 'stock DECIMAL(12,2) NOT NULL DEFAULT 0'],
    ['medicines', 'stock', 'stock DECIMAL(12,2) NOT NULL DEFAULT 0'],
    ['treatment_plans', 'quantity', 'quantity INT NOT NULL DEFAULT 1'],
    ['medication_records', 'quantity', 'quantity DECIMAL(10,2) NULL'],
  ];
  for (const [table, column, ddl] of migrations) {
    await ensureColumn(table, column, ddl);
  }
}

/** 通用查询助手 */
export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function qOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows.length ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const idx = params.findIndex((v) => v === undefined);
  if (idx >= 0) {
    throw new Error(`execute: params[${idx}] undefined | sql: ${sql.slice(0, 160)} | params: ${JSON.stringify(params)}`);
  }
  const [res] = await pool.execute(sql, params);
  return res as mysql.ResultSetHeader;
}
