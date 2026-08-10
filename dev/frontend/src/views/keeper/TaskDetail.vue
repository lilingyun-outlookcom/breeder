<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/tasks" class="back">‹</RouterLink>
      <span class="title">{{ TYPE_LABEL[t.task_type] }}详情</span>
    </div>

    <div class="mobile-body" v-if="task">
      <!-- 任务信息 -->
      <div class="card">
        <div class="flex-between">
          <div>
            <div class="title" style="font-size: 16px; font-weight: 700" :class="{ overdue: task.is_overdue }">
              {{ task.title }}
            </div>
            <div class="sub muted mt8">
              {{ subject }}
              <template v-if="task.quantity"> · 数量 {{ task.quantity }} {{ task.quantity_unit }}</template>
            </div>
          </div>
          <StatusBadge :v="task.status" />
        </div>
        <div class="divider"></div>
        <div class="flex-between">
          <span class="muted">日期 {{ task.task_date }} · 截止 {{ task.due_time }}</span>
          <span v-if="task.is_overdue" class="badge badge-danger">⏰ 已逾期</span>
          <span v-else-if="task.status === 'done' && task.done_at" class="muted">完成于 {{ task.done_at.slice(11, 16) }}</span>
        </div>
      </div>

      <!-- 状态操作 -->
      <div class="card">
        <div class="card-title">🔄 任务状态</div>
        <div class="flex" style="gap: 8px">
          <button v-if="task.status !== 'done'" class="btn" style="flex: 1" @click="setStatus('processing')">
            {{ task.status === 'processing' ? '✓ 正在处理中' : '开始处理' }}
          </button>
          <button v-if="task.status !== 'done'" class="btn btn-outline" style="flex: 1" @click="setStatus('done')">
            标记完成（无记录）
          </button>
        </div>
        <p class="muted mt8" v-if="task.status !== 'done'">
          💡 填写下方记录并提交将自动标记为已完成
        </p>
      </div>

      <!-- 记录表单 -->
      <div class="card">
        <div class="card-title">📝 填写{{ TYPE_LABEL[t.task_type] }}记录</div>

        <!-- 笼舍选择 -->
        <div class="form-item" v-if="needCage">
          <label class="required">笼舍</label>
          <select v-model="form.cage_id">
            <option value="">选择笼舍</option>
            <option v-for="c in cages" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <!-- 动物选择 -->
        <div class="form-item" v-if="needAnimal">
          <label class="required">动物</label>
          <select v-model="form.animal_id">
            <option value="">选择动物</option>
            <option v-for="a in filteredAnimals" :key="a.id" :value="a.id">{{ a.name }}（{{ a.species }}）</option>
          </select>
        </div>

        <!-- 饲料 -->
        <div class="form-item" v-if="t.task_type === 'feeding'">
          <label class="required">饲料名称</label>
          <select v-model="form.feed_id">
            <option value="">选择饲料</option>
            <option v-for="f in feeds" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>

        <!-- 数量 -->
        <div class="form-item" v-if="t.task_type === 'feeding'">
          <label class="required">饲喂数量</label>
          <div class="flex" style="gap: 6px">
            <input v-model="form.quantity" type="number" placeholder="数量" style="flex: 1" />
            <input v-model="form.quantity_unit" placeholder="单位" style="width: 90px" />
          </div>
        </div>

        <div class="form-item" v-if="t.task_type === 'feeding'">
          <label>采食情况</label>
          <div class="radio-group">
            <span v-for="s in ['正常', '少吃', '拒食']" :key="s" class="radio-item" :class="{ active: form.intake === s }" @click="form.intake = s">{{ s }}</span>
          </div>
        </div>

        <!-- 换水 -->
        <template v-if="t.task_type === 'water'">
          <div class="form-item">
            <label class="required">换水量（升）</label>
            <input v-model="form.amount" type="number" placeholder="换水量" />
          </div>
          <div class="form-item">
            <label>水质</label>
            <div class="radio-group">
              <span v-for="s in ['正常', '异常']" :key="s" class="radio-item" :class="{ active: form.quality === s }" @click="form.quality = s">{{ s }}</span>
            </div>
          </div>
        </template>

        <!-- 环境 -->
        <template v-if="t.task_type === 'environment'">
          <div class="form-row">
            <div class="form-item">
              <label class="required">温度（℃）</label>
              <input v-model="form.temperature" type="number" step="0.1" placeholder="如 26.5" />
            </div>
            <div class="form-item">
              <label class="required">湿度（%）</label>
              <input v-model="form.humidity" type="number" step="0.1" placeholder="如 65" />
            </div>
          </div>
          <div class="form-item">
            <label>通风情况</label>
            <div class="radio-group">
              <span v-for="s in ['良好', '一般', '差']" :key="s" class="radio-item" :class="{ active: form.ventilation === s }" @click="form.ventilation = s">{{ s }}</span>
            </div>
          </div>
          <div class="form-item">
            <label>整洁情况</label>
            <div class="radio-group">
              <span v-for="s in ['良好', '一般', '差']" :key="s" class="radio-item" :class="{ active: form.cleanliness === s }" @click="form.cleanliness = s">{{ s }}</span>
            </div>
          </div>
          <div class="form-item">
            <label class="flex" style="gap: 8px; cursor: pointer">
              <input type="checkbox" v-model="form.abnormal" style="width: auto" />
              参数超标，标记异常并上报
            </label>
          </div>
        </template>

        <!-- 消毒 -->
        <div class="form-item" v-if="t.task_type === 'disinfection'">
          <label class="required">消毒药品</label>
          <select v-model="form.medicine_id">
            <option value="">选择消毒药品</option>
            <option v-for="m in disinfectants" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>

        <!-- 用药 -->
        <template v-if="t.task_type === 'medication'">
          <div class="form-item">
            <label class="required">药品</label>
            <select v-model="form.medicine_id">
              <option value="">选择药品</option>
              <option v-for="m in meds" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="form-item">
            <label>用量</label>
            <input v-model="form.dosage" placeholder="如：2片/次" />
          </div>
        </template>

        <!-- 繁育 -->
        <template v-if="t.task_type === 'breeding'">
          <div class="form-item">
            <label>记录类型</label>
            <div class="radio-group">
              <span class="radio-item" :class="{ active: form.record_type === '跟进' }" @click="form.record_type = '跟进'">日常跟进</span>
              <span class="radio-item" :class="{ active: form.record_type === '分娩登记' }" @click="form.record_type = '分娩登记'">分娩登记</span>
            </div>
          </div>
          <template v-if="form.record_type === '跟进'">
            <div class="form-item">
              <label>母兽采食</label>
              <div class="radio-group">
                <span v-for="s in ['正常', '少吃', '拒食']" :key="s" class="radio-item" :class="{ active: form.mother_intake === s }" @click="form.mother_intake = s">{{ s }}</span>
              </div>
            </div>
            <div class="form-item">
              <label>身体异常情况</label>
              <input v-model="form.body_abnormal" placeholder="如：精神状态不佳 / 无异常" />
            </div>
          </template>
          <template v-else>
            <div class="form-row">
              <div class="form-item">
                <label class="required">总产仔数</label>
                <input v-model="form.total_born" type="number" min="1" />
              </div>
              <div class="form-item">
                <label class="required">存活数量</label>
                <input v-model="form.alive_count" type="number" min="0" />
              </div>
            </div>
          </template>
        </template>

        <!-- 照片 -->
        <div class="form-item">
          <label>拍照上传</label>
          <PhotoUpload v-model="form.photos" />
        </div>

        <div class="form-item">
          <label>备注</label>
          <textarea v-model="form.note" placeholder="选填" style="min-height: 56px"></textarea>
        </div>

        <div class="form-actions">
          <button class="btn btn-block btn-lg" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中…' : '提交记录并完成' }}
          </button>
        </div>
      </div>

      <!-- 幼崽成长记录（繁育任务） -->
      <div class="card" v-if="t.task_type === 'breeding'">
        <div class="card-title">🐣 幼崽成长记录</div>
        <div class="form-row">
          <div class="form-item">
            <label>幼崽编号</label>
            <input v-model="cub.cub_no" type="number" min="1" placeholder="如 1" />
          </div>
          <div class="form-item">
            <label>体重（g）</label>
            <input v-model="cub.weight" type="number" step="0.01" placeholder="如 320.5" />
          </div>
        </div>
        <div class="form-item">
          <label>健康状态</label>
          <div class="radio-group">
            <span class="radio-item" :class="{ active: cub.health === '健康' }" @click="cub.health = '健康'">健康</span>
            <span class="radio-item" :class="{ active: cub.health === '异常' }" @click="cub.health = '异常'">异常</span>
          </div>
        </div>
        <div class="form-item">
          <label>异常备注</label>
          <input v-model="cub.abnormal_note" placeholder="健康时留空" />
        </div>
        <div class="form-item">
          <label>照片</label>
          <PhotoUpload v-model="cub.photoList" :max="1" />
        </div>
        <button class="btn btn-outline btn-block" :disabled="savingCub" @click="saveCub">
          {{ savingCub ? '保存中…' : '保存幼崽记录' }}
        </button>
      </div>

      <!-- 已提交记录 -->
      <div class="card" v-if="records.length">
        <div class="card-title">✅ 已提交记录（{{ records.length }}）</div>
        <div v-for="r in records" :key="r.id" class="list-item" style="cursor: default">
          <div class="row">
            <div class="muted">{{ r.created_at }}</div>
            <div class="photo-grid">
              <img v-for="p in r.photos" :key="p" :src="assetUrl(p)" class="ph-img" @click="preview = p" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="preview" class="lightbox" @click="preview = ''">
        <img :src="assetUrl(preview)" />
      </div>
    </div>

    <div v-else class="loading">加载中…</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api, assetUrl } from '../../api';
