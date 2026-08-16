<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/home" class="back">‹</RouterLink>
      <span class="title">{{ form.report_type === 'death' ? '💀 动物死亡上报' : '🚨 动物异常上报' }}</span>
    </div>
    <div class="mobile-body">
      <div class="card">
        <div class="form-item">
          <label>上报类型</label>
          <div class="radio-group">
            <span class="radio-item" :class="{ active: form.report_type === 'abnormal' }" @click="form.report_type = 'abnormal'">🚨 异常情况</span>
            <span class="radio-item" :class="{ active: form.report_type === 'death' }" @click="form.report_type = 'death'">💀 动物死亡</span>
          </div>
        </div>
        <div class="form-item">
          <label class="required">选择动物</label>
          <select v-model="form.animal_id">
            <option value="">选择动物</option>
            <option v-for="a in animals" :key="a.id" :value="a.id">{{ a.name }}（{{ a.species }}）</option>
          </select>
        </div>
        <div class="form-item" v-if="form.report_type === 'death'">
          <label class="required">死亡只数</label>
          <input v-model="form.died_count" type="number" min="1" placeholder="群体填只数，个体填 1" />
        </div>
        <div class="form-item" v-else>
          <label>优先级</label>
          <div class="radio-group">
            <span v-for="s in ['低', '中', '高']" :key="s" class="radio-item" :class="{ active: form.priority === s }" @click="form.priority = s">{{ s }}</span>
          </div>
        </div>
        <div class="form-item">
          <label class="required">{{ form.report_type === 'death' ? '死亡情况说明' : '症状描述' }}</label>
          <textarea v-model="form.symptoms" :placeholder="form.report_type === 'death' ? '请描述死亡情况、发现时间、疑似原因…' : '请详细描述动物的异常表现，如：食欲不振、精神萎靡、皮肤红肿…'" style="min-height: 90px"></textarea>
        </div>
        <div class="form-item">
          <label>上传照片</label>
          <PhotoUpload v-model="form.photos" />
        </div>
        <button class="btn btn-block btn-lg" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中…' : '提交上报' }}
        </button>
        <p class="muted mt8" style="text-align: center">{{ form.report_type === 'death' ? '死亡上报由后台确认后才会扣减动物数量' : '提交后后台将收到工单并安排处理' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import { toast, errToast } from '../../toast';
import PhotoUpload from '../../components/PhotoUpload.vue';

const router = useRouter();
const animals = ref<any[]>([]);
const submitting = ref(false);
const form = reactive({ animal_id: '', report_type: 'abnormal', died_count: 1, symptoms: '', priority: '中', photos: [] as string[] });

async function submit() {
  if (!form.animal_id) return toast('请选择动物', 'err');
  if (form.report_type === 'death') {
    const died = Number(form.died_count);
    if (!died || died < 1) return toast('请填写死亡只数', 'err');
    if (!form.symptoms) return toast('请描述死亡情况', 'err');
  } else if (!form.symptoms) {
    return toast('请描述症状', 'err');
  }
  submitting.value = true;
  try {
    await api.post('/reports/abnormal', form);
    toast('上报成功，已通知后台');
    router.replace('/keeper/home');
  } catch (e) {
    errToast(e);
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    animals.value = await api.get('/keeper/animals');
  } catch (e) {
    errToast(e);
  }
});
</script>
