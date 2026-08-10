<template>
  <div>
    <div class="page-head">
      <div class="filters">
        <input v-model="q" placeholder="搜索名称" style="width: 180px" />
      </div>
      <button class="btn" @click="openEdit()">+ 新增药品</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>名称</th><th>类别</th><th>规格</th><th>单位</th><th>备注</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id">
            <td>{{ m.id }}</td>
            <td>{{ m.name }}</td>
            <td>
              <span class="badge" :class="m.category === '消毒' ? 'badge-info' : 'badge-warn'">{{ m.category }}</span>
            </td>
            <td>{{ m.spec }}</td>
            <td>{{ m.unit }}</td>
            <td>{{ m.remark }}</td>
            <td>
              <div class="ops">
                <a @click="openEdit(m)">编辑</a>
                <a style="color: var(--danger)" @click="remove(m)">删除</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="show" title="药品/消毒剂" @close="show = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">名称</label>
          <input v-model="form.name" />
        </div>
        <div class="form-item">
          <label>类别</label>
          <select v-model="form.category">
            <option value="用药">用药</option>
            <option value="消毒">消毒</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>规格</label>
          <input v-model="form.spec" placeholder="如：0.5g*10片" />
        </div>
        <div class="form-item">
          <label>单位</label>
          <input v-model="form.unit" placeholder="如：片/毫升" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from '../../api';
import { toast, errToast } from '../../toast';
import Modal from '../../components/Modal.vue';

const list = ref<any[]>([]);
const q = ref('');
const show = ref(false);
const editing = ref<any>(null);
const form = reactive({ name: '', category: '用药', spec: '', unit: '', remark: '' });

const filtered = computed(() =>
  q.value.trim() ? list.value.filter((m) => m.name.includes(q.value.trim())) : list.value
);

async function load() {
  list.value = await api.get('/medicines');
}
function openEdit(m?: any) {
  editing.value = m || null;
  Object.assign(form, {
    name: m?.name || '', category: m?.category || '用药', spec: m?.spec || '',
    unit: m?.unit || '', remark: m?.remark || '',
  });
  show.value = true;
}
async function save() {
  if (!form.name) return toast('请填写名称', 'err');
  try {
    if (editing.value) await api.put(`/medicines/${editing.value.id}`, form);
    else await api.post('/medicines', form);
    toast('保存成功');
    show.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}
async function remove(m: any) {
  if (!confirm(`确认删除「${m.name}」？`)) return;
  try {
    await api.del(`/medicines/${m.id}`);
    toast('已删除');
    load();
  } catch (e) {
    errToast(e);
  }
}
onMounted(load);
</script>
