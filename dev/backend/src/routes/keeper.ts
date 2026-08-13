import { Router } from 'express';
import { q, qOne } from '../db';
import { requireAuth } from '../auth';
import { ok, ah } from './helpers';
import { todayStr, nowStr } from '../util';

const router = Router();
router.use(requireAuth);

/* 饲养员首页聚合数据 */
router.get(
  '/home',
  ah(async (req, res) => {
    const uid = req.user!.id;
    const today = todayStr();
    const now = nowStr();

    const attendance = await qOne<any>(
      'SELECT * FROM attendance WHERE user_id=? AND date=?',
      [uid, today]
    );

    const tasks = await q(
      `SELECT t.*, c.name AS cage_name, a.name AS animal_name,
              f.name AS feed_name, m.name AS medicine_name, g.title AS group_title
       FROM tasks t
       LEFT JOIN cages c ON c.id=t.cage_id
       LEFT JOIN animals a ON a.id=t.animal_id
       LEFT JOIN feeds f ON f.id=t.feed_id
       LEFT JOIN medicines m ON m.id=t.medicine_id
       LEFT JOIN task_groups g ON g.id=t.group_id
       WHERE t.assignee_id=? AND t.task_date=? ORDER BY t.due_time`,
      [uid, today]
    );
    const taskData = tasks.map((t: any) => ({
      ...t,
      is_overdue: t.status !== 'done' && t.due_at < now,
    }));

    const [unread] = await q<{ c: number }>(
      'SELECT COUNT(*) c FROM notifications WHERE user_id=? AND is_read=0',
      [uid]
    );
    const [animalCount] = await q<{ c: number }>(
      'SELECT COALESCE(SUM(total),0) c FROM animals WHERE keeper_id=? AND status=1',
      [uid]
    );
    const [openReports] = await q<{ c: number }>(
      "SELECT COUNT(*) c FROM abnormal_reports WHERE reporter_id=? AND status<>'done'",
      [uid]
    );

    ok(res, {
      today,
      attendance,
      tasks: taskData,
      medTasks: taskData.filter((t: any) => t.task_type === 'medication'),
      unreadCount: unread.c,
      animalCount: animalCount.c,
      openReports: openReports.c,
    });
  })
);

/* 我的动物 */
router.get(
  '/animals',
  ah(async (req, res) => {
    const rows = await q(
      `SELECT a.*, c.name AS cage_name FROM animals a
       LEFT JOIN cages c ON c.id=a.cage_id
       WHERE a.keeper_id=? AND a.status=1 ORDER BY a.id`,
      [req.user!.id]
    );
    ok(res, rows);
  })
);

/* 我上报的异常工单 */
router.get(
  '/reports',
  ah(async (req, res) => {
    const rows = await q(
      `SELECT r.*, a.name AS animal_name FROM abnormal_reports r
       LEFT JOIN animals a ON a.id=r.animal_id
       WHERE r.reporter_id=? ORDER BY r.id DESC LIMIT 100`,
      [req.user!.id]
    );
    rows.forEach((r: any) => {
      try {
        r.photos = r.photos ? JSON.parse(r.photos) : [];
      } catch {
        r.photos = [];
      }
    });
    ok(res, rows);
  })
);

export default router;
