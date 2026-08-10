import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { requireAuth } from '../auth';
import { config } from '../config';
import { execute } from '../db';
import { ok, fail } from './helpers';
import { nowStr } from '../util';

const router = Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const d = new Date();
    const dir = path.join(config.uploadDir, `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext.toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 9 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      cb(new Error('仅支持 jpg/png/gif/webp 图片'));
      return;
    }
    cb(null, true);
  },
});

router.post('/', requireAuth, (req, res, next) => {
  upload.array('files', 9)(req, res, async (err: any) => {
    if (err) return fail(res, err.message || '上传失败');
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return fail(res, '未接收到文件');
    const urls: string[] = [];
    for (const f of files) {
      const rel = path.relative(config.uploadDir, f.path).split(path.sep).join('/');
      const url = `${config.uploadUrlPrefix}/${rel}`;
      urls.push(url);
    }
    try {
      const now = nowStr();
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        await execute(
          'INSERT INTO uploads (filename,path,size,mime,uploader_id,created_at) VALUES (?,?,?,?,?,?)',
          [f.filename, urls[i], f.size, f.mimetype, req.user!.id, now]
        );
      }
    } catch {
      // 上传记录失败不影响主流程
    }
    ok(res, { urls });
  });
});

export default router;
