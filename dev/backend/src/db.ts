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
  const [res] = await pool.execute(sql, params);
  return res as mysql.ResultSetHeader;
}
