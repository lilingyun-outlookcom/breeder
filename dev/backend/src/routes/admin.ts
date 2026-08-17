import { Router } from 'express';
import { q, qOne, execute } from '../db';
import { requireAuth, requireRole, hashPwd } from '../auth';
import { ok, fail, ah, int } from './helpers';
import { nowStr, todayStr, parseNum } from '../util';

const router = Router();
router.use(requireAuth);

/* ============ 用户管理 (仅 admin) ============ */
router.get(
  '/users',
  requireRole('admin'),
  ah(async (_req, res) => {
    const rows = await q(
      'SELECT id,username,name,role,phone,status,created_at FROM users ORDER BY id'
    );
    ok(res, rows);
  })
);

router.post(
  '/users',
  requireRole('admin'),
  ah(async (req, res) => {
    const { username, name, role, phone, password } = req.body || {};
    if (!username || !name || !role) return fail(res, '请填写完整信息');
    const exists = await qOne<any>('SELECT id FROM users WHERE username=?', [username]);
    if (exists) return fail(res, '用户名已存在');
    await execute(
      'INSERT INTO users (username,password,name,role,phone,status,created_at) VALUES (?,?,?,?,?,?,?)',
      [username, hashPwd(password || '123456'), name, role, phone || '', 1, nowStr()]
    );
    ok(res, '创建成功');
  })
);

router.put(
  '/users/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const user = await qOne<any>('SELECT * FROM users WHERE id=?', [id]);
    if (!user) return fail(res, '用户不存在');
    const { name, role, phone, status, password } = req.body || {};
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (status !== undefined) user.status = status ? 1 : 0;
    if (password) user.password = hashPwd(password);
    await execute(
      'UPDATE users SET name=?,role=?,phone=?,status=?,password=? WHERE id=?',
      [user.name, user.role, user.phone, user.status, user.password, id]
    );
    ok(res, '更新成功');
  })
);

router.delete(
  '/users/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    if (id === req.user!.id) return fail(res, '不能停用自己');
    await execute('UPDATE users SET status=0 WHERE id=?', [id]);
    ok(res, '已停用');
  })
);

/* ============ 系统设置 (仅 admin) ============ */
router.get(
  '/settings',
  ah(async (_req, res) => {
    const rows = await q<{ k: string; v: string; remark: string }>('SELECT k,v,remark FROM settings');
    const obj: Record<string, string> = {};
    rows.forEach((r) => (obj[r.k] = r.v));
    ok(res, obj);
  })
);

router.put(
  '/settings',
  requireRole('admin'),
  ah(async (req, res) => {
    const body = req.body || {};
    const keys = [
      'checkin_lat',
      'checkin_lng',
      'checkin_radius',
      'work_start_time',
      'work_end_time',
      'amap_key',
    ];
    for (const k of keys) {
      if (body[k] !== undefined) {
        await execute('INSERT INTO settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)', [
          k,
          String(body[k]),
        ]);
      }
    }
    ok(res, '保存成功');
  })
);

/* ============ 笼舍 ============ */
router.get(
  '/cages',
  ah(async (_req, res) => {
    const rows = await q('SELECT * FROM cages ORDER BY id');
    ok(res, rows);
  })
);

router.post(
  '/cages',
  requireRole('admin'),
  ah(async (req, res) => {
    const { name, location, remark } = req.body || {};
    if (!name) return fail(res, '请填写笼舍名称');
    await execute('INSERT INTO cages (name,location,remark,created_at) VALUES (?,?,?,?)', [
      name,
      location || '',
      remark || '',
      nowStr(),
    ]);
    ok(res, '创建成功');
  })
);

router.put(
  '/cages/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const { name, location, remark } = req.body || {};
    if (!name) return fail(res, '请填写笼舍名称');
    await execute('UPDATE cages SET name=?,location=?,remark=? WHERE id=?', [
      name,
      location || '',
      remark || '',
      id,
    ]);
    ok(res, '更新成功');
  })
);

router.delete(
  '/cages/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    await execute('DELETE FROM cages WHERE id=?', [id]);
    ok(res, '删除成功');
  })
);

/* ============ 饲料 ============ */
router.get(
  '/feeds',
  ah(async (_req, res) => {
    const rows = await q('SELECT * FROM feeds ORDER BY id');
    ok(res, rows);
  })
);

router.post(
  '/feeds',
  requireRole('admin'),
  ah(async (req, res) => {
    const { name, unit, remark } = req.body || {};
    if (!name) return fail(res, '请填写饲料名称');
    await execute('INSERT INTO feeds (name,unit,remark,created_at) VALUES (?,?,?,?)', [
      name,
      unit || '克',
      remark || '',
      nowStr(),
    ]);
    ok(res, '创建成功');
  })
);

