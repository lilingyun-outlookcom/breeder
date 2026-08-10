import { Router } from 'express';
import { q, qOne, execute } from '../db';
import { requireAuth } from '../auth';
import { ok, fail, ah, int } from './helpers';
import { nowStr, parseNum } from '../util';

const router = Router();
router.use(requireAuth);

interface TypeDef {
  table: string;
  label: string;
  taskType: string; // 关联的 task_type
  required: string[]; // 必填字段
  fields: string[]; // 允许写入的字段
  listJoin?: string; // 列表查询 join 片段
}

const TYPES: Record<string, TypeDef> = {
  feeding: {
    table: 'feeding_records',
    label: '喂食记录',
    taskType: 'feeding',
    required: ['cage_id', 'quantity'],
    fields: ['task_id', 'cage_id', 'animal_id', 'feed_id', 'quantity', 'intake', 'photos', 'note'],
    listJoin: `LEFT JOIN cages c ON c.id=r.cage_id LEFT JOIN animals a ON a.id=r.animal_id
               LEFT JOIN feeds f ON f.id=r.feed_id LEFT JOIN users u ON u.id=r.created_by`,
  },
  water: {
    table: 'water_records',
    label: '换水记录',
    taskType: 'water',
    required: ['cage_id', 'amount'],
    fields: ['task_id', 'cage_id', 'amount', 'quality', 'photos', 'note'],
    listJoin: `LEFT JOIN cages c ON c.id=r.cage_id LEFT JOIN users u ON u.id=r.created_by`,
  },
  environment: {
    table: 'environment_records',
    label: '环境记录',
    taskType: 'environment',
    required: ['cage_id', 'temperature', 'humidity'],
    fields: ['task_id', 'cage_id', 'temperature', 'humidity', 'ventilation', 'cleanliness', 'abnormal', 'photos', 'note'],
    listJoin: `LEFT JOIN cages c ON c.id=r.cage_id LEFT JOIN users u ON u.id=r.created_by`,
  },
  disinfection: {
    table: 'disinfection_records',
    label: '笼舍消毒记录',
    taskType: 'disinfection',
    required: ['cage_id', 'medicine_id'],
    fields: ['task_id', 'cage_id', 'medicine_id', 'photos', 'note'],
    listJoin: `LEFT JOIN cages c ON c.id=r.cage_id LEFT JOIN medicines m ON m.id=r.medicine_id
               LEFT JOIN users u ON u.id=r.created_by`,
  },
  medication: {
    table: 'medication_records',
    label: '用药记录',
    taskType: 'medication',
    required: ['animal_id', 'medicine_id'],
    fields: ['task_id', 'animal_id', 'medicine_id', 'dosage', 'photos', 'note'],
    listJoin: `LEFT JOIN animals a ON a.id=r.animal_id LEFT JOIN medicines m ON m.id=r.medicine_id
               LEFT JOIN users u ON u.id=r.created_by`,
  },
  breeding: {
    table: 'breeding_records',
    label: '繁育记录',
    taskType: 'breeding',
    required: ['animal_id'],
    fields: ['task_id', 'plan_id', 'animal_id', 'record_type', 'mother_intake', 'body_abnormal', 'total_born', 'alive_count', 'photos', 'note'],
    listJoin: `LEFT JOIN animals a ON a.id=r.animal_id LEFT JOIN users u ON u.id=r.created_by`,
  },
};

