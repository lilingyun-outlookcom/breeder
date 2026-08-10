<template>
  <div>
    <div class="seg" style="max-width: 400px; margin-bottom: 16px">
      <button :class="{ active: tab === 'new' }" @click="tab = 'new'">新建任务</button>
      <button :class="{ active: tab === 'groups' }" @click="tab = 'groups'; loadGroups()">任务批次</button>
      <button :class="{ active: tab === 'list' }" @click="tab = 'list'; loadList()">任务明细</button>
    </div>

    <!-- ============ 新建任务 ============ -->
    <div v-if="tab === 'new'">
      <div class="card">
        <div class="card-title">📋 配置每日任务</div>
        <div class="form-row">
          <div class="form-item">
            <label class="required">任务类型</label>
            <select v-model="f.task_type">
              <option value="feeding">喂食任务</option>
              <option value="water">换水任务</option>
              <option value="environment">笼舍环境记录</option>
              <option value="disinfection">笼舍消毒</option>
              <option value="medication">用药复诊</option>
              <option value="breeding">繁育跟进</option>
            </select>
          </div>
          <div class="form-item">
            <label>任务标题</label>
            <input v-model="f.title" placeholder="留空自动生成" />
          </div>
          <div class="form-item">
            <label>负责人</label>
            <select v-model="f.assignee_id">
              <option value="">选择饲养员</option>
              <option v-for="u in keepers" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item" v-if="['feeding', 'water', 'environment', 'disinfection'].includes(f.task_type)">
            <label class="required">笼舍</label>
            <select v-model="f.cage_id">
              <option value="">选择笼舍</option>
              <option v-for="c in cages" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-item" v-if="['feeding', 'medication', 'breeding'].includes(f.task_type)">
            <label class="required">动物</label>
            <select v-model="f.animal_id">
              <option value="">选择动物</option>
              <option v-for="a in animals" :key="a.id" :value="a.id">{{ a.name }}（{{ a.species }}）</option>
            </select>
          </div>
          <div class="form-item" v-if="f.task_type === 'feeding'">
            <label class="required">饲料</label>
            <select v-model="f.feed_id">
              <option value="">选择饲料</option>
              <option v-for="fd in feeds" :key="fd.id" :value="fd.id">{{ fd.name }}</option>
            </select>
          </div>
          <div class="form-item" v-if="f.task_type === 'disinfection'">
            <label class="required">消毒药品</label>
            <select v-model="f.medicine_id">
              <option value="">选择药品</option>
              <option v-for="m in disinfectants" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="form-item" v-if="f.task_type === 'medication'">
            <label class="required">药品</label>
            <select v-model="f.medicine_id">
              <option value="">选择药品</option>
              <option v-for="m in meds" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="form-item" v-if="['feeding', 'water'].includes(f.task_type)">
            <label :class="{ required: true }">数量{{ f.task_type === 'water' ? '（升）' : '' }}</label>
            <div class="flex" style="gap: 6px">
              <input v-model="f.quantity" type="number" placeholder="数量" style="flex: 1" />
              <input v-model="f.quantity_unit" placeholder="单位" style="width: 80px" />
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="required">重复方式</label>
            <select v-model="f.repeat_type">
              <option value="daily">每天重复</option>
              <option value="once">仅执行一次</option>
            </select>
          </div>
          <div class="form-item">
            <label class="required">开始日期</label>
            <input v-model="f.start_date" type="date" />
          </div>
          <div class="form-item" v-if="f.repeat_type === 'daily'">
            <label class="required">结束日期</label>
            <input v-model="f.end_date" type="date" />
          </div>
        </div>

        <div class="form-item">
          <label class="required">每天完成时间（可多个，表示每天需完成几次）</label>
          <div class="flex" style="flex-wrap: wrap">
            <div v-for="(t, i) in f.due_times" :key="i" class="flex" style="gap: 6px">
              <input v-model="f.due_times[i]" type="time" style="width: 130px" />
              <button class="btn btn-danger btn-sm" @click="f.due_times.splice(i, 1)">删</button>
            </div>
            <button class="btn btn-ghost btn-sm" @click="f.due_times.push('18:00')">+ 增加时段</button>
          </div>
          <p class="muted mt8">示例：每天 2 个时段 08:00 / 18:00，饲养员须按时完成，逾期自动提醒</p>
        </div>

        <div class="form-item">
          <label>备注</label>
          <input v-model="f.remark" placeholder="选填" />
        </div>

        <div class="form-actions">
          <button class="btn" :disabled="saving" @click="createBatch">
            {{ saving ? '生成中...' : '生成任务' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ 任务批次 ============ -->
    <div v-else-if="tab === 'groups'">
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>ID</th><th>类型</th><th>标题</th><th>负责人</th><th>进度</th><th>创建时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="g in groups" :key="g.id">
              <td>{{ g.id }}</td>
              <td><span class="tag-type" :class="'tag-' + g.task_type">{{ TYPE_LABEL[g.task_type] }}</span></td>
              <td>{{ g.title || TYPE_LABEL[g.task_type] }}</td>
              <td>{{ g.assignee_name }}</td>
              <td>
                <span class="badge" :class="g.done_count >= g.total && g.total > 0 ? 'badge-ok' : 'badge-warn'">
                  {{ g.done_count }}/{{ g.total }}
                </span>
              </td>
              <td class="muted">{{ g.created_at?.slice(0, 16) }}</td>
              <td>
                <div class="ops">
                  <a @click="viewGroup(g)">明细</a>
                  <a style="color: var(--danger)" @click="removeGroup(g)">删除批次</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt16" v-if="groupTasks.length">
        <div class="card">
          <div class="card-title">
            <span>批次 {{ viewGroupId }} 任务明细（{{ groupTasks.length }} 条）</span>
            <a class="link" @click="groupTasks = []; viewGroupId = 0">收起</a>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr><th>日期</th><th>截止</th><th>对象</th><th>状态</th><th>完成时间</th></tr>
              </thead>
              <tbody>
                <tr v-for="t in groupTasks" :key="t.id">
                  <td>{{ t.task_date }}</td>
                  <td>{{ t.due_time }}</td>
                  <td>{{ [t.cage_name, t.animal_name, t.feed_name, t.medicine_name].filter(Boolean).join(' / ') || '-' }}</td>
                  <td><StatusBadge :v="t.status" /></td>
                  <td class="muted">{{ t.done_at || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 任务明细 ============ -->
    <div v-else>
      <div class="filters mb8">
        <input v-model="listFilter.date" type="date" @change="loadList" />
        <select v-model="listFilter.type" @change="loadList">
          <option value="">全部类型</option>
          <option v-for="(l, k) in TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
        </select>
        <select v-model="listFilter.status" @change="loadList">
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="done">已完成</option>
        </select>
        <select v-model="listFilter.assignee_id" @change="loadList">
          <option value="">全部负责人</option>
          <option v-for="u in keepers" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>ID</th><th>日期</th><th>类型</th><th>标题</th><th>对象</th><th>截止</th><th>负责人</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in tasks" :key="t.id">
              <td>{{ t.id }}</td>
              <td>{{ t.task_date }}</td>
              <td><span class="tag-type" :class="'tag-' + t.task_type">{{ TYPE_LABEL[t.task_type] }}</span></td>
              <td>{{ t.title }}</td>
              <td>{{ [t.cage_name, t.animal_name, t.feed_name, t.medicine_name].filter(Boolean).join('/') || '-' }}</td>
              <td :class="{ overdue: t.is_overdue }">{{ t.due_time }}</td>
              <td>{{ t.assignee_name }}</td>
              <td><StatusBadge :v="t.status" /></td>
              <td><a @click="openEdit(t)">改</a></td>
            </tr>
          </tbody>
        </table>
        <div v-if="!tasks.length" class="empty">暂无任务</div>
      </div>
    </div>

    <!-- 修改单个任务 -->
    <Modal :show="showEdit" title="修改任务" @close="showEdit = false">
      <div class="form-row">
        <div class="form-item">
          <label>日期</label>
          <input v-model="editForm.task_date" type="date" />
        </div>
        <div class="form-item">
          <label>截止时间</label>
          <input v-model="editForm.due_time" type="time" />
        </div>
        <div class="form-item">
          <label>负责人</label>
          <select v-model="editForm.assignee_id">
            <option v-for="u in keepers" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div class="form-item">
          <label>状态</label>
          <select v-model="editForm.status">
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="done">已完成</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn" @click="saveEdit">保存</button>
        <button class="btn btn-ghost" @click="showEdit = false">取消</button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { api } from '../../api';
import { toast, errToast } from '../../toast';
import Modal from '../../components/Modal.vue';
import StatusBadge from '../../components/StatusBadge.vue';

const TYPE_LABEL: Record<string, string> = {
  feeding: '喂食', water: '换水', environment: '环境',
  disinfection: '消毒', medication: '用药', breeding: '繁育',
};

const tab = ref('new');
const saving = ref(false);

const keepers = ref<any[]>([]);
const cages = ref<any[]>([]);
const animals = ref<any[]>([]);
const feeds = ref<any[]>([]);
const meds = ref<any[]>([]);
const disinfectants = ref<any[]>([]);

const f = reactive({
  task_type: 'feeding', title: '', assignee_id: '', cage_id: '', animal_id: '',
  feed_id: '', medicine_id: '', quantity: '', quantity_unit: '克',
  repeat_type: 'daily', start_date: today(), end_date: today(), due_times: ['08:00'], remark: '',
});

const groups = ref<any[]>([]);
const groupTasks = ref<any[]>([]);
const viewGroupId = ref(0);

const tasks = ref<any[]>([]);
const listFilter = reactive({ date: '', type: '', status: '', assignee_id: '' });

const showEdit = ref(false);
const editForm = reactive({ id: 0, task_date: '', due_time: '', assignee_id: '', status: '' });

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function createBatch() {
  if (!f.assignee_id) return toast('请选择负责人', 'err');
  if (f.repeat_type === 'daily' && f.end_date < f.start_date) return toast('结束日期不能早于开始日期', 'err');
  saving.value = true;
  try {
    const body: any = {
      task_type: f.task_type,
      title: f.title,
      assignee_id: f.assignee_id,
      cage_id: f.cage_id || null,
      animal_id: f.animal_id || null,
      feed_id: f.feed_id || null,
      medicine_id: f.medicine_id || null,
      quantity: f.quantity || null,
      quantity_unit: f.quantity_unit,
      repeat_type: f.repeat_type,
      start_date: f.start_date,
      end_date: f.repeat_type === 'once' ? f.start_date : f.end_date,
      due_times: f.due_times.filter(Boolean),
      remark: f.remark,
    };
    const r = await api.post('/tasks/batch', body);
    toast(`已生成 ${r.total} 条任务`);
    tab.value = 'groups';
    loadGroups();
  } catch (e) {
    errToast(e);
  } finally {
    saving.value = false;
  }
}

async function loadGroups() {
  groups.value = await api.get('/tasks/groups');
}
async function loadList() {
  tasks.value = await api.get('/tasks' + api.qs(listFilter));
}
async function viewGroup(g: any) {
  viewGroupId.value = g.id;
  groupTasks.value = await api.get('/tasks?group_id=' + g.id);
}
async function removeGroup(g: any) {
  if (!confirm(`确认删除批次 #${g.id} 的 ${g.total} 条任务？`)) return;
  try {
    await api.del(`/tasks/group/${g.id}`);
    toast('已删除');
    loadGroups();
  } catch (e) {
    errToast(e);
  }
}
function openEdit(t: any) {
  Object.assign(editForm, {
    id: t.id, task_date: t.task_date, due_time: t.due_time,
    assignee_id: t.assignee_id, status: t.status,
  });
  showEdit.value = true;
}
async function saveEdit() {
  try {
    await api.put(`/tasks/${editForm.id}`, editForm);
    toast('已保存');
    showEdit.value = false;
    loadList();
  } catch (e) {
    errToast(e);
  }
}

onMounted(async () => {
  const [ks, cs, an, fd, md] = await Promise.all([
    api.get('/users'), api.get('/cages'), api.get('/animals'),
    api.get('/feeds'), api.get('/medicines'),
  ]);
  keepers.value = ks.filter((u: any) => u.role === 'keeper' && u.status);
  cages.value = cs;
  animals.value = an;
  feeds.value = fd;
  meds.value = md.filter((m: any) => m.category === '用药');
  disinfectants.value = md.filter((m: any) => m.category === '消毒');
});
</script>

<style scoped>
.tag-feeding { background: #dbeafe; color: #1d4ed8; }
.tag-water { background: #cffafe; color: #0e7490; }
.tag-environment { background: #dcfce7; color: #15803d; }
.tag-disinfection { background: #fef3c7; color: #b45309; }
.tag-medication { background: #fce7f3; color: #be185d; }
.tag-breeding { background: #ede9fe; color: #6d28d9; }
</style>
