import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || (isProd ? '3001' : '3000'), 10),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'breeder',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || (isProd ? 'breeder_prod' : 'breeder_dev'),
  },
  jwtSecret: process.env.JWT_SECRET || 'breeder-dev-secret-change-me',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads', isProd ? 'prod' : 'dev'),
  uploadUrlPrefix: '/uploads',
  maxUploadMb: 10,
  reminderIntervalSec: 30,
};
