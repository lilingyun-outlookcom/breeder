<template>
  <div v-if="!isProd" class="env-banner">⚠ 开发环境 · 数据为测试数据，可随意操作</div>
</template>

<script setup lang="ts">
// BASE_URL 由构建时注入：/dev/ 或 /prod/
const isProd = import.meta.env.BASE_URL.includes('/prod/');
// 仅开发环境：给根元素打标记，全局样式据此让页面顶部让出横幅高度（生产无任何影响）
if (!isProd) document.documentElement.classList.add('env-dev');
</script>

<style scoped>
.env-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
  z-index: 9990;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #f97316;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  /* 纯提示横幅，不拦截下方点击 */
  pointer-events: none;
  user-select: none;
}
</style>
