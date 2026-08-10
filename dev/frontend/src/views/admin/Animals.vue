<template>
  <div>
    <div class="page-head">
      <div class="filters">
        <select v-model="fKeeper" @change="load">
          <option value="">全部饲养员</option>
          <option v-for="u in keepers" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
        <input v-model="q" placeholder="搜索名称/物种" style="width: 180px" />
      </div>
      <button class="btn" @click="openEdit()">+ 新增动物</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>动物</th><th>物种</th><th>性别</th><th>年龄</th><th>笼舍</th><th>饲养员</th><th>健康</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in filtered" :key="a.id">
            <td>{{ a.id }}</td>
            <td>
              <div class="flex" style="gap: 8px">
                <img v-if="a.photo" :src="assetUrl(a.photo)" class="ph-img" />
                <b>{{ a.name }}</b>
              </div>
            </td>
            <td>{{ a.species }}</td>
            <td>{{ a.sex }}</td>
            <td>{{ a.age }}</td>
            <td>{{ a.cage_name || '-' }}</td>
            <td>{{ a.keeper_name || '未分配' }}</td>
            <td><span class="badge" :class="a.health === '正常' ? 'badge-ok' : 'badge-danger'">{{ a.health }}</span></td>
            <td>
              <div class="ops">
                <a @click="openEdit(a)">编辑</a>
                <a style="color: var(--danger)" @click="remove(a)">删除</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="show" title="动物信息" size="lg" @close="show = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">名称</label>
          <input v-model="form.name" />
        </div>
        <div class="form-item">
          <label>物种</label>
          <input v-model="form.species" placeholder="如：东北虎" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>性别</label>
          <select v-model="form.sex">
            <option>公</option><option>母</option><option>未知</option>
          </select>
        </div>
        <div class="form-item">
          <label>年龄</label>
          <input v-model="form.age" placeholder="如：3岁" />
        </div>
        <div class="form-item">
          <label>健康状态</label>
          <select v-model="form.health">
            <option>正常</option><option>异常</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>所属笼舍</label>
          <select v-model="form.cage_id">
            <option value="">未分配</option>
            <option v-for="c in cages" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-item">
          <label>负责饲养员</label>
          <select v-model="form.keeper_id">
            <option value="">未分配</option>
            <option v-for="u in keepers" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>
      <div class="form-item">
        <label>照片</label>
        <PhotoUpload v-model="form.photoList" :max="1" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { api, assetUrl } from '../../api';
import { toast, errToast } from '../../toast';
import Modal from '../../components/Modal.vue';
import PhotoUpload from '../../components/PhotoUpload.vue';

const list = ref<any[]>([]);
const keepers = ref<any[]>([]);
const cages = ref<any[]>([]);
const q = ref('');
const fKeeper = ref('');
const show = ref(false);
const editing = ref<any>(null);
const form = reactive({
  name: '', species: '', sex: '未知', age: '', health: '正常',
  cage_id: '', keeper_id: '', photoList: [] as string[], remark: '',
});

const filtered = computed(() => {
  const s = q.value.trim();
  if (!s) return list.value;
  return list.value.filter((a) => a.name.includes(s) || (a.species || '').includes(s));
});

async function load() {
  const params: any = {};
  if (fKeeper.value) params.keeper_id = fKeeper.value;
  list.value = await api.get('/animals' + api.qs(params));
}
async function loadRefs() {
  const [ks, cs] = await Promise.all([api.get('/users'), api.get('/cages')]);
  keepers.value = ks.filter((u: any) => u.role === 'keeper' && u.status);
  cages.value = cs;
}
function openEdit(a?: any) {
  editing.value = a || null;
  Object.assign(form, {
    name: a?.name || '', species: a?.species || '', sex: a?.sex || '未知',
    age: a?.age || '', health: a?.health || '正常',
    cage_id: a?.cage_id || '', keeper_id: a?.keeper_id || '',
    photoList: a?.photo ? [a.photo] : [], remark: a?.remark || '',
  });
  show.value = true;
}
async function save() {
  if (!form.name) return toast('请填写名称', 'err');
  try {
    const body = { ...form, photo: form.photoList[0] || '' };
    if (editing.value) await api.put(`/animals/${editing.value.id}`, body);
    else await api.post('/animals', body);
    toast('保存成功');
    show.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}
async function remove(a: any) {
  if (!confirm(`确认删除动物「${a.name}」？`)) return;
  try {
    await api.del(`/animals/${a.id}`);
    toast('已删除');
    load();
  } catch (e) {
    errToast(e);
  }
}
onMounted(async () => {
  await Promise.all([load(), loadRefs()]);
});
</script>
