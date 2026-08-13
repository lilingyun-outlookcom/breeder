<template>
  <div class="mobile-shell">
    <RouterView />
    <HelpButton variant="float" />
    <nav class="mobile-tabbar">
      <RouterLink to="/keeper/home">
        <span class="ic">🏠</span>首页
      </RouterLink>
      <RouterLink to="/keeper/tasks">
        <span class="ic">📋</span>任务
      </RouterLink>
      <RouterLink to="/keeper/checkin">
        <span class="ic">📍</span>打卡
      </RouterLink>
      <RouterLink to="/keeper/messages" style="position: relative">
        <span v-if="unread" class="unread-dot">{{ unread > 99 ? '99+' : unread }}</span>
        <span class="ic">🔔</span>消息
      </RouterLink>
      <RouterLink to="/keeper/profile">
        <span class="ic">👤</span>我的
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '../../api';
import HelpButton from '../../components/HelpButton.vue';

const unread = ref(0);
let timer: any = null;

async function refresh() {
  try {
    const c = await api.get('/notifications/unread-count');
    unread.value = c;
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  refresh();
  timer = setInterval(refresh, 30000);
});
onUnmounted(() => timer && clearInterval(timer));
</script>