import { toast, errToast } from '../../toast';
import PhotoUpload from '../../components/PhotoUpload.vue';
import StatusBadge from '../../components/StatusBadge.vue';

const route = useRoute();
const taskId = Number(route.params.id);

const TYPE_LABEL: Record<string, string> = {
  feeding: '喂食任务', water: '换水任务', environment: '环境记录',
  disinfection: '笼舍消毒', medication: '用药复诊', breeding: '繁育跟进',
};

const task = ref<any>(null);
const cages = ref<any[]>([]);
const animals = ref<any[]>([]);
const feeds = ref<any[]>([]);
const meds = ref<any[]>([]);
const disinfectants = ref<any[]>([]);
const records = ref<any[]>([]);
const submitting = ref(false);
const savingCub = ref(false);
const preview = ref('');

const form = reactive<any>({
  task_id: taskId, cage_id: '', animal_id: '', feed_id: '', quantity: '', quantity_unit: '',
  intake: '正常', amount: '', quality: '正常', temperature: '', humidity: '',
  ventilation: '良好', cleanliness: '良好', abnormal: false,
  medicine_id: '', dosage: '', record_type: '跟进', mother_intake: '正常',
  body_abnormal: '', total_born: '', alive_count: '', photos: [] as string[], note: '',
});

const cub = reactive<any>({ plan_id: null, animal_id: '', cub_no: 1, weight: '', health: '健康', abnormal_note: '', photoList: [] as string[] });

