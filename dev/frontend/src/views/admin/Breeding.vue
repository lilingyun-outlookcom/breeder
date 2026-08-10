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
      <button class="btn" @click="openCreate()">+ 新建繁育计划</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>类型</th><th>母兽</th><th>公兽</th><th>周期</th><th>饲养员</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in list" :key="p.id">
            <td>{{ p.id }}</td>
            <td>
              <span class="badge" :class="p.plan_type === '妊娠' ? 'badge-danger' : 'badge-info'">{{ p.plan_type }}</span>
            </td>
            <td>{{ p.female_name }}</td>
            <td>{{ p.male_name || '-' }}</td>
            <td class="muted">{{ p.start_date }} ~ {{ p.due_date }}</td>
            <td>{{ p.keeper_name }}</td>
            <td><StatusBadge :v="p.status === 'active' ? 'active' : 'done'" /></td>
            <td>
              <div class="ops">
                <a @click="openDetail(p)">记录</a>
                <a @click="finish(p)">{{ p.status === 'active' ? '结束' : '恢复' }}</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="empty">暂无繁育计划</div>
    </div>

    <!-- 新建 -->
    <Modal :show="showCreate" title="新建繁育计划" @close="showCreate = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">计划类型</label>
          <select v-model="form.plan_type">
            <option value="配对">配对</option>
            <option value="妊娠">妊娠</option>
          </select>
        </div>
        <div class="form-item">
          <label class="required">母兽</label>
          <select v-model="form.female_animal_id">
            <option value="">选择母兽</option>
            <option v-for="a in females" :key="a.id" :value="a.id">{{ a.name }}（{{ a.species }}）</option>
          </select>
        </div>
        <div class="form-item">
          <label>公兽</label>
          <select v-model="form.male_animal_id">
            <option value="">选择公兽</option>
            <option v-for="a in males" :key="a.id" :value="a.id">{{ a.name }}（{{ a.species }}）</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label class="required">开始日期</label>
          <input v-model="form.start_date" type="date" />
        </div>
        <div class="form-item">
          <label class="required">跟进截止</label>
          <input v-model="form.due_date" type="date" />
        </div>
      </div>
      <div class="form-item">
        <label>备注</label>
        <input v-model="form.remark" />
      </div>
      <div class="form-actions">
        <button class="btn" @click="save">保存（自动生成每日繁育跟进任务）</button>
        <button class="btn btn-ghost" @click="showCreate = false">取消</button>
      </div>
    </Modal>

    <!-- 记录明细 -->
    <Modal :show="!!detail" :title="'繁育记录：' + (detail?.female_name || '')" size="lg" @close="detail = null">
      <template v-if="detail">
        <div class="card-title" style="margin-top: 0">📝 跟进/分娩记录</div>
        <div v-for="r in detailRecords" :key="r.id" class="list-item" style="cursor: default">
          <div class="row">
            <div>
              <b>{{ r.record_type === '分娩登记' ? '🧬 分娩登记' : '📈 日常跟进' }}</b>
              <span class="muted"> · {{ r.created_at }}</span>
              <div class="muted">
                <span v-if="r.mother_intake">母兽采食：{{ r.mother_intake }} </span>
                <span v-if="r.body_abnormal">身体异常：{{ r.body_abnormal }}</span>
                <span v-if="r.total_born">总产仔：{{ r.total_born }} 存活：{{ r.alive_count }}</span>
                <span v-if="r.note">备注：{{ r.note }}</span>
              </div>
            </div>
            <div class="photo-grid" style="justify-content: flex-end">
              <img v-for="p in r.photos" :key="p" :src="assetUrl(p)" class="ph" style="width: 52px; height: 52px" @click="preview = p" />
            </div>
          </div>
        </div>
        <div v-if="!detailRecords.length" class="empty">暂无记录</div>

        <div class="card-title mt16">🐣 幼崽成长记录</div>
        <div v-for="c in detailCubs" :key="c.id" class="list-item" style="cursor: default">
          <div class="row">
            <div>
              <b>幼崽 #{{ c.cub_no }}</b>
              <span class="muted"> · 体重 {{ c.weight }}g · 健康：{{ c.health }}</span>
              <div class="muted" v-if="c.abnormal_note">异常备注：{{ c.abnormal_note }}</div>
            </div>
            <img v-if="c.photo" :src="assetUrl(c.photo)" class="ph-img" @click="preview = c.photo" />
          </div>
        </div>
        <div v-if="!detailCubs.length" class="empty">暂无幼崽记录</div>
      </template>
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
const animals = ref<any[]>([]);
const females = ref<any[]>([]);
const males = ref<any[]>([]);
const showCreate = ref(false);
const detail = ref<any>(null);
const detailRecords = ref<any[]>([]);
const detailCubs = ref<any[]>([]);
const preview = ref('');
const f = reactive({ status: '' });

const form = reactive({
  plan_type: '配对', female_animal_id: '', male_animal_id: '',
  start_date: today(), due_date: today(), remark: '',
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load() {
  list.value = await api.get('/breeding-plans' + api.qs(f));
}

function openCreate() {
  Object.assign(form, {
    plan_type: '配对', female_animal_id: '', male_animal_id: '',
    start_date: today(), due_date: today(), remark: '',
  });
  showCreate.value = true;
}

async function save() {
  if (!form.female_animal_id) return toast('请选择母兽', 'err');
  if (form.due_date < form.start_date) return toast('截止日期不能早于开始日期', 'err');
  try {
    await api.post('/breeding-plans', form);
    toast('计划已保存，已生成每日繁育跟进任务');
    showCreate.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}

async function openDetail(p: any) {
  detail.value = p;
  const d = await api.get(`/breeding-plans/${p.id}/records`);
  detailRecords.value = d.records;
  detailCubs.value = d.cubs;
}

async function finish(p: any) {
  try {
    await api.put(`/breeding-plans/${p.id}`, { status: p.status === 'active' ? 'done' : 'active' });
    toast('已更新');
    load();
  } catch (e) {
    errToast(e);
  }
}

onMounted(async () => {
  animals.value = await api.get('/animals');
  females.value = animals.value.filter((a: any) => a.sex === '母');
  males.value = animals.value.filter((a: any) => a.sex === '公');
  load();
});
</script>
