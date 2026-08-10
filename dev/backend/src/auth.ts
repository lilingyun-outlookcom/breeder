import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { config } from './config';

export interface AuthUser {
  id: number;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function hashPwd(pwd: string): string {
  return bcrypt.hashSync(pwd, 10);
}

export function checkPwd(pwd: string, hash: string): boolean {
  return bcrypt.compareSync(pwd, hash);
}

export function signToken(user: { id: number; role: string; name: string }): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) {
    res.status(401).json({ code: 1, msg: '未登录' });
    return;
  }
  try {
    const d = jwt.verify(t, config.jwtSecret) as AuthUser;
    req.user = d;
    next();
  } catch {
    res.status(401).json({ code: 1, msg: '登录已过期，请重新登录' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: 1, msg: '未登录' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ code: 1, msg: '无权限执行此操作' });
      return;
    }
    next();
  };
}
