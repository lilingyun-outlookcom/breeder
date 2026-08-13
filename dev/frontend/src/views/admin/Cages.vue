<template>
  <div>
    <div class="page-head">
      <div class="filters">
        <input v-model="q" placeholder="搜索名称/位置" style="width: 200px" />
      </div>
      <button class="btn" @click="openEdit()">+ 新增笼舍</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>名称</th><th>位置</th><th>备注</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.name }}</td>
            <td>{{ c.location }}</td>
            <td>{{ c.remark }}</td>
            <td>
              <div class="ops">
                <a @click="openEdit(c)">编辑</a>
                <a style="color: var(--danger)" @click="remove(c)">删除</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="show" title="笼舍" @close="show = false">
      <div class="form-item">
        <label class="required">名称</label>
        <input v-model="form.name" placeholder="如：1号笼舍" />
      </div>
      <div class="form-item">
        <label>位置</label>
        <input v-model="form.location" placeholder="如：东区" />
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
const form = reactive({ name: '', location: '', remark: '' });

const filtered = computed(() => {
  const s = q.value.trim();
  if (!s) return list.value;
  return list.value.filter((c) => c.name.includes(s) || (c.location || '').includes(s));
});

async function load() {
  list.value = await api.get('/cages');
}
function openEdit(c?: any) {
  editing.value = c || null;
  Object.assign(form, { name: c?.name || '', location: c?.location || '', remark: c?.remark || '' });
  show.value = true;
}
async function save() {
  if (!form.name) return toast('请填写名称', 'err');
  try {
    if (editing.value) await api.put(`/cages/${editing.value.id}`, form);
    else await api.post('/cages', form);
    toast('保存成功');
    show.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}
async function remove(c: any) {
  if (!confirm(`确认删除笼舍「${c.name}」？`)) return;
  try {
    await api.del(`/cages/${c.id}`);
    toast('已删除');
    load();
  } catch (e) {
    errToast(e);
  }
}
onMounted(load);
</script>
