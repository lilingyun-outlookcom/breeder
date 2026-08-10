import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { pool, initSchema } from './db';
import { seedIfEmpty } from './seed';
import { startReminder } from './reminder';

import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import tasksRouter from './routes/tasks';
import attendanceRouter from './routes/attendance';
import recordsRouter from './routes/records';
import ticketsRouter from './routes/tickets';
import keeperRouter from './routes/keeper';
import notificationsRouter from './routes/notifications';
import uploadRouter from './routes/upload';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env, time: new Date().toISOString() });
});

// 业务路由
app.use('/api/auth', authRouter);
app.use('/api', adminRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/records', recordsRouter);
app.use('/api', ticketsRouter);
app.use('/api/keeper', keeperRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/upload', uploadRouter);

// 上传文件
app.use('/uploads', express.static(config.uploadDir));

// 前端静态资源（Vite 构建产物，base 为 /dev/ 或 /prod/，经 Apache 反代剥离前缀）
app.use(express.static(path.join(__dirname, '../public')));

// API 404
app.use('/api', (_req, res) => {
  res.status(404).json({ code: 1, msg: '接口不存在' });
});

// 统一错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ code: 1, msg: err?.message || '服务器内部错误' });
});

async function main() {
  try {
    await initSchema();
    await seedIfEmpty();
  } catch (e: any) {
    console.error('数据库初始化失败，请检查 MySQL 是否已安装并初始化:', e.message);
    process.exit(1);
  }
  startReminder();
  app.listen(config.port, () => {
    console.log(`饲养员服务平台 [${config.env}] 监听端口 ${config.port}`);
  });
}

main();

// 优雅退出
process.on('SIGINT', () => {
  pool.end().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  pool.end().finally(() => process.exit(0));
});
