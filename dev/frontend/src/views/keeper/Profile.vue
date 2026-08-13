<template>
  <div>
    <div class="mobile-top">
      <span class="title">👤 我的</span>
    </div>
    <div class="mobile-body">
      <div class="card" style="display: flex; align-items: center; gap: 14px">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--primary-light); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-size: 24px">
          {{ (auth.user?.name || '?').slice(0, 1) }}
        </div>
        <div>
          <div style="font-size: 17px; font-weight: 700">{{ auth.user?.name }}</div>
          <div class="muted">账号：{{ auth.user?.username }} · {{ roleName(auth.user?.role) }}</div>
        </div>
      </div>

      <div class="card" style="padding: 6px 14px">
        <RouterLink to="/keeper/attendance-history" class="list-item" style="box-shadow: none; margin-bottom: 0; border-bottom: 1px solid var(--border); border-radius: 0">
          🕐 查看我的打卡记录
        </RouterLink>
        <RouterLink to="/keeper/animals" class="list-item" style="box-shadow: none; margin-bottom: 0; border-bottom: 1px solid var(--border); border-radius: 0">
          🐾 我的动物（{{ animalCount }}）
        </RouterLink>
        <RouterLink to="/keeper/reports" class="list-item" style="box-shadow: none; margin-bottom: 0; border-bottom: 1px solid var(--border); border-radius: 0">
          🚨 我的异常上报
        </RouterLink>
        <RouterLink to="/keeper/breeding" class="list-item" style="box-shadow: none; margin-bottom: 0; border-radius: 0">
          🐣 我的繁育任务
        </RouterLink>
      </div>

      <div class="card">
        <div class="card-title">🔑 修改密码</div>
        <div class="form-item">
          <label>原密码</label>
          <input v-model="pwd.oldPwd" type="password" />
        </div>
        <div class="form-item">
          <label>新密码（至少6位）</label>
          <input v-model="pwd.newPwd" type="password" />
        </div>
        <button class="btn btn-block" @click="changePwd">修改密码</button>
      </div>

      <button class="btn btn-danger btn-block mt16" @click="logout">退出登录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import { auth, roleName } from '../../store';
import { toast, errToast } from '../../toast';

const router = useRouter();
const animalCount = ref(0);
const pwd = reactive({ oldPwd: '', newPwd: '' });

async function changePwd() {
  if (!pwd.oldPwd || !pwd.newPwd) return toast('请填写完整', 'err');
  try {
    await api.put('/auth/password', pwd);
    toast('密码已修改，请重新登录');
    setTimeout(() => logout(), 1200);
  } catch (e) {
    errToast(e);
  }
}

function logout() {
  auth.logout();
  router.replace('/login');
}

onMounted(async () => {
  try {
    const [animals] = await Promise.all([api.get('/keeper/animals')]);
    animalCount.value = animals.length;
  } catch {
    /* ignore */
  }
});
</script>
