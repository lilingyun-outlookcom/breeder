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

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'];

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
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (ALLOWED_MIME.includes(file.mimetype) || ALLOWED_EXT.includes(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error('不支持的附件类型，仅支持图片、文档与压缩包'));
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
