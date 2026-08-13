// 轻量 toast 提示
let container: HTMLDivElement | null = null;

export function toast(msg: string, type: 'ok' | 'err' = 'ok', duration = 2200) {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-wrap';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'err' ? 'toast-err' : 'toast-ok');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export function errToast(e: any) {
  toast(e?.message || '操作失败', 'err');
}