/* ============ 提交记录（饲养员/后台） ============ */
router.post(
  '/:type',
  ah(async (req, res) => {
    const td = TYPES[req.params.type];
    if (!td) return fail(res, '记录类型不正确');

    const b = req.body || {};
    const taskId = int(b.task_id);

    // 校验必填
    for (const f of td.required) {
      const v = b[f];
      if (v === undefined || v === null || v === '') return fail(res, `缺少必填项：${f}`);
    }
    // 数字字段校验
    for (const f of ['quantity', 'amount', 'temperature', 'humidity']) {
      if (b[f] !== undefined && b[f] !== '' && parseNum(b[f]) === null) {
        return fail(res, `${f} 必须是数字`);
      }
    }

    // 若关联任务：校验归属与类型匹配
    if (taskId) {
      const task = await qOne<any>('SELECT * FROM tasks WHERE id=?', [taskId]);
      if (!task) return fail(res, '关联任务不存在');
      if (req.user!.role === 'keeper' && task.assignee_id !== req.user!.id) {
        return fail(res, '该任务不属于你', 403);
      }
      if (td.taskType === 'breeding') {
        if (task.task_type !== 'breeding') return fail(res, '任务类型不匹配');
      } else if (task.task_type !== td.taskType) {
        return fail(res, '任务类型不匹配');
      }
    }

    // 组装插入字段
    const cols: string[] = ['created_by', 'created_at'];
    const vals: any[] = [req.user!.id, nowStr()];
    for (const f of td.fields) {
      if (f === 'task_id') {
        cols.push('task_id');
        vals.push(taskId);
        continue;
      }
      if (b[f] === undefined || b[f] === null || b[f] === '') {
        cols.push(f);
        vals.push(null);
        continue;
      }
      if (f === 'photos' && Array.isArray(b[f])) {
        cols.push(f);
        vals.push(JSON.stringify(b[f]));
        continue;
      }
      cols.push(f);
      vals.push(b[f]);
    }

    const r = await execute(
      `INSERT INTO ${td.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      vals
    );

    // 关联任务自动置为已完成
    if (taskId) {
      await execute('UPDATE tasks SET status=?, done_at=?, done_by=? WHERE id=?', [
        'done',
        nowStr(),
        req.user!.id,
        taskId,
      ]);
      const t = await qOne<any>('SELECT group_id FROM tasks WHERE id=?', [taskId]);
      if (t?.group_id) {
        await execute(
          `UPDATE task_groups g SET done_count=(SELECT COUNT(*) FROM tasks t WHERE t.group_id=g.id AND t.status='done') WHERE g.id=?`,
          [t.group_id]
        );
      }
    }
    ok(res, { id: r.insertId });
  })
);

/* ============ 幼崽成长记录 ============ */
router.post(
  '/cub',
  ah(async (req, res) => {
    const b = req.body || {};
    if (!b.animal_id) return fail(res, '请选择动物');
    await execute(
      `INSERT INTO cub_records (plan_id,animal_id,cub_no,weight,health,abnormal_note,photo,created_by,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        int(b.plan_id),
        int(b.animal_id),
        int(b.cub_no) || 1,
        parseNum(b.weight),
        b.health || '健康',
        b.abnormal_note || '',
        b.photo || '',
        req.user!.id,
        nowStr(),
      ]
    );
    ok(res, '记录成功');
  })
);

/* ============ 记录列表 ============ */
router.get(
  '/:type',
  ah(async (req, res) => {
    const td = TYPES[req.params.type];
    if (!td) return fail(res, '记录类型不正确');
    const date = String(req.query.date || '');
    const where: string[] = [];
    const params: any[] = [];
    if (req.user!.role === 'keeper') {
      where.push('r.created_by=?');
      params.push(req.user!.id);
    }
    if (date) {
      where.push('DATE(r.created_at)=?');
      params.push(date);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = await q(
      `SELECT r.* FROM ${td.table} r ${td.listJoin || ''} ${w}
       ORDER BY r.id DESC LIMIT 500`,
      params
    );
    // 解析 photos JSON
    const data = rows.map((r: any) => {
      try {
        r.photos = r.photos ? JSON.parse(r.photos) : [];
      } catch {
        r.photos = [];
      }
      return r;
    });
    ok(res, data);
  })
);

/* ============ 记录详情 ============ */
router.get(
  '/:type/:id',
  ah(async (req, res) => {
    const td = TYPES[req.params.type];
    const id = int(req.params.id);
    if (!td || !id) return fail(res, '参数错误');
    const r = await qOne<any>(`SELECT r.* FROM ${td.table} r WHERE r.id=?`, [id]);
    if (!r) return fail(res, '记录不存在');
    try {
      r.photos = r.photos ? JSON.parse(r.photos) : [];
    } catch {
      r.photos = [];
    }
    ok(res, r);
  })
);

export default router;
