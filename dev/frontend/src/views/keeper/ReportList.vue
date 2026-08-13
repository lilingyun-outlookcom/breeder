<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/profile" class="back">‹</RouterLink>
      <span class="title">🚨 我的异常上报</span>
    </div>
    <div class="mobile-body">
      <div v-for="r in list" :key="r.id" class="list-item" style="cursor: default">
        <div class="row">
          <div>
            <div class="title">{{ r.animal_name }} <span class="muted" style="font-weight: normal">#{{ r.id }}</span></div>
            <div class="sub">{{ r.symptoms }}</div>
            <div class="sub">{{ r.created_at?.slice(0, 16) }}</div>
            <div class="sub" v-if="r.resolution" style="color: var(--primary-dark)">处理结果：{{ r.resolution }}</div>
          </div>
          <StatusBadge :v="r.status" />
        </div>
        <div class="photo-grid mt8" v-if="r.photos?.length">
          <img v-for="p in r.photos" :key="p" :src="assetUrl(p)" class="ph" style="width: 56px; height: 56px" @click="preview = p" />
        </div>
      </div>
      <div v-if="!list.length" class="empty">暂无上报记录</div>

      <div v-if="preview" class="lightbox" @click="preview = ''">
        <img :src="assetUrl(preview)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, assetUrl } from '../../api';
import { errToast } from '../../toast';
import StatusBadge from '../../components/StatusBadge.vue';

const list = ref<any[]>([]);
const preview = ref('');

onMounted(async () => {
  try {
    list.value = await api.get('/keeper/reports');
  } catch (e) {
    errToast(e);
  }
});
</script>
