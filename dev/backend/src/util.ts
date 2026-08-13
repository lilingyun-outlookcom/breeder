// 时间工具：所有业务时间统一按北京时间(Asia/Shanghai)处理。
// 系统时区在部署时配置为 Asia/Shanghai，new Date() 即北京时间。
function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function cnDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function cnDateTimeStr(d: Date = new Date()): string {
  return `${cnDateStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function cnTimeStr(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 当前时间字符串(与 MySQL DATETIME 同格式，可直接用于 SQL 比较) */
export function nowStr(): string {
  return cnDateTimeStr();
}

export function todayStr(): string {
  return cnDateStr();
}

/** 日期字符串 + n 天，返回 YYYY-MM-DD */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return cnDateStr(d);
}

/** [start, end] 闭区间内的所有日期 */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 10000) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

/** haversine 距离，单位 米 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
