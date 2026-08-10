<template>
  <div>
    <div class="page-head">
      <div></div>
      <button class="btn" @click="openEdit()">+ 新增用户</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>账号</th><th>姓名</th><th>角色</th><th>手机</th><th>状态</th><th>创建时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in list" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.name }}</td>
            <td><span class="badge" :class="u.role === 'admin' ? 'badge-danger' : u.role === 'vet' ? 'badge-info' : 'badge-ok'">{{ roleName(u.role) }}</span></td>
            <td>{{ u.phone }}</td>
            <td>
              <span class="badge" :class="u.status ? 'badge-ok' : 'badge-dark'">{{ u.status ? '启用' : '停用' }}</span>
            </td>
            <td class="muted">{{ u.created_at?.slice(0, 16) }}</td>
            <td>
              <div class="ops">
                <a @click="openEdit(u)">编辑</a>
                <a v-if="u.id !== auth.user?.id" style="color: var(--danger)" @click="disable(u)">停用</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="show" title="编辑用户" @close="show = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">账号</label>
          <input v-model="form.username" :disabled="!!editing" placeholder="登录账号" />
        </div>
        <div class="form-item">
          <label>姓名</label>
          <input v-model="form.name" placeholder="真实姓名" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>角色</label>
          <select v-model="form.role">
            <option value="keeper">饲养员</option>
            <option value="vet">兽医</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div class="form-item">
          <label>手机号</label>
          <input v-model="form.phone" placeholder="选填" />
        </div>
      </div>
      <div class="form-item">
        <label>{{ editing ? '重置密码（留空不修改）' : '初始密码（默认 123456）' }}</label>
        <input v-model="form.password" type="password" placeholder="至少6位" />
      </div>
      <div class="form-actions">
        <button class="btn" @click="save">保存</button>
        <button class="btn btn-ghost" @click="show = false">取消</button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { api } from '../../api';
import { auth, roleName } from '../../store';
import { toast, errToast } from '../../toast';
import Modal from '../../components/Modal.vue';

const list = ref<any[]>([]);
const show = ref(false);
const editing = ref<any>(null);
const form = reactive({ username: '', name: '', role: 'keeper', phone: '', password: '' });

async function load() {
  list.value = await api.get('/users');
}

function openEdit(u?: any) {
  editing.value = u || null;
  Object.assign(form, {
    username: u?.username || '',
    name: u?.name || '',
    role: u?.role || 'keeper',
    phone: u?.phone || '',
    password: '',
  });
  show.value = true;
}

async function save() {
  if (!form.username || !form.name) return toast('请填写账号和姓名', 'err');
  try {
    if (editing.value) {
      const body: any = { name: form.name, role: form.role, phone: form.phone };
      if (form.password) body.password = form.password;
      await api.put(`/users/${editing.value.id}`, body);
    } else {
      await api.post('/users', { ...form });
    }
    toast('保存成功');
    show.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}

async function disable(u: any) {
  if (!confirm(`确认停用用户「${u.name}」？`)) return;
  try {
    await api.del(`/users/${u.id}`);
    toast('已停用');
    load();
  } catch (e) {
    errToast(e);
  }
}

onMounted(load);
</script>
