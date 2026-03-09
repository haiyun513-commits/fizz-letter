// 信友系统前端模块
const PenPal = {
  currentPenPalId: null,
  currentPenPalName: null,
  currentTab: 'letters',
  pollTimer: null,
  pollInterval: 5000,
  _pollEstimatedAt: null,

  // ─── API helpers ───
  async api(path, opts = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...Auth.authHeaders(),
      ...(opts.headers || {}),
    };
    const fetchOpts = { ...opts, headers };
    if (opts.body) fetchOpts.body = JSON.stringify(opts.body);
    const res = await fetch('/api/penpal' + path, fetchOpts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  },

  // ─── Mailbox Home ───
  async loadMailbox() {
    const dbg = document.getElementById('penpal-list');
    dbg.innerHTML = '<div style="color:#aaa;padding:12px;font-size:11px;">loading...</div>';
    try {
      const [activeData, archivedData] = await Promise.all([
        this.api('/list'),
        this.api('/archived').catch(() => ({ penPals: [] })),
      ]);
      this.renderMailboxList(activeData.penPals || [], archivedData.penPals || []);
      this.loadLegacyMailbox();
      this.setupLegacyToggle();
      this.setupTestMode();
    } catch (err) {
      console.error('loadMailbox error:', err);
      document.getElementById('penpal-list').innerHTML =
        '<div style="color:#e57373;padding:12px;font-size:11px;word-break:break-all;">ERR: ' + err.message + '</div>';
    }
  },

  async loadLegacyMailbox() {
    try {
      const letters = await Auth.getMailbox();
      const container = document.getElementById('legacy-mailbox');
      if (!letters || letters.length === 0) {
        container.innerHTML = '<div class="penpal-empty-hint">还没有一次性信件</div>';
        return;
      }
      container.innerHTML = letters.map(l => {
        const icon = '';
        const label = l.type === 'letter' ? '信件' :
                      l.type === 'answer' ? '答案' :
                      l.type === 'tarot' ? '塔罗' : '语言之间';
        const date = new Date(l.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        const preview = (l.content || '').slice(0, 40) + (l.content?.length > 40 ? '...' : '');
        return `<div class="legacy-card" data-id="${l.id}">
          <div class="legacy-card-icon">${icon}</div>
          <div class="legacy-card-body">
            <div class="legacy-card-label">${label} · ${date}</div>
            <div class="legacy-card-preview">${this.escapeHtml(preview)}</div>
          </div>
        </div>`;
      }).join('');

      container.querySelectorAll('.legacy-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          const item = letters.find(l => l.id === id);
          if (item && window._showLegacyDetail) {
            window._showLegacyDetail(item);
          }
        });
      });
    } catch {
      // silent
    }
  },

  // ─── Pen Pal Detail ───
  async loadDetail(penPalId) {
    this.currentPenPalId = penPalId;
    this.currentTab = 'letters';
    try {
      const data = await this.api('/' + penPalId);
      const pp = data.penPal;
      document.getElementById('penpal-detail-name').textContent = pp.name;
      this.currentPenPalName = pp.name;

      this.switchTab('letters');
      this.renderLetterTimeline(data.letters || []);

      if (data.pendingReply) {
        this.showWaiting(data.pendingReply.estimated_at);
        this.startPolling(penPalId);
      } else {
        this.hideWaiting();
        this.stopPolling();
      }
    } catch (err) {
      console.error('loadDetail error:', err);
    }
  },

  // ─── Send Letter ───
  _sendingLetter: false,
  _instantWaiting: false,
  testMode: localStorage.getItem('fizz-test-mode') === 'true',

  async sendLetter(penPalId, content, instant) {
    if (this._sendingLetter) return;
    if (this.testMode) instant = true;
    if (!instant && !content.trim()) return;
    this._sendingLetter = true;
    const sendBtn = document.getElementById('btn-send-letter');
    const instantBtn = document.getElementById('btn-instant-letter');
    sendBtn.disabled = true;
    instantBtn.disabled = true;
    if (instant) {
      instantBtn.textContent = '传达中...';
      instantBtn.classList.add('btn-sending');
    }
    try {
      const body = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      if (content.trim()) body.content = content.trim();
      if (instant) body.instant = true;
      const data = await this.api('/' + penPalId + '/letter', {
        method: 'POST',
        body,
      });

      document.getElementById('letter-input').value = '';
      document.getElementById('letter-char-count').textContent = '0';

      if (content.trim()) {
        this.appendLetter({
          role: 'user',
          content: content.trim(),
          created_at: new Date().toISOString(),
        });
      }

      if (data.estimated_at) {
        this.showWaiting(data.estimated_at, instant);
        this.startPolling(penPalId, instant);
      }

      if (instant) {
        // Keep instant button in "传达中..." state until reply arrives
        this._instantWaiting = true;
        this._sendingLetter = false;
        return; // skip finally reset for instant
      }
    } catch (err) {
      FizzUI.toast(err.message || '发送失败', 'error');
    } finally {
      this._sendingLetter = false;
      if (!this._instantWaiting) {
        sendBtn.disabled = false;
        instantBtn.disabled = false;
        instantBtn.textContent = '一念即达';
        instantBtn.classList.remove('btn-sending');
      }
    }
  },

  resetInstantButton() {
    this._instantWaiting = false;
    const sendBtn = document.getElementById('btn-send-letter');
    const instantBtn = document.getElementById('btn-instant-letter');
    if (sendBtn) { sendBtn.disabled = false; }
    if (instantBtn) {
      instantBtn.disabled = false;
      instantBtn.textContent = '一念即达';
      instantBtn.classList.remove('btn-sending');
    }
  },

  // ─── Check Reply Status ───
  _pollCount: 0,
  async checkStatus(penPalId) {
    this._pollCount++;
    try {
      const data = await this.api('/' + penPalId + '/status');
      console.log(`[poll #${this._pollCount}]`, JSON.stringify(data));
      if (data.hasReply && data.newLetter) {
        console.log('[poll] 回信到达！', data.newLetter.letter_type);
        this.stopPolling();
        this.hideWaiting();
        this.resetInstantButton();
        this.appendLetter(data.newLetter);
        const timeline = document.getElementById('letter-timeline');
        const lastCard = timeline.lastElementChild;
        if (lastCard) {
          lastCard.classList.add('letter-card-reveal');
          setTimeout(() => lastCard.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
        }
        // Also reload fragments + reset fragment UI if it was a digest
        if (data.newLetter.letter_type === 'fragment_digest') {
          this.loadFragments(penPalId);
          this.resetFragmentInstant();
        }
      }
      return data;
    } catch (err) {
      console.error('[poll] error:', err);
      return null;
    }
  },

  startPolling(penPalId, instant) {
    this.stopPolling();
    const estimatedTime = this._pollEstimatedAt ? new Date(this._pollEstimatedAt).getTime() : Date.now();

    const getInterval = () => {
      const now = Date.now();
      const untilReply = estimatedTime - now;
      if (instant) {
        // instant: 2s for first 30s, then 5s
        return now - estimatedTime < 30000 ? 2000 : 5000;
      }
      if (untilReply > 60000) return 15000;  // >1min to go: every 15s
      if (untilReply > 0) return 5000;        // <1min to go: every 5s
      // past estimated time — reply should be here
      const overtime = now - estimatedTime;
      if (overtime < 120000) return 5000;     // 0-2min late: every 5s
      if (overtime < 600000) return 15000;    // 2-10min late: every 15s
      return 30000;                            // 10min+ late: every 30s
    };

    const poll = async () => {
      const status = await this.checkStatus(penPalId);
      if (status && status.hasReply) return;
      // If server says still pending, keep going — no time limit
      this.pollTimer = setTimeout(poll, getInterval());
    };

    this.pollTimer = setTimeout(poll, getInterval());
  },

  stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  },

  // Fragment instant polling - wait for digest reply
  startFragmentPolling(penPalId) {
    if (this._fragPollTimer) clearTimeout(this._fragPollTimer);
    const startTime = Date.now();
    const poll = async () => {
      try {
        const data = await this.api('/' + penPalId + '/status');
        console.log('[frag-poll]', JSON.stringify(data));
        if (data.hasReply && data.newLetter) {
          // 回复到达 — 刷新碎片列表 + 显示在信件时间线
          this.loadFragments(penPalId);
          this.appendLetter(data.newLetter);
          const timeline = document.getElementById('letter-timeline');
          const lastCard = timeline && timeline.lastElementChild;
          if (lastCard) {
            lastCard.classList.add('letter-card-reveal');
            setTimeout(() => lastCard.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
          }
          this.resetFragmentInstant();
          return;
        }
      } catch {}
      const elapsed = Date.now() - startTime;
      if (elapsed > 300000) {
        this.resetFragmentInstant();
        return;
      }
      const interval = elapsed < 30000 ? 2000 : 5000;
      this._fragPollTimer = setTimeout(poll, interval);
    };
    this._fragPollTimer = setTimeout(poll, 2000);
  },

  resetFragmentInstant() {
    const waitEl = document.getElementById('fragment-waiting');
    if (waitEl) waitEl.style.display = 'none';
    const instantBtn = this._fragInstantBtn || document.getElementById('btn-instant-fragment');
    const sendBtn = this._fragSendBtn || document.getElementById('btn-send-fragment');
    if (instantBtn) {
      instantBtn.textContent = '\u4e00\u5ff5\u5373\u8fbe';
      instantBtn.disabled = false;
      instantBtn.classList.remove('btn-reading');
    }
    if (sendBtn) sendBtn.disabled = false;
    this._fragInstantBtn = null;
    this._fragSendBtn = null;
    if (this._fragPollTimer) {
      clearTimeout(this._fragPollTimer);
      this._fragPollTimer = null;
    }
  },


  // ─── Create Pen Pal ───
  async createPenPal(name, initialLetter) {
    if (!name.trim()) return null;
    try {
      const body = { name: name.trim() };
      if (initialLetter) body.initial_letter = initialLetter;
      const data = await this.api('/create', {
        method: 'POST',
        body,
      });
      return data.penPal;
    } catch (err) {
      FizzUI.toast(err.message || '创建失败', 'error');
      return null;
    }
  },

  // ─── Archive / Restore ───
  async archivePenPal(penPalId) {
    try {
      await this.api('/' + penPalId + '/archive', { method: 'POST' });
      return true;
    } catch { return false; }
  },

  async deletePenPal(penPalId) {
    try {
      await this.api('/' + penPalId + '/delete', { method: 'POST' });
      return true;
    } catch (err) {
      FizzUI.toast('删除失败', 'error');
      return false;
    }
  },

  async restorePenPal(penPalId) {
    try {
      await this.api('/' + penPalId + '/restore', { method: 'POST' });
      return true;
    } catch { return false; }
  },

  // ─── Fragments ───
  async loadFragments(penPalId) {
    try {
      const data = await this.api('/' + penPalId + '/fragments');
      this.renderFragments(data.fragments || [], data.digests || []);
    } catch (err) {
      console.error('loadFragments error:', err);
    }
  },

  fragmentImage: null, // base64 data URI

  async sendFragment(penPalId, content, instant) {
    if (this.testMode) instant = true;
    if (!content.trim() && !this.fragmentImage && !instant) return;
    const sendBtn = document.getElementById('btn-send-fragment');
    const instantBtn = document.getElementById('btn-instant-fragment');
    try {
      sendBtn.disabled = true;
      instantBtn.disabled = true;
      if (instant) {
        instantBtn.textContent = '正在读碎片...';
        instantBtn.classList.add('btn-reading');
      } else {
        sendBtn.textContent = '投入中...';
      }
      const body = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      if (content.trim()) body.content = content.trim();
      if (instant) body.instant = true;
      if (this.fragmentImage) body.image = this.fragmentImage;
      await this.api('/' + penPalId + '/fragment', {
        method: 'POST',
        body,
      });
      document.getElementById('fragment-input').value = '';
      this.clearFragmentImage();
      this.loadFragments(penPalId);
      if (instant) {
        // Stop letter polling to avoid race condition
        this.stopPolling();
        this.hideWaiting();
        // Show waiting animation + keep polling until AI reply
        const waitEl = document.getElementById('fragment-waiting');
        if (waitEl) waitEl.style.display = 'flex';
        this._fragInstantBtn = instantBtn;
        this._fragSendBtn = sendBtn;
        this._fragPollPenPalId = penPalId;
        this.startFragmentPolling(penPalId);
      } else {
        sendBtn.textContent = '已投入 ✓';
        setTimeout(() => {
          sendBtn.textContent = '投入';
          sendBtn.disabled = false;
          instantBtn.disabled = false;
        }, 1500);
      }
    } catch (err) {
      sendBtn.textContent = '投入';
      sendBtn.disabled = false;
      instantBtn.textContent = '一念即达';
      instantBtn.disabled = false;
      instantBtn.classList.remove('btn-reading');
      FizzUI.toast(err.message || '发送失败', 'error');
    }
  },

  clearFragmentImage() {
    this.fragmentImage = null;
    const preview = document.getElementById('fragment-image-preview');
    const img = document.getElementById('fragment-preview-img');
    if (preview) preview.style.display = 'none';
    if (img) img.src = '';
  },

  async deleteFragment(fragId) {
    try {
      await this.api('/' + this.currentPenPalId + '/fragment/' + fragId, { method: 'DELETE' });
      this.loadFragments(this.currentPenPalId);
    } catch (err) {
      FizzUI.toast('删除失败', 'error');
    }
  },

  async editFragment(fragId, newContent) {
    try {
      await this.api('/' + this.currentPenPalId + '/fragment/' + fragId, {
        method: 'PUT',
        body: { content: newContent },
      });
      this.loadFragments(this.currentPenPalId);
    } catch (err) {
      FizzUI.toast('编辑失败', 'error');
    }
  },

  quoteFragment(content) {
    const input = document.getElementById('fragment-input');
    input.value = '「' + content + '」\n';
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  },

  _longPressTimer: null,
  _longPressTarget: null,

  initFragmentLongPress() {
    const container = document.getElementById('fragment-today');
    if (!container || container._longPressInited) return;
    container._longPressInited = true;

    let menuJustOpened = false;

    const startPress = (e) => {
      const item = e.target.closest('.fragment-item');
      const img = e.target.closest('[data-frag-type="image"]');
      if (!item && !img) return;
      const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      this._longPressTarget = { item, img, x: cx, y: cy };
      this._longPressFired = false;
      this._longPressTimer = setTimeout(() => {
        this._longPressFired = true;
        menuJustOpened = true;
        setTimeout(() => { menuJustOpened = false; }, 500);
        if (img) {
          this.showFragmentMenu(cx, cy, img.dataset.fragId, null, true);
        } else if (item) {
          this.showFragmentMenu(cx, cy, item.dataset.fragId, item.dataset.fragContent, false);
        }
        this._longPressTarget = null;
      }, 500);
    };

    const cancelPress = (e) => {
      if (this._longPressFired) {
        e.preventDefault();
        e.stopPropagation();
      }
      clearTimeout(this._longPressTimer);
      this._longPressTarget = null;
    };

    container.addEventListener('touchstart', startPress, { passive: false });
    container.addEventListener('touchend', cancelPress);
    container.addEventListener('touchmove', (e) => {
      clearTimeout(this._longPressTimer);
      this._longPressTarget = null;
    });
    container.addEventListener('mousedown', startPress);
    container.addEventListener('mouseup', cancelPress);
    container.addEventListener('mouseleave', () => {
      clearTimeout(this._longPressTimer);
      this._longPressTarget = null;
    });

    // Close menu on outside click — use setTimeout to skip the ghost click from long-press release
    document.addEventListener('click', (e) => {
      if (menuJustOpened) return;
      const menu = document.getElementById('fragment-context-menu');
      if (menu && menu.style.display === 'block' && !menu.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
    // Also close on touchstart outside (mobile)
    document.addEventListener('touchstart', (e) => {
      if (menuJustOpened) return;
      const menu = document.getElementById('fragment-context-menu');
      if (menu && menu.style.display === 'block' && !menu.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  },

  showFragmentMenu(x, y, fragId, content, isImage) {
    let menu = document.getElementById('fragment-context-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'fragment-context-menu';
      menu.className = 'fragment-context-menu';
      document.body.appendChild(menu);
    }

    let html = '';
    if (isImage) {
      html = '<div class="frag-menu-item frag-menu-danger" data-action="delete">删除图片</div>';
    } else {
      html += '<div class="frag-menu-item" data-action="edit">编辑</div>';
      if (content) {
        html += '<div class="frag-menu-item" data-action="quote">引用</div>';
      }
      html += '<div class="frag-menu-item frag-menu-danger" data-action="delete">删除</div>';
    }
    menu.innerHTML = html;
    menu.style.display = 'block';

    // Position near finger
    const mw = 120, mh = menu.offsetHeight || 100;
    let left = Math.min(x, window.innerWidth - mw - 10);
    let top = y - mh - 10;
    if (top < 10) top = y + 10;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    menu.onclick = async (e) => {
      const action = e.target.dataset.action;
      menu.style.display = 'none';
      if (!action) return;
      if (action === 'delete') {
        if (await FizzUI.confirm(isImage ? '删除这张图片？' : '删除这条碎片？', {danger: true, confirmText: '删除'})) {
          this.deleteFragment(fragId);
        }
      } else if (action === 'edit') {
        const decoded = document.createElement('textarea');
        decoded.innerHTML = content;
        const newContent = await FizzUI.prompt('编辑碎片', decoded.value);
        if (newContent !== null && newContent.trim()) {
          this.editFragment(fragId, newContent.trim());
        }
      } else if (action === 'quote') {
        const decoded = document.createElement('textarea');
        decoded.innerHTML = content;
        this.quoteFragment(decoded.value);
      }
    };
  },

  _fragmentImageInited: false,
  initFragmentImage() {
    if (this._fragmentImageInited) return;
    const input = document.getElementById('fragment-image-input');
    const removeBtn = document.getElementById('fragment-preview-remove');
    if (!input) return;
    this._fragmentImageInited = true;
    if (input) {
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          FizzUI.toast('图片不能超过 5MB', 'error');
          input.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          this.fragmentImage = ev.target.result;
          document.getElementById('fragment-preview-img').src = ev.target.result;
          document.getElementById('fragment-image-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.clearFragmentImage();
        document.getElementById('fragment-image-input').value = '';
      });
    }
  },

  // ─── Settings ───
  async loadSettings() {
    try {
      const res = await fetch('/api/user/settings', { headers: Auth.authHeaders() });
      const data = await res.json();
      document.getElementById('email-notify-toggle').checked = data.email_notify !== false;
    } catch {
      // defaults
    }
  },

  async saveSettings(settings) {
    try {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...Auth.authHeaders() },
        body: JSON.stringify(settings),
      });
    } catch {
      // silent
    }
  },

  // ═══════════════════════════════════════════
  // Render functions
  // ═══════════════════════════════════════════

  renderMailboxList(penPals, archived) {
    const list = document.getElementById('penpal-list');

    if (!penPals.length && !archived.length) {
      list.innerHTML = `
        <div class="penpal-empty">
          <div class="penpal-empty-text">还没有收件人</div>
        </div>`;
    } else if (!penPals.length) {
      list.innerHTML = `
        <div class="penpal-empty">
          <div class="penpal-empty-hint">所有信友已归档</div>
        </div>`;
    } else {
      list.innerHTML = penPals.map(pp => {
        const lastDate = pp.last_letter_at ? this.formatRelativeTime(pp.last_letter_at) : '新信友';
        const preview = pp.latest_preview ? this.escapeHtml(pp.latest_preview.content) : '还没有信件';
        const unread = pp.unread_count || 0;
        return `<div class="penpal-card" data-id="${pp.id}">
                    <div class="penpal-card-body">
            <div class="penpal-card-top">
              <div class="penpal-card-name">${this.escapeHtml(pp.name)}</div>
              <div class="penpal-card-time">${lastDate}</div>
            </div>
            <div class="penpal-card-preview">${preview}</div>
          </div>
          ${unread > 0 ? `<div class="penpal-card-badge">${unread}</div>` : ''}
        </div>`;
      }).join('');

      list.querySelectorAll('.penpal-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          if (id && window._showPenPalDetail) window._showPenPalDetail(id);
        });
      });
    }

    // Archive section
    const archiveSection = document.getElementById('archive-section');
    const archiveList = document.getElementById('archive-list');
    if (archived.length > 0) {
      archiveSection.style.display = 'block';
      archiveList.innerHTML = archived.map(pp =>
        `<div class="penpal-card penpal-card-archived" data-id="${pp.id}">
                    <div class="penpal-card-body">
            <div class="penpal-card-name">${this.escapeHtml(pp.name)}</div>
            <div class="penpal-card-preview">已归档</div>
          </div>
          <button class="btn-restore" data-id="${pp.id}">恢复</button>
        </div>`
      ).join('');

      archiveList.querySelectorAll('.btn-restore').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (await this.restorePenPal(btn.dataset.id)) this.loadMailbox();
        });
      });

      archiveList.querySelectorAll('.penpal-card-archived').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          if (id && window._showPenPalDetail) window._showPenPalDetail(id);
        });
      });
    } else {
      archiveSection.style.display = 'none';
    }
  },

  setupTestMode() {
    // Show test mode toggle via ?test=1 in URL or localStorage
    const show = new URLSearchParams(location.search).has('test') || localStorage.getItem('fizz-test-mode') === 'true';
    const toggle = document.getElementById('test-mode-toggle');
    const cb = document.getElementById('test-mode-cb');
    if (!toggle || !cb) return;
    if (show) toggle.style.display = '';
    cb.checked = this.testMode;
    cb.addEventListener('change', () => {
      this.testMode = cb.checked;
      localStorage.setItem('fizz-test-mode', cb.checked);
      toggle.classList.toggle('test-mode-active', cb.checked);
    });
    toggle.classList.toggle('test-mode-active', this.testMode);
  },

  setupLegacyToggle() {
    const toggle = document.getElementById('legacy-toggle');
    const legacy = document.getElementById('legacy-mailbox');
    if (!toggle || !legacy) return;
    const arrow = toggle.querySelector('.toggle-arrow');
    // Default: collapsed
    const wasOpen = localStorage.getItem('legacy-open') !== 'false';
    legacy.style.display = wasOpen ? '' : 'none';
    if (arrow) arrow.textContent = wasOpen ? '▾' : '▸';
    toggle.style.cursor = 'pointer';
    toggle.addEventListener('click', () => {
      const open = legacy.style.display === 'none';
      legacy.style.display = open ? '' : 'none';
      if (arrow) arrow.textContent = open ? '▾' : '▸';
      localStorage.setItem('legacy-open', open);
    });
  },

  renderLetterTimeline(letters) {
    const timeline = document.getElementById('letter-timeline');
    if (!letters.length) {
      timeline.innerHTML = `
        <div class="letter-timeline-empty">
          <div class="letter-timeline-empty-text">写下第一封信吧</div>
        </div>`;
      return;
    }

    timeline.innerHTML = letters.map((l, i) => {
      const isUser = l.role === 'user';
      const date = new Date(l.created_at).toLocaleDateString('zh-CN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const cleanContent = l.content.replace(/^\[INITIAL\]/, '');
      const preview = cleanContent.replace(/<[^>]*>/g, '').slice(0, 40) + (cleanContent.length > 40 ? '...' : '');
      const isLast = i === letters.length - 1;
      const deleteBtn = `<div class="letter-card-actions"><span class="letter-delete-btn" onclick="event.stopPropagation();PenPal.deleteLetter('${l.id}',this)">删除</span></div>`;
      if (!isUser) {
        return `<div class="letter-card letter-card-ai${isLast ? ' letter-expanded' : ''}" data-name="${this.escapeHtml(this.currentPenPalName || '')}" onclick="this.classList.toggle('letter-expanded')">
          <div class="letter-card-envelope">

            <span class="letter-card-envelope-date">${date}</span>
            <span class="letter-card-envelope-preview">${preview}</span>
            <span class="letter-card-fold-hint">展开</span>
          </div>
          <div class="letter-card-paper">
            <div class="letter-card-date">${date}<span class="letter-card-label letter-label-ai">— ${this.escapeHtml(this.currentPenPalName || 'TA')} 的来信</span></div>
            <div class="letter-card-content">${this.formatLetterContent(cleanContent)}</div>
            ${deleteBtn}
          </div>
        </div>`;
      }
      return `<div class="letter-card letter-card-user${isLast ? ' letter-expanded' : ''}" onclick="this.classList.toggle('letter-expanded')">
          <div class="letter-card-envelope">

            <span class="letter-card-envelope-date">${date}</span>
            <span class="letter-card-envelope-preview">${preview}</span>
            <span class="letter-card-fold-hint">展开</span>
          </div>
          <div class="letter-card-paper">
            <div class="letter-card-date">${date}<span class="letter-card-label letter-label-user">— 我寄出的</span></div>
            <div class="letter-card-content">${this.formatLetterContent(l.content)}</div>
            ${deleteBtn}
          </div>
        </div>`;
    }).join('');

    setTimeout(() => { timeline.scrollTop = timeline.scrollHeight; }, 100);
  },

  appendLetter(letter) {
    const timeline = document.getElementById('letter-timeline');
    const empty = timeline.querySelector('.letter-timeline-empty');
    if (empty) empty.remove();

    const isUser = letter.role === 'user';
    const date = new Date(letter.created_at).toLocaleDateString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const div = document.createElement('div');
    const preview = letter.content.replace(/<[^>]*>/g, '').slice(0, 40) + (letter.content.length > 40 ? '...' : '');
    const delBtn = `<div class="letter-card-actions"><span class="letter-delete-btn" onclick="event.stopPropagation();PenPal.deleteLetter('${letter.id}',this)">删除</span></div>`;
    if (!isUser) {
      div.className = 'letter-card letter-card-ai letter-expanded';
      div.dataset.name = this.currentPenPalName || '';
      div.onclick = function() { this.classList.toggle('letter-expanded'); };
      div.innerHTML = `<div class="letter-card-envelope">

          <span class="letter-card-envelope-date">${date}</span>
          <span class="letter-card-envelope-preview">${preview}</span>
          <span class="letter-card-fold-hint">展开</span>
        </div>
        <div class="letter-card-paper">
          <div class="letter-card-date">${date}<span class="letter-card-label letter-label-ai">— ${this.escapeHtml(this.currentPenPalName || 'TA')} 的来信</span></div>
          <div class="letter-card-content">${this.formatLetterContent(letter.content)}</div>
          ${delBtn}
        </div>`;
    } else {
      div.className = 'letter-card letter-card-user letter-expanded';
      div.onclick = function() { this.classList.toggle('letter-expanded'); };
      div.innerHTML = `<div class="letter-card-envelope">

          <span class="letter-card-envelope-date">${date}</span>
          <span class="letter-card-envelope-preview">${preview}</span>
          <span class="letter-card-fold-hint">展开</span>
        </div>
        <div class="letter-card-paper">
          <div class="letter-card-date">${date}<span class="letter-card-label letter-label-user">— 我寄出的</span></div>
          <div class="letter-card-content">${this.formatLetterContent(letter.content)}</div>
          ${delBtn}
        </div>`;
    }
    timeline.appendChild(div);

    setTimeout(() => { timeline.scrollTop = timeline.scrollHeight; }, 100);
  },

  // ─── Delete Letter ───
  async deleteLetter(letterId, btnEl) {
    if (!confirm('确定删除这封信？')) return;
    try {
      await this.api('/' + this.currentPenPalId + '/letter/' + letterId, { method: 'DELETE' });
      const card = btnEl.closest('.letter-card');
      if (card) card.remove();
    } catch (err) {
      FizzUI.toast('删除失败', 'error');
    }
  },

  // ─── Waiting Animation ───
  showWaiting(estimatedAt, instant) {
    const el = document.getElementById('letter-waiting');
    el.style.display = 'flex';
    this._pollEstimatedAt = estimatedAt;
    const sendBtn = document.getElementById('btn-send-letter');
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.3';
    sendBtn.style.pointerEvents = 'none';
    const waitText = document.getElementById('waiting-time');
    if (instant) {
      document.querySelector('.waiting-text').textContent = 'TA 正在写回信...';
      waitText.textContent = '一念即达 · 即时传递中';
    } else if (estimatedAt) {
      document.querySelector('.waiting-text').textContent = '信正在路上...';
      this.updateWaitingTime(estimatedAt);
      this._waitingInterval = setInterval(() => this.updateWaitingTime(estimatedAt), 1000);
    }
  },

  hideWaiting() {
    document.getElementById('letter-waiting').style.display = 'none';
    const sendBtn = document.getElementById('btn-send-letter');
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
    sendBtn.style.pointerEvents = 'auto';
    if (this._waitingInterval) {
      clearInterval(this._waitingInterval);
      this._waitingInterval = null;
    }
  },

  updateWaitingTime(estimatedAt) {
    const diff = new Date(estimatedAt).getTime() - Date.now();
    const el = document.getElementById('waiting-time');
    if (diff <= 0) {
      document.querySelector('.waiting-text').textContent = 'TA 正在写回信...';
      el.textContent = '快到了...';
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    el.textContent = mins > 0
      ? `大约 ${mins} 分 ${secs} 秒后到达`
      : `大约 ${secs} 秒后到达`;
  },

  // ─── Render: Fragments (timeline) ───
  renderFragments(fragments, digests) {
    const todayEl = document.getElementById('fragment-today');
    const digestsEl = document.getElementById('fragment-digests');
    digestsEl.innerHTML = '';

    // Merge fragments + digests into one timeline sorted by time
    const items = [];
    (fragments || []).forEach(f => items.push({ type: 'fragment', time: new Date(f.created_at).getTime(), data: f }));
    (digests || []).forEach(d => items.push({ type: 'digest', time: new Date(d.created_at).getTime(), data: d }));
    items.sort((a, b) => a.time - b.time);

    if (items.length === 0) {
      todayEl.innerHTML = '';
      return;
    }

    let lastDay = '';
    todayEl.innerHTML = items.map(item => {
      const d = new Date(item.time);
      const dayKey = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      let divider = '';
      if (dayKey !== lastDay) {
        divider = `<div class="fragment-day-divider"><span>${dayKey}</span></div>`;
        lastDay = dayKey;
      }
      if (item.type === 'fragment') {
        const f = item.data;
        const time = new Date(f.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const imgHtml = f.image_url ? `<div class="fragment-img"><img src="${f.image_url}" alt="" loading="lazy" data-frag-id="${f.id}" data-frag-type="image"></div>` : '';
        const textHtml = f.content ? `<div class="fragment-text">${this.escapeHtml(f.content)}</div>` : '';
        const reactionHtml = f.ai_reaction ? `<div class="fragment-reaction">${f.ai_reaction}</div>` : '';
        const canEdit = !f.batch_id;
        return divider + `<div class="fragment-item" data-frag-id="${f.id}" data-frag-content="${this.escapeHtml(f.content || '')}" data-can-edit="${canEdit}">
            <div class="fragment-time">${time}</div>
            ${textHtml}
            ${imgHtml}
            ${reactionHtml}
          </div>`;
      } else {
        const dd = item.data;
        const date = new Date(dd.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return divider + `<div class="fragment-digest">
            <div class="fragment-digest-date">${date}</div>
            <div class="fragment-digest-content">${this.formatLetterContent(dd.content)}</div>
          </div>`;
      }
    }).join('');
  },

  // ─── Tab Switching ───
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.penpal-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.penpal-tab-content').forEach(c => {
      c.classList.toggle('active', c.id === 'tab-content-' + tab);
    });
    if (tab === 'fragments' && this.currentPenPalId) {
      this.initFragmentImage();
      this.initFragmentLongPress();
      this.loadFragments(this.currentPenPalId);
    }
  },

  // ─── Utilities ───
  escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  },

  formatLetterContent(content) {
    if (!content) return '';
    return this.escapeHtml(content)
      .split('\n')
      .filter(l => l.trim())
      .map(l => '<p>' + l + '</p>')
      .join('');
  },

  getInitial(name) {
    return (name || '?').charAt(0);
  },

  formatRelativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + ' 分钟前';
    if (hours < 24) return hours + ' 小时前';
    if (days < 7) return days + ' 天前';
    return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  },
};