router.put(
  '/feeds/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const { name, unit, remark } = req.body || {};
    if (!name) return fail(res, '请填写饲料名称');
    await execute('UPDATE feeds SET name=?,unit=?,remark=? WHERE id=?', [
      name,
      unit || '克',
      remark || '',
      id,
    ]);
    ok(res, '更新成功');
  })
);

router.delete(
  '/feeds/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    await execute('DELETE FROM feeds WHERE id=?', [id]);
    ok(res, '删除成功');
  })
);

/* ============ 药品/消毒剂 ============ */
router.get(
  '/medicines',
  ah(async (_req, res) => {
    const rows = await q('SELECT * FROM medicines ORDER BY id');
    ok(res, rows);
  })
);

router.post(
  '/medicines',
  requireRole('admin'),
  ah(async (req, res) => {
    const { name, category, spec, unit, remark } = req.body || {};
    if (!name) return fail(res, '请填写名称');
    await execute(
      'INSERT INTO medicines (name,category,spec,unit,remark,created_at) VALUES (?,?,?,?,?,?)',
      [name, category || '用药', spec || '', unit || '', remark || '', nowStr()]
    );
    ok(res, '创建成功');
  })
);

router.put(
  '/medicines/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const { name, category, spec, unit, remark } = req.body || {};
    if (!name) return fail(res, '请填写名称');
    await execute('UPDATE medicines SET name=?,category=?,spec=?,unit=?,remark=? WHERE id=?', [
      name,
      category || '用药',
      spec || '',
      unit || '',
      remark || '',
      id,
    ]);
    ok(res, '更新成功');
  })
);

router.delete(
  '/medicines/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    await execute('DELETE FROM medicines WHERE id=?', [id]);
    ok(res, '删除成功');
  })
);

/* ============ 动物 ============ */
const ANIMAL_SELECT = `
  SELECT a.*, c.name AS cage_name, u.name AS keeper_name,
         (SELECT COALESCE(SUM(tp.quantity),0) FROM treatment_plans tp
            WHERE tp.animal_id=a.id AND tp.status='active') AS sick_count,
         (SELECT COUNT(*) FROM breeding_plans bp
            WHERE bp.female_animal_id=a.id AND bp.status='active' AND bp.plan_type='妊娠') AS pregnant_count
  FROM animals a
  LEFT JOIN cages c ON c.id = a.cage_id
  LEFT JOIN users u ON u.id = a.keeper_id
`;

router.get(
  '/animals',
  ah(async (req, res) => {
    const keeperId = int(req.query.keeper_id);
    const cageId = int(req.query.cage_id);
    const where: string[] = ['a.status=1'];
    const params: any[] = [];
    if (keeperId) {
      where.push('a.keeper_id=?');
      params.push(keeperId);
    }
    if (cageId) {
      where.push('a.cage_id=?');
      params.push(cageId);
    }
    const rows = await q(ANIMAL_SELECT + ' WHERE ' + where.join(' AND ') + ' ORDER BY a.id DESC', params);
    ok(res, rows);
  })
);

router.post(
  '/animals',
  requireRole('admin'),
  ah(async (req, res) => {
    const { name, species, sex, age, health, cage_id, keeper_id, photo, remark } = req.body || {};
    if (!name) return fail(res, '请填写动物名称');
    const total = int(req.body?.total) || 1;
    if (total < 1) return fail(res, '总数量必须大于 0');
    const r = await execute(
      'INSERT INTO animals (cage_id,name,species,sex,age,health,total,keeper_id,photo,remark,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)',
      [
        cage_id || null,
        name,
        species || '',
        sex || '未知',
        age || '',
        health || '正常',
        total,
        keeper_id || null,
        photo || '',
        remark || '',
        nowStr(),
      ]
    );
    ok(res, { id: r.insertId });
  })
);

