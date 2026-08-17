<template>
  <div class="map-picker">
    <div ref="mapEl" class="map-picker-map"></div>
    <div class="search-box">
      <input
        v-model="searchText"
        class="search-input"
        type="text"
        :placeholder="isZh ? '搜索地址，如：广州动物园' : 'Search address…'"
        @keyup.enter="search"
      />
      <button class="search-btn" :disabled="searching" @click="search">
        {{ searching ? (isZh ? '搜索中…' : 'Searching…') : isZh ? '搜索' : 'Search' }}
      </button>
    </div>
    <button class="locate-btn" :disabled="locating" @click="locate" :title="isZh ? '定位到当前位置' : 'Locate me'">
      <span v-if="!locating">📍 {{ isZh ? '定位到当前位置' : 'Locate me' }}</span>
      <span v-else>{{ isZh ? '定位中…' : 'Locating…' }}</span>
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

// 根据浏览器语言自动切换地图标注语言（中文 / English）
const isZh = (navigator.language || 'zh').toLowerCase().startsWith('zh');

const mapEl = ref<HTMLDivElement | null>(null);
const locating = ref(false);
const searchText = ref('');
const searching = ref(false);
let map: L.Map | null = null;
let marker: L.Marker | null = null;
let circle: L.Circle | null = null;
let tiles: L.TileLayer[] = [];
let tileIdx = 0;
// 高德瓦片为 GCJ-02 坐标系，仅在激活时做坐标纠偏；回退到 CartoDB/OSM 时为 WGS-84
let amapActive = false;
// 当前选点（始终保存 WGS-84 坐标，与手机定位/后端一致）
let currentWgs: { lat: number; lng: number } | null = null;

// 默认视野（广州，WGS-84）
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

/* ---- GCJ-02（高德）<-> WGS-84 坐标纠偏 ---- */
const GCJ_PI = 3.1415926535897932384626;
const GCJ_A = 6378245.0;
const GCJ_EE = 0.00669342162296594323;

function outOfChina(lat: number, lng: number) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * GCJ_PI) + 20.0 * Math.sin(2.0 * x * GCJ_PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * GCJ_PI) + 40.0 * Math.sin((y / 3.0) * GCJ_PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * GCJ_PI) + 320 * Math.sin((y * GCJ_PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x: number, y: number) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * GCJ_PI) + 20.0 * Math.sin(2.0 * x * GCJ_PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * GCJ_PI) + 40.0 * Math.sin((x / 3.0) * GCJ_PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * GCJ_PI) + 300.0 * Math.sin((x / 30.0) * GCJ_PI)) * 2.0) / 3.0;
  return ret;
}

function wgsToGcj(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * GCJ_PI;
  let magic = Math.sin(radLat);
  magic = 1 - GCJ_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic)) * GCJ_PI);
  dLng = (dLng * 180.0) / ((GCJ_A / sqrtMagic) * Math.cos(radLat) * GCJ_PI);
  return [lat + dLat, lng + dLng];
}

function gcjToWgs(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng];
  const [gLat, gLng] = wgsToGcj(lat, lng);
  return [lat * 2 - gLat, lng * 2 - gLng];
}

/** WGS-84 -> 地图显示坐标（高德瓦片时转 GCJ-02） */
function toMap(lat: number, lng: number): [number, number] {
  return amapActive ? wgsToGcj(lat, lng) : [lat, lng];
}

/** 地图显示坐标 -> WGS-84 */
function fromMap(lat: number, lng: number): [number, number] {
  return amapActive ? gcjToWgs(lat, lng) : [lat, lng];
}
/* ---- 坐标纠偏结束 ---- */

function emitPoint(lat: number, lng: number) {
  emit('update:lat', round(lat));
  emit('update:lng', round(lng));
}

/** 以 WGS-84 坐标放置/移动标记（显示时按需纠偏） */
function setMarkerWgs(lat: number, lng: number) {
  if (!map) return;
  currentWgs = { lat, lng };
  const [mlat, mlng] = toMap(lat, lng);
  if (!marker) {
    marker = L.marker([mlat, mlng], { icon: divIcon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker!.getLatLng();
      const [wlat, wlng] = fromMap(p.lat, p.lng);
      currentWgs = { lat: wlat, lng: wlng };
      emitPoint(wlat, wlng);
    });
  } else {
    marker.setLatLng([mlat, mlng]);
  }
}

function clearMarker() {
  currentWgs = null;
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
  const wlat = currentWgs?.lat ?? num(props.lat);
  const wlng = currentWgs?.lng ?? num(props.lng);
  if (wlat === null || wlat === undefined || wlng === null || wlng === undefined) return;
  if (!validLatLng(wlat, wlng)) return;
  const [lat, lng] = toMap(wlat, wlng);
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
  amapActive = idx === 0;
  // 瓦片源切换导致坐标系变化（GCJ-02 <-> WGS-84），同步纠正标记/范围圈位置
  if (currentWgs) {
    setMarkerWgs(currentWgs.lat, currentWgs.lng);
    const rv = num(props.radius);
    if (rv !== null && rv > 0) drawCircle(rv);
  }
}

