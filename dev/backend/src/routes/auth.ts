import { Router } from 'express';
import { q, qOne } from '../db';
import { checkPwd, hashPwd, signToken, requireAuth } from '../auth';
import { ok, fail, ah } from './helpers';
import { nowStr } from '../util';

const router = Router();

// 登录
router.post(
  '/login',
  ah(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return fail(res, '请输入用户名和密码');
    const user = await qOne<any>('SELECT * FROM users WHERE username=? AND status=1', [username]);
    if (!user || !checkPwd(password, user.password)) return fail(res, '用户名或密码错误');
    const token = signToken({ id: user.id, role: user.role, name: user.name });
    ok(res, {
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone },
    });
  })
);

// 当前登录用户
router.get(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const user = await qOne<any>('SELECT id,username,name,role,phone FROM users WHERE id=?', [
      req.user!.id,
    ]);
    if (!user) return fail(res, '用户不存在', 401);
    ok(res, user);
  })
);

// 修改密码
router.put(
  '/password',
  requireAuth,
  ah(async (req, res) => {
    const { oldPwd, newPwd } = req.body || {};
    if (!oldPwd || !newPwd) return fail(res, '请填写原密码和新密码');
    if (String(newPwd).length < 6) return fail(res, '新密码至少6位');
    const user = await qOne<any>('SELECT * FROM users WHERE id=?', [req.user!.id]);
    if (!user || !checkPwd(oldPwd, user.password)) return fail(res, '原密码错误');
    await q('UPDATE users SET password=? WHERE id=?', [hashPwd(newPwd), user.id]);
    ok(res, '密码修改成功');
  })
);

// 注册（开放注册：饲养员账号，管理员审核前默认为启用）
router.post(
  '/register',
  ah(async (req, res) => {
    const { username, password, name, phone } = req.body || {};
    if (!username || !password || !name) return fail(res, '请填写完整信息');
    if (String(password).length < 6) return fail(res, '密码至少6位');
    const exists = await qOne<any>('SELECT id FROM users WHERE username=?', [username]);
    if (exists) return fail(res, '用户名已存在');
    await q('INSERT INTO users (username,password,name,role,phone,status,created_at) VALUES (?,?,?,?,?,?,?)', [
      username,
      hashPwd(password),
      name,
      'keeper',
      phone || '',
      1,
      nowStr(),
    ]);
    ok(res, '注册成功，请登录');
  })
);

export default router;
