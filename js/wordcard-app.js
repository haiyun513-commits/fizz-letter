// 字卡传讯 — 聊天界面（含自定义卡管理 + 头像系统）
document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'wc-chat-history';
  const AVATAR_KEY = 'wc-avatars';

  function showScreenById(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  // 容错：word-cards.js 可能未加载完
  if (typeof WordCardEngine === "undefined") { console.warn("WordCardEngine not loaded, using fallback"); window.WordCardEngine = class { constructor(){ this.history=[]; this.usedTexts=new Set(); } draw(){ return null; } reset(){ this.history=[]; this.usedTexts.clear(); } setCustomCards(){} setCardMode(){} getCardMode(){ return "default"; } }; }
  const wordDeck = typeof WordCardEngine !== 'undefined' ? new WordCardEngine() : { reset:function(){}, usedTexts:new Set(), drawCards:function(){return[];}, setCustomCards:function(){}, setCardMode:function(){}, cardMode:'default', commitCards:function(){}, drawCandidates:function(){return[];}, drawFromPoolNames:function(){return[];} };
  let busy = false;
  let chatMessages = [];
  let messageQueue = [];

  // ─── 头像系统 ───
  let avatarData = { me: null, ta: null, taName: '' };
  let currentAvatarTarget = null; // 'me' or 'ta'

  function loadAvatarData() {
    try {
      const raw = localStorage.getItem(AVATAR_KEY);
      if (raw) Object.assign(avatarData, JSON.parse(raw));
    } catch(e) {}
  }

  function saveAvatarData() {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(avatarData));
  }

  function getMyNickname() {
    if (typeof Auth !== 'undefined' && Auth.getUser) {
      const u = Auth.getUser();
      if (u && u.nickname) return u.nickname;
    }
    return '我';
  }

  function getTaNickname() {
    return avatarData.taName || '';
  }

  const DEFAULT_AVATAR_DARK = '/images/avatar-default-dark.png';
  const DEFAULT_AVATAR_LIGHT = '/images/avatar-default-light.png';

  function getDefaultAvatar() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? DEFAULT_AVATAR_DARK : DEFAULT_AVATAR_LIGHT;
  }

  function getAvatarSrc(who) {
    return avatarData[who] || getDefaultAvatar();
  }

  // 读取指定 chatId 的 ta 头像（用于列表页）
  function getChatTaAvatar(chatId) {
    try {
      var raw = localStorage.getItem('wc-chat-profile-' + chatId);
      if (raw) { var o = JSON.parse(raw); if (o.ta) return o.ta; }
    } catch(e) {}
    return getDefaultAvatar();
  }

  function getChatTaNickname(chatId) {
    try {
      var raw = localStorage.getItem('wc-chat-profile-' + chatId);
      if (raw) { var o = JSON.parse(raw); return o.taName || ''; }
    } catch(e) {}
    return '';
  }

  function refreshHeaderAvatars() {
    loadAvatarData();
    const meImg = document.getElementById('wc-avatar-me-img');
    const meDef = document.getElementById('wc-avatar-me-default');
    const taImg = document.getElementById('wc-avatar-ta-img');
    const taDef = document.getElementById('wc-avatar-ta-default');
    const meNameEl = document.getElementById('wc-name-me');
    const taNameEl = document.getElementById('wc-name-ta');

    meImg.src = getAvatarSrc('me');
    meImg.classList.add('active');
    meDef.style.display = 'none';

    taImg.src = getAvatarSrc('ta');
    taImg.classList.add('active');
    taDef.style.display = 'none';

    meNameEl.textContent = getMyNickname();
    taNameEl.textContent = getTaNickname();
  }

  function buildMsgAvatarHtml(type) {
    const isUser = type === 'user';
    const src = isUser ? getAvatarSrc('me') : getAvatarSrc('ta');
    return '<img src="' + src + '" alt="">';
  }

  // 头像点击 → 选图
  const avatarFileInput = document.getElementById('wc-avatar-file');
  // TA 头像点击换头像
  var _el=document.getElementById('wc-avatar-ta'); if(_el) _el.addEventListener('click', (e) => {
    e.stopPropagation();
    currentAvatarTarget = 'ta';
    avatarFileInput.click();
  });
  // 用户头像（隐藏的）也支持
  var _el=document.getElementById('wc-avatar-me'); if(_el) _el.addEventListener('click', () => {
    currentAvatarTarget = 'me';
    avatarFileInput.click();
  });
  // 点击顶栏名字区域 → 设置昵称
  var _el=document.getElementById('wc-header-profile'); if(_el) _el.addEventListener('click', () => {
    showNicknameModal();
  });

  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file || !currentAvatarTarget) return;
      const reader = new FileReader();
      reader.onload = () => {
        // 压缩到 128x128
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 128; c.height = 128;
          const ctx = c.getContext('2d');
          const s = Math.min(img.width, img.height);
          const sx = (img.width - s) / 2;
          const sy = (img.height - s) / 2;
          ctx.drawImage(img, sx, sy, s, s, 0, 0, 128, 128);
          const dataUrl = c.toDataURL('image/jpeg', 0.8);
          avatarData[currentAvatarTarget] = dataUrl;
          saveAvatarData();
          refreshHeaderAvatars();
          refreshAllMsgAvatars();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
      avatarFileInput.value = '';
    });
  }

  // TA 昵称点击 → 弹窗（备用，profile click 也触发）
  var _el=document.getElementById('wc-name-ta'); if(_el) _el.addEventListener('click', (e) => {
    e.stopPropagation();
    showNicknameModal();
  });

  function showNicknameModal() {
    // 移除已有弹窗
    (function(_e){if(_e)_e.remove()})(document.querySelector('.wc-nickname-modal'));
    const modal = document.createElement('div');
    modal.className = 'wc-nickname-modal';
    modal.innerHTML = `
      <div class="wc-nickname-box">
        <label>TA 的昵称</label>
        <input type="text" maxlength="20" placeholder="可以不填" value="${getTaNickname()}">
        <div class="wc-nickname-actions">
          <button class="wc-nick-cancel">取消</button>
          <button class="wc-nick-save">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const input = modal.querySelector('input');
    input.focus();
    input.select();
    modal.querySelector('.wc-nick-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    const save = () => {
      avatarData.taName = input.value.trim();
      saveAvatarData();
      refreshHeaderAvatars();
      modal.remove();
    };
    modal.querySelector('.wc-nick-save').addEventListener('click', save);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  }

  function refreshAllMsgAvatars() {
    document.querySelectorAll('.wc-msg-row .wc-msg-avatar').forEach(el => {
      const row = el.closest('.wc-msg-row');
      const isUser = row.classList.contains('is-user');
      el.innerHTML = buildMsgAvatarHtml(isUser ? 'user' : 'reply');
    });
  }

  let currentChatId = null;
  loadAvatarData();

  // ─── 对话管理（微信风格） ───
  let savePending = false;

  // 自动保存到服务端（防抖 1.5s）
  let saveTimer = null;
  function saveChat() {
    // localStorage 即时存
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: chatMessages, usedTexts: [...wordDeck.usedTexts] }));
    } catch(e) {}
    // 服务端防抖存
    if (!isLoggedIn() || !currentChatId) return;
    clearTimeout(saveTimer);
    savePending = true;
    saveTimer = setTimeout(async () => {
      try {
        await fetch('/api/wc-chats/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ id: currentChatId, messages: chatMessages, usedTexts: [...wordDeck.usedTexts] })
        });
      } catch(e) {}
      savePending = false;
    }, 1500);
  }

  // 强制立即保存（离开对话时）
  async function saveChatNow() {
    clearTimeout(saveTimer);
    if (!isLoggedIn() || !currentChatId || chatMessages.length === 0) return;
    try {
      await fetch('/api/wc-chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id: currentChatId, messages: chatMessages, usedTexts: [...wordDeck.usedTexts] })
      });
    } catch(e) {}
  }

  // 加载对话列表
  async function loadChatList() {
    const listEl = document.getElementById('wc-chat-list');
    const emptyEl = document.getElementById('wc-list-empty');
    if (!isLoggedIn()) {
      listEl.innerHTML = '';
      emptyEl.style.display = '';
      emptyEl.innerHTML = '登录后可保存对话';
      return;
    }
    try {
      const res = await fetch('/api/wc-chats', { headers: authHeaders() });
      const data = await res.json();
      const chats = data.chats || [];
      listEl.innerHTML = '';
      if (chats.length === 0) {
        emptyEl.style.display = '';
        return;
      }
      emptyEl.style.display = 'none';
      for (const chat of chats) {
        listEl.appendChild(buildListItem(chat));
      }
      // 如果有未读则保留按钮红点，否则清除
      const anyUnread = chats.some(c => c.unreadCount > 0);
      const btnBadge = document.getElementById('wc-btn-badge');
      if (btnBadge) btnBadge.style.display = anyUnread ? 'block' : 'none';
    } catch(e) {
      console.warn('load chat list failed:', e);
    }
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    }
    if (diff < 86400000 * 2) return '昨天';
    if (diff < 86400000 * 7) return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    return (d.getMonth()+1) + '/' + d.getDate();
  }

  function buildListItem(chat) {
    const item = document.createElement('div');
    item.className = 'wc-list-item';
    item.dataset.id = chat.id;
    item.innerHTML = `
      <div class="wc-list-item-inner">
        <div class="wc-list-item-avatar"><img src="${getChatTaAvatar(chat.id)}" alt=""></div>
        <div class="wc-list-item-body">
          <div class="wc-list-item-top">
            <span class="wc-list-item-name">${getChatTaNickname(chat.id) || chat.title || '新对话'}</span>
            <span class="wc-list-item-time">${formatTime(chat.updatedAt)}</span>
          </div>
          <div class="wc-list-item-bottom"><span class="wc-list-item-preview">${chat.messageCount || 0} 条消息</span>${chat.unreadCount > 0 ? '<span class="wc-unread-badge">' + chat.unreadCount + '</span>' : ''}</div>
        </div>
      </div>
      <div class="wc-list-item-del">删除</div>
    `;
    // 点击打开
    item.querySelector('.wc-list-item-inner').addEventListener('click', () => openChat(chat.id));
    // 左滑删除
    let startX = 0, moved = false;
    item.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; moved = false; });
    item.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - startX;
      if (dx < -30) { item.classList.add('swiped'); moved = true; }
      if (dx > 20) item.classList.remove('swiped');
    });
    item.querySelector('.wc-list-item-del').addEventListener('click', async () => {
      try {
        await fetch('/api/wc-chats/' + chat.id, { method: 'DELETE', headers: authHeaders() });
        item.remove();
        const remaining = document.querySelectorAll('.wc-list-item');
        if (remaining.length === 0) document.getElementById('wc-list-empty').style.display = '';
      } catch(e) {}
    });
    // 桌面端右键或长按也能删
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      item.classList.toggle('swiped');
    });
    return item;
  }

  // 打开一个对话
  async function openChat(chatId) {
    currentChatId = chatId;
    chatMessages = [];
    wordDeck.reset();
    const msgArea = document.getElementById('wc-chat-messages');
    msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
    showScreenById('screen-wordcard-input');
    refreshHeaderAvatars();
    initCustomCards();
    loadStickers();
    try {
      const res = await fetch('/api/wc-chats/' + chatId, { headers: authHeaders() });
      const data = await res.json();
      if (data.usedTexts) {
        for (const t of data.usedTexts) wordDeck.usedTexts.add(t);
      }
      chatMessages = data.messages || [];
      msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
      let lastAt = null;
      for (const msg of chatMessages) {
        // 主动消息加时间分隔
        if (msg.proactive && msg.at && msg.at !== lastAt) {
          const d = new Date(msg.at);
          const timeStr = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const sep = document.createElement('div');
          sep.className = 'wc-time-sep';
          sep.textContent = timeStr;
          msgArea.appendChild(sep);
          lastAt = msg.at;
        }
        appendMsgDom(msg.text, msg.type, msgArea, msg.msgType);
      }
      scrollToBottom();
      // Apply visual settings from chat data
      if (data.settings) {
        currentChatSettings = {
          bgPreset: data.settings.bgPreset || 'none',
          bgImage: data.settings.bgImage || null,
          bubbleTheme: data.settings.bubbleTheme || 'default',
          hueRotate: data.settings.hueRotate || 0,
          myBubbleColor: data.settings.myBubbleColor || 'default',
          taBubbleColor: data.settings.taBubbleColor || 'default'
        };
        applyChatVisualSettings(currentChatSettings);
      } else {
        currentChatSettings = {};
        applyChatVisualSettings({});
      }
    } catch(e) { console.warn('load chat failed:', e); }
    document.getElementById('wc-input').focus();
  }

  // 新建对话
  async function createNewChat() {
    if (!isLoggedIn()) {
      // 未登录：直接进聊天（localStorage 模式）
      currentChatId = null;
      chatMessages = [];
      wordDeck.reset();
      const msgArea = document.getElementById('wc-chat-messages');
      msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
      showScreenById('screen-wordcard-input');
      refreshHeaderAvatars();
      document.getElementById('wc-input').focus();
      return;
    }
    try {
      const res = await fetch('/api/wc-chats', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } });
      const data = await res.json();
      if (data.id) {
        openChat(data.id);
      }
    } catch(e) { console.warn('create chat failed:', e); }
  }

  // 兼容旧 localStorage 数据
  function loadChat() {
    if (isLoggedIn()) return; // 登录用户走服务端
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.messages || data.messages.length === 0) return;
      if (data.usedTexts) {
        for (const t of data.usedTexts) wordDeck.usedTexts.add(t);
      }
      chatMessages = data.messages;
    } catch (e) {}
  }

  loadChat();
  refreshHeaderAvatars();

  // ─── 自定义卡管理 ───
  const manageBtn = document.getElementById('btn-wc-manage');
  // cardPanel merged into settings panel
  const cardListEl = document.getElementById('wc-card-list');
  const cardCountEl = document.getElementById('wc-card-count');
  let userCards = [];

  function authHeaders() {
    if (typeof Auth !== 'undefined' && Auth.authHeaders) return Auth.authHeaders();
    const token = localStorage.getItem('fizz_token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function isLoggedIn() {
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn) return Auth.isLoggedIn();
    return !!localStorage.getItem('fizz_token');
  }

  // 初始化：已登录则显示管理按钮 + 加载自定义卡
  async function initCustomCards() {
    if (!isLoggedIn()) {
      if (manageBtn) manageBtn.style.display = 'none';
      return;
    }
    if (manageBtn) manageBtn.style.display = '';

    try {
      const res = await fetch('/api/custom-cards', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      userCards = data.cards || [];
      wordDeck.setCustomCards(userCards);
      wordDeck.setCardMode(data.mode || 'default');
      updateCardList();
      updateModeBadge();
      updateModeTabs(data.mode || 'default');
      if (userCards.length > 0 && manageBtn) manageBtn.classList.add('has-custom');
    } catch (e) { console.warn('load custom cards failed:', e); }
  }

  initCustomCards();

  // 打开/关闭面板（统一面板）
  // manageBtn removed from HTML, card panel merged into settings panel

  // 模式切换 tabs
  document.querySelectorAll('.wc-mode-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const mode = tab.dataset.mode;
      // 允许切换到任何模式（无卡时聊天会回"…"）
      updateModeTabs(mode);
      wordDeck.setCardMode(mode);
      updateModeBadge();
      try {
        await fetch('/api/card-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ mode }),
        });
      } catch (e) {}
    });
  });

  function updateModeTabs(mode) {
    document.querySelectorAll('.wc-mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
  }

  function updateModeBadge() {
    const header = document.querySelector('.wc-header-center');
    if (!header) return;
    let badge = header.querySelector('.wc-mode-badge');
    const mode = wordDeck.cardMode;
    if (mode === 'default') {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'wc-mode-badge';
      badge.style.cssText = 'font-size:0.55rem;color:var(--text-ghost);letter-spacing:0.08em;';
      header.appendChild(badge);
    }
    badge.textContent = mode === 'custom' ? '我的卡组' : '混合';
  }

  // 添加单张卡
  const addInput = document.getElementById('wc-add-input');
  const addBtn = document.getElementById('btn-wc-add');
  if (addBtn) addBtn.addEventListener('click', addSingleCard);
  if (addInput) addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSingleCard(); });

  async function addSingleCard() {
    const text = (addInput ? addInput.value : '').trim();
    if (!text || text.length > 20) return;
    addInput.value = '';
    try {
      const res = await fetch('/api/custom-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.card) {
        userCards.push(data.card);
        wordDeck.setCustomCards(userCards);
        updateCardList();
        if (manageBtn) manageBtn.classList.add('has-custom');
      }
    } catch (e) {}
  }

  // 批量添加
  const batchToggle = document.getElementById('btn-wc-batch-toggle');
  const batchArea = document.getElementById('wc-batch-area');
  if (batchToggle) {
    batchToggle.addEventListener('click', () => {
      batchArea.style.display = batchArea.style.display === 'none' ? '' : 'none';
    });
  }

  const batchAddBtn = document.getElementById('btn-wc-batch-add');
  if (batchAddBtn) {
    batchAddBtn.addEventListener('click', async () => {
      const textarea = document.getElementById('wc-batch-input');
      const lines = (textarea ? textarea.value : '').split('\n').map(s => s.trim()).filter(s => s && s.length <= 20);
      if (lines.length === 0) return;
      textarea.value = '';
      try {
        const res = await fetch('/api/custom-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ texts: lines }),
        });
        const data = await res.json();
        if (data.added > 0) await initCustomCards();
      } catch (e) {}
    });
  }

  // 删除卡
  async function deleteCard(cardId) {
    try {
      const res = await fetch('/api/custom-cards/' + cardId, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        userCards = userCards.filter(c => c.id !== cardId);
        wordDeck.setCustomCards(userCards);
        updateCardList();
        if (userCards.length === 0) {
          if (manageBtn) manageBtn.classList.remove('has-custom');
          if (wordDeck.cardMode === 'custom') {
            wordDeck.setCardMode('default');
            updateModeTabs('default');
            updateModeBadge();
          }
        }
      }
    } catch (e) {}
  }

  // 渲染卡片列表
  function updateCardList() {
    if (!cardListEl) return;
    cardListEl.innerHTML = '';
    if (userCards.length === 0) {
      cardListEl.innerHTML = '<div style="color:var(--text-ghost);font-size:0.8rem;padding:20px 0;text-align:center;">还没有自定义卡片</div>';
    } else {
      for (const card of userCards) {
        const chip = document.createElement('div');
        chip.className = 'wc-card-chip';
        const span = document.createElement('span');
        span.textContent = card.text;
        const del = document.createElement('button');
        del.className = 'wc-card-chip-del';
        del.title = '删除';
        del.textContent = '\u00d7';
        del.addEventListener('click', () => deleteCard(card.id));
        chip.appendChild(span);
        chip.appendChild(del);
        cardListEl.appendChild(chip);
      }
    }
    if (cardCountEl) cardCountEl.textContent = userCards.length + ' 张自定义卡';
  }

  // ─── 顶级 Tab 切换（设置 / 卡组 / 表情包） ───
  function switchSettingsTab(tabName) {
    document.querySelectorAll('.wc-top-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.wc-top-tab').forEach(t => { if (t.dataset.panel === tabName) t.classList.add('active'); });
    var allTabs = ['settings', 'cards', 'stickers'];
    allTabs.forEach(function(name) {
      var el = document.getElementById('wc-tab-' + name);
      if (el) el.style.display = name === tabName ? '' : 'none';
    });
    if (tabName === 'stickers' && stickerGroups.length === 0) loadStickers();
  }
  document.querySelectorAll('.wc-top-tab').forEach(tab => {
    tab.addEventListener('click', () => { switchSettingsTab(tab.dataset.panel); });
  });

  // ─── 表情包系统（分组） ───
  let stickerGroups = [];
  let stickerPanelOpen = false;
  let currentUserId = null;
  let activeUploadGroupId = null; // 当前上传目标分组

  function getCurrentUserId() {
    if (currentUserId) return currentUserId;
    try {
      const token = localStorage.getItem('fizz_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.id || payload.sub;
        return currentUserId;
      }
    } catch(e) {}
    return null;
  }

  function stickerUrl(sticker) {
    return '/api/stickers/image/' + getCurrentUserId() + '/' + sticker.filename;
  }

  async function loadStickers() {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch('/api/stickers', { headers: authHeaders() });
      const data = await res.json();
      stickerGroups = data.groups || [];
      renderStickerManager();
      renderStickerPicker();
      renderFloatingStickers();
    } catch(e) { console.warn('load stickers failed:', e); }
  }

  // ── 管理面板：分组列表渲染 ──
  function renderStickerManager() {
    const container = document.getElementById('wc-stk-groups');
    if (!container) return;
    container.innerHTML = '';
    if (stickerGroups.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-ghost);font-size:0.78rem;padding:30px 0;">还没有表情包分组</div>';
      return;
    }
    for (const group of stickerGroups) {
      const section = document.createElement('div');
      section.className = 'wc-stk-group' + (group.enabled ? '' : ' disabled');
      section.dataset.id = group.id;

      // 分组头
      const header = document.createElement('div');
      header.className = 'wc-stk-group-header';
      header.innerHTML = `
        <div class="wc-stk-group-info">
          <span class="wc-stk-group-name" title="双击重命名">${group.name}</span>
          <span class="wc-stk-group-count">${group.stickers.length}</span>
        </div>
        <div class="wc-stk-group-actions">
          <label class="wc-stk-group-upload" title="添加表情到此分组">
            <input type="file" accept="image/*" multiple style="display:none;" data-group="${group.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </label>
          <label class="wc-stk-switch">
            <input type="checkbox" ${group.enabled ? 'checked' : ''} data-group="${group.id}">
            <span class="wc-stk-slider"></span>
          </label>
          <button class="wc-stk-group-del" data-group="${group.id}" title="删除分组">&times;</button>
        </div>
      `;

      // 分组名双击重命名
      const nameEl = header.querySelector('.wc-stk-group-name');
      nameEl.addEventListener('dblclick', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = group.name;
        input.maxLength = 10;
        input.className = 'wc-stk-rename-input';
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        const save = async () => {
          const newName = input.value.trim() || group.name;
          group.name = newName;
          try {
            await fetch('/api/sticker-groups/' + group.id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ name: newName })
            });
          } catch(e) {}
          renderStickerManager();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
      });

      // 启用/禁用开关
      header.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        group.enabled = enabled;
        section.classList.toggle('disabled', !enabled);
        try {
          await fetch('/api/sticker-groups/' + group.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ enabled })
          });
        } catch(e) {}
        renderStickerPicker();
      });

      // 分组内上传
      header.querySelector('input[type="file"]').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        activeUploadGroupId = group.id;
        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;
          await uploadSticker(file, group.id);
        }
        e.target.value = '';
        renderStickerManager();
        renderStickerPicker();
      });

      // 删除分组
      header.querySelector('.wc-stk-group-del').addEventListener('click', async () => {
        if (!confirm('删除分组「' + group.name + '」及其所有表情？')) return;
        try {
          await fetch('/api/sticker-groups/' + group.id, { method: 'DELETE', headers: authHeaders() });
          await loadStickers();
        } catch(e) {}
      });

      section.appendChild(header);

      // 表情网格
      if (group.stickers.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'wc-stk-grid';
        for (const sticker of group.stickers) {
          const item = document.createElement('div');
          item.className = 'wc-stk-item';
          const img = document.createElement('img');
          img.src = stickerUrl(sticker);
          img.alt = '';
          img.loading = 'lazy';
          // 长按/右键删除
          let pressTimer = null;
          item.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
              if (confirm('删除这个表情？')) deleteStickerFromGroup(sticker.id, group);
            }, 600);
          });
          item.addEventListener('touchend', () => clearTimeout(pressTimer));
          item.addEventListener('touchmove', () => clearTimeout(pressTimer));
          item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm('删除这个表情？')) deleteStickerFromGroup(sticker.id, group);
          });
          item.appendChild(img);
          grid.appendChild(item);
        }
        section.appendChild(grid);
      }

      container.appendChild(section);
    }
  }

  async function deleteStickerFromGroup(stickerId, group) {
    try {
      await fetch('/api/stickers/' + stickerId, { method: 'DELETE', headers: authHeaders() });
      group.stickers = group.stickers.filter(s => s.id !== stickerId);
      renderStickerManager();
      renderStickerPicker();
    } catch(e) {}
  }

  // ── 聊天用：底部表情选择器渲染 ──
  function renderStickerPicker() {
    const grid = document.getElementById('wc-sticker-grid');
    const empty = document.getElementById('wc-sticker-empty');
    if (!grid) return;
    grid.innerHTML = '';
    const enabledGroups = stickerGroups.filter(g => g.enabled && g.stickers.length > 0);
    if (enabledGroups.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'wc-sticker-empty';
      emptyDiv.innerHTML = '还没有表情包<br><span style="font-size:0.65rem;opacity:0.5;">在卡组面板 → 表情包中添加</span>';
      grid.appendChild(emptyDiv);
      return;
    }
    for (const group of enabledGroups) {
      // 分组标签（多于1组时显示）
      if (enabledGroups.length > 1) {
        const label = document.createElement('div');
        label.className = 'wc-stk-picker-label';
        label.textContent = group.name;
        grid.appendChild(label);
      }
      const row = document.createElement('div');
      row.className = 'wc-stk-picker-row';
      for (const sticker of group.stickers) {
        const item = document.createElement('div');
        item.className = 'wc-sticker-item';
        const img = document.createElement('img');
        img.src = stickerUrl(sticker);
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('click', () => {
          sendSticker(sticker);
          toggleStickerPanel(false);
        });
        item.appendChild(img);
        row.appendChild(item);
      }
      grid.appendChild(row);
    }
  }

  async function uploadSticker(file, groupId) {
    if (!isLoggedIn()) return;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        let dataUrl = reader.result;
        const isGif = file.type === 'image/gif';
        if (!isGif) {
          // 非GIF：canvas压缩
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = dataUrl; });
          const maxSize = 256;
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          dataUrl = c.toDataURL('image/png', 0.9);
        }
        // GIF直接用原始dataURL，保留动画
        try {
          const res = await fetch('/api/stickers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ image: dataUrl, groupId })
          });
          const data = await res.json();
          if (data.sticker && data.group) {
            const g = stickerGroups.find(gr => gr.id === data.group.id);
            if (g) g.stickers = data.group.stickers;
          } else if (data.error) {
            alert(data.error);
          }
        } catch(e) {}
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  function sendSticker(sticker) {
    addMsg(stickerUrl(sticker), 'user', 'sticker');
    messageQueue.push('[表情包]');
  }

  // ── 浮动表情面板渲染 ──
  function renderFloatingStickers() {
    const panel = document.getElementById('wc-sticker-panel');
    if (!panel) return;
    panel.innerHTML = '';
    const enabledGroups = stickerGroups.filter(g => g.enabled && g.stickers.length > 0);
    if (enabledGroups.length === 0) {
      panel.innerHTML = '<div class="wc-sticker-empty">还没有表情包<br><span style="font-size:0.65rem;opacity:0.5;">在卡组面板 → 表情包中添加</span></div>';
      return;
    }
    for (const group of enabledGroups) {
      for (const sticker of group.stickers) {
        const img = document.createElement('img');
        img.src = stickerUrl(sticker);
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('click', () => {
          sendSticker(sticker);
          toggleStickerPanel(false);
        });
        panel.appendChild(img);
      }
    }
  }

  function toggleStickerPanel(show) {
    const panel = document.getElementById('wc-sticker-panel');
    if (show === undefined) show = !stickerPanelOpen;
    stickerPanelOpen = show;
    panel.style.display = show ? '' : 'none';
    if (show) {
      if (stickerGroups.length === 0) loadStickers();
      else renderFloatingStickers();
    }
  }

  // 笑脸按钮 → 弹出选择器
  var _el=document.getElementById('btn-wc-sticker'); if(_el) _el.addEventListener('click', () => {
    if (!isLoggedIn()) {
      alert('登录后可使用表情包');
      return;
    }
    toggleStickerPanel();
  });

  // 顶部工具栏上传（默认传到第一个分组）
  const stickerFileInput = document.getElementById('wc-sticker-file');
  if (stickerFileInput) {
    stickerFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      const targetGroup = (stickerGroups[0] && stickerGroups[0].id);
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        await uploadSticker(file, targetGroup);
      }
      stickerFileInput.value = '';
      renderStickerManager();
      renderStickerPicker();
    });
  }

  // 新建分组
  var _el=document.getElementById('btn-stk-new-group'); if(_el) _el.addEventListener('click', async () => {
    const name = prompt('分组名称（最多10字）');
    if (!name || !name.trim()) return;
    try {
      const res = await fetch('/api/sticker-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();
      if (data.group) {
        stickerGroups.push(data.group);
        renderStickerManager();
        renderStickerPicker();
      }
    } catch(e) {}
  });

  // 点击外部关闭表情选择器
  document.addEventListener('click', (e) => {
    if (!stickerPanelOpen) return;
    const panel = document.getElementById('wc-sticker-panel');
    const btn = document.getElementById('btn-wc-sticker');
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      toggleStickerPanel(false);
    }
  });

  // ─── 导航 ───
  // 主页 → 对话列表（登录）或直接进聊天（未登录）
  // 检查未读并更新按钮红点
  async function checkBtnUnread() {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch('/api/wc-chats/unread', { headers: authHeaders() });
      const data = await res.json();
      const badge = document.getElementById('wc-btn-badge');
      if (badge) badge.style.display = data.hasUnread ? 'block' : 'none';
    } catch(e) {}
  }

  document.getElementById('btn-wordcard').addEventListener('click', () => {
    if (isLoggedIn()) {
      showScreenById('screen-wordcard-list');
      loadChatList();
    } else {
      // 未登录：直接进单聊天
      currentChatId = null;
      chatMessages = [];
      loadChat();
      const msgArea = document.getElementById('wc-chat-messages');
      msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
      for (const msg of chatMessages) appendMsgDom(msg.text, msg.type, msgArea, msg.msgType);
      showScreenById('screen-wordcard-input');
      refreshHeaderAvatars();
      document.getElementById('wc-input').focus();
    }
  });




  // ─── Per-chat 设置面板 ───
  const chatSettingsBtn = document.getElementById('btn-wc-chat-settings');
  const chatSettingsPanel = document.getElementById('wc-chat-settings-panel');

  if (chatSettingsBtn) {
    chatSettingsBtn.addEventListener('click', () => {
      if (chatSettingsPanel.style.display === 'none') {
        chatSettingsPanel.style.display = 'flex';
        switchSettingsTab('settings');
        loadChatSettings();
        loadProfileSection();
      } else {
        chatSettingsPanel.style.display = 'none';
      }
    });
  }

  var _settingsPanelClose = document.getElementById('btn-wc-settings-panel-close');
  if (_settingsPanelClose) _settingsPanelClose.addEventListener('click', () => {
    chatSettingsPanel.style.display = 'none';
  });

  // ─── TA Profile 编辑（per-chat） ───
  function loadProfileSection() {
    var img = document.getElementById('wc-profile-avatar-img');
    var placeholder = document.querySelector('.wc-profile-avatar-placeholder');
    var nicknameInput = document.getElementById('wc-profile-nickname');
    if (!img) return;
    // Load current TA avatar/nickname for this chat
    loadAvatarData();
    if (avatarData.ta) {
      img.src = avatarData.ta;
      img.style.display = '';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      img.style.display = 'none';
      if (placeholder) placeholder.style.display = '';
    }
    if (nicknameInput) nicknameInput.value = avatarData.taName || '';
  }

  // Profile avatar upload
  var profileAvatarFile = document.getElementById('wc-profile-avatar-file');
  if (profileAvatarFile) profileAvatarFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      var img = new Image();
      img.onload = function() {
        var size = 200;
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (sw > sh) { sx = (sw - sh) / 2; sw = sh; }
        else { sy = (sh - sw) / 2; sh = sw; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        avatarData.ta = dataUrl;
        saveAvatarData();
        var previewImg = document.getElementById('wc-profile-avatar-img');
        var placeholder = document.querySelector('.wc-profile-avatar-placeholder');
        if (previewImg) { previewImg.src = dataUrl; previewImg.style.display = ''; }
        if (placeholder) placeholder.style.display = 'none';
        refreshHeaderAvatars();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // Profile nickname input
  var profileNickname = document.getElementById('wc-profile-nickname');
  if (profileNickname) {
    var _nickTimer = null;
    profileNickname.addEventListener('input', function() {
      clearTimeout(_nickTimer);
      _nickTimer = setTimeout(function() {
        avatarData.taName = profileNickname.value.trim();
        saveAvatarData();
        refreshHeaderAvatars();
      }, 500);
    });
  }

  async function loadChatSettings() {
    if (!isLoggedIn() || !currentChatId) return;
    try {
      const res = await fetch('/api/wc-chats/' + currentChatId + '/settings', { headers: authHeaders() });
      const data = await res.json();
      document.getElementById('wc-chat-proactive-toggle').checked = data.proactiveEnabled !== false;
      // Load visual settings
      currentChatSettings = {
        bgPreset: data.bgPreset || 'none',
        bgImage: data.bgImage || null,
        bubbleTheme: data.bubbleTheme || 'default',
      hueRotate: data.hueRotate || 0,
        myBubbleColor: data.myBubbleColor || 'default',
        taBubbleColor: data.taBubbleColor || 'default'
      };
      updateSettingsPanelUI(currentChatSettings);
      applyChatVisualSettings(currentChatSettings);
      // Restore bubble style
      if (currentChatSettings.bubbleStyle && currentChatSettings.bubbleStyle !== 'default') {
        applyBubbleStyle(currentChatSettings.bubbleStyle);
      }
    } catch(e) {}
  }

  var _chatProactiveToggle = document.getElementById('wc-chat-proactive-toggle');
  if (_chatProactiveToggle) _chatProactiveToggle.addEventListener('change', async (e) => {
    if (!isLoggedIn() || !currentChatId) return;
    try {
      await fetch('/api/wc-chats/' + currentChatId + '/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ proactiveEnabled: e.target.checked })
      });
    } catch(e) {}
  });

  var _saveScreenshotBtn = document.getElementById('btn-wc-save-screenshot');
  if (_saveScreenshotBtn) _saveScreenshotBtn.addEventListener('click', () => {
    chatSettingsPanel.style.display = 'none';
    saveScreenshot();
  });

  var _clearChatBtn = document.getElementById('btn-wc-clear-chat');
  if (_clearChatBtn) _clearChatBtn.addEventListener("click", () => {
    if (!confirm("确定要清空这段对话吗？清空后无法恢复。")) return;
    chatSettingsPanel.style.display = "none";
    wordDeck.reset();
    chatMessages = [];
    localStorage.removeItem(STORAGE_KEY);
    const msgArea = document.getElementById("wc-chat-messages");
    msgArea.innerHTML = "<div class=\"wc-system-msg\">想对 TA 说什么？</div>";
    saveChat();
  });


  // ═══ Per-chat visual settings: background / bubble style / bubble color ═══

  const BG_PRESETS = {
    none: '',
    starry: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d1b2e 100%)',
    warm: 'linear-gradient(135deg, #fef3e2 0%, #f6e6d0 50%, #fef9f0 100%)',
    mint: 'linear-gradient(135deg, #e8f5e8 0%, #d4edda 50%, #e8f5e8 100%)',
    dusk: 'linear-gradient(135deg, #1a1025 0%, #2d1b3d 50%, #1a1025 100%)',
    white: '#ffffff',
  };

  const COLOR_PRESETS = {
    default: 'rgba(140,160,200,0.15)',
    mint: 'rgba(120,200,170,0.15)',
    sakura: 'rgba(220,160,180,0.15)',
    amber: 'rgba(220,190,130,0.15)',
    lavender: 'rgba(180,160,220,0.15)',
    coral: 'rgba(220,140,120,0.15)',
    deepsea: 'rgba(80,120,180,0.25)',
    nightpurple: 'rgba(120,80,160,0.25)',
  };

  let currentChatSettings = {};

  function applyChatVisualSettings(settings) {
    const msgArea = document.getElementById('wc-chat-messages');
    const container = document.querySelector('.wc-chat-container');
    if (!msgArea) return;

    // Background — 设在 container 上，header/input 用毛玻璃透出
    var target = container || msgArea;
    var hasBg = false;
    if (settings.bgImage) {
      target.style.setProperty('background-image', 'url(' + settings.bgImage + ')', 'important');
      target.style.setProperty('background-size', 'cover', 'important');
      target.style.setProperty('background-position', 'center', 'important');
      target.style.setProperty('background-repeat', 'no-repeat', 'important');
      target.style.setProperty('background-color', 'transparent', 'important');
      hasBg = true;
    } else if (settings.bgPreset && settings.bgPreset !== 'none' && BG_PRESETS[settings.bgPreset]) {
      var bg = BG_PRESETS[settings.bgPreset];
      if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) {
        target.style.backgroundImage = bg;
        target.style.backgroundColor = '';
      } else {
        target.style.backgroundImage = 'none';
        target.style.backgroundColor = bg;
      }
      target.style.backgroundSize = '';
      target.style.backgroundPosition = '';
      target.style.backgroundRepeat = '';
      hasBg = true;
    } else {
      target.style.removeProperty('background-image');
      target.style.removeProperty('background-color');
      target.style.removeProperty('background-size');
      target.style.removeProperty('background-position');
      target.style.removeProperty('background-repeat');
    }
    // 有背景时 header/input 变毛玻璃
    if (container) {
      container.classList.toggle('has-custom-bg', hasBg);
    }

    // Bubble theme — add class to messages container
    msgArea.classList.remove('bubble-theme-sweetpink', 'bubble-theme-darknight', 'bubble-theme-classicblue', 'bubble-theme-capsule', 'bubble-theme-imessage', 'bubble-theme-dark', 'bubble-theme-pink', 'bubble-theme-minimal');
    if (settings.bubbleTheme && settings.bubbleTheme !== 'default') {
      msgArea.classList.add('bubble-theme-' + settings.bubbleTheme);
    }
    // 主题也加到 container 上（控制 header/input 样式）
    if (container) {
      container.classList.remove('chat-theme-dark', 'chat-theme-pink', 'chat-theme-minimal');
      if (settings.bubbleTheme && settings.bubbleTheme !== 'default') {
        container.classList.add('chat-theme-' + settings.bubbleTheme);
      }
      // 动态更新状态栏 + body 背景颜色
      var themeColors = { dark: '#0b0d11', pink: '#f5e8ed', minimal: '#fafafa', default: '#f0f2f5' };
      var tc = themeColors[settings.bubbleTheme] || themeColors['default'];
      var metaTC = document.querySelector('meta[name="theme-color"]');
      if (metaTC) metaTC.content = tc;
      document.documentElement.style.background = tc;
      document.body.style.background = tc;
    }

    // 色调 — hue-rotate on bubbles
    var hue = parseInt(settings.hueRotate) || 0;
    if (hue > 0) {
      msgArea.style.filter = 'hue-rotate(' + hue + 'deg)';
    } else {
      msgArea.style.filter = '';
    }
  }

  function updateSettingsPanelUI(settings) {
    // Background
    document.querySelectorAll('#wc-bg-options .wc-bg-card, #wc-bg-options .wc-bg-option').forEach(function(o) { o.classList.remove('selected'); });
    var bgKey = settings.bgImage ? 'custom' : (settings.bgPreset || 'none');
    if (bgKey === 'custom') {
      // highlight upload button
      var uploadLabel = document.querySelector('.wc-bg-upload');
      if (uploadLabel) uploadLabel.classList.add('selected');
    } else {
      var bgEl = document.querySelector('#wc-bg-options .wc-bg-option[data-bg="' + bgKey + '"]');
      if (bgEl) bgEl.classList.add('selected');
    }

    // Bubble style
    document.querySelectorAll('#wc-theme-options .wc-theme-option').forEach(function(o) { o.classList.remove('selected'); });
    var styleKey = settings.bubbleStyle || 'round';
    var styleEl = document.querySelector('#wc-theme-options .wc-theme-option[data-style="' + styleKey + '"]');
    if (styleEl) styleEl.classList.add('selected');

    // My color
    document.querySelectorAll('#wc-my-colors .wc-color-option').forEach(function(o) { o.classList.remove('selected'); });
    var myKey = settings.myBubbleColor || 'default';
    var myEl = document.querySelector('#wc-my-colors .wc-color-option[data-color="' + myKey + '"]');
    if (myEl) myEl.classList.add('selected');

    // Ta color
    document.querySelectorAll('#wc-ta-colors .wc-color-option').forEach(function(o) { o.classList.remove('selected'); });
    var taKey = settings.taBubbleColor || 'default';
    var taEl = document.querySelector('#wc-ta-colors .wc-color-option[data-color="' + taKey + '"]');
    if (taEl) taEl.classList.add('selected');
  }

  async function saveChatVisualSetting(partial) {
    if (!isLoggedIn() || !currentChatId) return;
    Object.assign(currentChatSettings, partial);
    try {
      await fetch('/api/wc-chats/' + currentChatId + '/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(partial)
      });
    } catch(e) { console.warn('save visual setting failed:', e); }
  }

  // Background option clicks
  document.querySelectorAll('#wc-bg-options .wc-bg-card:not(.wc-bg-upload), #wc-bg-options .wc-bg-option:not(.wc-bg-upload)').forEach(function(opt) {
    opt.addEventListener('click', function() {
      document.querySelectorAll('#wc-bg-options .wc-bg-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      currentChatSettings.bgPreset = opt.dataset.bg;
      currentChatSettings.bgImage = null;
      saveChatVisualSetting({ bgPreset: opt.dataset.bg, bgImage: null });
      applyChatVisualSettings(currentChatSettings);
    });
  });

  // Background upload
  var bgUploadInput = document.getElementById('wc-bg-upload');
  if (bgUploadInput) bgUploadInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('图片不能超过 20MB'); return; }
    var img = new Image();
    img.onload = function() {
      var maxDim = 1200;
      var w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var quality = 0.8;
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 800000 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      document.querySelectorAll('#wc-bg-options .wc-bg-option').forEach(function(o) { o.classList.remove('selected'); });
      var _upEl = document.querySelector('.wc-bg-upload'); if(_upEl) _upEl.classList.add('selected');
      currentChatSettings.bgPreset = 'custom';
      currentChatSettings.bgImage = dataUrl;
      saveChatVisualSetting({ bgPreset: 'custom', bgImage: dataUrl });
      applyChatVisualSettings(currentChatSettings);
    };
    img.src = URL.createObjectURL(file);
  });

  // Bubble theme clicks
  document.querySelectorAll('#wc-theme-options .wc-theme-option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      document.querySelectorAll('#wc-theme-options .wc-theme-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      currentChatSettings.bubbleTheme = opt.dataset.theme;
      saveChatVisualSetting({ bubbleTheme: opt.dataset.theme });
      applyChatVisualSettings(currentChatSettings);
    });
  });

  // Bubble style clicks (separate from theme)
  document.querySelectorAll('#wc-bubble-options .wc-theme-option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      document.querySelectorAll('#wc-bubble-options .wc-theme-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      currentChatSettings.bubbleStyle = opt.dataset.bubble;
      saveChatVisualSetting({ bubbleStyle: opt.dataset.bubble });
      applyBubbleStyle(opt.dataset.bubble);
    });
  });

  function applyBubbleStyle(style) {
    var msgArea = document.getElementById('wc-chat-messages');
    if (!msgArea) return;
    msgArea.classList.remove('bubble-theme-sweetpink', 'bubble-theme-darknight', 'bubble-theme-classicblue', 'bubble-theme-capsule', 'bubble-theme-imessage');
    if (style && style !== 'default') {
      msgArea.classList.add('bubble-theme-' + style);
    }
  }

  // Hue clicks
  document.querySelectorAll('#wc-hue-options .wc-hue-option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      document.querySelectorAll('#wc-hue-options .wc-hue-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      currentChatSettings.hueRotate = opt.dataset.hue;
      saveChatVisualSetting({ hueRotate: parseInt(opt.dataset.hue) });
      applyChatVisualSettings(currentChatSettings);
    });
  });


  // ═══ End per-chat visual settings ═══


  // 列表页：返回主页
  var _el=document.getElementById('btn-wclist-back'); if(_el) _el.addEventListener('click', () => {
    showScreenById('screen-welcome');
  });

  // 列表页：新建对话
  var _el=document.getElementById('btn-wclist-new'); if(_el) _el.addEventListener('click', () => {
    createNewChat();
  });

  // 聊天页：返回列表（保存后返回）
  document.getElementById('btn-wordcard-back').addEventListener('click', async () => {
    await saveChatNow();
    if (isLoggedIn()) {
      showScreenById('screen-wordcard-list');
      loadChatList();
    } else {
      showScreenById('screen-welcome');
    }
  });

  // 清空当前对话
  var _resetBtn = document.getElementById('btn-wordcard-reset'); if (_resetBtn) _resetBtn.addEventListener('click', () => {
    wordDeck.reset();
    chatMessages = [];
    localStorage.removeItem(STORAGE_KEY);
    const msgArea = document.getElementById('wc-chat-messages');
    msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
    saveChat();
  });

  // ─── 保存聊天截图 ───
  function saveScreenshot() {
    if (chatMessages.length === 0) return;

    // 预加载所有表情包图片
    var stickerMsgs = chatMessages.filter(m => m.msgType === 'sticker');
    var stickerImages = {};
    var loadPromises = stickerMsgs.map(function(m) {
      return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() { stickerImages[m.text] = img; resolve(); };
        img.onerror = function() { resolve(); };
        img.src = m.text;
      });
    });

    Promise.all(loadPromises).then(function() { _doScreenshot(stickerImages); });
  }

  function _doScreenshot(stickerImages) {

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const canvasW = 600;
    const dpr = 3;
    const padX = 50;
    const padY = 50;
    const gap = 16;
    const fontSize = 16;
    const lineH = 26;
    const bubblePadX = 16;
    const bubblePadY = 10;
    const maxTextW = canvasW - padX * 2 - bubblePadX * 2 - 40;

    // 预计算高度
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `300 ${fontSize}px "Noto Serif SC", serif`;

    function wrapText(ctx, text, maxW) {
      const lines = [];
      let line = '';
      for (const ch of text) {
        if (ctx.measureText(line + ch).width > maxW) {
          lines.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      if (line) lines.push(line);
      return lines.length || 1;
    }

    const stickerSize = 120;
    let totalH = padY;
    const msgLayouts = [];
    for (const msg of chatMessages) {
      if (msg.msgType === 'sticker') {
        const bubbleH = stickerSize + 8;
        msgLayouts.push({ ...msg, lineCount: 0, bubbleH, isSticker: true });
        totalH += bubbleH + gap;
      } else {
        const lineCount = wrapText(tmpCtx, msg.text, maxTextW);
        const bubbleH = bubblePadY * 2 + lineCount * lineH;
        msgLayouts.push({ ...msg, lineCount, bubbleH });
        totalH += bubbleH + gap;
      }
    }
    totalH += padY - gap;
    const canvasH = Math.max(totalH, 400);

    // 画布
    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 背景
    if (isDark) {
      ctx.fillStyle = '#050606';
    } else {
      ctx.fillStyle = '#e8ecf1';
    }
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 标题
    ctx.font = `400 14px "LXGW WenKai", serif`;
    ctx.fillStyle = isDark ? 'rgba(200,198,198,0.3)' : 'rgba(100,110,130,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('字卡传讯', canvasW / 2, 30);
    ctx.textAlign = 'left';

    // 消息
    ctx.font = `300 ${fontSize}px "Noto Serif SC", serif`;
    let y = padY;
    for (const msg of msgLayouts) {
      const isUser = msg.type === 'user';
      const lines = [];
      let line = '';
      for (const ch of msg.text) {
        if (ctx.measureText(line + ch).width > maxTextW) {
          lines.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      if (line) lines.push(line);

      const bubbleW = Math.min(
        Math.max(...lines.map(l => ctx.measureText(l).width)) + bubblePadX * 2,
        canvasW - padX * 2
      );
      const bubbleH = msg.bubbleH;
      const bubbleX = isUser ? canvasW - padX - bubbleW : padX;
      const r = 18;
      const sr = 4;

      // 表情包不画气泡
      if (msg.isSticker) {
        if (stickerImages[msg.text]) {
          var stkImg = stickerImages[msg.text];
          var drawW = stickerSize, drawH = stickerSize;
          if (stkImg.width > stkImg.height) { drawH = stickerSize * stkImg.height / stkImg.width; }
          else { drawW = stickerSize * stkImg.width / stkImg.height; }
          var stkX = isUser ? canvasW - padX - drawW : padX;
          try { ctx.drawImage(stkImg, stkX, y, drawW, drawH); } catch(e) {}
        }
        y += msg.bubbleH + gap;
        continue;
      }

      // 气泡背景
      ctx.beginPath();
      if (isUser) {
        ctx.moveTo(bubbleX + r, y);
        ctx.arcTo(bubbleX + bubbleW, y, bubbleX + bubbleW, y + bubbleH, r);
        ctx.arcTo(bubbleX + bubbleW, y + bubbleH, bubbleX, y + bubbleH, sr);
        ctx.arcTo(bubbleX, y + bubbleH, bubbleX, y, r);
        ctx.arcTo(bubbleX, y, bubbleX + bubbleW, y, r);
      } else {
        ctx.moveTo(bubbleX + r, y);
        ctx.arcTo(bubbleX + bubbleW, y, bubbleX + bubbleW, y + bubbleH, r);
        ctx.arcTo(bubbleX + bubbleW, y + bubbleH, bubbleX, y + bubbleH, r);
        ctx.arcTo(bubbleX, y + bubbleH, bubbleX, y, sr);
        ctx.arcTo(bubbleX, y, bubbleX + bubbleW, y, r);
      }
      ctx.closePath();

      if (isUser) {
        ctx.fillStyle = isDark ? 'rgba(4,52,90,0.35)' : 'rgba(140,160,200,0.1)';
        ctx.strokeStyle = isDark ? 'rgba(140,180,220,0.12)' : 'rgba(140,160,200,0.12)';
      } else {
        ctx.fillStyle = isDark ? 'rgba(4,52,90,0.2)' : 'rgba(255,255,255,0.45)';
        ctx.strokeStyle = isDark ? 'rgba(200,198,198,0.06)' : 'rgba(255,255,255,0.7)';
      }
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.stroke();

      // 内容：表情包画图片，普通消息画文字
      if (msg.isSticker && stickerImages[msg.text]) {
        var stkImg = stickerImages[msg.text];
        var drawW = stickerSize, drawH = stickerSize;
        if (stkImg.width > stkImg.height) { drawH = stickerSize * stkImg.height / stkImg.width; }
        else { drawW = stickerSize * stkImg.width / stkImg.height; }
        var stkX = isUser ? canvasW - padX - drawW - 4 : padX + 4;
        try { ctx.drawImage(stkImg, stkX, y + 4, drawW, drawH); } catch(e) {}
      } else {
        ctx.fillStyle = isDark ? 'rgba(200,198,198,0.9)' : 'rgba(60,70,90,0.9)';
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], bubbleX + bubblePadX, y + bubblePadY + fontSize + i * lineH);
        }
      }

      y += bubbleH + gap;
    }

    // 底部水印
    ctx.font = `300 11px "Noto Serif SC", serif`;
    ctx.fillStyle = isDark ? 'rgba(200,198,198,0.15)' : 'rgba(100,110,130,0.2)';
    ctx.textAlign = 'center';
    ctx.fillText('fizz letter', canvasW / 2, canvasH - 16);

    // 下载
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'wordcard-chat-' + Date.now() + '.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    }, 'image/png');

    // 同时存信箱
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
      const transcript = chatMessages.map(m => (m.type === 'user' ? '我：' : 'TA：') + m.text).join('\n');
      Auth.saveToMailbox('letter', transcript, { source: 'wordcard' });
    }
  }



  document.getElementById('btn-wc-send').addEventListener('click', send);
  document.getElementById('wc-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) send();
  });

  function send() {
    if (busy) return;
    var input = document.getElementById('wc-input');
    var text = input.value.trim();

    if (text) {
      // 有文字 → 显示消息，加入队列，AI不回应
      messageQueue.push(text);
      input.value = '';
      addMsg(text, 'user');
      input.focus();
      return;
    }

    // 空白发送 → 合并队列，触发AI翻卡
    if (messageQueue.length === 0) return;
    var combined = messageQueue.join('\n');
    messageQueue = [];
    sendText(combined);
  }

  async function sendText(text) {
    if (busy) return;
    busy = true;

    const typing = document.getElementById('wc-typing');
    typing.style.display = 'flex';
    scrollToBottom();

    // ── 先做本地关键词匹配（作为 AI 参考）──
    const localResult = wordDeck.drawCandidates(text, 6);
    const keywordHint = localResult.keywordIds;

    // ── AI 选池子（每次都调，关键词匹配结果作为 hint）──
    let result;
    try {
      const poolResp = await fetch('/api/word-cards/select-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history: chatMessages.slice(-10), keywordHint })
      });
      const poolData = await poolResp.json();
      if (poolData.pools && poolData.pools.length > 0) {
        result = wordDeck.drawFromPoolNames(poolData.pools, 8);
        result.question = text;
        result.keywordIds = keywordHint;
      } else {
        result = localResult;
      }
    } catch (e) {
      console.log('select-pools fallback:', e.message);
      result = localResult;
    }

    // 卡片全用完时，清空已用记录重试
    if (result.candidates.length === 0) {
      wordDeck.usedTexts.clear();
      result = localResult.candidates.length > 0 ? localResult : wordDeck.drawCandidates(text, 6);
    }

    const candidateObjs = result.candidates.map(c => ({ text: c.text, source: c.source }));
    let finalCards;

    if (candidateObjs.length === 0) {
      typing.style.display = 'none';
      addMsg('\u2026', 'reply');
      busy = false;
      return;
    }

    try {
      const resp = await fetch('/api/word-cards/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, candidates: candidateObjs, history: chatMessages.slice(-10) })
      });
      const data = await resp.json();
      if (data.none) {
        // AI 认为候选都不搭 → 显示兜底元卡
        const meta = typeof CARD_LIMIT_META !== 'undefined' ? CARD_LIMIT_META : ["字卡里没有我想说的"];
        finalCards = [meta[Math.floor(Math.random() * meta.length)]];
      } else if (data.cards && data.cards.length > 0) {
        finalCards = data.cards;
      } else {
        finalCards = candidateObjs.map(c => c.text).slice(0, 2);
      }
    } catch (err) {
      finalCards = candidateObjs.map(c => c.text).slice(0, 2);
    }

    const singleKws = new Set(['where', 'weather', 'home', 'outside', 'rain', 'night']);
    if (finalCards.length > 1 && result.keywordIds.some(k => singleKws.has(k))) {
      finalCards = [finalCards[0]];
    }

    wordDeck.commitCards(text, result.keywordIds, finalCards);

    let delay = 10000 + Math.random() * 15000;
    finalCards.forEach((cardText, i) => {
      setTimeout(() => {
        if (i === finalCards.length - 1) typing.style.display = 'none';
        addMsg(cardText, 'reply');
        if (i === finalCards.length - 1) {
          // AI 有概率发表情包
          maybeAiSticker(delay);
          busy = false;
          document.getElementById('wc-input').focus();
        }
      }, delay);
      delay += 8000 + Math.random() * 7000;
    });
  }

  // AI 随机发表情包（30% 概率，延迟 2-5 秒）
  function maybeAiSticker(baseDelay) {
    const enabledStickers = stickerGroups
      .filter(g => g.enabled)
      .flatMap(g => g.stickers);
    if (enabledStickers.length === 0) return;
    if (Math.random() > 0.12) return;
    const sticker = enabledStickers[Math.floor(Math.random() * enabledStickers.length)];
    setTimeout(() => {
      addMsg(stickerUrl(sticker), 'reply', 'sticker');
    }, 2000 + Math.random() * 3000);
  }

  function appendMsgDom(text, type, container, msgType) {
    const row = document.createElement('div');
    row.className = 'wc-msg-row' + (type === 'user' ? ' is-user' : '');
    const avatar = document.createElement('div');
    avatar.className = 'wc-msg-avatar';
    avatar.innerHTML = buildMsgAvatarHtml(type);
    const bubble = document.createElement('div');
    bubble.className = type === 'user' ? 'wc-msg-user' : 'wc-msg-reply';
    if (msgType === 'sticker') {
      bubble.classList.add('wc-msg-sticker');
      const img = document.createElement('img');
      img.src = text;
      img.alt = '';
      img.className = 'wc-sticker-msg-img';
      bubble.appendChild(img);
    } else {
      bubble.textContent = text;
    }
    row.appendChild(avatar);
    row.appendChild(bubble);
    container.appendChild(row);
    return row;
  }

  function addMsg(text, type, msgType) {
    const msgArea = document.getElementById('wc-chat-messages');
    appendMsgDom(text, type, msgArea, msgType);
    const msgObj = { text, type };
    if (msgType) msgObj.msgType = msgType;
    chatMessages.push(msgObj);
    scrollToBottom();
    saveChat(); // 每条消息自动保存
  }

  function scrollToBottom() {
    const msgArea = document.getElementById('wc-chat-messages');
    requestAnimationFrame(() => { msgArea.scrollTop = msgArea.scrollHeight; });
  }

  // ===== 卡牌放大（雷诺曼） =====
  const zoomOverlay = document.getElementById('card-zoom-overlay');
  if (zoomOverlay) {
    const zoomImg = document.getElementById('card-zoom-img');
    const zoomName = document.getElementById('card-zoom-name');
    const zoomNameEn = document.getElementById('card-zoom-name-en');
    const zoomKeywords = document.getElementById('card-zoom-keywords');
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.lenormand-card-img');
      if (!img) return;
      zoomImg.src = img.src;
      const card = img.closest('.lenormand-card');
      if (card) {
        zoomName.textContent = (function(_e){return _e?_e.textContent:""})(card.querySelector('.lenormand-card-name')) || '';
        zoomNameEn.textContent = (function(_e){return _e?_e.textContent:""})(card.querySelector('.lenormand-card-name-en')) || '';
        zoomKeywords.textContent = (function(_e){return _e?_e.textContent:""})(card.querySelector('.lenormand-card-keywords')) || '';
      }
      zoomOverlay.classList.add('show');
    });
    zoomOverlay.addEventListener('click', () => { zoomOverlay.classList.remove('show'); });
  }
});

  // 页面加载时检查未读红点
  if (typeof checkBtnUnread === 'function') {
    checkBtnUnread();
    // 每60秒检查一次
    setInterval(checkBtnUnread, 60000);
  }
