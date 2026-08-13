<template>
  <div>
    <section v-for="(sec, i) in doc?.sections || []" :key="i" class="help-sec">
      <h4 v-if="sec.heading">{{ sec.heading }}</h4>
      <ol v-if="sec.steps?.length" class="help-steps">
        <li v-for="(s, j) in sec.steps" :key="j">{{ s }}</li>
      </ol>
      <ul v-if="sec.bullets?.length" class="help-bullets">
        <li v-for="(b, j) in sec.bullets" :key="j">{{ b }}</li>
      </ul>
      <p v-if="sec.note" class="help-callout help-note">💡 {{ sec.note }}</p>
      <p v-if="sec.warn" class="help-callout help-warn">⚠️ {{ sec.warn }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { HelpDoc } from '../help/content';

defineProps<{ doc?: HelpDoc }>();
</script>

<style scoped>
.help-sec {
  margin-bottom: 14px;
}
.help-sec h4 {
  font-size: 14px;
  color: var(--primary-dark);
  margin-bottom: 6px;
}
.help-sec ol,
.help-sec ul {
  padding-left: 20px;
  font-size: 13.5px;
  color: var(--text);
}
.help-sec li {
  margin-bottom: 4px;
}
.help-callout {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}
.help-note {
  background: var(--primary-light);
  color: var(--primary-dark);
}
.help-warn {
  background: #fee2e2;
  color: var(--danger);
}
</style>
