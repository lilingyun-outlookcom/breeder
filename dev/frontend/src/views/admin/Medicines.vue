<template>
  <div>
    <div class="page-head">
      <div class="filters">
        <input v-model="q" placeholder="搜索名称" style="width: 180px" />
      </div>
      <button class="btn" @click="openEdit()">+ 新增药品</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr><th>ID</th><th>名称</th><th>类别</th><th>规格</th><th>单位</th><th>总数</th><th>备注</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id">
            <td>{{ m.id }}</td>
            <td>{{ m.name }}</td>
            <td>
              <span class="badge" :class="m.category === '消毒' ? 'badge-info' : 'badge-warn'">{{ m.category }}</span>
            </td>
            <td>{{ m.spec }}</td>
            <td>{{ m.unit }}</td>
            <td><b>{{ m.stock ?? 0 }}</b></td>
            <td>{{ m.remark }}</td>
            <td>
              <div class="ops">
                <a @click="openStock(m, 'buy')">买入</a>
                <a @click="openStock(m, 'loss')">灭失</a>
                <a @click="openEdit(m)">编辑</a>
                <a style="color: var(--danger)" @click="remove(m)">删除</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :show="show" title="药品/消毒剂" @close="show = false">
      <div class="form-row">
        <div class="form-item">
          <label class="required">名称</label>
          <input v-model="form.name" />
        </div>
        <div class="form-item">
          <label>类别</label>
          <select v-model="form.category">
            <option value="用药">用药</option>
            <option value="消毒">消毒</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>规格</label>
          <input v-model="form.spec" placeholder="如：0.5g*10片" />
        </div>
        <div class="form-item">
          <label>单位</label>
          <input v-model="form.unit" placeholder="如：片/毫升" />
        </div>
      </div>
      <div class="form-item">
        <label>备注</label>
        <input v-model="form.remark" />
      </div>
      <div class="form-actions">
        <button class="btn" @click="save">保存</button>
        <button class="btn btn-ghost" @click="show = false">取消</button>
      </div>
    </Modal>

    <!-- 买入/灭失 -->
    <Modal :show="showStock" :title="stockType === 'buy' ? '买入入库' : '灭失出库'" @close="showStock = false">
      <p class="muted mb8">{{ stockItem?.name }}（当前总数 {{ stockItem?.stock ?? 0 }}）</p>
      <div class="form-row">
        <div class="form-item">
          <label class="required">数量</label>
          <input v-model="stockForm.quantity" type="number" min="0.01" step="0.01" />
        </div>
        <div class="form-item">
          <label>备注</label>
          <input v-model="stockForm.remark" placeholder="选填" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn" @click="saveStock">{{ stockType === 'buy' ? '确认买入' : '确认灭失' }}</button>
        <button class="btn btn-ghost" @click="showStock = false">取消</button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from '../../api';
import { toast, errToast } from '../../toast';
import Modal from '../../components/Modal.vue';

const list = ref<any[]>([]);
const q = ref('');
const show = ref(false);
const editing = ref<any>(null);
const form = reactive({ name: '', category: '用药', spec: '', unit: '', remark: '' });
const showStock = ref(false);
const stockType = ref<'buy' | 'loss'>('buy');
const stockItem = ref<any>(null);
const stockForm = reactive({ quantity: 1, remark: '' });

const filtered = computed(() =>
  q.value.trim() ? list.value.filter((m) => m.name.includes(q.value.trim())) : list.value
);

async function load() {
  list.value = await api.get('/medicines');
}
function openEdit(m?: any) {
  editing.value = m || null;
  Object.assign(form, {
    name: m?.name || '', category: m?.category || '用药', spec: m?.spec || '',
    unit: m?.unit || '', remark: m?.remark || '',
  });
  show.value = true;
}
async function save() {
  if (!form.name) return toast('请填写名称', 'err');
  try {
    if (editing.value) await api.put(`/medicines/${editing.value.id}`, form);
    else await api.post('/medicines', form);
    toast('保存成功');
    show.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}
async function remove(m: any) {
  if (!confirm(`确认删除「${m.name}」？`)) return;
  try {
    await api.del(`/medicines/${m.id}`);
    toast('已删除');
    load();
  } catch (e) {
    errToast(e);
  }
}

function openStock(m: any, t: 'buy' | 'loss') {
  stockItem.value = m;
  stockType.value = t;
  Object.assign(stockForm, { quantity: 1, remark: '' });
  showStock.value = true;
}
async function saveStock() {
  const quantity = Number(stockForm.quantity);
  if (!quantity || quantity <= 0) return toast('请填写数量', 'err');
  try {
    await api.post('/inventory', {
      item_type: 'medicine',
      item_id: stockItem.value.id,
      change_type: stockType.value,
      quantity,
      remark: stockForm.remark,
    });
    toast(stockType.value === 'buy' ? '已入库' : '已灭失');
    showStock.value = false;
    load();
  } catch (e) {
    errToast(e);
  }
}
onMounted(load);
</script>
