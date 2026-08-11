import { createRouter, createWebHashHistory } from 'vue-router';
import { auth } from './store';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: () => import('./views/Login.vue') },
    { path: '/help', component: () => import('./views/Help.vue'), meta: { title: '操作手册', public: true } },
    {
      path: '/admin',
      component: () => import('./views/admin/AdminLayout.vue'),
      meta: { roles: ['admin', 'vet'] },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', component: () => import('./views/admin/Dashboard.vue'), meta: { title: '首页看板' } },
        { path: 'users', component: () => import('./views/admin/Users.vue'), meta: { title: '用户管理', adminOnly: true } },
        { path: 'cages', component: () => import('./views/admin/Cages.vue'), meta: { title: '笼舍管理', adminOnly: true } },
        { path: 'animals', component: () => import('./views/admin/Animals.vue'), meta: { title: '动物管理', adminOnly: true } },
        { path: 'feeds', component: () => import('./views/admin/Feeds.vue'), meta: { title: '饲料管理', adminOnly: true } },
        { path: 'medicines', component: () => import('./views/admin/Medicines.vue'), meta: { title: '药品管理', adminOnly: true } },
        { path: 'tasks', component: () => import('./views/admin/Tasks.vue'), meta: { title: '任务管理' } },
        { path: 'attendance', component: () => import('./views/admin/Attendance.vue'), meta: { title: '考勤记录' } },
        { path: 'reports', component: () => import('./views/admin/Reports.vue'), meta: { title: '异常工单' } },
        { path: 'treatment', component: () => import('./views/admin/Treatment.vue'), meta: { title: '诊疗方案' } },
        { path: 'breeding', component: () => import('./views/admin/Breeding.vue'), meta: { title: '繁育计划' } },
        { path: 'records', component: () => import('./views/admin/Records.vue'), meta: { title: '记录查询' } },
        { path: 'settings', component: () => import('./views/admin/Settings.vue'), meta: { title: '系统设置', adminOnly: true } },
        { path: 'notifications', component: () => import('./views/admin/Notifications.vue'), meta: { title: '消息中心' } },
      ],
    },
    {
      path: '/keeper',
      component: () => import('./views/keeper/KeeperLayout.vue'),
      meta: { roles: ['keeper'] },
      children: [
        { path: '', redirect: '/keeper/home' },
        { path: 'home', component: () => import('./views/keeper/Home.vue'), meta: { title: '首页' } },
        { path: 'tasks', component: () => import('./views/keeper/Tasks.vue'), meta: { title: '我的任务' } },
        { path: 'task/:id', component: () => import('./views/keeper/TaskDetail.vue'), meta: { title: '任务详情' } },
        { path: 'checkin', component: () => import('./views/keeper/Checkin.vue'), meta: { title: '打卡' } },
        { path: 'messages', component: () => import('./views/keeper/Messages.vue'), meta: { title: '消息' } },
        { path: 'animals', component: () => import('./views/keeper/Animals.vue'), meta: { title: '我的动物' } },
        { path: 'report', component: () => import('./views/keeper/ReportCreate.vue'), meta: { title: '异常上报' } },
        { path: 'reports', component: () => import('./views/keeper/ReportList.vue'), meta: { title: '我的上报' } },
        { path: 'breeding', component: () => import('./views/keeper/Breeding.vue'), meta: { title: '繁育任务' } },
        { path: 'attendance-history', component: () => import('./views/keeper/AttendanceHistory.vue'), meta: { title: '我的打卡记录' } },
        { path: 'profile', component: () => import('./views/keeper/Profile.vue'), meta: { title: '我的' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
});

router.beforeEach((to) => {
  if (to.path === '/login' || to.path === '/help') return true;
  if (!auth.isLogin) return { path: '/login' };
  const roles = to.meta.roles as string[] | undefined;
  if (roles && !roles.includes(auth.user?.role || '')) {
    return auth.isAdmin ? { path: '/admin' } : { path: '/keeper' };
  }
  if (to.meta.adminOnly && auth.user?.role !== 'admin') {
    return { path: '/admin/dashboard' };
  }
  return true;
});

export default router;
