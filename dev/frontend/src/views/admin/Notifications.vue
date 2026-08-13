<template>
  <div>
    <div class="page-head">
      <div class="muted">共 {{ list.length }} 条，其中未读 {{ unread }} 条</div>
      <button class="btn btn-ghost" @click="readAll">全部已读</button>
    </div>
    <div class="card" style="padding: 6px 12px">
      <div v-for="n in list" :key="n.id" class="list-item" :style="{ cursor: 'default', opacity: n.is_read ? 0.7 : 1, background: n.is_read ? '#f9fafb' : '#fff' }">
        <div class="row">
          <div>
            <b>{{ n.title }}</b>
            <span class="badge" :class="n.type === 'task_overdue' ? 'badge-danger' : n.type === 'task_due_soon' ? 'badge-warn' : 'badge-info'" style="margin-left: 8px">
              {{ n.type === 'task_overdue' ? '逾期' : n.type === 'task_due_soon' ? '临期' : '系统' }}
            </span>
            <div class="sub">{{ n.content }}</div>
            <div class="sub">{{ n.created_at }}</div>
          </div>
          <button v-if="!n.is_read" class="btn btn-ghost btn-sm" @click="read(n)">标已读</button>
        </div>
      </div>
      <div v-if="!list.length" class="empty">暂无消息</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../../api';
import { errToast } from '../../toast';

const list = ref<any[]>([]);
const unread = computed(() => list.value.filter((n) => !n.is_read).length);

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
