<template>
  <div>
    <div class="filters mb8">
      <div class="seg" style="max-width: 560px; flex-wrap: wrap">
        <button v-for="(item, key) in TYPES" :key="key" :class="{ active: type === key }" @click="type = key; load()">
          {{ item.label }}
        </button>
      </div>
      <input v-model="f.date" type="date" @change="load" />
    </div>

    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>ID</th>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
            <th>照片</th>
            <th>备注</th>
            <th>记录人</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>{{ r.id }}</td>
            <td v-for="col in columns" :key="col.key">
              <span v-if="col.key === 'photos'"></span>
              <StatusBadge v-else-if="col.badge" :v="r[col.key]" />
              <template v-else>{{ r[col.key] || '-' }}</template>
            </td>
            <td>
              <div class="flex" style="gap: 4px">
                <img v-for="p in r.photos" :key="p" :src="assetUrl(p)" class="ph-img" style="width: 32px; height: 32px" @click="preview = p" />
                <span v-if="!r.photos?.length" class="muted">-</span>
              </div>
            </td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ r.note || '-' }}</td>
            <td>{{ r.user_name }}</td>
            <td class="muted">{{ r.created_at?.slice(0, 16) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="empty">暂无记录</div>
    </div>

    <div v-if="preview" class="lightbox" @click="preview = ''">
      <img :src="assetUrl(preview)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { api, assetUrl } from '../../api';
import { errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const TYPES: Record<string, { label: string; cols: { key: string; label: string; badge?: boolean }[] }> = {
  feeding: {
    label: '喂食记录',
    cols: [
      { key: 'cage_name', label: '笼舍' },
      { key: 'animal_name', label: '动物' },
      { key: 'feed_name', label: '饲料' },
      { key: 'quantity', label: '数量' },
      { key: 'intake', label: '采食', badge: true },
    ],
  },
  water: {
    label: '换水记录',
    cols: [
      { key: 'cage_name', label: '笼舍' },
      { key: 'amount', label: '换水量(L)' },
      { key: 'quality', label: '水质', badge: true },
    ],
  },
  environment: {
    label: '环境记录',
    cols: [
      { key: 'cage_name', label: '笼舍' },
      { key: 'temperature', label: '温度(℃)' },
      { key: 'humidity', label: '湿度(%)' },
      { key: 'ventilation', label: '通风', badge: true },
      { key: 'cleanliness', label: '整洁', badge: true },
      { key: 'abnormal', label: '异常标记' },
    ],
  },
  disinfection: {
    label: '消毒记录',
    cols: [
      { key: 'cage_name', label: '笼舍' },
      { key: 'medicine_name', label: '消毒药品' },
    ],
  },
  medication: {
    label: '用药记录',
    cols: [
      { key: 'animal_name', label: '动物' },
      { key: 'medicine_name', label: '药品' },
      { key: 'dosage', label: '用量' },
    ],
  },
  breeding: {
    label: '繁育记录',
    cols: [
      { key: 'animal_name', label: '动物' },
      { key: 'record_type', label: '类型' },
      { key: 'mother_intake', label: '母兽采食', badge: true },
      { key: 'body_abnormal', label: '身体异常' },
    ],
  },
};

const type = ref('feeding');
const list = ref<any[]>([]);
const f = reactive({ date: '' });
const preview = ref('');

const columns = computed(() => TYPES[type.value].cols);

async function load() {
  try {
    list.value = await api.get('/records/' + type.value + api.qs(f));
  } catch (e) {
    errToast(e);
  }
}

onMounted(load);
</script>
