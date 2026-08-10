<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/home" class="back">‹</RouterLink>
      <span class="title">🕐 我的打卡记录</span>
    </div>
    <div class="mobile-body">
      <div class="card" style="padding: 10px 12px">
        <div class="flex" style="gap: 8px">
          <input v-model="month" type="month" @change="load" />
          <span class="muted">出勤 {{ stat.checked }} 天 · 迟到 {{ stat.late }} 次</span>
        </div>
      </div>
      <div class="mt8">
        <div
          v-for="a in stat.list"
          :key="a.id"
          class="list-item"
          style="cursor: default"
        >
          <div class="row">
            <div>
              <div class="title">{{ a.date }}</div>
              <div class="sub">
                <template v-if="a.check_in_at">签到 {{ a.check_in_at.slice(11, 16) }}</template>
                <template v-else>未签到</template>
                <template v-if="a.check_out_at"> · 签退 {{ a.check_out_at.slice(11, 16) }}</template>
              </div>
            </div>
            <StatusBadge :v="a.check_in_status || '未签到'" />
          </div>
        </div>
        <div v-if="!stat.list?.length" class="empty">该月暂无打卡记录</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { api } from '../../api';
import { errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const month = ref(today().slice(0, 7));
const stat = reactive<any>({ list: [], checked: 0, late: 0 });

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load() {
  try {
    const s = await api.get('/attendance/history' + api.qs({ month: month.value }));
    Object.assign(stat, s);
  } catch (e) {
    errToast(e);
  }
}

onMounted(load);
</script>
