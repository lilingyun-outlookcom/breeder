<template>
  <div>
    <div class="page-head">
      <div class="filters">
        <select v-model="f.status" @change="load">
          <option value="">全部状态</option>
          <option value="active">进行中</option>
          <option value="done">已结束</option>
        </select>
      </div>
      <button class="btn" @click="openPlan()">+ 录入诊疗方案</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>动物</th><th>药品</th><th>数量</th><th>用量</th><th>频次</th><th>周期</th><th>兽医</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in list" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.animal_name }}</td>
            <td>{{ p.medicine_name }}</td>
            <td>{{ p.quantity }}</td>
            <td>{{ p.dosage }}</td>
            <td>{{ p.frequency }}</td>
            <td class="muted">{{ p.start_date }} ~ {{ p.end_date }}</td>
            <td>{{ p.vet_name }}</td>
            <td><StatusBadge :v="p.status === 'active' ? 'active' : 'done'" /></td>
            <td>
              <div class="ops">
                <a style="color: var(--danger)" v-if="p.status === 'active'" @click="openDeath(p)">确认死亡</a>
                <a @click="finish(p)">{{ p.status === 'active' ? '结束' : '恢复' }}</a>
                <a @click="openPlan(p)">编辑</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="empty">暂无诊疗方案</div>
    </div>

    <Modal :show="show" title="诊疗方案" size="lg" @close="show = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">动物</label>
          <select v-model="form.animal_id">
            <option value="">选择动物</option>
            <option v-for="a in animals" :key="a.id" :value="a.id">{{ a.name }}（{{ a.species }}）</option>
          </select>
        </div>
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
        <div class="form-item">
          <label>诊疗数量</label>
          <input v-model="form.quantity" type="number" min="1" placeholder="群体填只数，个体填 1" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label class="required">开始日期</label>
          <input v-model="form.start_date" type="date" />
        </div>
        <div class="form-item">
          <label>持续天数</label>
          <input v-model="form.duration_days" type="number" min="1" />
        </div>
        <div class="form-item">
          <label>负责人（默认动物饲养员）</label>
          <select v-model="form.assignee_id">
            <option value="">自动分配</option>
            <option v-for="u in keepers" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>
      <div class="form-item">
        <label>每日用药时间</label>
        <div class="flex" style="flex-wrap: wrap">
          <div v-for="(t, i) in form.times" :key="i" class="flex" style="gap: 6px">
            <input v-model="form.times[i]" type="time" style="width: 130px" />
            <button class="btn btn-danger btn-sm" @click="form.times.splice(i, 1)">删</button>
          </div>
          <button class="btn btn-ghost btn-sm" @click="form.times.push('18:00')">+ 时段</button>
        </div>
      </div>
      <div class="form-item">
        <label>备注</label>
        <input v-model="form.remark" />
      </div>
      <div class="form-actions">
        <button class="btn" @click="save">保存</button>
        <button class="btn btn-ghost" @click="show = false">取消</button>
      </div>
    </Modal>

    <!-- 确认死亡 -->
    <Modal :show="showDeath" title="确认死亡" @close="showDeath = false">
      <div class="form-item">
        <label class="required">死亡只数</label>
        <input v-model="deathForm.died_count" type="number" min="1" :max="deathPlan?.quantity" />
        <p class="muted mt8">将按死亡只数扣减该动物总数量，并同步减少诊疗计划剩余数量（剩余减至 0 自动结束）。</p>
      </div>
      <div class="form-actions">
        <button class="btn" style="background: var(--danger)" @click="confirmDeath">确认死亡</button>
        <button class="btn btn-ghost" @click="showDeath = false">取消</button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { api } from '../../api';
import { toast, errToast } from '../../toast';
import Modal from '../../components/Modal.vue';
import StatusBadge from '../../components/StatusBadge.vue';

const list = ref<any[]>([]);
const animals = ref<any[]>([]);
const meds = ref<any[]>([]);
const keepers = ref<any[]>([]);
const show = ref(false);
const editing = ref<any>(null);
const f = reactive({ status: '' });
const showDeath = ref(false);
const deathPlan = ref<any>(null);
const deathForm = reactive({ died_count: 1 });

const form = reactive({
  animal_id: '', medicine_id: '', dosage: '', quantity: 1, start_date: today(),
  duration_days: 3, times: ['09:00'] as string[], remark: '', assignee_id: '',
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load() {
  list.value = await api.get('/treatment-plans' + api.qs(f));
}

function openPlan(p?: any) {
  editing.value = p || null;
  Object.assign(form, {
    animal_id: p?.animal_id || '', medicine_id: p?.medicine_id || '',
    dosage: p?.dosage || '', quantity: p?.quantity || 1, start_date: p?.start_date || today(),
    duration_days: p?.duration_days || 3, times: p?.times?.length ? p.times : ['09:00'],
    remark: p?.remark || '', assignee_id: '',
  });
  show.value = true;
}

async function save() {
  if (!form.animal_id || !form.medicine_id) return toast('请选择动物和药品', 'err');
  const qty = Number(form.quantity);
  if (!qty || qty < 1) return toast('诊疗数量必须大于 0', 'err');
  try {
    if (editing.value) {
      await api.put(`/treatment-plans/${editing.value.id}`, { remark: form.remark, dosage: form.dosage, quantity: qty });
      toast('已更新');
    } else {
      await api.post('/treatment-plans', { ...form, quantity: qty });
      toast('方案已保存，已生成每日用药任务');
    }
    show.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}

function openDeath(p: any) {
  deathPlan.value = p;
  deathForm.died_count = p.quantity;
  showDeath.value = true;
}

async function confirmDeath() {
  const died = Number(deathForm.died_count);
  if (!died || died < 1) return toast('请填写死亡只数', 'err');
  if (died > deathPlan.value.quantity) return toast(`不能超过剩余诊疗数量（${deathPlan.value.quantity}）`, 'err');
  if (!confirm(`确认该动物死亡 ${died} 只？将扣减总数量并结束相应诊疗。`)) return;
  try {
    await api.post(`/treatment-plans/${deathPlan.value.id}/death`, { died_count: died });
    toast('已确认死亡');
    showDeath.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}

async function finish(p: any) {
  try {
    await api.put(`/treatment-plans/${p.id}`, { status: p.status === 'active' ? 'done' : 'active' });
    toast('已更新');
    load();
  } catch (e) {
    errToast(e);
  }
}

onMounted(async () => {
  const [md, ks] = await Promise.all([api.get('/medicines'), api.get('/users')]);
  meds.value = md.filter((m: any) => m.category === '用药');
  keepers.value = ks.filter((u: any) => u.role === 'keeper' && u.status);
  animals.value = await api.get('/animals');
  load();
});
</script>
