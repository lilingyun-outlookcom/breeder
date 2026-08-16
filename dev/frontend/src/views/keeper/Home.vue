<template>
  <div>
    <div class="mobile-top">
      <span class="title"><img :src="logo" alt="logo" class="logo-img" /> 饲养工作台</span>
      <span style="font-size: 12.5px">{{ auth.user?.name }}</span>
    </div>

    <div class="mobile-body">
      <!-- 打卡状态 -->
      <div class="att-card" @click="router.push('/keeper/checkin')">
        <div>
          <div style="font-size: 13px; opacity: 0.9">今日打卡</div>
          <div class="big">
            {{ attText }}
            <span v-if="att?.check_in_status === '迟到'" class="badge badge-danger" style="margin-left: 6px">迟到</span>
          </div>
          <div class="time">
            <template v-if="att?.check_in_at">签到 {{ att.check_in_at.slice(11, 16) }}</template>
            <template v-if="att?.check_out_at"> · 签退 {{ att.check_out_at.slice(11, 16) }}</template>
          </div>
        </div>
        <span class="btn">去打卡</span>
      </div>

      <!-- 统计 -->
      <div class="flex" style="gap: 8px; margin-bottom: 12px">
        <div class="card clickable" style="flex: 1; text-align: center; padding: 10px" @click="router.push('/keeper/tasks')">
          <div style="font-size: 20px; font-weight: 700">{{ data.tasks?.length ?? 0 }}</div>
          <div class="muted">今日待办</div>
        </div>
        <div class="card clickable" style="flex: 1; text-align: center; padding: 10px" @click="router.push('/keeper/tasks?type=medication')">
          <div style="font-size: 20px; font-weight: 700; color: var(--primary)">{{ data.medTasks?.length ?? 0 }}</div>
          <div class="muted">今日喂药</div>
        </div>
        <div class="card clickable" style="flex: 1; text-align: center; padding: 10px" @click="router.push('/keeper/animals')">
          <div style="font-size: 20px; font-weight: 700">{{ data.animalCount ?? 0 }}</div>
          <div class="muted">负责动物</div>
        </div>
      </div>

      <!-- 今日喂药清单 -->
      <div v-if="data.medTasks?.length" class="card" style="border-left: 4px solid #be185d">
        <div class="card-title">💊 今日喂药清单（{{ data.medTasks.length }}）</div>
        <div
          v-for="t in data.medTasks"
          :key="t.id"
          class="list-item"
          style="margin-bottom: 8px"
          @click="router.push('/keeper/task/' + t.id)"
        >
          <div class="row">
            <div>
              <div class="title">{{ t.animal_name || '动物' }}</div>
              <div class="sub">{{ t.medicine_name || '' }} · 截止 {{ t.due_time }}</div>
            </div>
            <StatusBadge :v="t.status" />
          </div>
        </div>
      </div>

      <!-- 今日待办 -->
      <div class="card">
        <div class="card-title">
          <span>📋 今日待办（{{ data.tasks?.length ?? 0 }}）</span>
          <RouterLink to="/keeper/tasks" class="link">全部 ›</RouterLink>
        </div>
        <div v-if="!data.tasks?.length" class="empty">今日暂无任务 🎉</div>
        <div
          v-for="t in data.tasks.slice(0, 5)"
          :key="t.id"
          class="list-item"
          style="margin-bottom: 8px"
          @click="router.push('/keeper/task/' + t.id)"
        >
          <div class="row">
            <div>
              <div class="title" :class="{ overdue: t.is_overdue }">
                {{ TYPE_LABEL[t.task_type] }} {{ t.is_overdue ? '⏰' : '' }}
              </div>
              <div class="sub">{{ taskSubject(t) }}</div>
            </div>
            <div class="right">
              <div :class="{ overdue: t.is_overdue }">{{ t.due_time }}</div>
              <StatusBadge :v="t.status" />
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷入口 -->
      <div class="card">
        <div class="card-title">⚡ 快捷入口</div>
        <div class="flex" style="flex-wrap: wrap; gap: 10px">
          <RouterLink class="btn btn-outline" to="/keeper/animals">🐾 我的动物</RouterLink>
          <RouterLink class="btn btn-outline" to="/keeper/report">🚨 异常上报</RouterLink>
          <RouterLink class="btn btn-outline" to="/keeper/breeding">🐣 繁育任务</RouterLink>
          <RouterLink class="btn btn-outline" to="/keeper/attendance-history">🕐 我的打卡记录</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import { auth } from '../../store';
import { errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const router = useRouter();
const logo = import.meta.env.BASE_URL + 'logo.jpg';
const data = ref<any>({ tasks: [] });
const att = ref<any>(null);

const TYPE_LABEL: Record<string, string> = {
  feeding: '喂食任务', water: '换水任务', environment: '环境记录',
  disinfection: '笼舍消毒', medication: '用药复诊', breeding: '繁育跟进',
};

const attText = computed(() => {
  if (!att.value) return '未签到';
  if (att.value.check_out_at) return '已签退';
  if (att.value.check_in_at) return '已签到';
  return '未签到';
});

function taskSubject(t: any) {
  const parts = [t.cage_name, t.animal_name, t.feed_name, t.medicine_name].filter(Boolean);
  return parts.length ? parts.join(' / ') : t.title || '-';
}

async function load() {
  try {
    const d = await api.get('/keeper/home');
    data.value = d;
    att.value = d.attendance;
  } catch (e) {
    errToast(e);
  }
}

onMounted(load);
</script>
