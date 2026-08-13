import { Router } from 'express';
import { q, execute } from '../db';
import { requireAuth } from '../auth';
import { ok, ah } from './helpers';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  ah(async (req, res) => {
    const rows = await q(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY is_read, id DESC LIMIT 100',
      [req.user!.id]
    );
    ok(res, rows);
  })
);

router.get(
  '/unread-count',
  ah(async (req, res) => {
    const [r] = await q<{ c: number }>(
      'SELECT COUNT(*) c FROM notifications WHERE user_id=? AND is_read=0',
      [req.user!.id]
    );
    ok(res, r.c);
  })
);

router.put(
  '/read/:id',
  ah(async (req, res) => {
    await execute('UPDATE notifications SET is_read=1 WHERE user_id=? AND id=?', [
      req.user!.id,
      req.params.id,
    ]);
    ok(res);
  })
);

router.put(
  '/read-all',
  ah(async (req, res) => {
    await execute('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user!.id]);
    ok(res);
  })
);

export default router;
