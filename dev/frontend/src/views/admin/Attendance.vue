<template>
  <div>
    <div class="filters mb8">
      <input v-model="f.date" type="date" @change="load" />
      <select v-model="f.user_id" @change="load">
        <option value="">全部饲养员</option>
        <option v-for="u in keepers" :key="u.id" :value="u.id">{{ u.name }}</option>
      </select>
      <span class="muted">今日：已签到 {{ summary.checked }}，迟到 {{ summary.late }}，未签到 {{ summary.uncheck }}</span>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>日期</th><th>姓名</th><th>签到时间</th><th>状态</th><th>签退时间</th><th>迟到</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in list" :key="a.id">
            <td>{{ a.date }}</td>
            <td>{{ a.user_name }}</td>
            <td>{{ a.check_in_at ? a.check_in_at.slice(11, 16) : '-' }}</td>
            <td><StatusBadge :v="a.check_in_status || '未签到'" /></td>
            <td>{{ a.check_out_at ? a.check_out_at.slice(11, 16) : '-' }}</td>
            <td>
              <span v-if="a.check_in_status === '迟到'" class="badge badge-danger">迟到</span>
              <span v-else class="muted">-</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="empty">暂无考勤记录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from '../../api';
import { errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const list = ref<any[]>([]);
const keepers = ref<any[]>([]);
const f = reactive({ date: today(), user_id: '' });

const summary = computed(() => ({
  checked: list.value.filter((a) => a.check_in_at).length,
  late: list.value.filter((a) => a.check_in_status === '迟到').length,
  uncheck: Math.max(0, keepers.value.length - list.value.filter((a) => a.check_in_at).length),
}));

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load() {
  try {
    list.value = await api.get('/attendance' + api.qs(f));
  } catch (e) {
    errToast(e);
  }
}

onMounted(async () => {
  const ks = await api.get('/users');
  keepers.value = ks.filter((u: any) => u.role === 'keeper');
  load();
});
</script>
