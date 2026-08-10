<template>
  <Teleport to="body">
    <div v-if="show" class="modal-mask" @click.self="$emit('close')">
      <div class="modal" :class="{ 'modal-lg': size === 'lg' }">
        <div class="modal-title">
          <span>{{ title }}</span>
          <span class="modal-close" @click="$emit('close')">✕</span>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ show: boolean; title?: string; size?: 'sm' | 'lg' }>();
defineEmits<{ (e: 'close'): void }>();
</script>
