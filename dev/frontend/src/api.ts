const BASE = import.meta.env.BASE_URL || '/'; // '/dev/' 或 '/prod/'
export const API_BASE = BASE.replace(/\/$/, '') + '/api';

// dev/prod 同域不同路径：localStorage 按 origin 共享，登录态必须按环境加前缀隔离，
// 否则 prod 登录会覆盖 dev 的登录态（反之亦然）
const ENV_PREFIX = BASE.replace(/[/-]/g, '') || 'app'; // dev | prod
export const TOKEN_KEY = `token_${ENV_PREFIX}`;
export const USER_KEY = `user_${ENV_PREFIX}`;

/** 读取带环境前缀的存储值；兼容旧版无前缀 key（单环境时期），读取后自动迁移并清理 */
export function readScoped(key: string): string | null {
  const scoped = localStorage.getItem(`${key}_${ENV_PREFIX}`);
  if (scoped !== null) return scoped;
  const legacy = localStorage.getItem(key);
  if (legacy !== null) {
    localStorage.setItem(`${key}_${ENV_PREFIX}`, legacy);
    localStorage.removeItem(key);
    return legacy;
  }
  return null;
}

/** 把后端返回的相对 URL（如 /uploads/xxx.jpg）转成带环境前缀的完整路径 */
export function assetUrl(u: string | null | undefined): string {
  if (!u) return '';
  if (/^https?:\/\//.test(u)) return u;
  return BASE.replace(/\/$/, '') + (u.startsWith('/') ? u : '/' + u);
}

export class ApiError extends Error {
  code: number;
  constructor(code: number, msg: string) {
    super(msg);
    this.code = code;
  }
}

let token = readScoped('token') || '';

export function setToken(t: string) {
  token = t;
  localStorage.setItem(TOKEN_KEY, t);
}
export function getToken() {
  return token;
}
export function clearToken() {
  token = '';
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // 清理历史遗留的无前缀 key
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function request(method: string, url: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts: RequestInit = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + url, opts);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (res.status === 401 && !url.startsWith('/auth/login')) {
    clearToken();
    location.hash = '#/login';
    throw new ApiError(401, '登录已过期');
  }
  if (res.status === 403) {
    throw new ApiError(403, data?.msg || '无权限');
  }
  if (data === null || data.code !== 0) {
    throw new ApiError(res.status, data?.msg || `请求失败(${res.status})`);
  }
  return data.data;
}

export const api = {
  get: (url: string) => request('GET', url),
  post: (url: string, body?: any) => request('POST', url, body),
  put: (url: string, body?: any) => request('PUT', url, body),
  del: (url: string) => request('DELETE', url),
  qs: (obj: Record<string, any>) => {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
    });
    const s = p.toString();
    return s ? '?' + s : '';
  },
};

export async function uploadFiles(files: File[]): Promise<string[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE + '/upload', { method: 'POST', headers, body: fd });
  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new ApiError(res.status, data?.msg || '上传失败');
  }
  return data.data.urls;
}
