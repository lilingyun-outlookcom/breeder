import { Router } from 'express';
import { q, qOne, execute } from '../db';
import { requireAuth, requireRole } from '../auth';
import { ok, fail, ah, int } from './helpers';
import { nowStr, todayStr, dateRange, parseNum } from '../util';

const router = Router();
router.use(requireAuth);

export const TASK_TYPES: Record<string, string> = {
  feeding: '喂食任务',
  water: '换水任务',
  environment: '笼舍环境',
  disinfection: '笼舍消毒',
  medication: '用药复诊',
  breeding: '繁育跟进',
};

const TASK_SELECT = `
  SELECT t.*, c.name AS cage_name, a.name AS animal_name,
         f.name AS feed_name, f.unit AS feed_unit,
         m.name AS medicine_name,
         u.name AS assignee_name, g.title AS group_title
  FROM tasks t
  LEFT JOIN cages c ON c.id = t.cage_id
  LEFT JOIN animals a ON a.id = t.animal_id
  LEFT JOIN feeds f ON f.id = t.feed_id
  LEFT JOIN medicines m ON m.id = t.medicine_id
  LEFT JOIN users u ON u.id = t.assignee_id
  LEFT JOIN task_groups g ON g.id = t.group_id
`;

/**
 * 按配置批量生成任务行。
 * repeat_type: daily=每天生成, once=仅在 start_date 生成一天
 */
