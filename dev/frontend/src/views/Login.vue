<template>
  <div class="login-page">
    <div class="login-box">
      <h1>🦁 饲养管理平台</h1>
      <p class="sub">动物园饲养 · 任务 · 打卡一体化系统</p>
      <form @submit.prevent="login">
        <div class="form-item">
          <label>账号</label>
          <input v-model="form.username" placeholder="请输入账号" autocomplete="username" />
        </div>
        <div class="form-item">
          <label>密码</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>
        <button class="btn btn-block btn-lg" :disabled="loading" type="submit">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
      <p class="login-tip">
        饲养员与后台管理员使用各自账号登录，系统自动进入对应端<br />
        首次使用默认账号：admin/admin123 · keeper/keeper123
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { auth } from '../store';
import { toast, errToast } from '../toast';

const router = useRouter();
const form = reactive({ username: '', password: '' });
const loading = ref(false);

async function login() {
  if (!form.username || !form.password) {
    toast('请输入账号和密码', 'err');
    return;
  }
  loading.value = true;
  try {
    const data = await api.post('/auth/login', form);
    auth.login(data.token, data.user);
    toast('登录成功');
    router.replace(data.user.role === 'keeper' ? '/keeper' : '/admin');
  } catch (e) {
    errToast(e);
  } finally {
    loading.value = false;
  }
}
</script>
