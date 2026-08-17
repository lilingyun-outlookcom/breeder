<template>
  <div class="env-badge" :class="isProd ? 'is-prod' : 'is-dev'">
    <i class="env-dot"></i>{{ isProd ? '生产环境' : '开发环境' }}
  </div>
</template>

<script setup lang="ts">
// BASE_URL 由构建时注入：/dev/ 或 /prod/，据此区分当前环境
const isProd = import.meta.env.BASE_URL.includes('/prod/');
</script>

<style scoped>
.env-badge {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9990;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  letter-spacing: 0.5px;
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  /* 纯标识，不拦截下方点击 */
  pointer-events: none;
  user-select: none;
}
.is-dev {
  background: rgba(22, 163, 74, 0.92);
}
.is-prod {
  background: rgba(220, 38, 38, 0.92);
}
.env-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}
</style>
