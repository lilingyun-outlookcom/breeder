<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/home" class="back">‹</RouterLink>
      <span class="title">🔔 消息提醒</span>
      <button class="btn btn-sm" style="background: rgba(255,255,255,0.25)" @click="readAll">全部已读</button>
    </div>
    <div class="mobile-body">
      <div
        v-for="n in list"
        :key="n.id"
        class="list-item"
        :style="{ cursor: 'default', opacity: n.is_read ? 0.65 : 1 }"
      >
        <div class="row">
          <div>
            <div class="title">
              {{ n.title }}
              <span class="badge" :class="n.type === 'task_overdue' ? 'badge-danger' : n.type === 'task_due_soon' ? 'badge-warn' : 'badge-info'" style="margin-left: 6px">
                {{ n.type === 'task_overdue' ? '逾期' : n.type === 'task_due_soon' ? '临期' : '系统' }}
              </span>
            </div>
            <div class="sub">{{ n.content }}</div>
            <div class="sub">{{ n.created_at }}</div>
          </div>
          <a v-if="!n.is_read" class="link" style="flex-shrink: 0" @click="read(n)">标已读</a>
        </div>
      </div>
      <div v-if="!list.length" class="empty">暂无消息</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../api';
import { errToast } from '../../toast';

const list = ref<any[]>([]);

async function load() {
  try {
    list.value = await api.get('/notifications');
  } catch (e) {
    errToast(e);
  }
}
async function read(n: any) {
  await api.put(`/notifications/read/${n.id}`);
  n.is_read = 1;
}
async function readAll() {
  await api.put('/notifications/read-all');
  load();
}
onMounted(load);
</script>
