// 统一系统提示 — Toast + Dialog
const FizzUI = {
  // Toast 提示（自动消失）
  toast(msg, type = 'info', duration = 2500) {
    const container = document.getElementById('fizz-toast');
    const item = document.createElement('div');
    item.className = 'fizz-toast-item' + (type === 'error' ? ' fizz-toast-error' : '');
    item.textContent = msg;
    container.appendChild(item);
    setTimeout(() => {
      item.classList.add('fizz-toast-out');
      item.addEventListener('animationend', () => item.remove());
    }, duration);
  },

  // Confirm 弹窗（返回 Promise<boolean>）
  confirm(msg, opts = {}) {
    return new Promise(resolve => {
      const overlay = document.getElementById('fizz-dialog-overlay');
      const msgEl = document.getElementById('fizz-dialog-msg');
      const inputEl = document.getElementById('fizz-dialog-input');
      const cancelBtn = document.getElementById('fizz-dialog-cancel');
      const confirmBtn = document.getElementById('fizz-dialog-confirm');

      msgEl.textContent = msg;
      inputEl.style.display = 'none';
      confirmBtn.textContent = opts.confirmText || '确定';
      cancelBtn.textContent = opts.cancelText || '取消';
      confirmBtn.className = 'fizz-dialog-btn ' + (opts.danger ? 'fizz-btn-danger' : 'fizz-btn-confirm');
      overlay.style.display = 'flex';

      const cleanup = (val) => {
        overlay.style.display = 'none';
        cancelBtn.onclick = null;
        confirmBtn.onclick = null;
        resolve(val);
      };
      cancelBtn.onclick = () => cleanup(false);
      confirmBtn.onclick = () => cleanup(true);
      overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
    });
  },

  // Prompt 弹窗（返回 Promise<string|null>）
  prompt(msg, defaultVal = '') {
    return new Promise(resolve => {
      const overlay = document.getElementById('fizz-dialog-overlay');
      const msgEl = document.getElementById('fizz-dialog-msg');
      const inputEl = document.getElementById('fizz-dialog-input');
      const cancelBtn = document.getElementById('fizz-dialog-cancel');
      const confirmBtn = document.getElementById('fizz-dialog-confirm');

      msgEl.textContent = msg;
      inputEl.style.display = 'block';
      inputEl.value = defaultVal;
      confirmBtn.textContent = '确定';
      cancelBtn.textContent = '取消';
      confirmBtn.className = 'fizz-dialog-btn fizz-btn-confirm';
      overlay.style.display = 'flex';
      setTimeout(() => inputEl.focus(), 100);

      const cleanup = (val) => {
        overlay.style.display = 'none';
        cancelBtn.onclick = null;
        confirmBtn.onclick = null;
        resolve(val);
      };
      cancelBtn.onclick = () => cleanup(null);
      confirmBtn.onclick = () => cleanup(inputEl.value);
      overlay.onclick = (e) => { if (e.target === overlay) cleanup(null); };
      inputEl.onkeydown = (e) => { if (e.key === 'Enter') cleanup(inputEl.value); };
    });
  },

  // Alert（简化版 confirm，只有确定按钮）
  alert(msg) {
    return new Promise(resolve => {
      const overlay = document.getElementById('fizz-dialog-overlay');
      const msgEl = document.getElementById('fizz-dialog-msg');
      const inputEl = document.getElementById('fizz-dialog-input');
      const cancelBtn = document.getElementById('fizz-dialog-cancel');
      const confirmBtn = document.getElementById('fizz-dialog-confirm');

      msgEl.textContent = msg;
      inputEl.style.display = 'none';
      cancelBtn.style.display = 'none';
      confirmBtn.textContent = '好';
      confirmBtn.className = 'fizz-dialog-btn fizz-btn-confirm';
      overlay.style.display = 'flex';

      const cleanup = () => {
        overlay.style.display = 'none';
        cancelBtn.style.display = '';
        confirmBtn.onclick = null;
        resolve();
      };
      confirmBtn.onclick = cleanup;
      overlay.onclick = (e) => { if (e.target === overlay) cleanup(); };
    });
  }
};
