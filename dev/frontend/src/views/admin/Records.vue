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
            <th>照片/附件</th>
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
              <span v-else-if="col.key === 'change_type'">
                <span class="badge" :class="r.change_type === 'buy' ? 'badge-ok' : 'badge-danger'">{{ r.change_type === 'buy' ? '买入' : '灭失' }}</span>
              </span>
              <StatusBadge v-else-if="col.badge" :v="r[col.key]" />
              <template v-else>{{ r[col.key] || '-' }}</template>
            </td>
            <td>
              <div class="flex" style="gap: 4px; flex-wrap: wrap">
                <img v-for="p in r.photos" :key="p" :src="assetUrl(p)" loading="lazy" class="ph-img" style="width: 32px; height: 32px" @click="preview = p" />
                <template v-for="a in r.attachments || []" :key="a">
                  <img v-if="isImage(a)" :src="assetUrl(a)" loading="lazy" class="ph-img" style="width: 32px; height: 32px" @click="preview = a" />
                  <a v-else :href="assetUrl(a)" target="_blank" class="badge badge-info" :title="a.split('/').pop()">{{ fileExt(a) }}</a>
                </template>
                <span v-if="!r.photos?.length && !(r.attachments || []).length" class="muted">-</span>
              </div>
            </td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ r.note || '-' }}</td>
            <td>{{ r.user_name }}</td>
            <td class="muted">{{ r.created_at?.slice(0, 16) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="!list.length" class="empty">暂无记录</div>
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
  inventory_feed: {
    label: '饲料出入库',
    cols: [
      { key: 'item_name', label: '名称' },
      { key: 'change_type', label: '类型' },
      { key: 'quantity', label: '数量' },
    ],
  },
  inventory_medicine: {
    label: '药品出入库',
    cols: [
      { key: 'item_name', label: '名称' },
      { key: 'change_type', label: '类型' },
      { key: 'quantity', label: '数量' },
    ],
  },
};

const type = ref('feeding');
const list = ref<any[]>([]);
const f = reactive({ date: '' });
const preview = ref('');

/** 图片类文件按缩略图展示，其余附件以类型徽章展示 */
function isImage(u: string) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(u);
}
function fileExt(u: string) {
  const m = u.match(/\.([a-z0-9]+)(?:$|\?)/i);
  return (m ? m[1].toUpperCase() : 'FILE');
}

const columns = computed(() => TYPES[type.value].cols);

// 请求序号：快速切换记录类型时，只有最后一次请求的结果生效，避免旧响应覆盖新数据
let loadSeq = 0;
const loading = ref(false);

async function load() {
  const seq = ++loadSeq;
  const t = type.value;
  // 切换类型/日期时立即清空旧数据，避免图片未加载完、接口排队期间仍显示上一类型的记录
  list.value = [];
  loading.value = true;
  try {
    const data =
      t === 'inventory_feed' || t === 'inventory_medicine'
        ? await api.get('/inventory-records' + api.qs({ item_type: t === 'inventory_feed' ? 'feed' : 'medicine', date: f.date }))
        : await api.get('/records/' + t + api.qs(f));
    if (seq === loadSeq) list.value = data;
  } catch (e) {
    if (seq === loadSeq) errToast(e);
  } finally {
    if (seq === loadSeq) loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
/* 记录类型按钮：保持自然宽度不被挤压，容器可换行，避免按钮文字堆叠 */
.seg button {
  flex: 0 1 auto;
  padding: 7px 14px;
  white-space: nowrap;
}
</style>
