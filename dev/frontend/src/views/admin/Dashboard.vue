<template>
  <div>
    <div class="stat-grid">
      <div class="stat-card clickable" @click="router.push('/admin/attendance')">
        <div class="num">{{ s.keeperCount ?? '-' }}</div>
        <div class="label">在岗饲养员</div>
        <div class="icon">👥</div>
      </div>
      <div class="stat-card clickable" @click="router.push('/admin/attendance')">
        <div class="num">{{ s.checkedToday ?? '-' }}<span style="font-size: 14px; color: var(--text-3)"> / {{ s.keeperCount ?? 0 }}</span></div>
        <div class="label">今日已签到（迟到 {{ s.lateToday ?? 0 }}）</div>
        <div class="icon">🕐</div>
      </div>
      <div class="stat-card clickable" @click="router.push('/admin/tasks')">
        <div class="num">{{ s.tasksToday?.done ?? 0 }}<span style="font-size: 14px; color: var(--text-3)"> / {{ totalTasks }}</span></div>
        <div class="label">今日任务完成率</div>
        <div class="icon">📋</div>
      </div>
      <div class="stat-card clickable" style="border-left: 3px solid var(--danger)" @click="router.push('/admin/tasks')">
        <div class="num" style="color: var(--danger)">{{ s.overdueToday ?? 0 }}</div>
        <div class="label">今日逾期任务</div>
        <div class="icon">⏰</div>
      </div>
      <div class="stat-card clickable" style="border-left: 3px solid var(--warning)" @click="router.push('/admin/reports')">
        <div class="num" style="color: var(--warning)">{{ s.pendingTickets ?? 0 }}</div>
        <div class="label">待处理异常工单</div>
        <div class="icon">🚨</div>
      </div>
      <div class="stat-card clickable" @click="router.push('/admin/animals')">
        <div class="num">{{ s.animalCount ?? '-' }}</div>
        <div class="label">在册动物</div>
        <div class="icon">🐾</div>
      </div>
    </div>

    <div class="flex" style="gap: 10px; flex-wrap: wrap; margin-bottom: 12px">
      <RouterLink class="btn" to="/admin/tasks">+ 配置任务</RouterLink>
      <RouterLink class="btn btn-warn" to="/admin/reports">处理异常工单</RouterLink>
    </div>

    <div class="card">
      <div class="card-title">📋 今日任务（{{ s.today }}）</div>
      <div class="flex" style="gap: 20px; flex-wrap: wrap">
        <div>待处理 <b>{{ s.tasksToday?.pending ?? 0 }}</b></div>
        <div>处理中 <b>{{ s.tasksToday?.processing ?? 0 }}</b></div>
        <div style="color: var(--primary)">已完成 <b>{{ s.tasksToday?.done ?? 0 }}</b></div>
        <div style="color: var(--danger)">逾期 <b>{{ s.overdueToday ?? 0 }}</b></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>🚨 最新异常工单</span>
        <RouterLink to="/admin/reports" class="link">全部 ›</RouterLink>
      </div>
      <div v-if="!tickets.length" class="empty">暂无异常工单</div>
      <div class="table-wrap" v-else>
        <table class="tbl">
          <thead>
            <tr><th>动物</th><th>症状</th><th>上报人</th><th>时间</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets" :key="t.id">
              <td>{{ t.animal_name }}</td>
              <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ t.symptoms }}</td>
              <td>{{ t.reporter_name }}</td>
              <td>{{ t.created_at?.slice(5, 16) }}</td>
              <td><StatusBadge :v="t.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import { errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const router = useRouter();

const s = ref<any>({ tasksToday: {} });
const tickets = ref<any[]>([]);
const totalTasks = computed(() => (s.value.tasksToday?.pending ?? 0) + (s.value.tasksToday?.processing ?? 0) + (s.value.tasksToday?.done ?? 0));

onMounted(async () => {
  try {
    s.value = await api.get('/stats/dashboard');
    tickets.value = (await api.get('/reports?status=pending')).slice(0, 6);
  } catch (e) {
    errToast(e);
  }
});
</script>