/** 定位到当前位置：成功后移动标记并回填坐标 */
function locate() {
  if (!navigator.geolocation) {
    toast(isZh ? '当前浏览器不支持定位' : 'Geolocation is not supported', 'err');
    return;
  }
  if (locating.value) return;
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false;
      const { latitude, longitude } = pos.coords;
      setMarkerWgs(latitude, longitude);
      const rv = num(props.radius);
      if (rv !== null && rv > 0) drawCircle(rv);
      const [mlat, mlng] = toMap(latitude, longitude);
      map?.setView([mlat, mlng], 16);
      emitPoint(latitude, longitude);
    },
    (err) => {
      locating.value = false;
      const msg = !isZh
        ? 'Unable to get current location'
        : err.code === err.PERMISSION_DENIED
          ? '已拒绝定位授权，请在浏览器设置中允许定位后重试'
          : err.code === err.TIMEOUT
            ? '定位超时，请重试'
            : '无法获取当前位置，请检查定位是否开启';
      toast(msg, 'err');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

interface GeoResult {
  lat: number;
  lng: number;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Photon（komoot）：免费 OSM 地理编码，无需 key，国内可达，返回 WGS-84 */
async function geocodePhoton(q: string): Promise<GeoResult | null> {
  const data = (await fetchJsonWithTimeout(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`,
    8000
  )) as { features?: Array<{ geometry?: { coordinates?: number[] } }> };
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  return { lat: Number(coords[1]), lng: Number(coords[0]) };
}

/** Nominatim：免费 OSM 地理编码，国内访问不稳定，作为回退 */
async function geocodeNominatim(q: string): Promise<GeoResult | null> {
  const data = (await fetchJsonWithTimeout(
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1' +
      `&accept-language=${isZh ? 'zh-CN' : 'en'}&q=${encodeURIComponent(q)}`,
    6000
  )) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(data) || !data.length) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

/** 地址搜索（免费地理编码，返回 WGS-84 坐标；国内网络优先 Photon，Nominatim 回退） */
async function search() {
  const q = searchText.value.trim();
  if (!q || searching.value) return;
  searching.value = true;
  try {
    let result: GeoResult | null = null;
    for (const geocode of [geocodePhoton, geocodeNominatim]) {
      try {
        const r = await geocode(q);
        if (r && validLatLng(r.lat, r.lng)) {
          result = r;
          break;
        }
      } catch {
        // 当前服务不可用（超时/被拦），尝试下一个
      }
    }
    if (!result) {
      toast(
        isZh ? '未找到相关地址或搜索服务暂不可用，请换个关键词重试' : 'Address not found or search unavailable',
        'err'
      );
      return;
    }
    const { lat, lng } = result;
    setMarkerWgs(lat, lng);
    const rv = num(props.radius);
    if (rv !== null && rv > 0) drawCircle(rv);
    const [mlat, mlng] = toMap(lat, lng);
    map?.setView([mlat, mlng], 16);
    emitPoint(lat, lng);
  } finally {
    searching.value = false;
  }
}

onMounted(() => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, { attributionControl: true });
  const lat = num(props.lat) ?? DEFAULT.lat;
  const lng = num(props.lng) ?? DEFAULT.lng;

  // 瓦片源：高德（支持中英文标注切换）为主，失败自动回退 CartoDB / OSM（均免费、无需 key）
  tiles = [
    L.tileLayer(
      `https://webrd0{s}.is.autonavi.com/appmaptile?lang=${isZh ? 'zh_cn' : 'en'}&size=1&scale=1&style=8&x={x}&y={y}&z={z}`,
      {
        subdomains: '1234',
        maxZoom: 18,
        attribution: '&copy; 高德地图 AutoNavi',
      }
    ),
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
  const [vlat, vlng] = toMap(lat, lng);
  map.setView([vlat, vlng], validLatLng(lat, lng) ? 15 : 12);
  map.on('tileerror', () => {
    const next = (tileIdx + 1) % tiles.length;
    tiles[tileIdx]?.remove();
    addTile(next);
  });

  // 点击地图选点（显示坐标转回 WGS-84 存储）
  map.on('click', (e: L.LeafletMouseEvent) => {
    const [wlat, wlng] = fromMap(e.latlng.lat, e.latlng.lng);
    setMarkerWgs(wlat, wlng);
    const rv = num(props.radius);
    if (rv !== null && rv > 0) drawCircle(rv);
    emitPoint(wlat, wlng);
  });

  // 初始坐标
  if (validLatLng(lat, lng)) {
    setMarkerWgs(lat, lng);
    const rv = num(props.radius);
    if (rv !== null && rv > 0) drawCircle(rv);
  }
  setTimeout(() => map?.invalidateSize(), 100);
});

// 输入框手动微调时同步地图 marker / 圆（props 为 WGS-84）
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
    const cur = currentWgs;
    const moved = !cur || Math.abs(cur.lat - la) > 1e-6 || Math.abs(cur.lng - ln) > 1e-6;
    if (moved) {
      setMarkerWgs(la, ln);
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
.search-box {
  position: absolute;
  top: 10px;
  left: 50px;
  z-index: 1001;
  display: flex;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
.search-input {
  width: 200px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1.4;
  border: 1px solid #d9d9d9;
  border-right: none;
  border-radius: 6px 0 0 6px;
  outline: none;
}
.search-input:focus {
  border-color: #1677ff;
}
.search-btn {
  padding: 6px 12px;
  font-size: 13px;
  line-height: 1.4;
  color: #fff;
  background: #1677ff;
  border: 1px solid #1677ff;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  white-space: nowrap;
}
.search-btn:hover:not(:disabled) {
  background: #4096ff;
}
.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
@media (max-width: 640px) {
  .search-input {
    width: 140px;
  }
}
</style>
