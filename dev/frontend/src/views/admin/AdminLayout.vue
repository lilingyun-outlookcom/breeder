<template>
  <div class="admin-shell">
    <div v-if="menuOpen" class="admin-mask" @click="menuOpen = false"></div>
    <aside class="admin-side" :class="{ open: menuOpen }">
      <div class="admin-logo">🦁 饲养<span>管理平台</span></div>
      <ul class="admin-nav">
        <li><RouterLink to="/admin/dashboard">📊 首页看板</RouterLink></li>
        <li v-if="isAdminRole">
          <p class="nav-group">基础资料</p>
        </li>
        <li v-if="isAdminRole"><RouterLink to="/admin/users">👥 用户管理</RouterLink></li>
        <li v-if="isAdminRole"><RouterLink to="/admin/cages">🏠 笼舍管理</RouterLink></li>
        <li v-if="isAdminRole"><RouterLink to="/admin/animals">🐾 动物管理</RouterLink></li>
        <li v-if="isAdminRole"><RouterLink to="/admin/feeds">🌿 饲料管理</RouterLink></li>
        <li v-if="isAdminRole"><RouterLink to="/admin/medicines">💊 药品管理</RouterLink></li>
        <li>
          <p class="nav-group">业务管理</p>
        </li>
        <li><RouterLink to="/admin/tasks">📋 任务管理</RouterLink></li>
        <li><RouterLink to="/admin/attendance">🕐 考勤记录</RouterLink></li>
        <li><RouterLink to="/admin/reports">🚨 异常工单</RouterLink></li>
        <li><RouterLink to="/admin/treatment">🩺 诊疗方案</RouterLink></li>
        <li><RouterLink to="/admin/breeding">🐣 繁育计划</RouterLink></li>
        <li><RouterLink to="/admin/records">📝 记录查询</RouterLink></li>
        <li v-if="isAdminRole">
          <p class="nav-group">系统</p>
        </li>
        <li v-if="isAdminRole"><RouterLink to="/admin/settings">⚙️ 系统设置</RouterLink></li>
        <li><RouterLink to="/admin/notifications">🔔 消息中心</RouterLink></li>
      </ul>
    </aside>
    <main class="admin-main">
      <div class="admin-top">
        <button class="menu-toggle" aria-label="菜单" @click="menuOpen = !menuOpen">☰</button>
        <h2 style="font-size: 17px">{{ route.meta.title || '' }}</h2>
        <div class="user-box">
          <span>👤 <b>{{ auth.user?.name }}</b>（{{ roleName(auth.user?.role) }}）</span>
          <RouterLink to="/admin/notifications">🔔 消息</RouterLink>
          <a @click="logout">退出</a>
        </div>
      </div>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, roleName } from '../../store';

const route = useRoute();
const router = useRouter();
const isAdminRole = auth.user?.role === 'admin';

const menuOpen = ref(false);
// 路由切换后自动收起移动端菜单
watch(() => route.path, () => (menuOpen.value = false));

function logout() {
  auth.logout();
  router.replace('/login');
}
</script>
