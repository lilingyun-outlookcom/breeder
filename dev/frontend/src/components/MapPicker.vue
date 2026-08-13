<template>
  <div class="map-picker">
    <div ref="mapEl" class="map-picker-map"></div>
    <button class="locate-btn" :disabled="locating" @click="locate" title="定位到当前位置">
      <span v-if="!locating">📍 定位到当前位置</span>
      <span v-else>定位中…</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from '../toast';

const props = withDefaults(
  defineProps<{ lat?: number | string; lng?: number | string; radius?: number | string }>(),
  {}
);
const emit = defineEmits<{
  (e: 'update:lat', v: number): void;
  (e: 'update:lng', v: number): void;
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const locating = ref(false);
let map: L.Map | null = null;
let marker: L.Marker | null = null;
let circle: L.Circle | null = null;
let tiles: L.TileLayer[] = [];
let tileIdx = 0;

// 默认视野（广州）
const DEFAULT = { lat: 23.13, lng: 113.26 };

// 自定义 marker 图标：避免 Leaflet 默认 PNG 图标在 Vite 打包下的路径问题
const divIcon = L.divIcon({
  className: 'map-picker-marker',
  html: '<div class="map-picker-dot"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(v: number) {
  return Number(v.toFixed(6));
}

function validLatLng(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function setMarker(lat: number, lng: number) {
  if (!map) return;
  if (!marker) {
    marker = L.marker([lat, lng], { icon: divIcon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker!.getLatLng();
      emit('update:lat', round(p.lat));
      emit('update:lng', round(p.lng));
    });
  } else {
    marker.setLatLng([lat, lng]);
  }
}

function clearMarker() {
  if (marker) {
    marker.remove();
    marker = null;
  }
  if (circle) {
    circle.remove();
    circle = null;
  }
}

function drawCircle(radius: number) {
  if (!map) return;
  const p = marker?.getLatLng();
  const lat = p ? p.lat : num(props.lat);
  const lng = p ? p.lng : num(props.lng);
  if (lat === null || lng === null || !validLatLng(lat, lng)) return;
  if (!circle) {
    circle = L.circle([lat, lng], {
      radius,
      color: '#1677ff',
      weight: 1.5,
      fillColor: '#1677ff',
      fillOpacity: 0.12,
    }).addTo(map);
  } else {
    circle.setLatLng([lat, lng]);
    circle.setRadius(radius);
  }
}

function addTile(idx: number) {
  if (!map || !tiles[idx]) return;
  tiles[idx].addTo(map);
  tileIdx = idx;
}

/** 定位到当前位置：成功后移动标记并回填坐标 */
function locate() {
  if (!navigator.geolocation) {
    toast('当前浏览器不支持定位', 'err');
    return;
  }
  if (locating.value) return;
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false;
      const { latitude, longitude } = pos.coords;
      setMarker(latitude, longitude);
      const rv = num(props.radius);
      if (rv !== null && rv > 0) drawCircle(rv);
      map?.setView([latitude, longitude], 16);
      emit('update:lat', round(latitude));
      emit('update:lng', round(longitude));
    },
    (err) => {
      locating.value = false;
      const msg =
        err.code === err.PERMISSION_DENIED
          ? '已拒绝定位授权，请在浏览器设置中允许定位后重试'
          : err.code === err.TIMEOUT
            ? '定位超时，请重试'
            : '无法获取当前位置，请检查定位是否开启';
      toast(msg, 'err');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

onMounted(() => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, { attributionControl: true });
  const lat = num(props.lat) ?? DEFAULT.lat;
  const lng = num(props.lng) ?? DEFAULT.lng;
  map.setView([lat, lng], validLatLng(lat, lng) ? 15 : 12);

  // 瓦片源：CartoDB 为主，失败自动回退 OSM（均免费、无需 key）
  tiles = [
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
    }),
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }),
  ];
  addTile(0);
  map.on('tileerror', () => {
    const next = (tileIdx + 1) % tiles.length;
    tiles[tileIdx]?.remove();
    addTile(next);
  });

  // 点击地图选点
  map.on('click', (e: L.LeafletMouseEvent) => {
    const { lat: la, lng: ln } = e.latlng;
    setMarker(la, ln);
    const rv = num(props.radius);
    if (rv !== null && rv > 0) drawCircle(rv);
    emit('update:lat', round(la));
    emit('update:lng', round(ln));
  });

  // 初始坐标
  if (validLatLng(lat, lng)) {
    setMarker(lat, lng);
    const rv = num(props.radius);
    if (rv !== null && rv > 0) drawCircle(rv);
  }
  setTimeout(() => map?.invalidateSize(), 100);
});

// 输入框手动微调时同步地图 marker / 圆
watch(
  () => [props.lat, props.lng] as const,
  ([lat, lng]) => {
    if (!map) return;
    const la = num(lat);
    const ln = num(lng);
    if (la === null || ln === null || !validLatLng(la, ln)) {
      clearMarker();
      return;
    }
    const cur = marker?.getLatLng();
    const moved = !cur || Math.abs(cur.lat - la) > 1e-6 || Math.abs(cur.lng - ln) > 1e-6;
    if (moved) {
      setMarker(la, ln);
      const rv = num(props.radius);
      if (rv !== null && rv > 0) drawCircle(rv);
    }
  }
);

watch(
  () => props.radius,
  (r) => {
    if (!map) return;
    const rv = num(r);
    if (rv !== null && rv > 0) drawCircle(rv);
  }
);

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<style scoped>
.map-picker {
  position: relative;
  width: 100%;
}
.map-picker-map {
  height: 320px;
  border-radius: 8px;
  overflow: hidden;
  z-index: 0;
}
.locate-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1001;
  padding: 6px 12px;
  font-size: 13px;
  line-height: 1.4;
  color: #333;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}
.locate-btn:hover:not(:disabled) {
  border-color: #1677ff;
  color: #1677ff;
}
.locate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
/* Leaflet 动态插入的 DOM 不受 scoped 限制，需穿透 */
.map-picker-map :deep(.map-picker-marker) {
  background: transparent;
  border: none;
}
.map-picker-map :deep(.map-picker-dot) {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff4d4f;
  border: 3px solid #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
}
</style>
