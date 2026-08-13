<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/home" class="back">‹</RouterLink>
      <span class="title">🐣 繁育任务</span>
    </div>
    <div class="mobile-body">
      <div v-if="!plans.length" class="empty">暂无繁育计划</div>
      <div v-for="p in plans" :key="p.id" class="list-item" style="cursor: default">
        <div class="row">
          <div>
            <div class="title">
              <span class="badge" :class="p.plan_type === '妊娠' ? 'badge-danger' : 'badge-info'">{{ p.plan_type }}</span>
              {{ p.female_name }}
            </div>
            <div class="sub">公兽：{{ p.male_name || '-' }} · {{ p.start_date }} ~ {{ p.due_date }}</div>
            <div class="sub" v-if="p.remark">备注：{{ p.remark }}</div>
          </div>
          <StatusBadge :v="p.status === 'active' ? 'active' : 'done'" />
        </div>
        <button v-if="p.status === 'active'" class="btn btn-outline btn-sm mt8" @click="goTask(p)">
          去完成今日跟进
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import { toast, errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const router = useRouter();
const plans = ref<any[]>([]);

async function goTask(p: any) {
  try {
    const tasks = await api.get('/tasks' + api.qs({ type: 'breeding', animal_id: '' }));
    const mine = tasks.find(
      (t: any) => String(t.animal_id) === String(p.female_animal_id) && t.status !== 'done'
    );
    if (mine) router.push('/keeper/task/' + mine.id);
    else toast('今日暂无该计划的跟进任务');
  } catch (e) {
    errToast(e);
  }
}

onMounted(async () => {
  try {
    plans.value = await api.get('/breeding-plans');
  } catch (e) {
    errToast(e);
  }
});
</script>
