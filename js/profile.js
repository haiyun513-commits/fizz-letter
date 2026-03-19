/* ============================================================
   Profile v7 — Tabs + Dual Image + Card Flip
   ============================================================ */
(function () {
  'use strict';

  // ---- State ------------------------------------------------
  var S = {
    allPersonas: [],  // unfiltered
    personas: [],     // filtered by current tab
    editingId: null,
    loaded: false,
    current: 0,
    pendingAvatar: null,
    pendingIllust: null,
    dragging: false,
    dragStartX: 0,
    dragDelta: 0,
    didDrag: false,
    flipped: false,
    tab: 'self',      // 'self' or 'dream_role'
  };

  // ---- Helpers ----------------------------------------------
  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.remove('active');
    });
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function authHeaders() {
    if (window.Auth && typeof Auth.authHeaders === 'function') {
      return Auth.authHeaders();
    }
    return {};
  }

  async function api(method, path, body) {
    var opts = {
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    var r = await fetch(path, opts);
    if (!r.ok) {
      var t = '';
      try { t = await r.text(); } catch (_) {}
      throw new Error(t || r.statusText);
    }
    var ct = r.headers.get('content-type') || '';
    if (ct.indexOf('application/json') !== -1) return r.json();
    return null;
  }

  // ---- DOM refs ---------------------------------------------
  var $deck      = document.getElementById('profile-deck');
  var $dots      = document.getElementById('profile-dots');
  var $feedback  = document.getElementById('profile-feedback');
  var $lightbox  = document.getElementById('profile-lightbox');
  var $flipCard  = document.getElementById('lb-flip');
  var $flipInner = document.getElementById('lb-flip-inner');
  var $lbFront   = document.getElementById('profile-lightbox-img-front');
  var $lbBack    = document.getElementById('profile-lightbox-img-back');
  var $flipHint  = document.getElementById('flip-hint');
  var $form      = document.getElementById('persona-form');
  var $formMsg   = document.getElementById('persona-form-message');
  var $editTitle = document.getElementById('persona-edit-title');
  var $editSub   = document.getElementById('persona-edit-subtitle');

  // dual upload refs
  var $uploadAvatar  = document.getElementById('persona-upload-avatar');
  var $previewAvatar = document.getElementById('persona-preview-avatar');
  var $placeholderAv = document.getElementById('persona-placeholder-avatar');
  var $inputAvatar   = document.getElementById('persona-input-avatar');
  var $uploadIllust  = document.getElementById('persona-upload-illust');
  var $previewIllust = document.getElementById('persona-preview-illust');
  var $placeholderIl = document.getElementById('persona-placeholder-illust');
  var $inputIllust   = document.getElementById('persona-input-illust');

  // ---- Load personas ----------------------------------------
  async function loadPersonas() {
    try {
      var data = await api('GET', '/api/personas');
      S.allPersonas = Array.isArray(data) ? data : (data && data.personas) || [];
      S.loaded = true;
    } catch (e) {
      S.allPersonas = [];
      showFeedback('加载失败: ' + e.message, true);
    }
    filterByTab();
  }

  function filterByTab() {
    S.personas = S.allPersonas.filter(function (p) { return p.type === S.tab; });
    S.current = 0;
  }

  // ---- Active persona (localStorage) -----------------------
  function getActiveId(type) {
    return localStorage.getItem(type === 'self' ? 'active_self_id' : 'active_dream_id') || '';
  }
  function setActiveId(type, id) {
    localStorage.setItem(type === 'self' ? 'active_self_id' : 'active_dream_id', id);
    var p = S.allPersonas.find(function(x) { return x.id === id; });
    if (p) {
      var info = { name: p.name, avatar_url: p.avatar_url || '', summary: p.summary || '' };
      localStorage.setItem(type === 'self' ? 'active_self_info' : 'active_dream_info', JSON.stringify(info));
    }
  }

  // ---- Render deck ------------------------------------------
  function renderDeck() {
    var total = S.personas.length + 1;
    if (S.current >= total) S.current = total - 1;
    if (S.current < 0) S.current = 0;

    var activeId = getActiveId(S.tab);
    var html = '';
    S.personas.forEach(function (p, i) {
      var offset = i - S.current;
      if (offset < -2) offset = -2;
      if (offset > 2) offset = 2;

      var isActive = p.id === activeId;
      // use avatar as card image, fall back to illust, then legacy image_url
      var cardImg = p.avatar_url || p.illust_url || p.image_url;
      var imgHtml;
      if (cardImg) {
        imgHtml = '<div class="pcard-img-wrap">'
          + '<img class="pcard-img" src="' + esc(cardImg) + '" alt="' + esc(p.name) + '"'
          + ' data-avatar="' + esc(p.avatar_url || cardImg) + '"'
          + ' data-illust="' + esc(p.illust_url || '') + '">'
          + '</div>';
      } else {
        imgHtml = '<div class="pcard-img-wrap"><div class="pcard-img-empty">\u2727</div></div>';
      }

      var activateBtn = isActive
        ? '<button class="pcard-action-btn pcard-btn-active" type="button" disabled>\u2713 已选定</button>'
        : '<button class="pcard-action-btn" data-action="activate" data-id="' + esc(p.id) + '" type="button">设为当前</button>';

      html += '<div class="pcard' + (isActive ? ' pcard-is-active' : '') + '" data-offset="' + offset + '" data-index="' + i + '">'
        + '<div class="pcard-inner">'
        + imgHtml
        + '<div class="pcard-name">' + esc(p.name) + '</div>'
        + (p.summary ? '<div class="pcard-summary">' + esc(p.summary) + '</div>' : '')
        + '<div class="pcard-actions">'
        + activateBtn
        + '<button class="pcard-action-btn" data-action="edit" data-id="' + esc(p.id) + '" type="button">编辑</button>'
        + '<button class="pcard-action-btn danger" data-action="delete" data-id="' + esc(p.id) + '" type="button">删除</button>'
        + '</div>'
        + '</div>'
        + '</div>';
    });

    // Add card
    var addOffset = S.personas.length - S.current;
    if (addOffset < -2) addOffset = -2;
    if (addOffset > 2) addOffset = 2;
    html += '<div class="pcard pcard-add" data-offset="' + addOffset + '" data-index="' + S.personas.length + '">'
      + '<div class="pcard-add-box">'
      + '<span class="pcard-add-icon">+</span>'
      + '<span class="pcard-add-label">创建新角色</span>'
      + '</div>'
      + '</div>';

    $deck.innerHTML = html;
    renderDots(total);
  }

  function renderDots(total) {
    var html = '';
    for (var i = 0; i < total; i++) {
      html += '<span class="profile-dot' + (i === S.current ? ' active' : '') + '" data-dot="' + i + '"></span>';
    }
    $dots.innerHTML = html;
  }

  function updateOffsets() {
    var cards = $deck.querySelectorAll('.pcard');
    cards.forEach(function (c) {
      var idx = parseInt(c.getAttribute('data-index'), 10);
      var offset = idx - S.current;
      if (offset < -2) offset = -2;
      if (offset > 2) offset = 2;
      c.setAttribute('data-offset', offset);
    });
    var dots = $dots.querySelectorAll('.profile-dot');
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === S.current);
    });
  }

  // ---- Swipe / Drag -----------------------------------------
  function initSwipe() {
    $deck.addEventListener('pointerdown', onDragStart, { passive: true });
    $deck.addEventListener('pointermove', onDragMove, { passive: false });
    $deck.addEventListener('pointerup', onDragEnd, { passive: true });
    $deck.addEventListener('pointercancel', onDragEnd, { passive: true });
  }

  function onDragStart(e) {
    if (e.button && e.button !== 0) return;
    if (e.target.closest('.pcard-action-btn')) return;
    S.dragging = true;
    S.didDrag = false;
    S.dragStartX = e.clientX;
    S.dragDelta = 0;
  }

  function onDragMove(e) {
    if (!S.dragging) return;
    S.dragDelta = e.clientX - S.dragStartX;
    if (Math.abs(S.dragDelta) > 8) S.didDrag = true;
    if (!S.didDrag) return;
    var cards = $deck.querySelectorAll('.pcard');
    cards.forEach(function (c) {
      c.style.transition = 'none';
      var idx = parseInt(c.getAttribute('data-index'), 10);
      var base = idx - S.current;
      var px = base * window.innerWidth + S.dragDelta;
      c.style.transform = 'translateX(' + px + 'px)';
      c.style.opacity = Math.abs(base) <= 1 ? '1' : '0';
    });
    e.preventDefault();
  }

  function onDragEnd() {
    if (!S.dragging) return;
    S.dragging = false;
    if (!S.didDrag) return;
    var total = S.personas.length + 1;
    var threshold = window.innerWidth * 0.18;

    if (S.dragDelta < -threshold && S.current < total - 1) {
      S.current++;
    } else if (S.dragDelta > threshold && S.current > 0) {
      S.current--;
    }

    var cards = $deck.querySelectorAll('.pcard');
    cards.forEach(function (c) {
      c.style.transition = '';
      c.style.transform = '';
      c.style.opacity = '';
    });
    updateOffsets();
    S.didDrag = false;
  }

  // ---- Lightbox with flip -----------------------------------
  function openLightbox(avatarSrc, illustSrc) {
    S.flipped = false;
    $flipInner.classList.remove('flipped');
    $lbFront.src = avatarSrc || '';
    $lbBack.src = illustSrc || '';
    // show hint only if there's a back image
    $flipHint.style.display = illustSrc ? '' : 'none';
    $lightbox.classList.add('open');
  }

  function flipCard() {
    S.flipped = !S.flipped;
    $flipInner.classList.toggle('flipped', S.flipped);
    $flipHint.style.display = 'none';
  }

  function closeLightbox() {
    $lightbox.classList.remove('open');
    S.flipped = false;
    $flipInner.classList.remove('flipped');
    setTimeout(function () {
      $lbFront.src = '';
      $lbBack.src = '';
    }, 400);
  }

  // click on card = flip, click outside = close
  $flipCard.addEventListener('click', function (e) {
    e.stopPropagation();
    flipCard();
  });
  $lightbox.addEventListener('click', function (e) {
    if (e.target === $lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });

  // ---- Deck click delegation --------------------------------
  $deck.addEventListener('click', function (e) {
    if (S.didDrag) return;
    // lightbox — click on card image
    var img = e.target.closest('.pcard-img');
    if (img) {
      var avatar = img.getAttribute('data-avatar') || img.src;
      var illust = img.getAttribute('data-illust') || '';
      openLightbox(avatar, illust);
      return;
    }
    var actBtn = e.target.closest('[data-action="activate"]');
    if (actBtn) {
      var newId = actBtn.getAttribute('data-id');
      setActiveId(S.tab, newId);
      var allCards = $deck.querySelectorAll('.pcard[data-index]');
      allCards.forEach(function(card) {
        var idx = parseInt(card.getAttribute('data-index'), 10);
        var p = S.personas[idx];
        if (!p) return;
        var isNowActive = p.id === newId;
        card.classList.toggle('pcard-is-active', isNowActive);
        var btn = card.querySelector('.pcard-action-btn[data-action="activate"], .pcard-btn-active');
        if (btn) {
          if (isNowActive) {
            btn.className = 'pcard-action-btn pcard-btn-active';
            btn.disabled = true;
            btn.removeAttribute('data-action');
            btn.textContent = '✓ 已选定';
          } else {
            btn.className = 'pcard-action-btn';
            btn.disabled = false;
            btn.setAttribute('data-action', 'activate');
            btn.setAttribute('data-id', p.id);
            btn.textContent = '设为当前';
          }
        }
      });
      showFeedback('已设为当前角色', false);
      return;
    }
    var editBtn = e.target.closest('[data-action="edit"]');
    if (editBtn) { openEditor(editBtn.getAttribute('data-id')); return; }
    var delBtn = e.target.closest('[data-action="delete"]');
    if (delBtn) { deletePersona(delBtn.getAttribute('data-id')); return; }
    var addCard = e.target.closest('.pcard-add');
    if (addCard) { openEditor(null); return; }
  });

  // ---- Dots click -------------------------------------------
  $dots.addEventListener('click', function (e) {
    var dot = e.target.closest('.profile-dot');
    if (!dot) return;
    var idx = parseInt(dot.getAttribute('data-dot'), 10);
    if (!isNaN(idx)) { S.current = idx; updateOffsets(); }
  });

  // ---- Feedback helper --------------------------------------
  function showFeedback(msg, isError) {
    $feedback.textContent = msg;
    $feedback.style.display = 'block';
    $feedback.style.color = isError ? '#c45' : 'var(--text-secondary)';
    clearTimeout(showFeedback._t);
    showFeedback._t = setTimeout(function () { $feedback.style.display = 'none'; }, 4000);
  }

  // ---- Editor -----------------------------------------------
  function openEditor(personaId) {
    S.editingId = personaId || null;
    S.pendingAvatar = null;
    S.pendingIllust = null;
    $formMsg.style.display = 'none';
    $form.reset();
    // reset both previews
    $previewAvatar.style.display = 'none'; $previewAvatar.src = '';
    $placeholderAv.style.display = '';
    $previewIllust.style.display = 'none'; $previewIllust.src = '';
    $placeholderIl.style.display = '';

    // show/hide sections based on tab
    var isSelf = S.tab === 'self';
    var relSection = document.getElementById('persona-section-relationship');
    var advToggle = document.getElementById('pform-advanced-toggle');
    var advBody = document.getElementById('pform-advanced-body');
    var arrow = document.getElementById('pform-advanced-arrow');
    if (relSection) relSection.style.display = isSelf ? 'none' : '';
    if (isSelf) {
      if (advToggle) advToggle.style.display = '';
      if (advBody) advBody.style.display = 'none';
      if (arrow) arrow.textContent = '\u25BE';
    } else {
      if (advToggle) advToggle.style.display = 'none';
      if (advBody) advBody.style.display = '';
    }

    if (S.editingId) {
      var p = S.personas.find(function (x) { return x.id === S.editingId; });
      if (p) {
        $editTitle.textContent = '编辑角色';
        $editSub.textContent = p.name;
        document.getElementById('persona-name').value = p.name || '';
        document.getElementById('persona-summary').value = p.summary || '';
        document.getElementById('persona-type').value = p.type || S.tab;
        document.getElementById('persona-age').value = p.age || '';
        var colorEl = document.getElementById('persona-color');
        if (colorEl) colorEl.value = p.color || '';
        document.getElementById('persona-height').value = p.height || '';
        document.getElementById('persona-extra').value = p.extra || '';
        document.getElementById('persona-occupation').value = p.occupation || '';
        document.getElementById('persona-eye-color').value = p.eye_color || '';
        document.getElementById('persona-hair-color').value = p.hair_color || '';
        document.getElementById('persona-source').value = p.source || '';
        document.getElementById('persona-relationship').value = p.relationship || '';
        document.getElementById('persona-tags').value = p.tags || '';
        var attrs = p.attributes || {};
        document.getElementById('attr-rational').value = attrs.rational != null ? attrs.rational : 50;
        document.getElementById('attr-active').value = attrs.active != null ? attrs.active : 50;
        document.getElementById('attr-possessive').value = attrs.possessive != null ? attrs.possessive : 50;
        document.getElementById('attr-expressive').value = attrs.expressive != null ? attrs.expressive : 50;
        document.getElementById('attr-tough').value = attrs.tough != null ? attrs.tough : 50;
        // populate avatar preview
        var av = p.avatar_url || p.image_url;
        if (av) {
          $previewAvatar.src = av;
          $previewAvatar.style.display = 'block';
          $placeholderAv.style.display = 'none';
        }
        // populate illust preview
        if (p.illust_url) {
          $previewIllust.src = p.illust_url;
          $previewIllust.style.display = 'block';
          $placeholderIl.style.display = 'none';
        }
      }
    } else {
      $editTitle.textContent = '新建角色';
      $editSub.textContent = '';
      document.getElementById('persona-type').value = S.tab;
    }
    showScreen('screen-persona-edit');
  }

  // ---- Upload areas -----------------------------------------
  function setupUpload($area, $prev, $ph, $inp, slotKey) {
    $area.addEventListener('click', function () { $inp.click(); });
    $inp.addEventListener('change', function () {
      var file = $inp.files && $inp.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) { showFormMsg('图片不能超过 8MB', true); return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (slotKey === 'avatar') S.pendingAvatar = ev.target.result;
        else S.pendingIllust = ev.target.result;
        $prev.src = ev.target.result;
        $prev.style.display = 'block';
        $ph.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });
  }
  setupUpload($uploadAvatar, $previewAvatar, $placeholderAv, $inputAvatar, 'avatar');
  setupUpload($uploadIllust, $previewIllust, $placeholderIl, $inputIllust, 'illust');

  // ---- Advanced toggle --------------------------------------
  var $advToggle = document.getElementById('pform-advanced-toggle');
  if ($advToggle) {
    $advToggle.addEventListener('click', function () {
      var body = document.getElementById('pform-advanced-body');
      var arrow = document.getElementById('pform-advanced-arrow');
      if (!body) return;
      var open = body.style.display !== 'none';
      body.style.display = open ? 'none' : '';
      if (arrow) arrow.textContent = open ? '\u25BE' : '\u25B4';
    });
  }

  // ---- Form message helper ----------------------------------
  function showFormMsg(msg, isError) {
    $formMsg.textContent = msg;
    $formMsg.style.display = 'block';
    $formMsg.style.color = isError ? '#c45' : 'var(--accent)';
    clearTimeout(showFormMsg._t);
    showFormMsg._t = setTimeout(function () { $formMsg.style.display = 'none'; }, 4000);
  }

  // ---- Save persona -----------------------------------------
  $form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = document.getElementById('persona-name').value.trim();
    if (!name) { showFormMsg('请输入角色名', true); return; }

    var colorEl = document.getElementById('persona-color');
    var payload = {
      name: name,
      summary: document.getElementById('persona-summary').value.trim(),
      type: document.getElementById('persona-type').value,
      age: document.getElementById('persona-age').value.trim(),
      color: colorEl ? colorEl.value.trim() : '',
      height: document.getElementById('persona-height').value.trim(),
      extra: document.getElementById('persona-extra').value.trim(),
      occupation: document.getElementById('persona-occupation').value.trim(),
      eye_color: document.getElementById('persona-eye-color').value.trim(),
      hair_color: document.getElementById('persona-hair-color').value.trim(),
      source: document.getElementById('persona-source').value.trim(),
      relationship: document.getElementById('persona-relationship').value.trim(),
      tags: document.getElementById('persona-tags').value.trim(),
      attributes: {
        rational: parseInt(document.getElementById('attr-rational').value),
        active: parseInt(document.getElementById('attr-active').value),
        possessive: parseInt(document.getElementById('attr-possessive').value),
        expressive: parseInt(document.getElementById('attr-expressive').value),
        tough: parseInt(document.getElementById('attr-tough').value),
      },
    };

    var saveBtn = document.getElementById('btn-persona-save');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      var result;
      if (S.editingId) {
        result = await api('PUT', '/api/persona/' + S.editingId, payload);
      } else {
        result = await api('POST', '/api/persona', payload);
      }

      var savedId = (result && result.persona && result.persona.id) || (result && result.id) || S.editingId;

      // upload avatar
      if (S.pendingAvatar && savedId) {
        try {
          await api('POST', '/api/persona/' + savedId + '/image', { image: S.pendingAvatar, slot: 'avatar' });
        } catch (err) { showFormMsg('头像上传失败: ' + err.message, true); }
      }
      // upload illust
      if (S.pendingIllust && savedId) {
        try {
          await api('POST', '/api/persona/' + savedId + '/image', { image: S.pendingIllust, slot: 'illust' });
        } catch (err) { showFormMsg('立绘上传失败: ' + err.message, true); }
      }

      await refresh();
      if (savedId) {
        var idx = S.personas.findIndex(function (p) { return p.id === savedId; });
        if (idx !== -1) S.current = idx;
      }
      goBackToHome();
      showFeedback(S.editingId ? '已更新' : '已创建', false);
    } catch (err) {
      showFormMsg('保存失败: ' + err.message, true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存角色';
    }
  });

  // ---- Delete persona ---------------------------------------
  async function deletePersona(id) {
    if (!confirm('确定删除这个角色吗？')) return;
    try {
      await api('DELETE', '/api/persona/' + id);
      await refresh();
      showFeedback('已删除', false);
    } catch (err) {
      showFeedback('删除失败: ' + err.message, true);
    }
  }

  // ---- Navigation -------------------------------------------
  function goBackToHome() {
    showScreen('screen-profile-home');
    renderDeck();
  }

  document.getElementById('btn-persona-back').addEventListener('click', goBackToHome);
  document.getElementById('btn-persona-cancel').addEventListener('click', goBackToHome);
  document.getElementById('btn-profile-back').addEventListener('click', function () {
    showScreen('screen-welcome');
  });

  // ---- Keyboard navigation ----------------------------------
  document.addEventListener('keydown', function (e) {
    var home = document.getElementById('screen-profile-home');
    if (!home || !home.classList.contains('active')) return;
    var total = S.personas.length + 1;
    if (e.key === 'ArrowLeft' && S.current > 0) { S.current--; updateOffsets(); }
    else if (e.key === 'ArrowRight' && S.current < total - 1) { S.current++; updateOffsets(); }
  });

  // ---- Tab switching ----------------------------------------
  var $tabs = document.getElementById('profile-tabs');
  $tabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.profile-tab');
    if (!btn) return;
    var tab = btn.getAttribute('data-tab');
    if (tab === S.tab) return;
    S.tab = tab;
    // update active class
    $tabs.querySelectorAll('.profile-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    filterByTab();
    renderDeck();
  });

  function syncTabUI() {
    $tabs.querySelectorAll('.profile-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === S.tab);
    });
  }

  // ---- Refresh / Public API ---------------------------------
  async function refresh() { await loadPersonas(); renderDeck(); }

  async function open() {
    if (!S.loaded) await loadPersonas();
    syncTabUI();
    renderDeck();
    showScreen('screen-profile-home');
  }

  window.ProfileArchive = { open: open, refresh: refresh, getActiveId: getActiveId };
  initSwipe();
})();
