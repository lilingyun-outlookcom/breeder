<template>
  <div>
    <div class="page-head">
      <div class="filters">
        <input v-model="q" placeholder="搜索名称" style="width: 180px" />
      </div>
      <button class="btn" @click="openEdit()">+ 新增饲料</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>名称</th><th>单位</th><th>备注</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in filtered" :key="f.id">
            <td>{{ f.id }}</td>
            <td>{{ f.name }}</td>
            <td>{{ f.unit }}</td>
            <td>{{ f.remark }}</td>
            <td>
              <div class="ops">
                <a @click="openEdit(f)">编辑</a>
                <a style="color: var(--danger)" @click="remove(f)">删除</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="show" title="饲料" @close="show = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">名称</label>
          <input v-model="form.name" />
        </div>
        <div class="form-item">
          <label>单位</label>
          <input v-model="form.unit" placeholder="如：克 / 千克" />
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
const form = reactive({ name: '', unit: '克', remark: '' });

const filtered = computed(() =>
  q.value.trim() ? list.value.filter((f) => f.name.includes(q.value.trim())) : list.value
);

async function load() {
  list.value = await api.get('/feeds');
}
function openEdit(f?: any) {
  editing.value = f || null;
  Object.assign(form, { name: f?.name || '', unit: f?.unit || '克', remark: f?.remark || '' });
  show.value = true;
}
async function save() {
  if (!form.name) return toast('请填写名称', 'err');
  try {
    if (editing.value) await api.put(`/feeds/${editing.value.id}`, form);
    else await api.post('/feeds', form);
    toast('保存成功');
    show.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}
async function remove(f: any) {
  if (!confirm(`确认删除「${f.name}」？`)) return;
  try {
    await api.del(`/feeds/${f.id}`);
    toast('已删除');
    load();
  } catch (e) {
    errToast(e);
  }
}
onMounted(load);
</script>
