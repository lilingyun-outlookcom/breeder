<template>
  <div class="photo-grid">
    <div v-for="(u, i) in urls" :key="u" class="ph-wrap">
      <img :src="assetUrl(u)" class="ph" @click="preview = u" />
      <span class="del" @click="remove(i)">×</span>
    </div>
    <button v-if="urls.length < max" class="add" @click="pick">+</button>
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="onChange"
    />
    <div v-if="preview" class="lightbox" @click="preview = ''">
      <img :src="assetUrl(preview)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { uploadFiles, assetUrl } from '../api';
import { toast, errToast } from '../toast';

const props = withDefaults(defineProps<{ modelValue?: string[]; max?: number }>(), {
  modelValue: () => [],
  max: 9,
});
const emit = defineEmits<{ (e: 'update:modelValue', v: string[]): void }>();

const inputRef = ref<HTMLInputElement | null>(null);
const preview = ref('');
const uploading = ref(false);

const urls = computed(() => props.modelValue || []);

function pick() {
  inputRef.value?.click();
}

async function onChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  (e.target as HTMLInputElement).value = '';
  if (!files.length) return;
  if (uploading.value) return;
  uploading.value = true;
  try {
    const keep = urls.value.length + files.length > props.max ? props.max - urls.value.length : files.length;
    const urls2 = await uploadFiles(files.slice(0, keep));
    emit('update:modelValue', [...urls.value, ...urls2]);
    toast(`已上传 ${urls2.length} 张`);
  } catch (e) {
    errToast(e);
  } finally {
    uploading.value = false;
  }
}

function remove(i: number) {
  const next = [...urls.value];
  next.splice(i, 1);
  emit('update:modelValue', next);
}
</script>