router.put(
  '/animals/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    const a = await qOne<any>('SELECT * FROM animals WHERE id=?', [id]);
    if (!a) return fail(res, '动物不存在');
    const b = req.body || {};
    ['name', 'species', 'sex', 'age', 'health', 'photo', 'remark'].forEach((k) => {
      if (b[k] !== undefined) a[k] = b[k];
    });
    if (b.total !== undefined) {
      const t = int(b.total) || a.total;
      if (t < 1) return fail(res, '总数量必须大于 0');
      a.total = t;
    }
    if (b.cage_id !== undefined) a.cage_id = b.cage_id || null;
    if (b.keeper_id !== undefined) a.keeper_id = b.keeper_id || null;
    await execute(
      'UPDATE animals SET cage_id=?,name=?,species=?,sex=?,age=?,health=?,total=?,keeper_id=?,photo=?,remark=? WHERE id=?',
      [a.cage_id, a.name, a.species, a.sex, a.age, a.health, a.total, a.keeper_id, a.photo, a.remark, id]
    );
    ok(res, '更新成功');
  })
);

/* 合并同类：同物种+同笼舍+同饲养员的多行合并为一行（数量求和、引用重映射、其余下架） */
router.post(
  '/animals/merge',
  requireRole('admin'),
  ah(async (_req, res) => {
    const groups = await q<{ species: string; cage_id: number | null; keeper_id: number | null; keep_id: number; cnt: number }>(
      `SELECT species, cage_id, keeper_id, MIN(id) AS keep_id, COUNT(*) AS cnt
       FROM animals WHERE status=1 AND species<>''
       GROUP BY species, cage_id, keeper_id HAVING cnt > 1`
    );
    let merged = 0;
    for (const g of groups) {
      const others = await q<{ id: number }>(
        'SELECT id FROM animals WHERE status=1 AND species=? AND cage_id<=>? AND keeper_id<=>? AND id<>?',
        [g.species, g.cage_id, g.keeper_id, g.keep_id]
      );
      const ids = others.map((r) => r.id);
      if (!ids.length) continue;
      const inClause = ids.map(() => '?').join(',');
      // 数量求和（保留行 + 被合并行）
      await execute(
        `UPDATE animals SET total=(SELECT s FROM (SELECT SUM(total) AS s FROM animals WHERE id IN (${inClause}) OR id=?) AS t) WHERE id=?`,
        [...ids, g.keep_id, g.keep_id]
      );
      // 引用重映射到保留行
      await execute(`UPDATE tasks SET animal_id=? WHERE animal_id IN (${inClause})`, [g.keep_id, ...ids]);
      await execute(`UPDATE feeding_records SET animal_id=? WHERE animal_id IN (${inClause})`, [g.keep_id, ...ids]);
      await execute(`UPDATE treatment_plans SET animal_id=? WHERE animal_id IN (${inClause})`, [g.keep_id, ...ids]);
      await execute(`UPDATE breeding_plans SET female_animal_id=? WHERE female_animal_id IN (${inClause})`, [g.keep_id, ...ids]);
      await execute(`UPDATE breeding_plans SET male_animal_id=? WHERE male_animal_id IN (${inClause})`, [g.keep_id, ...ids]);
      await execute(`UPDATE abnormal_reports SET animal_id=? WHERE animal_id IN (${inClause})`, [g.keep_id, ...ids]);
      await execute(`UPDATE cub_records SET animal_id=? WHERE animal_id IN (${inClause})`, [g.keep_id, ...ids]);
      await execute(`UPDATE animals SET status=0 WHERE id IN (${inClause})`, ids);
      merged += 1;
    }
    ok(res, { merged });
  })
);

router.delete(
  '/animals/:id',
  requireRole('admin'),
  ah(async (req, res) => {
    const id = int(req.params.id);
    if (!id) return fail(res, '参数错误');
    await execute('UPDATE animals SET status=0 WHERE id=?', [id]);
    ok(res, '删除成功');
  })
);

/* ============ 物资出入库（饲料/药品 买入/灭失） ============ */
router.post(
  '/inventory',
  requireRole('admin', 'vet'),
  ah(async (req, res) => {
    const b = req.body || {};
    const itemType = b.item_type;
    if (!['feed', 'medicine'].includes(itemType)) return fail(res, '物资类型不正确');
    const changeType = b.change_type;
    if (!['buy', 'loss'].includes(changeType)) return fail(res, '变动类型不正确');
    const itemId = int(b.item_id);
    const qty = parseNum(b.quantity);
    if (!itemId) return fail(res, '参数错误');
    if (qty === null || qty <= 0) return fail(res, '数量必须大于 0');
    const table = itemType === 'feed' ? 'feeds' : 'medicines';
    const item = await qOne<any>(`SELECT id, stock FROM ${table} WHERE id=?`, [itemId]);
    if (!item) return fail(res, '物资不存在');
    if (changeType === 'loss' && item.stock < qty) {
      return fail(res, `库存不足（当前 ${item.stock}），无法灭失`);
    }
    // 附件：仅接受 /uploads/ 开头的 URL 数组，最多 9 个
    let attachments = '';
    if (Array.isArray(b.attachments)) {
      const urls = b.attachments
        .filter((u: any) => typeof u === 'string' && /^\/uploads\/.+/.test(u))
        .slice(0, 9);
      attachments = JSON.stringify(urls);
    }
    await execute(`UPDATE ${table} SET stock=${changeType === 'buy' ? 'stock+?' : 'stock-?'} WHERE id=?`, [qty, itemId]);
    await execute(
      'INSERT INTO inventory_records (item_type,item_id,change_type,quantity,remark,attachments,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)',
      [itemType, itemId, changeType, qty, b.remark || '', attachments, req.user!.id, nowStr()]
    );
    ok(res, '操作成功');
  })
);