const t = computed(() => task.value || { task_type: '' });
const needCage = computed(() => ['feeding', 'water', 'environment', 'disinfection'].includes(t.value.task_type));
const needAnimal = computed(() => ['feeding', 'medication', 'breeding'].includes(t.value.task_type));
const filteredAnimals = computed(() => {
  if (!form.cage_id) return animals.value;
  return animals.value.filter((a) => String(a.cage_id) === String(form.cage_id));
});

const subject = computed(() => {
  const parts = [task.value?.cage_name, task.value?.animal_name, task.value?.feed_name, task.value?.medicine_name].filter(Boolean);
  return parts.length ? parts.join(' / ') : task.value?.remark || '-';
});

async function loadTask() {
  task.value = await api.get(`/tasks/${taskId}`);
  const tk = task.value;
  // 预填表单
  form.cage_id = tk.cage_id || '';
  form.animal_id = tk.animal_id || '';
  form.feed_id = tk.feed_id || '';
  form.medicine_id = tk.medicine_id || '';
  form.quantity = tk.quantity ?? '';
  form.quantity_unit = tk.quantity_unit || '克';
  cub.plan_id = tk.plan_id || null;
  cub.animal_id = tk.animal_id || '';
  // 已提交记录
  const list = await api.get('/records/' + tk.task_type);
  records.value = list.filter((r: any) => r.task_id === taskId);
}

