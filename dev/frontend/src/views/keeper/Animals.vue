<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/home" class="back">‹</RouterLink>
      <span class="title">🐾 我的动物</span>
    </div>
    <div class="mobile-body">
      <div v-for="a in list" :key="a.id" class="list-item" style="cursor: default">
        <div class="row">
          <div class="flex" style="gap: 10px">
            <img v-if="a.photo" :src="assetUrl(a.photo)" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover" />
            <div v-else style="width: 48px; height: 48px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 22px">🐾</div>
            <div>
              <div class="title">{{ a.name }}</div>
              <div class="sub">{{ a.species }} · {{ a.sex }} · {{ a.age }}</div>
              <div class="sub">笼舍：{{ a.cage_name || '未分配' }} · 总数量：{{ a.total }}</div>
            </div>
          </div>
          <span class="badge" :class="a.health === '正常' ? 'badge-ok' : 'badge-danger'">{{ a.health }}</span>
        </div>
      </div>
      <div v-if="!list.length" class="empty">暂无负责动物</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, assetUrl } from '../../api';
import { errToast } from '../../toast';

const list = ref<any[]>([]);
onMounted(async () => {
  try {
    list.value = await api.get('/keeper/animals');
  } catch (e) {
    errToast(e);
  }
});
</script>
