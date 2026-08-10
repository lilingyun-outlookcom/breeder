import { Router } from 'express';
import { q, qOne, execute } from '../db';
import { requireAuth } from '../auth';
import { ok, fail, ah } from './helpers';
import { nowStr, todayStr, distanceMeters, parseNum, cnTimeStr } from '../util';

const router = Router();
router.use(requireAuth);

async function getSettings(): Promise<Record<string, string>> {
  const rows = await q<{ k: string; v: string }>('SELECT k,v FROM settings');
  const obj: Record<string, string> = {};
  rows.forEach((r) => (obj[r.k] = r.v));
  return obj;
}

/** 校验坐标是否在打卡范围内 */
function inRange(s: Record<string, string>, lat: number, lng: number): { ok: boolean; dist: number } {
  const clat = parseNum(s.checkin_lat) ?? 0;
  const clng = parseNum(s.checkin_lng) ?? 0;
  const radius = parseNum(s.checkin_radius) ?? 500;
  const dist = distanceMeters(lat, lng, clat, clng);
  return { ok: dist <= radius, dist };
}

/* 我的打卡记录（按日期） */
router.get(
  '/me',
  ah(async (req, res) => {
    const date = String(req.query.date || todayStr());
    const rec = await qOne<any>('SELECT * FROM attendance WHERE user_id=? AND date=?', [
      req.user!.id,
      date,
    ]);
    ok(res, rec);
  })
);

/* 签到 */
router.post(
  '/checkin',
  ah(async (req, res) => {
    const lat = parseNum(req.body?.lat);
    const lng = parseNum(req.body?.lng);
    if (lat === null || lng === null) return fail(res, '无法获取定位，请允许定位权限');
    const s = await getSettings();
    const { ok: inR, dist } = inRange(s, lat, lng);
    if (!inR) return fail(res, `不在打卡范围内（距打卡点 ${dist} 米）`, 403);

    const date = todayStr();
    const exists = await qOne<any>('SELECT * FROM attendance WHERE user_id=? AND date=?', [
      req.user!.id,
      date,
    ]);
    if (exists?.check_in_at) return fail(res, '今日已签到，请勿重复操作');

    const workStart = String(s.work_start_time || '09:00');
    const status = cnTimeStr() > workStart ? '迟到' : '正常';
    if (exists) {
      await execute(
        'UPDATE attendance SET check_in_at=?, check_in_status=?, check_in_lat=?, check_in_lng=? WHERE id=?',
        [nowStr(), status, lat, lng, exists.id]
      );
    } else {
      await execute(
        'INSERT INTO attendance (user_id,date,check_in_at,check_in_status,check_in_lat,check_in_lng,created_at) VALUES (?,?,?,?,?,?,?)',
        [req.user!.id, date, nowStr(), status, lat, lng, nowStr()]
      );
    }
    ok(res, { status, date, dist });
  })
);

/* 签退 */
router.post(
  '/checkout',
  ah(async (req, res) => {
    const lat = parseNum(req.body?.lat);
    const lng = parseNum(req.body?.lng);
    if (lat === null || lng === null) return fail(res, '无法获取定位，请允许定位权限');
    const s = await getSettings();
    const { ok: inR, dist } = inRange(s, lat, lng);
    if (!inR) return fail(res, `不在打卡范围内（距打卡点 ${dist} 米）`, 403);

    const date = todayStr();
    const rec = await qOne<any>('SELECT * FROM attendance WHERE user_id=? AND date=?', [
      req.user!.id,
      date,
    ]);
    if (!rec?.check_in_at) return fail(res, '尚未签到，不能签退');
    if (rec.check_out_at) return fail(res, '今日已签退，请勿重复操作');
    await execute(
      'UPDATE attendance SET check_out_at=?, check_out_lat=?, check_out_lng=? WHERE id=?',
      [nowStr(), lat, lng, rec.id]
    );
    ok(res, { date, dist });
  })
);

/* 我的打卡记录（按月） */
router.get(
  '/history',
  ah(async (req, res) => {
    const month = String(req.query.month || todayStr().slice(0, 7));
    const rows = await q(
      'SELECT * FROM attendance WHERE user_id=? AND date LIKE ? ORDER BY date DESC',
      [req.user!.id, month + '%']
    );
    const total = rows.length;
    const late = rows.filter((r: any) => r.check_in_status === '迟到').length;
    const checked = rows.filter((r: any) => r.check_in_at).length;
    ok(res, { month, total, checked, late, list: rows });
  })
);

export default router;
