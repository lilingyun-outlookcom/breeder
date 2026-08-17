import { pool, q } from './db';
import { hashPwd } from './auth';
import { nowStr } from './util';

/**
 * 首次启动时写入初始数据：
 * - 默认账号：admin/admin123(管理员) vet/vet123(兽医) keeper/keeper123(饲养员)
 * - 打卡设置默认值（园区坐标需后台修改）
 * - 示例笼舍/饲料/药品/动物
 */
export async function seedIfEmpty(): Promise<void> {
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM users');
  const count = (rows as any[])[0]?.c || 0;
  if (count > 0) return;

  const now = nowStr();
  const admin = await pool.query(
    'INSERT INTO users (username,password,name,role,phone,status,created_at) VALUES (?,?,?,?,?,?,?)',
    ['admin', hashPwd('admin123'), '系统管理员', 'admin', '', 1, now]
  );
  const vetId = await pool.query(
    'INSERT INTO users (username,password,name,role,phone,status,created_at) VALUES (?,?,?,?,?,?,?)',
    ['vet', hashPwd('vet123'), '兽医小李', 'vet', '', 1, now]
  );
  const keeperId = await pool.query(
    'INSERT INTO users (username,password,name,role,phone,status,created_at) VALUES (?,?,?,?,?,?,?)',
    ['keeper', hashPwd('keeper123'), '饲养员小王', 'keeper', '13800000000', 1, now]
  );
  const keeper = (keeperId as any)[0].insertId;

  // 打卡设置默认值：示例坐标为广州市区，需后台修改为实际园区坐标
  const settings: [string, string, string][] = [
    ['checkin_lat', '23.129163', '打卡中心纬度'],
    ['checkin_lng', '113.264435', '打卡中心经度'],
    ['checkin_radius', '500', '打卡允许半径(米)'],
    ['work_start_time', '09:00', '上班时间(晚于此签到记为迟到)'],
    ['work_end_time', '18:00', '下班时间(参考)'],
    ['amap_key', '', '高德地图Web服务Key(可选,用于地图地址搜索命中国内POI)'],
  ];
  for (const [k, v, remark] of settings) {
    await pool.query('INSERT INTO settings (k,v,remark) VALUES (?,?,?)', [k, v, remark]);
  }

  // 笼舍
  const cages: [string, string][] = [
    ['1号笼舍', '东区'],
    ['2号笼舍', '东区'],
    ['3号笼舍', '西区'],
  ];
  for (const [name, location] of cages) {
    await pool.query('INSERT INTO cages (name,location,created_at) VALUES (?,?,?)', [
      name,
      location,
      now,
    ]);
  }

  // 饲料
  const feeds: [string, string][] = [
    ['苜蓿草', '克'],
    ['精饲料', '克'],
    ['鲜肉', '克'],
    ['水果', '克'],
  ];
  for (const [name, unit] of feeds) {
    await pool.query('INSERT INTO feeds (name,unit,created_at) VALUES (?,?,?)', [name, unit, now]);
  }

  // 药品/消毒剂
  const medicines: [string, string][] = [
    ['碘伏', '消毒'],
    ['多菌灵', '消毒'],
    ['阿莫西林', '用药'],
    ['益生菌', '用药'],
  ];
  for (const [name, category] of medicines) {
    await pool.query('INSERT INTO medicines (name,category,created_at) VALUES (?,?,?)', [
      name,
      category,
      now,
    ]);
  }

  // 示例动物（分配给饲养员keeper）
  const animals: [string, string, string, string, string, string][] = [
    ['小白', '猕猴', '母', '2岁', '1号笼舍', '正常'],
    ['大黄', '金毛犬', '公', '5岁', '2号笼舍', '正常'],
    ['萌萌', '大熊猫', '母', '4岁', '3号笼舍', '正常'],
    ['壮壮', '东北虎', '公', '6岁', '1号笼舍', '正常'],
  ];
  const cagesRows = await q<{ id: number; name: string }>('SELECT id,name FROM cages');
  const cageMap = new Map(cagesRows.map((c) => [c.name, c.id]));
  for (const [name, species, sex, age, cageName, health] of animals) {
    await pool.query(
      'INSERT INTO animals (cage_id,name,species,sex,age,health,keeper_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [cageMap.get(cageName) ?? null, name, species, sex, age, health, keeper, 1, now]
    );
  }

  console.log(`[seed] 已写入初始数据：admin/admin123, vet/vet123, keeper/keeper123 (admin id=${(admin as any)[0].insertId})`);
}
