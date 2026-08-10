<template>
  <div>
    <div class="filters mb8">
      <div class="seg" style="max-width: 360px">
        <button :class="{ active: f.status === '' }" @click="f.status = ''; load()">全部</button>
        <button :class="{ active: f.status === 'pending' }" @click="f.status = 'pending'; load()">待处理</button>
        <button :class="{ active: f.status === 'processing' }" @click="f.status = 'processing'; load()">处理中</button>
        <button :class="{ active: f.status === 'done' }" @click="f.status = 'done'; load()">已处理</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>动物</th><th>症状</th><th>优先级</th><th>上报人</th><th>时间</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>{{ r.id }}</td>
            <td>{{ r.animal_name }}<span class="muted">（{{ r.cage_name || '未分配笼舍' }}）</span></td>
            <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ r.symptoms }}</td>
            <td>
              <span class="badge" :class="r.priority === '高' ? 'badge-danger' : r.priority === '中' ? 'badge-warn' : 'badge-dark'">{{ r.priority }}</span>
            </td>
            <td>{{ r.reporter_name }}</td>
            <td class="muted">{{ r.created_at?.slice(0, 16) }}</td>
            <td><StatusBadge :v="r.status" /></td>
            <td><a @click="open(r)">处理</a></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="empty">暂无工单</div>
    </div>

    <Modal :show="!!current" :title="'工单 #' + (current?.id || '')" size="lg" @close="current = null">
      <template v-if="current">
        <div class="flex" style="align-items: flex-start; gap: 12px">
          <div style="flex: 1">
            <p><b>动物：</b>{{ current.animal_name }}（{{ current.cage_name || '未分配笼舍' }}）</p>
            <p class="mt8"><b>症状：</b>{{ current.symptoms }}</p>
            <p class="mt8"><b>上报人：</b>{{ current.reporter_name }} · {{ current.created_at }}</p>
            <p class="mt8"><b>处理方案：</b></p>
            <textarea v-model="detailForm.resolution" placeholder="填写处理结果/诊疗方案" style="min-height: 80px"></textarea>
          </div>
          <div>
            <div class="photo-grid" v-if="current.photos?.length">
              <img v-for="p in current.photos" :key="p" :src="assetUrl(p)" class="ph" style="width: 90px; height: 90px" @click="preview = p" />
            </div>
            <div v-else class="muted">无照片</div>
          </div>
        </div>
        <div class="form-row mt16">
          <div class="form-item">
            <label>处理状态</label>
            <select v-model="detailForm.status">
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="done">已处理</option>
            </select>
          </div>
          <div class="form-item">
            <label>动物健康状态</label>
            <select v-model="detailForm.health">
              <option value="正常">正常</option>
              <option value="异常">异常</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn" @click="save">保存处理</button>
          <button class="btn btn-warn" @click="openPlan()">录入诊疗方案</button>
          <button class="btn btn-ghost" @click="current = null">关闭</button>
        </div>

        <div class="divider" v-if="currentPlans.length"></div>
        <p v-if="currentPlans.length" class="muted mb8">已有诊疗方案：</p>
        <div v-for="p in currentPlans" :key="p.id" class="list-item" style="cursor: default">
          <div class="row">
            <div>
              <b>{{ p.medicine_name || '未指定药品' }}</b>
              <span class="muted"> · 用量 {{ p.dosage || '-' }} · {{ p.frequency || '' }} · {{ p.start_date }} 至 {{ p.end_date }}</span>
            </div>
            <StatusBadge :v="p.status === 'active' ? 'active' : 'done'" />
          </div>
        </div>
      </template>
    </Modal>

    <!-- 诊疗方案录入 -->
    <Modal :show="showPlan" title="录入诊疗方案（自动生成每日喂药/复诊任务）" @close="showPlan = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">药品</label>
          <select v-model="plan.medicine_id">
            <option value="">选择药品</option>
            <option v-for="m in meds" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="form-item">
          <label>用量</label>
          <input v-model="plan.dosage" placeholder="如：2片/次" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label class="required">开始日期</label>
          <input v-model="plan.start_date" type="date" />
        </div>
        <div class="form-item">
          <label>持续天数</label>
          <input v-model="plan.duration_days" type="number" min="1" />
        </div>
      </div>
      <div class="form-item">
        <label>每日用药时间</label>
        <div class="flex" style="flex-wrap: wrap">
          <div v-for="(t, i) in plan.times" :key="i" class="flex" style="gap: 6px">
            <input v-model="plan.times[i]" type="time" style="width: 130px" />
            <button class="btn btn-danger btn-sm" @click="plan.times.splice(i, 1)">删</button>
          </div>
          <button class="btn btn-ghost btn-sm" @click="plan.times.push('18:00')">+ 时段</button>
        </div>
      </div>
      <div class="form-item">
        <label>备注</label>
        <input v-model="plan.remark" />
      </div>
      <div class="form-actions">
        <button class="btn" @click="savePlan">保存方案</button>
        <button class="btn btn-ghost" @click="showPlan = false">取消</button>
      </div>
    </Modal>

    <div v-if="preview" class="lightbox" @click="preview = ''">
      <img :src="assetUrl(preview)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { api, assetUrl } from '../../api';
import { toast, errToast } from '../../toast';
import Modal from '../../components/Modal.vue';
import StatusBadge from '../../components/StatusBadge.vue';

const list = ref<any[]>([]);
const current = ref<any>(null);
const currentPlans = ref<any[]>([]);
const meds = ref<any[]>([]);
const preview = ref('');
const f = reactive({ status: '' });
const showPlan = ref(false);

const detailForm = reactive({ status: 'pending', resolution: '', health: '正常' });
const plan = reactive({
  medicine_id: '', dosage: '', start_date: today(), duration_days: 3,
  times: ['09:00'] as string[], remark: '', report_id: 0, animal_id: 0,
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load() {
  list.value = await api.get('/reports' + api.qs(f));
}

async function open(r: any) {
  const d = await api.get(`/reports/${r.id}`);
  current.value = d;
  currentPlans.value = d.plans || [];
  Object.assign(detailForm, { status: d.status, resolution: d.resolution || '', health: '正常' });
}

async function save() {
  if (!current.value) return;
  try {
    await api.put(`/reports/${current.value.id}`, detailForm);
    toast('已保存');
    current.value = null;
    load();
  } catch (e) {
    errToast(e);
  }
}

function openPlan() {
  if (!current.value) return;
  Object.assign(plan, {
    report_id: current.value.id,
    animal_id: current.value.animal_id,
    medicine_id: '', dosage: '', start_date: today(), duration_days: 3,
    times: ['09:00'], remark: '',
  });
  showPlan.value = true;
}

async function savePlan() {
  if (!plan.medicine_id) return toast('请选择药品', 'err');
  try {
    await api.post('/treatment-plans', plan);
    toast('方案已保存，已生成每日用药任务');
    showPlan.value = false;
    if (current.value) await open(current.value);
  } catch (e) {
    errToast(e);
  }
}

onMounted(async () => {
  const md = await api.get('/medicines');
  meds.value = md.filter((m: any) => m.category === '用药');
  load();
});
</script>
