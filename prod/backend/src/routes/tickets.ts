import { Router } from 'express';
import { q, qOne, execute } from '../db';
import { requireAuth, requireRole } from '../auth';
import { ok, fail, ah, int } from './helpers';
import { nowStr, todayStr, addDays } from '../util';
import { generateTaskRows } from './tasks';

const router = Router();
router.use(requireAuth);

const REPORT_SELECT = `
  SELECT r.*, a.name AS animal_name, a.cage_id,
         c.name AS cage_name, u.name AS reporter_name, h.name AS handler_name
  FROM abnormal_reports r
  LEFT JOIN animals a ON a.id=r.animal_id
  LEFT JOIN cages c ON c.id=a.cage_id
  LEFT JOIN users u ON u.id=r.reporter_id
  LEFT JOIN users h ON h.id=r.handler_id
`;

/* ============ 动物异常上报（饲养员/后台） ============ */
router.post(
  '/reports/abnormal',
  ah(async (req, res) => {
    const b = req.body || {};
    const animalId = int(b.animal_id);
    if (!animalId) return fail(res, '请选择动物');
    if (!b.symptoms) return fail(res, '请描述异常症状');
    const r = await execute(
      `INSERT INTO abnormal_reports (animal_id,reporter_id,symptoms,photos,status,priority,created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [
        animalId,
        req.user!.id,
        b.symptoms,
        JSON.stringify(Array.isArray(b.photos) ? b.photos : []),
        'pending',
        b.priority || '中',
        nowStr(),
      ]
    );
    ok(res, { id: r.insertId });
  })
);

/* 工单列表：admin/vet 看全部，keeper 看自己上报的 */
router.get(
  '/reports',
  ah(async (req, res) => {
    const status = String(req.query.status || '');
    const where: string[] = [];
    const params: any[] = [];
    if (req.user!.role === 'keeper') {
      where.push('r.reporter_id=?');
      params.push(req.user!.id);
    }
    if (status && ['pending', 'processing', 'done'].includes(status)) {
      where.push('r.status=?');
      params.push(status);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = await q(REPORT_SELECT + ' ' + w + ' ORDER BY r.id DESC LIMIT 500', params);
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

router.get(
  '/reports/:id',
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const r = await qOne<any>(REPORT_SELECT + ' WHERE r.id=?', [id]);
    if (!r) return fail(res, '工单不存在');
    if (req.user!.role === 'keeper' && r.reporter_id !== req.user!.id) {
      return fail(res, '无权查看', 403);
    }
    try {
      r.photos = r.photos ? JSON.parse(r.photos) : [];
    } catch {
      r.photos = [];
    }
    const plans = await q('SELECT * FROM treatment_plans WHERE report_id=?', [id]);
    ok(res, { ...r, plans });
  })
);

/* 后台处理工单 */
router.put(
  '/reports/:id',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const r = await qOne<any>('SELECT * FROM abnormal_reports WHERE id=?', [id]);
    if (!r) return fail(res, '工单不存在');
    const b = req.body || {};
    const status = b.status && ['pending', 'processing', 'done'].includes(b.status) ? b.status : r.status;
    await execute(
      'UPDATE abnormal_reports SET status=?, resolution=?, handler_id=?, handled_at=? WHERE id=?',
      [
        status,
        b.resolution !== undefined ? b.resolution : r.resolution,
        status === 'done' ? req.user!.id : null,
        status === 'done' ? nowStr() : null,
        id,
      ]
    );
    // 同步动物健康状态
    if (b.health !== undefined && ['正常', '异常'].includes(b.health)) {
      await execute('UPDATE animals SET health=? WHERE id=?', [b.health, r.animal_id]);
    }
    ok(res, '处理成功');
  })
);

/* ============ 诊疗方案（admin/vet 录入，自动生成每日用药复诊任务） ============ */
router.post(
  '/treatment-plans',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const b = req.body || {};
    const animalId = int(b.animal_id);
    if (!animalId) return fail(res, '请选择动物');
    const medicineId = int(b.medicine_id);
    if (!medicineId) return fail(res, '请选择药品');
    const start = String(b.start_date || todayStr());
    const duration = int(b.duration_days) || 1;
    const end = b.end_date || addDays(start, duration - 1);

    const animal = await qOne<any>('SELECT * FROM animals WHERE id=?', [animalId]);
    const assigneeId = int(b.assignee_id) || animal?.keeper_id;
    if (!assigneeId) return fail(res, '该动物未分配饲养员，请先分配');

    const times: string[] = Array.isArray(b.times) ? b.times : ['09:00'];
    const plan = await execute(
      `INSERT INTO treatment_plans (animal_id,report_id,medicine_id,dosage,frequency,times,duration_days,start_date,end_date,vet_id,status,remark,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        animalId,
        int(b.report_id),
        medicineId,
        b.dosage || '',
        b.frequency || `${times.length}次/天`,
        JSON.stringify(times),
        duration,
        start,
        end,
        req.user!.id,
        'active',
        b.remark || '',
        nowStr(),
      ]
    );
    await generateTaskRows({
      task_type: 'medication',
      title: `用药复诊-${animal?.name || ''}`,
      remark: (b.dosage ? `用量:${b.dosage} ` : '') + (b.remark || ''),
      animal_id: animalId,
      medicine_id: medicineId,
      assignee_id: assigneeId,
      start_date: start,
      end_date: end,
      due_times: times,
      created_by: req.user!.id,
    });
    ok(res, { id: plan.insertId });
  })
);