export async function generateTaskRows(p: {
  task_type: string;
  title?: string;
  remark?: string;
  cage_id?: number | null;
  animal_id?: number | null;
  feed_id?: number | null;
  medicine_id?: number | null;
  quantity?: number | null;
  quantity_unit?: string;
  assignee_id: number;
  start_date: string;
  end_date?: string;
  due_times: string[];
  created_by?: number | null;
  group_id?: number | null;
  plan_id?: number | null;
}): Promise<number> {
  const end = p.end_date || p.start_date;
  const dates = p.task_type === 'once' ? [p.start_date] : dateRange(p.start_date, end);
  const times = p.due_times.length ? p.due_times : ['17:00'];
  const title = p.title || TASK_TYPES[p.task_type] || p.task_type;
  let count = 0;
  for (const d of dates) {
    for (const t of times) {
      await execute(
        `INSERT INTO tasks
         (group_id, task_type, title, cage_id, animal_id, feed_id, medicine_id,
          quantity, quantity_unit, task_date, due_time, due_at, assignee_id,
          status, remark, plan_id, created_by, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          p.group_id ?? null,
          p.task_type,
          title,
          p.cage_id ?? null,
          p.animal_id ?? null,
          p.feed_id ?? null,
          p.medicine_id ?? null,
          p.quantity ?? null,
          p.quantity_unit || '',
          d,
          t,
          `${d} ${t}:00`,
          p.assignee_id,
          'pending',
          p.remark || '',
          p.plan_id ?? null,
          p.created_by ?? null,
          nowStr(),
        ]
      );
      count++;
    }
  }
  return count;
}

/** 校验并返回任务类型合法性 */
function checkType(t: string): string | null {
  return TASK_TYPES[t] ? t : null;
}

/* ============ 后台批量配置任务 (admin/vet) ============ */
router.post(
  '/batch',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const b = req.body || {};
    const taskType = checkType(b.task_type);
    if (!taskType) return fail(res, '任务类型不正确');
    const assigneeId = int(b.assignee_id);
    if (!assigneeId) return fail(res, '请选择负责人');
    const start = String(b.start_date || '');
    if (!start) return fail(res, '请选择开始日期');
    const end = b.repeat_type === 'once' ? start : String(b.end_date || start);
    if (end < start) return fail(res, '结束日期不能早于开始日期');
    const dueTimes: string[] = Array.isArray(b.due_times) ? b.due_times : [String(b.due_time || '17:00')];

    // 若未指定负责人，尝试取动物的默认饲养员
    let assigneeIdFinal = assigneeId;
    if (b.animal_id) {
      const animal = await qOne<any>('SELECT keeper_id FROM animals WHERE id=?', [b.animal_id]);
      if (animal?.keeper_id && !b.assignee_id) assigneeIdFinal = animal.keeper_id;
    }
    const grp = await execute(
      'INSERT INTO task_groups (task_type,title,remark,assignee_id,created_by,created_at) VALUES (?,?,?,?,?,?)',
      [taskType, b.title || '', b.remark || '', assigneeIdFinal, req.user!.id, nowStr()]
    );
    const total = await generateTaskRows({
      task_type: taskType,
      title: b.title,
      remark: b.remark,
      cage_id: int(b.cage_id),
      animal_id: int(b.animal_id),
      feed_id: int(b.feed_id),
      medicine_id: int(b.medicine_id),
      quantity: parseNum(b.quantity),
      quantity_unit: b.quantity_unit || '',
      assignee_id: assigneeIdFinal,
      start_date: start,
      end_date: end,
      due_times: dueTimes,
      created_by: req.user!.id,
      group_id: grp.insertId,
    });
    await execute('UPDATE task_groups SET total=? WHERE id=?', [total, grp.insertId]);
    ok(res, { groupId: grp.insertId, total });
  })
);

/* ============ 任务列表（后台/饲养员通用，按权限过滤） ============ */
router.get(
  '/',
  ah(async (req, res) => {
    const date = String(req.query.date || '');
    const type = String(req.query.type || '');
    const status = String(req.query.status || '');
    const assigneeId = int(req.query.assignee_id);
    const groupId = int(req.query.group_id);
    const where: string[] = [];
    const params: any[] = [];
    if (req.user!.role === 'keeper') {
      where.push('t.assignee_id=?');
      params.push(req.user!.id);
    }
    if (date) {
      where.push('t.task_date=?');
      params.push(date);
    }
    if (checkType(type)) {
      where.push('t.task_type=?');
      params.push(type);
    }
    if (status && ['pending', 'processing', 'done'].includes(status)) {
      where.push('t.status=?');
      params.push(status);
    }
    if (assigneeId && req.user!.role !== 'keeper') {
      where.push('t.assignee_id=?');
      params.push(assigneeId);
    }
    if (groupId) {
      where.push('t.group_id=?');
      params.push(groupId);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = await q(TASK_SELECT + ' ' + w + ' ORDER BY t.task_date DESC, t.due_time', params);
    // 附加逾期标记
    const now = nowStr();
    const data = rows.map((r: any) => ({
      ...r,
      is_overdue: r.status !== 'done' && r.due_at < now,
    }));
    ok(res, data);
  })
);

/* ============ 任务批次列表（后台） ============ */
router.get(
  '/groups',
  requireRole('admin', 'vet'),
  ah(async (_req, res) => {
    const rows = await q(
      `SELECT g.*, u.name AS assignee_name,
              (SELECT COUNT(*) FROM tasks t WHERE t.group_id=g.id) AS total,
              (SELECT COUNT(*) FROM tasks t WHERE t.group_id=g.id AND t.status='done') AS done_count
       FROM task_groups g LEFT JOIN users u ON u.id=g.assignee_id
       ORDER BY g.id DESC LIMIT 300`
    );
    ok(res, rows);
  })
);

router.delete(
  '/group/:id',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    await execute('DELETE FROM tasks WHERE group_id=?', [id]);
    await execute('DELETE FROM task_groups WHERE id=?', [id]);
    ok(res, '已删除该批次全部任务');
  })
);

/* ============ 单任务详情（饲养员/后台） ============ */
router.get(
  '/:id',
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const t = await qOne<any>(TASK_SELECT + ' WHERE t.id=?', [id]);
    if (!t) return fail(res, '任务不存在');
    if (req.user!.role === 'keeper' && t.assignee_id !== req.user!.id) {
      return fail(res, '该任务不属于你', 403);
    }
    const now = nowStr();
    ok(res, { ...t, is_overdue: t.status !== 'done' && t.due_at < now });
  })
);

/* ============ 修改单个任务（后台） ============ */
router.put(
  '/:id',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const t = await qOne<any>('SELECT * FROM tasks WHERE id=?', [id]);
    if (!t) return fail(res, '任务不存在');
    const b = req.body || {};
    if (b.assignee_id !== undefined) t.assignee_id = int(b.assignee_id) || t.assignee_id;
    if (b.due_time) {
      t.due_time = b.due_time;
      t.due_at = `${t.task_date} ${b.due_time}:00`;
    }
    if (b.task_date) {
      t.task_date = b.task_date;
      t.due_at = `${b.task_date} ${t.due_time}:00`;
    }
    if (b.status && ['pending', 'processing', 'done'].includes(b.status)) t.status = b.status;
    if (b.remark !== undefined) t.remark = b.remark;
    await execute('UPDATE tasks SET assignee_id=?,due_time=?,task_date=?,due_at=?,status=?,remark=? WHERE id=?', [
      t.assignee_id,
      t.due_time,
      t.task_date,
      t.due_at,
      t.status,
      t.remark,
      id,
    ]);
    ok(res, '更新成功');
  })
);

/* ============ 饲养员更新任务状态 ============ */
router.put(
  '/:id/status',
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const t = await qOne<any>('SELECT * FROM tasks WHERE id=?', [id]);
    if (!t) return fail(res, '任务不存在');
    if (req.user!.role === 'keeper' && t.assignee_id !== req.user!.id) {
      return fail(res, '该任务不属于你', 403);
    }
    const status = String(req.body?.status || '');
    if (!['pending', 'processing', 'done'].includes(status)) return fail(res, '状态不正确');
    const now = nowStr();
    await execute('UPDATE tasks SET status=?, done_at=?, done_by=? WHERE id=?', [
      status,
      status === 'done' ? now : null,
      status === 'done' ? req.user!.id : null,
      id,
    ]);
    // 同步批次完成数
    if (t.group_id) {
      await execute(
        `UPDATE task_groups g SET done_count=(SELECT COUNT(*) FROM tasks t WHERE t.group_id=g.id AND t.status='done') WHERE g.id=?`,
        [t.group_id]
      );
    }
    ok(res, '状态已更新');
  })
);

/* ============ 饲养员今日任务（首页待办） ============ */
router.get(
  '/mine/today',
  ah(async (req, res) => {
    const today = todayStr();
    const rows = await q(
      TASK_SELECT + ' WHERE t.assignee_id=? AND t.task_date=? ORDER BY t.due_time',
      [req.user!.id, today]
    );
    const now = nowStr();
    const data = rows.map((r: any) => ({
      ...r,
      is_overdue: r.status !== 'done' && r.due_at < now,
    }));
    ok(res, data);
  })
);

export default router;
