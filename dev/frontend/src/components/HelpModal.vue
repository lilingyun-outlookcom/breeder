<template>
  <Teleport to="body">
    <div v-if="show" class="modal-mask help-mask" @click.self="$emit('close')">
      <div class="modal modal-lg help-modal">
        <div class="modal-title help-title">
          <span>📖 {{ doc?.title || '操作手册' }}</span>
          <span class="modal-close" @click="$emit('close')">✕</span>
        </div>
        <div class="help-summary">{{ doc?.summary }}</div>
        <div class="help-body">
          <HelpDocBody :doc="doc" />
        </div>
        <div class="help-foot">
          <span class="help-hint muted">首页点击帮助会打开完整手册，其他页面弹窗展示当前页手册</span>
          <button class="btn btn-ghost btn-sm" @click="openFull">查看完整手册（新窗口）</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { HelpDoc } from '../help/content';
import { openFullManual } from '../help/content';
import HelpDocBody from './HelpDocBody.vue';

defineProps<{ show: boolean; doc?: HelpDoc }>();
defineEmits<{ (e: 'close'): void }>();
</script>

<style scoped>
.help-mask {
  z-index: 150;
}
.help-modal {
  max-width: 680px;
  padding: 18px 22px;
}
.help-title {
  margin-bottom: 6px;
}
.help-summary {
  color: var(--text-2);
  font-size: 13px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 10px;
}
.help-body {
  max-height: 56vh;
  overflow-y: auto;
  padding-right: 6px;
}
.help-foot {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.help-hint {
  font-size: 12px;
}
</style>
