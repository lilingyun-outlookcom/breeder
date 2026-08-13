<template>
  <div class="help-page">
    <header class="help-header">
      <div>
        <h1>📖 系统操作手册</h1>
        <p class="sub">动物园饲养管理平台 · 完整使用说明（管理端 + 饲养员端）</p>
      </div>
      <a class="btn btn-outline" :href="appUrl">← 返回系统</a>
    </header>

    <nav class="help-toc">
      <span class="toc-label">目录：</span>
      <a v-for="d in helpDocs" :key="d.path" @click="scrollToDoc(d)">{{ d.title }}</a>
    </nav>

    <div class="help-groups">
      <section v-for="group in groups" :key="group.title" class="help-group">
        <h2 class="group-title">{{ group.title }}</h2>
        <article v-for="d in group.docs" :key="d.path" :id="anchorOf(d)" class="help-doc card">
          <header class="doc-head">
            <h3>{{ d.title }}</h3>
            <span class="doc-path muted">{{ group.pathLabel }}{{ d.path }}</span>
          </header>
          <p class="doc-summary">{{ d.summary }}</p>
          <HelpDocBody :doc="d" />
        </article>
      </section>
    </div>

    <footer class="help-footer muted">
      如有问题请联系系统管理员 · 手册版本 2026-08
    </footer>
  </div>
</template>

<script setup lang="ts">
import { helpDocs, type HelpDoc } from '../help/content';
import HelpDocBody from '../components/HelpDocBody.vue';

const appUrl = import.meta.env.BASE_URL || '/';
const anchorOf = (d: HelpDoc) => 'doc-' + d.path.replace(/\//g, '-').replace(/^-/, '');

function scrollToDoc(d: HelpDoc) {
  // hash 路由下不能用 href="#..."（会被路由拦截），改为滚动定位
  document.getElementById(anchorOf(d))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const isAdmin = (d: HelpDoc) => d.path.startsWith('/admin');
const isKeeper = (d: HelpDoc) => d.path.startsWith('/keeper');

const groups = [
  { title: '通用与登录', docs: helpDocs.filter((d) => d.path === '/common' || d.path === '/login'), pathLabel: '' },
  { title: '管理端（管理员 / 兽医）', docs: helpDocs.filter(isAdmin), pathLabel: '' },
  { title: '饲养员端（手机端）', docs: helpDocs.filter(isKeeper), pathLabel: '' },
];
</script>

<style scoped>
.help-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}
.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.help-header h1 {
  font-size: 22px;
}
.help-header .sub {
  color: var(--text-2);
  font-size: 13px;
  margin-top: 2px;
}
.help-toc {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 10px 14px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: 20px;
}
.help-toc .toc-label {
  font-size: 12.5px;
  color: var(--text-3);
}
.help-toc a {
  font-size: 12.5px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--primary-light);
  color: var(--primary-dark);
}
.help-toc a:hover {
  opacity: 0.85;
}
.help-group {
  margin-bottom: 26px;
}
.group-title {
  font-size: 17px;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 4px solid var(--primary);
}
.help-doc {
  scroll-margin-top: 12px;
}
.help-doc + .help-doc {
  margin-top: 14px;
}
.doc-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.doc-head h3 {
  font-size: 16px;
}
.doc-summary {
  color: var(--text-2);
  font-size: 13px;
  margin: 6px 0 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border);
}
.help-footer {
  text-align: center;
  margin-top: 30px;
}
</style>
