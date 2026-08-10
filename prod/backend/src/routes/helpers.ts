import { Request, Response, NextFunction, RequestHandler } from 'express';

export function ok(res: Response, data: any = null): void {
  res.json({ code: 0, data });
}

export function fail(res: Response, msg: string, status = 400): void {
  res.status(status).json({ code: 1, msg });
}

/** 包装异步路由，统一错误处理 */
export const ah =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export function int(v: any): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
