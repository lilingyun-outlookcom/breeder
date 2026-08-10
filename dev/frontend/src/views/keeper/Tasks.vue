<template>
  <div>
    <div class="mobile-top">
      <span class="title">📋 我的任务</span>
    </div>
    <div class="mobile-body">
      <div class="card" style="padding: 10px 12px">
        <div class="flex" style="gap: 8px">
          <input v-model="date" type="date" @change="load" />
          <select v-model="type" @change="load" style="width: 120px">
            <option value="">全部类型</option>
            <option v-for="(l, k) in TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
          </select>
        </div>
      </div>

      <div class="mt8">
        <div v-if="!tasks.length" class="empty">
          {{ loading ? '加载中…' : '当日暂无任务 🎉' }}
        </div>
        <div
          v-for="t in tasks"
          :key="t.id"
          class="list-item"
          @click="router.push('/keeper/task/' + t.id)"
        >
          <div class="row">
            <div>
              <div class="title" :class="{ overdue: t.is_overdue }">
                <span class="tag-type" :class="'tag-' + t.task_type">{{ TYPE_LABEL[t.task_type] }}</span>
                {{ t.is_overdue ? ' ⏰ 已逾期' : '' }}
              </div>
              <div class="sub">{{ taskSubject(t) }}</div>
              <div class="sub">截止 {{ t.due_time }}</div>
            </div>
            <div class="right">
              <StatusBadge :v="t.status" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import { errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const router = useRouter();
const tasks = ref<any[]>([]);
const date = ref(today());
const type = ref('');
const loading = ref(true);

const TYPE_LABEL: Record<string, string> = {
  feeding: '喂食', water: '换水', environment: '环境',
  disinfection: '消毒', medication: '用药', breeding: '繁育',
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function taskSubject(t: any) {
  const parts = [t.cage_name, t.animal_name, t.feed_name, t.medicine_name].filter(Boolean);
  return parts.length ? parts.join(' / ') : t.title || '-';
}

async function load() {
  loading.value = true;
  try {
    tasks.value = await api.get('/tasks' + api.qs({ date: date.value, type: type.value }));
  } catch (e) {
    errToast(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.tag-feeding { background: #dbeafe; color: #1d4ed8; }
.tag-water { background: #cffafe; color: #0e7490; }
.tag-environment { background: #dcfce7; color: #15803d; }
.tag-disinfection { background: #fef3c7; color: #b45309; }
.tag-medication { background: #fce7f3; color: #be185d; }
.tag-breeding { background: #ede9fe; color: #6d28d9; }
</style>
