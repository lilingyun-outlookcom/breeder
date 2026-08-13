<template>
  <span class="badge" :class="cls">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ v: string }>();

const map: Record<string, [string, string]> = {
  pending: ['待处理', 'badge-warn'],
  processing: ['处理中', 'badge-info'],
  done: ['已完成', 'badge-ok'],
  active: ['进行中', 'badge-ok'],
  normal: ['正常', 'badge-ok'],
  late: ['迟到', 'badge-danger'],
  good: ['良好', 'badge-ok'],
  abnormal: ['异常', 'badge-danger'],
};

const text = computed(() => map[props.v]?.[0] || props.v);
const cls = computed(() => map[props.v]?.[1] || 'badge-dark');
</script>
