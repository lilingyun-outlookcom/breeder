<template>
  <div>
    <div class="card" style="max-width: 640px">
      <div class="card-title">📍 打卡范围设置</div>
      <p class="muted mb8">饲养员只能在设置的地址范围内签到/签退，超范围将无法打卡。</p>
      <MapPicker
        :lat="form.checkin_lat"
        :lng="form.checkin_lng"
        :radius="form.checkin_radius"
        :amap-key="form.amap_key"
        @update:lat="(v) => (form.checkin_lat = String(v))"
        @update:lng="(v) => (form.checkin_lng = String(v))"
        class="mb8"
      />
      <div class="form-row">
        <div class="form-item">
          <label class="required">中心纬度</label>
          <input v-model="form.checkin_lat" placeholder="如：23.129163" />
        </div>
        <div class="form-item">
          <label class="required">中心经度</label>
          <input v-model="form.checkin_lng" placeholder="如：113.264435" />
        </div>
        <div class="form-item">
          <label class="required">允许半径（米）</label>
          <input v-model="form.checkin_radius" type="number" min="10" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label class="required">上班时间（晚于此时签到记为迟到）</label>
          <input v-model="form.work_start_time" type="time" />
        </div>
        <div class="form-item">
          <label>下班时间</label>
          <input v-model="form.work_end_time" type="time" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>高德地图 Key（可选，配置后地址搜索可命中高德 POI，如景区/园区名称）</label>
          <input v-model="form.amap_key" placeholder="Web 服务类型 Key，留空则使用免费公共搜索" />
        </div>
      </div>
      <p class="muted mt8">
        💡 可在左上角搜索框输入地址快速定位，也可点击地图或拖拽红色标记选点，经纬度会自动填入并支持手动微调。地图标注语言随浏览器语言自动切换中/英文。
      </p>
      <p class="muted mt8">
        💡 默认搜索使用免费公共接口（OSM 数据），部分国内 POI 可能搜不到。免费申请高德 Key：
        <a href="https://lbs.amap.com" target="_blank" rel="noopener">lbs.amap.com</a>
        → 控制台 → 应用管理 → 创建应用 → 添加 Key（服务平台选「Web服务」），填入上方输入框并保存即可。
      </p>
      <div class="form-actions mt16">
        <button class="btn" @click="save">保存设置</button>
      </div>
    </div>

    <div class="card" style="max-width: 640px">
      <div class="card-title">🔑 默认账号</div>
      <div class="tbl-wrap table-wrap">
        <table class="tbl">
          <tbody>
            <tr><td>管理员</td><td>admin / admin123</td></tr>
            <tr><td>兽医</td><td>vet / vet123</td></tr>
            <tr><td>饲养员</td><td>keeper / keeper123</td></tr>
          </tbody>
        </table>
      </div>
      <p class="muted mt8">⚠️ 首次登录后请在「用户管理」中修改默认密码。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { api } from '../../api';
import { toast, errToast } from '../../toast';
import MapPicker from '../../components/MapPicker.vue';

const form = reactive({
  checkin_lat: '', checkin_lng: '', checkin_radius: '',
  work_start_time: '09:00', work_end_time: '18:00', amap_key: '',
});

async function load() {
  try {
    const s = await api.get('/settings');
    Object.assign(form, s);
  } catch (e) {
    errToast(e);
  }
}

async function save() {
  if (!form.checkin_lat || !form.checkin_lng || !form.checkin_radius) {
    return toast('请填写完整的打卡中心坐标和半径', 'err');
  }
  try {
    await api.put('/settings', form);
    toast('设置已保存');
  } catch (e) {
    errToast(e);
  }
}

onMounted(load);
</script>
