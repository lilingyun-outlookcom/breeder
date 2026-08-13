import { q, execute } from './db';
import { config } from './config';
import { nowStr } from './util';

/**
 * 逾期/临期任务提醒：
 * - 临期：截止前 30 分钟提醒一次
 * - 逾期：未按时完成提醒一次（饲养员 + 所有后台账号）
 * 以 notifications(type + related) 去重，只提醒一次。
 */

interface TaskRow {
  id: number;
  title: string;
  task_type: string;
  cage_name: string | null;
  animal_name: string | null;
  due_time: string;
  assignee_id: number;
  status: string;
}

function label(t: TaskRow): string {
  const who = [t.cage_name, t.animal_name].filter(Boolean).join(' ');
  return `${t.title}${who ? `（${who}）` : ''}`;
}

async function notify(relatedId: number, type: string, title: string, content: string): Promise<void> {
  // 去重：同一任务同一类型只发一次
  const [existed] = await q<{ c: number }>(
    "SELECT COUNT(*) c FROM notifications WHERE type=? AND related_type='task' AND related_id=?",
    [type, relatedId]
  );
  if (existed.c > 0) return;

  const recipients = await q<{ id: number }>(
    "SELECT id FROM users WHERE status=1 AND (role='admin' OR role='vet' OR id IN (SELECT assignee_id FROM tasks WHERE id=?))",
    [relatedId]
  );
  const now = nowStr();
  for (const r of recipients) {
    await execute(
      'INSERT INTO notifications (user_id,type,title,content,related_type,related_id,is_read,created_at) VALUES (?,?,?,?,?,?,0,?)',
      [r.id, type, title, content, 'task', relatedId, now]
    );
  }
}

export async function checkReminders(): Promise<void> {
  const now = nowStr();

  // 临期提醒（30 分钟内截止且尚未处理）
  const dueSoon = await q<TaskRow>(
    `SELECT t.*, c.name AS cage_name, a.name AS animal_name
     FROM tasks t
     LEFT JOIN cages c ON c.id=t.cage_id
     LEFT JOIN animals a ON a.id=t.animal_id
     WHERE t.status='pending' AND t.due_at > ? AND t.due_at <= ?`,
    [now, addMinutes(now, 30)]
  );
  for (const t of dueSoon) {
    await notify(t.id, 'task_due_soon', '任务临期提醒', `${label(t)} 将于 ${t.due_time} 截止，请及时处理`);
  }

  // 逾期提醒（超过截止时间未完成）
  const overdue = await q<TaskRow>(
    `SELECT t.*, c.name AS cage_name, a.name AS animal_name
     FROM tasks t
     LEFT JOIN cages c ON c.id=t.cage_id
     LEFT JOIN animals a ON a.id=t.animal_id
     WHERE t.status<>'done' AND t.due_at < ?`,
    [now]
  );
  for (const t of overdue) {
    await notify(t.id, 'task_overdue', '任务逾期提醒', `${label(t)} 应于 ${t.due_time} 完成，现已逾期，请尽快处理`);
  }
}

function addMinutes(dt: string, mins: number): string {
  const d = new Date(dt.replace(' ', 'T'));
  d.setMinutes(d.getMinutes() + mins);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

let timer: NodeJS.Timeout | null = null;

export function startReminder(): void {
  if (timer) return;
  const run = async () => {
    try {
      await checkReminders();
    } catch (e) {
      console.error('[reminder] 检查失败:', e);
    }
  };
  run();
  timer = setInterval(run, config.reminderIntervalSec * 1000);
}
