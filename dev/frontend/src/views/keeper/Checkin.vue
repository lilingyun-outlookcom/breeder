<template>
  <div>
    <div class="mobile-top">
      <RouterLink to="/keeper/home" class="back">‹</RouterLink>
      <span class="title">📍 打卡签到</span>
    </div>

    <div class="mobile-body">
      <div class="att-card" style="background: linear-gradient(135deg, #059669, #34d399)">
        <div>
          <div style="font-size: 13px; opacity: 0.9">今日打卡状态</div>
          <div class="big">{{ attText }}</div>
          <div class="time">
            <template v-if="att?.check_in_at">签到 {{ att.check_in_at.slice(11, 16) }} · {{ att.check_in_status }}</template>
            <template v-if="att?.check_out_at"> · 签退 {{ att.check_out_at.slice(11, 16) }}</template>
            <template v-if="!att?.check_in_at">上班时间 {{ settings.work_start_time || '09:00' }}，晚于该时间签到记为迟到</template>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📍 打卡范围</div>
        <div class="flex-between" style="margin-bottom: 6px">
          <span class="muted">打卡中心：{{ settings.checkin_lat }}, {{ settings.checkin_lng }}</span>
        </div>
        <div class="flex-between">
          <span class="muted">允许半径：{{ settings.checkin_radius }} 米</span>
          <span class="muted" v-if="!pos">未获取定位</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📡 我的位置</div>
        <template v-if="pos">
          <p>经度：{{ pos.coords.longitude }}</p>
          <p>纬度：{{ pos.coords.latitude }}</p>
          <p class="mt8" style="font-size: 15px">
            距打卡点：
            <b :style="{ color: inRange ? 'var(--primary)' : 'var(--danger)' }">{{ dist }} 米</b>
            <span v-if="!inRange" class="badge badge-danger" style="margin-left: 8px">超出范围</span>
            <span v-else class="badge badge-ok" style="margin-left: 8px">范围内</span>
          </p>
        </template>
        <p v-else class="muted">正在获取定位…请确保已允许浏览器定位权限（需 HTTPS 环境）</p>
        <div class="form-actions mt8">
          <button class="btn btn-ghost" @click="locate">刷新定位</button>
        </div>
      </div>

      <div class="flex" style="gap: 10px; margin-top: 14px">
        <button class="btn btn-lg" style="flex: 1" :disabled="!inRange || !!att?.check_in_at" @click="checkIn">
          签到
        </button>
        <button class="btn btn-lg btn-outline" style="flex: 1" :disabled="!inRange || !att?.check_in_at || !!att?.check_out_at" @click="checkOut">
          签退
        </button>
      </div>
      <p v-if="!inRange" class="muted mt8" style="text-align: center">
        ⚠️ 你不在打卡范围内，无法签到/签退
      </p>
      <p class="muted mt8" style="text-align: center" v-else>
        💡 请到达园区打卡点后点击签到
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../../api';
import { toast, errToast } from '../../toast';

const settings = ref<any>({});
const att = ref<any>(null);
const pos = ref<any>(null);
const dist = ref(0);

const inRange = computed(() => pos.value && dist.value <= (Number(settings.value.checkin_radius) || 500));
const attText = computed(() => {
  if (!att.value) return '未签到';
  if (att.value.check_out_at) return '已签退';
  if (att.value.check_in_at) return '已签到';
  return '未签到';
});

function locate() {
  if (!navigator.geolocation) {
    toast('当前浏览器不支持定位', 'err');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (p) => {
      pos.value = p;
      calcDist(p);
    },
    (e) => {
      console.warn('定位失败', e);
      toast('定位失败：' + (e.message || '请检查权限'), 'err');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function calcDist(p: any) {
  const lat = Number(settings.value.checkin_lat);
  const lng = Number(settings.value.checkin_lng);
  if (!lat || !lng) return;
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(p.coords.latitude - lat);
  const dLng = toRad(p.coords.longitude - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(p.coords.latitude)) * Math.sin(dLng / 2) ** 2;
  dist.value = Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

async function checkIn() {
  try {
    const r = await api.post('/attendance/checkin', {
      lat: pos.value.coords.latitude,
      lng: pos.value.coords.longitude,
    });
    toast(r.status === '迟到' ? `签到成功（迟到）` : '签到成功');
    load();
  } catch (e) {
    errToast(e);
  }
}

async function checkOut() {
  try {
    await api.post('/attendance/checkout', {
      lat: pos.value.coords.latitude,
      lng: pos.value.coords.longitude,
    });
    toast('签退成功');
    load();
  } catch (e) {
    errToast(e);
  }
}

async function load() {
  try {
    const [s, a] = await Promise.all([api.get('/settings'), api.get('/attendance/me')]);
    settings.value = s;
    att.value = a;
    if (pos.value) calcDist(pos.value);
  } catch (e) {
    errToast(e);
  }
}

onMounted(async () => {
  await load();
  locate();
});
</script>