router.get(
  '/inventory-records',
  ah(async (req, res) => {
    const itemType = String(req.query.item_type || '');
    const date = String(req.query.date || '');
    const where: string[] = [];
    const params: any[] = [];
    if (['feed', 'medicine'].includes(itemType)) {
      where.push('ir.item_type=?');
      params.push(itemType);
    }
    if (date) {
      where.push('DATE(ir.created_at)=?');
      params.push(date);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = await q(
      `SELECT ir.*,
              CASE WHEN ir.item_type='feed' THEN f.name ELSE m.name END AS item_name,
              u.name AS user_name
       FROM inventory_records ir
       LEFT JOIN feeds f ON f.id=ir.item_id AND ir.item_type='feed'
       LEFT JOIN medicines m ON m.id=ir.item_id AND ir.item_type='medicine'
       LEFT JOIN users u ON u.id=ir.created_by
       ${w} ORDER BY ir.id DESC LIMIT 500`,
      params
    );
    for (const r of rows) {
      try {
        r.attachments = r.attachments ? JSON.parse(r.attachments) : [];
      } catch {
        r.attachments = [];
      }
    }
    ok(res, rows);
  })
);

/* ============ 后台看考勤 ============ */
router.get(
  '/attendance',
  ah(async (req, res) => {
    const date = String(req.query.date || '');
    const userId = int(req.query.user_id);
    const where: string[] = [];
    const params: any[] = [];
    if (date) {
      where.push('a.date=?');
      params.push(date);
    }
    if (userId) {
      where.push('a.user_id=?');
      params.push(userId);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = await q(
      `SELECT a.*, u.name AS user_name, u.username
       FROM attendance a LEFT JOIN users u ON u.id=a.user_id
       ${w} ORDER BY a.date DESC, a.user_id LIMIT 500`,
      params
    );
    ok(res, rows);
  })
);

/* ============ 统计看板 ============ */
router.get(
  '/stats/dashboard',
  ah(async (_req, res) => {
    const today = todayStr();
    const [keeperCount] = await q<{ c: number }>(
      "SELECT COUNT(*) c FROM users WHERE role='keeper' AND status=1"
    );
    const [checkedToday] = await q<{ c: number }>(
      'SELECT COUNT(*) c FROM attendance WHERE date=? AND check_in_at IS NOT NULL',
      [today]
    );
    const [lateToday] = await q<{ c: number }>(
      'SELECT COUNT(*) c FROM attendance WHERE date=? AND check_in_status=?',
      [today, '迟到']
    );
    const tasks = await q<{ status: string; c: number }>(
      'SELECT status, COUNT(*) c FROM tasks WHERE task_date=? GROUP BY status',
      [today]
    );
    const [overdue] = await q<{ c: number }>(
      "SELECT COUNT(*) c FROM tasks WHERE task_date=? AND status<>'done' AND due_at<?",
      [today, nowStr()]
    );
    const [pendingTickets] = await q<{ c: number }>(
      "SELECT COUNT(*) c FROM abnormal_reports WHERE status='pending'"
    );
    const [animalCount] = await q<{ c: number }>(
      'SELECT COALESCE(SUM(total),0) c FROM animals WHERE status=1'
    );
    const taskStat: Record<string, number> = { pending: 0, processing: 0, done: 0 };
    tasks.forEach((t) => (taskStat[t.status] = t.c));
    ok(res, {
      today,
      keeperCount: keeperCount.c,
      checkedToday: checkedToday.c,
      lateToday: lateToday.c,
      uncheckKeeper: Math.max(0, keeperCount.c - checkedToday.c),
      tasksToday: taskStat,
      overdueToday: overdue.c,
      pendingTickets: pendingTickets.c,
      animalCount: animalCount.c,
    });
  })
);

export default router;
