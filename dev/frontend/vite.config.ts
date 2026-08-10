import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base 由构建脚本通过 VITE_BASE_PATH 注入（/dev/ 或 /prod/），
// 后端经 Apache 反代时剥离前缀，所以产物以相对自身 base 的绝对路径引用。
export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_BASE_PATH || '/prod/',
  build: {
    // dev 构建默认输出到 ../backend/public（由后端直接提供）
    // prod 构建通过 VITE_OUTDIR=../dist-prod 输出，再同步到生产目录
    outDir: process.env.VITE_OUTDIR || '../backend/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/uploads': 'http://127.0.0.1:3000',
    },
  },
});