async function setStatus(status: string) {
  try {
    await api.put(`/tasks/${taskId}/status`, { status });
    toast(status === 'done' ? '任务已完成' : '已开始处理');
    loadTask();
  } catch (e) {
    errToast(e);
  }
}

async function submit() {
  // 必填校验
  if (needCage.value && !form.cage_id) return toast('请选择笼舍', 'err');
  if (needAnimal.value && !form.animal_id) return toast('请选择动物', 'err');
  if (t.value.task_type === 'feeding') {
    if (!form.feed_id) return toast('请选择饲料', 'err');
    if (!form.quantity) return toast('请填写饲喂数量', 'err');
  }
  if (t.value.task_type === 'water' && !form.amount) return toast('请填写换水量', 'err');
  if (t.value.task_type === 'environment') {
    if (form.temperature === '') return toast('请填写温度', 'err');
    if (form.humidity === '') return toast('请填写湿度', 'err');
  }
  if (t.value.task_type === 'disinfection' && !form.medicine_id) return toast('请选择消毒药品', 'err');
  if (t.value.task_type === 'medication' && !form.medicine_id) return toast('请选择药品', 'err');
  if (t.value.task_type === 'breeding' && form.record_type === '分娩登记') {
    if (!form.total_born || !form.alive_count) return toast('请填写产仔数和存活数', 'err');
  }

  submitting.value = true;
  try {
    const payload: any = { ...form };
    if (t.value.task_type === 'environment') payload.abnormal = form.abnormal ? 1 : 0;
    await api.post('/records/' + t.value.task_type, payload);
    toast('记录已提交，任务完成 🎉');
    loadTask();
  } catch (e) {
    errToast(e);
  } finally {
    submitting.value = false;
  }
}

async function saveCub() {
  if (!cub.animal_id) return toast('请先选择动物', 'err');
  if (cub.weight === '') return toast('请填写体重', 'err');
  savingCub.value = true;
  try {
    await api.post('/records/cub', {
      plan_id: cub.plan_id, animal_id: cub.animal_id, cub_no: cub.cub_no,
      weight: cub.weight, health: cub.health, abnormal_note: cub.abnormal_note,
      photo: cub.photoList[0] || '',
    });
    toast('幼崽记录已保存');
    cub.cub_no = (Number(cub.cub_no) || 1) + 1;
    cub.weight = '';
    cub.abnormal_note = '';
    cub.photoList = [];
  } catch (e) {
    errToast(e);
  } finally {
    savingCub.value = false;
  }
}

watch(() => form.cage_id, () => {
  if (form.cage_id && !animals.value.some((a) => String(a.cage_id) === String(form.cage_id) && String(a.id) === String(form.animal_id))) {
    form.animal_id = '';
  }
});

onMounted(async () => {
  try {
    const [cs, as2, fs, ms] = await Promise.all([
      api.get('/cages'), api.get('/animals'), api.get('/feeds'), api.get('/medicines'),
    ]);
    cages.value = cs;
    animals.value = as2;
    feeds.value = fs;
    meds.value = ms.filter((m: any) => m.category === '用药');
    disinfectants.value = ms.filter((m: any) => m.category === '消毒');
    await loadTask();
  } catch (e) {
    errToast(e);
  }
});
</script>
