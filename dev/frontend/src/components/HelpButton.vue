<template>
  <a v-if="variant === 'link'" class="help-entry" @click="onClick">❓ {{ label }}</a>
  <button v-else class="help-float" aria-label="帮助" title="帮助" @click="onClick">❓</button>
  <HelpModal :show="modalOpen" :doc="doc" @close="modalOpen = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import type { HelpDoc } from '../help/content';
import { findHelpDoc, HOME_PATHS, openFullManual } from '../help/content';
import HelpModal from './HelpModal.vue';

const props = withDefaults(
  defineProps<{ label?: string; variant?: 'link' | 'float' }>(),
  { label: '帮助', variant: 'link' }
);

const route = useRoute();
const modalOpen = ref(false);
const doc = ref<HelpDoc | undefined>();

function onClick() {
  // 首页/登录页：新标签页打开完整手册；其他页面：弹窗展示当前页手册
  if (HOME_PATHS.includes(route.path)) {
    openFullManual();
    return;
  }
  doc.value = findHelpDoc(route.path);
  if (!doc.value) {
    openFullManual();
    return;
  }
  modalOpen.value = true;
}
</script>

<style scoped>
.help-entry {
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}
.help-entry:hover {
  color: var(--primary);
}
.help-float {
  position: fixed;
  bottom: 76px;
  right: calc(max(0px, (100vw - 480px) / 2) + 16px);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
  opacity: 0.92;
}
.help-float:hover {
  opacity: 1;
}
.help-float:active {
  transform: scale(0.96);
}
</style>