router.get(
  '/treatment-plans',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const status = String(req.query.status || '');
    const w = status ? 'WHERE p.status=?' : '';
    const params = status ? [status] : [];
    const rows = await q(
      `SELECT p.*, a.name AS animal_name, m.name AS medicine_name, u.name AS vet_name
       FROM treatment_plans p
       LEFT JOIN animals a ON a.id=p.animal_id
       LEFT JOIN medicines m ON m.id=p.medicine_id
       LEFT JOIN users u ON u.id=p.vet_id
       ${w} ORDER BY p.id DESC`,
      params
    );
    rows.forEach((r: any) => {
      try {
        r.times = JSON.parse(r.times);
      } catch {
        r.times = [];
      }
    });
    ok(res, rows);
  })
);

router.put(
  '/treatment-plans/:id',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const p = await qOne<any>('SELECT * FROM treatment_plans WHERE id=?', [id]);
    if (!p) return fail(res, '方案不存在');
    const b = req.body || {};
    if (b.status && ['active', 'done'].includes(b.status)) p.status = b.status;
    if (b.remark !== undefined) p.remark = b.remark;
    if (b.dosage !== undefined) p.dosage = b.dosage;
    await execute('UPDATE treatment_plans SET status=?,remark=?,dosage=? WHERE id=?', [
      p.status,
      p.remark,
      p.dosage,
      id,
    ]);
    ok(res, '更新成功');
  })
);

/* ============ 繁育计划（admin 录入，自动生成每日繁育跟进任务） ============ */
router.post(
  '/breeding-plans',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const b = req.body || {};
    const femaleId = int(b.female_animal_id);
    if (!femaleId) return fail(res, '请选择母兽');
    const start = String(b.start_date || todayStr());
    const end = b.due_date ? String(b.due_date) : start;
    if (end < start) return fail(res, '截止日期不能早于开始日期');

    const female = await qOne<any>('SELECT * FROM animals WHERE id=?', [femaleId]);
    const assigneeId = int(b.assignee_id) || female?.keeper_id;
    if (!assigneeId) return fail(res, '母兽未分配饲养员，请先分配');

    const plan = await execute(
      `INSERT INTO breeding_plans (male_animal_id,female_animal_id,plan_type,start_date,due_date,status,creator_id,remark,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        int(b.male_animal_id),
        femaleId,
        b.plan_type || '配对',
        start,
        end,
        'active',
        req.user!.id,
        b.remark || '',
        nowStr(),
      ]
    );
    await generateTaskRows({
      task_type: 'breeding',
      title: `繁育跟进-${female?.name || ''}(${b.plan_type || '配对'})`,
      remark: b.remark || '',
      animal_id: femaleId,
      assignee_id: assigneeId,
      start_date: start,
      end_date: end,
      due_times: ['17:00'],
      created_by: req.user!.id,
      plan_id: plan.insertId,
    });
    ok(res, { id: plan.insertId });
  })
);

router.get(
  '/breeding-plans',
  ah(async (req, res) => {
    const status = String(req.query.status || '');
    const where: string[] = [];
    const params: any[] = [];
    if (req.user!.role === 'keeper') {
      where.push('(f.keeper_id=? OR m.keeper_id=?)');
      params.push(req.user!.id, req.user!.id);
    }
    if (status && ['active', 'done'].includes(status)) {
      where.push('p.status=?');
      params.push(status);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = await q(
      `SELECT p.*, f.name AS female_name, m.name AS male_name, u.name AS keeper_name
       FROM breeding_plans p
       LEFT JOIN animals f ON f.id=p.female_animal_id
       LEFT JOIN animals m ON m.id=p.male_animal_id
       LEFT JOIN users u ON u.id=f.keeper_id
       ${w} ORDER BY p.id DESC`,
      params
    );
    ok(res, rows);
  })
);

router.put(
  '/breeding-plans/:id',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const p = await qOne<any>('SELECT * FROM breeding_plans WHERE id=?', [id]);
    if (!p) return fail(res, '计划不存在');
    const b = req.body || {};
    if (b.status && ['active', 'done'].includes(b.status)) p.status = b.status;
    if (b.remark !== undefined) p.remark = b.remark;
    await execute('UPDATE breeding_plans SET status=?,remark=? WHERE id=?', [p.status, p.remark, id]);
    ok(res, '更新成功');
  })
);

/* 某个繁育计划的全部记录（跟进+分娩+幼崽） */
router.get(
  '/breeding-plans/:id/records',
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const records = await q(
      `SELECT r.*, u.name AS user_name FROM breeding_records r
       LEFT JOIN users u ON u.id=r.created_by
       WHERE r.plan_id=? ORDER BY r.id DESC`,
      [id]
    );
    records.forEach((r: any) => {
      try {
        r.photos = r.photos ? JSON.parse(r.photos) : [];
      } catch {
        r.photos = [];
      }
    });
    const cubs = await q('SELECT * FROM cub_records WHERE plan_id=? ORDER BY id DESC', [id]);
    ok(res, { records, cubs });
  })
);

export default router;
