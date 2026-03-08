// 主流程控制
document.addEventListener('DOMContentLoaded', () => {
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    bubbles: document.getElementById('screen-bubbles'),
    message: document.getElementById('screen-message'),
    loading: document.getElementById('screen-loading'),
    letter: document.getElementById('screen-letter'),
    answerInput: document.getElementById('screen-answer-input'),
    answerLoading: document.getElementById('screen-answer-loading'),
    answerResult: document.getElementById('screen-answer-result'),
    between: document.getElementById('screen-between'),
    tarotInput: document.getElementById('screen-tarot-input'),
    tarotLoading: document.getElementById('screen-tarot-loading'),
    tarotResult: document.getElementById('screen-tarot-result'),
    mailbox: document.getElementById('screen-mailbox'),
  };

  const bubbleContainer = document.getElementById('bubble-container');
  const manager = new BubbleManager(bubbleContainer);

  let currentScreen = 'welcome';

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    currentScreen = name;
  }

  // === 认证 ===
  const authModal = document.getElementById('auth-modal');

  function updateAuthUI() {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      document.getElementById('auth-area').style.display = 'none';
      document.getElementById('auth-user-area').style.display = 'flex';
      document.getElementById('auth-nickname').textContent = user?.nickname || '';
    } else {
      document.getElementById('auth-area').style.display = 'flex';
      document.getElementById('auth-user-area').style.display = 'none';
    }
  }

  Auth.checkSession().then(updateAuthUI);

  function showAuthForm(form) {
    document.getElementById('auth-form-login').style.display = form === 'login' ? 'block' : 'none';
    document.getElementById('auth-form-register').style.display = form === 'register' ? 'block' : 'none';
    document.getElementById('auth-form-forgot').style.display = form === 'forgot' ? 'block' : 'none';
  }

  document.getElementById('btn-login').addEventListener('click', () => {
    authModal.style.display = 'flex';
    showAuthForm('login');
  });

  document.getElementById('auth-modal-close').addEventListener('click', () => {
    authModal.style.display = 'none';
  });
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.style.display = 'none';
  });

  document.getElementById('show-register').addEventListener('click', () => showAuthForm('register'));
  document.getElementById('show-login').addEventListener('click', () => showAuthForm('login'));
  document.getElementById('show-forgot').addEventListener('click', () => showAuthForm('forgot'));
  document.getElementById('forgot-back-login').addEventListener('click', () => showAuthForm('login'));

  // 忘记密码
  document.getElementById('btn-do-forgot').addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value;
    const errorEl = document.getElementById('forgot-error');
    const successEl = document.getElementById('forgot-success');
    errorEl.textContent = '';
    successEl.textContent = '';
    if (!email) { errorEl.textContent = '请输入邮箱'; return; }
    try {
      const resp = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      successEl.textContent = '重置链接已发送，请查收邮箱';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('btn-do-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    try {
      await Auth.login(email, password);
      authModal.style.display = 'none';
      updateAuthUI();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('btn-do-register').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value;
    const nickname = document.getElementById('register-nickname').value;
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';
    try {
      await Auth.register(email, nickname, password);
      authModal.style.display = 'none';
      updateAuthUI();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.logout();
    updateAuthUI();
  });

  // === 信箱 ===
  const TYPE_LABELS = { letter: '来信', answer: '答案', between: '语言之间', tarot: '塔罗' };
  let mailboxLetters = []; // 存储信件数据

  document.getElementById('btn-mailbox').addEventListener('click', () => {
    showScreen('mailbox');
    loadMailbox();
  });

  document.getElementById('btn-mailbox-back').addEventListener('click', () => {
    showScreen('welcome');
  });

  // 详情返回信箱列表
  document.getElementById('btn-detail-back').addEventListener('click', () => {
    document.getElementById('mailbox-detail').style.display = 'none';
  });

  async function loadMailbox() {
    const listEl = document.getElementById('mailbox-list');
    const emptyEl = document.getElementById('mailbox-empty');
    const infoEl = document.getElementById('mailbox-info');
    const redeemBtn = document.getElementById('btn-redeem');
    listEl.innerHTML = '<div class="mailbox-loading">加载中...</div>';
    emptyEl.style.display = 'none';
    document.getElementById('mailbox-detail').style.display = 'none';
    try {
      mailboxLetters = await Auth.getMailbox();
      const user = Auth.getUser();
      if (user?.is_premium) {
        infoEl.textContent = '✦ 无限信箱 · ' + mailboxLetters.length + ' 封';
        redeemBtn.style.display = 'none';
      } else {
        infoEl.textContent = mailboxLetters.length + ' / 20 封';
        redeemBtn.style.display = 'block';
      }
      if (mailboxLetters.length === 0) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
      }
      listEl.innerHTML = mailboxLetters.map((l, i) => {
        const date = new Date(l.created_at).toLocaleString('zh-CN', {
          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const meta = l.metadata || {};
        let metaHint = '';
        if (meta.words) metaHint = meta.words.join(' · ');
        if (meta.card) metaHint = meta.card;
        if (meta.userWord && meta.aiWord) metaHint = meta.userWord + ' × ' + meta.aiWord;
        if (meta.word) metaHint = '「' + meta.word + '」';
        return '<div class="mailbox-item" onclick="openMailboxDetail(' + i + ')">' +
          '<div class="mailbox-item-header">' +
          '<span class="mailbox-item-type">' + (TYPE_LABELS[l.type] || l.type) + '</span>' +
          '<span class="mailbox-item-date">' + date + '</span>' +
          '</div>' +
          (metaHint ? '<div style="color:var(--text-ghost);font-size:0.7rem;margin-bottom:4px;">' + metaHint + '</div>' : '') +
          '<div class="mailbox-item-preview">' + l.content + '</div>' +
          '</div>';
      }).join('');
    } catch (err) {
      listEl.innerHTML = '<div class="mailbox-loading" style="color:#e57373;">' + err.message + '</div>';
    }
  }

  // 打开信箱详情 — 还原原始展示样式
  window.openMailboxDetail = function(index) {
    const l = mailboxLetters[index];
    if (!l) return;
    const detail = document.getElementById('mailbox-detail');
    const content = document.getElementById('mailbox-detail-content');
    const meta = l.metadata || {};

    if (l.type === 'letter') {
      // 还原信纸样式
      const paragraphs = l.content.split('\n').filter(p => p.trim()).map(p => '<p>' + p + '</p>').join('');
      content.innerHTML = '<div class="letter-paper template-parchment"><div class="letter-body reveal">' + paragraphs + '</div></div>';
    } else if (l.type === 'answer') {
      // 还原答案之书样式
      const word = meta.word || '?';
      content.innerHTML = '<div class="answer-result-card">' +
        '<div class="answer-word">「' + word + '」</div>' +
        '<div class="answer-response">' + l.content + '</div>' +
        '</div>';
    } else if (l.type === 'tarot') {
      // 还原塔罗样式 — 从 TAROT_CARDS 查找卡牌图片
      const cardName = meta.card || '';
      const card = typeof TAROT_CARDS !== 'undefined' ? TAROT_CARDS.find(c => c.name === cardName) : null;
      const imgSrc = card ? 'images/tarot/' + encodeURIComponent(card.image) : '';
      const enName = card ? card.en : '';
      const keywords = meta.keywords || (card ? card.keywords : '');
      content.innerHTML = '<div class="tarot-result-stage">' +
        (imgSrc ? '<img class="tarot-card-img" src="' + imgSrc + '" alt="' + cardName + '">' : '') +
        '<div class="tarot-card-info">' +
        '<div class="tarot-name">' + cardName + '</div>' +
        '<div class="tarot-name-en">' + enName + '</div>' +
        '<div class="tarot-keywords">' + keywords + '</div>' +
        '</div>' +
        '<div class="tarot-mood show">' + l.content + '</div>' +
        '</div>';
    } else if (l.type === 'between') {
      // 还原语言之间样式
      const userWord = meta.userWord || '?';
      const aiWord = meta.aiWord || '?';
      content.innerHTML = '<div class="between-stage" style="position:relative;height:auto;justify-content:center;">' +
        '<div class="cards-row">' +
        '<div class="card-col"><div class="card-label">你 的</div>' +
        '<div class="flip-card flipped"><div class="flip-card-inner">' +
        '<div class="flip-card-back"><span class="card-back-mark">?</span></div>' +
        '<div class="flip-card-front">' + userWord + '</div>' +
        '</div></div></div>' +
        '<div class="card-col"><div class="card-label">我 的</div>' +
        '<div class="flip-card flipped"><div class="flip-card-inner">' +
        '<div class="flip-card-back"><span class="card-back-mark">?</span></div>' +
        '<div class="flip-card-front">' + aiWord + '</div>' +
        '</div></div></div>' +
        '</div>' +
        '<div class="between-comment show">' + l.content + '</div>' +
        '</div>';
    }

    detail.style.display = 'flex';
  };

  // 兑换码弹窗
  document.getElementById('btn-redeem').addEventListener('click', () => {
    document.getElementById('redeem-modal').style.display = 'flex';
  });
  document.getElementById('redeem-modal-close').addEventListener('click', () => {
    document.getElementById('redeem-modal').style.display = 'none';
  });
  document.getElementById('redeem-modal').addEventListener('click', (e) => {
    if (e.target.id === 'redeem-modal') e.target.style.display = 'none';
  });
  document.getElementById('btn-do-redeem').addEventListener('click', async () => {
    const code = document.getElementById('redeem-code').value;
    const errorEl = document.getElementById('redeem-error');
    const successEl = document.getElementById('redeem-success');
    errorEl.textContent = '';
    successEl.textContent = '';
    try {
      const msg = await Auth.redeem(code);
      successEl.textContent = msg;
      updateAuthUI();
      setTimeout(() => {
        document.getElementById('redeem-modal').style.display = 'none';
        loadMailbox();
      }, 1500);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  // 星光系统
  const starCanvas = document.getElementById('starfield');
  const starCtx = starCanvas.getContext('2d');
  let stars = [];

  function initStars() {
    const dpr = window.devicePixelRatio || 1;
    starCanvas.width = window.innerWidth * dpr;
    starCanvas.height = window.innerHeight * dpr;
    starCtx.scale(dpr, dpr);

    stars = [];
    const count = Math.floor((window.innerWidth * window.innerHeight) / 6000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.2 + 0.3,
        baseAlpha: Math.random() * 0.5 + 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.003 + 0.001,
        // 偶尔有一颗大一点的亮星
        bright: Math.random() < 0.06,
      });
    }
  }

  function drawStars(time) {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    for (const s of stars) {
      const breathe = Math.sin(time * s.speed + s.phase);
      const alpha = s.baseAlpha + breathe * 0.2;
      const r = s.bright ? s.r * 1.8 : s.r;

      starCtx.beginPath();
      starCtx.arc(s.x, s.y, r, 0, Math.PI * 2);
      // 星雾静蓝配色星光
      starCtx.fillStyle = s.bright
        ? `rgba(200, 198, 198, ${Math.min(alpha + 0.25, 0.9)})`   /* 雾银亮星 */
        : `rgba(160, 175, 195, ${Math.max(alpha, 0.04)})`;        /* 灰蓝普通星 */
      starCtx.fill();

      // 亮星天际蓝辉光
      if (s.bright && alpha > 0.3) {
        starCtx.beginPath();
        starCtx.arc(s.x, s.y, r * 3.5, 0, Math.PI * 2);
        starCtx.fillStyle = `rgba(6, 88, 140, ${alpha * 0.15})`;
        starCtx.fill();
      }
    }
    requestAnimationFrame(drawStars);
  }

  initStars();
  requestAnimationFrame(drawStars);
  window.addEventListener('resize', initStars);

  // 主题切换
  let currentTheme = 'light';
  const LIGHT_TEMPLATES = ['handwrite', 'serif', 'glass'];
  const DARK_TEMPLATES = ['dark-glass', 'dark-serif'];

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTheme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', currentTheme);
    });
  });

  // 泡沫邮局
  document.getElementById('contact-toggle').addEventListener('click', () => {
    document.getElementById('contact-popup').classList.toggle('show');
  });

  // 开始按钮
  document.getElementById('btn-start').addEventListener('click', () => {
    showScreen('bubbles');
    manager.startRound();
  });

  // 返回首页
  document.getElementById('btn-back-home').addEventListener('click', () => {
    manager.reset();
    showScreen('welcome');
  });

  // 换一组按钮
  document.getElementById('btn-shuffle').addEventListener('click', () => {
    manager.shuffle();
  });

  // 跳过（如果这轮只选了一个就想继续）
  document.getElementById('btn-skip').addEventListener('click', () => {
    if (manager.selectedThisRound > 0) {
      manager.completeRound();
    }
  });

  // 轮次完成回调
  manager.onRoundComplete = (round) => {
    // 可以加过渡动画
  };

  // 全部完成回调
  manager.onAllComplete = (selectedWords) => {
    showScreen('message');
    // 显示选中的词
    const preview = document.getElementById('words-preview');
    preview.innerHTML = selectedWords.map(w => `<span class="word-chip">${w}</span>`).join('');
  };

  // 发送/跳过倾诉
  document.getElementById('btn-send-message').addEventListener('click', () => {
    const userMessage = document.getElementById('user-message').value;
    generateLetter(manager.selectedWords, userMessage);
  });

  document.getElementById('btn-skip-message').addEventListener('click', () => {
    generateLetter(manager.selectedWords, '');
  });

  // 生成信件（先调API，失败则用预写的）
  async function generateLetter(words, userMessage) {
    showScreen('loading');
    const style = detectStyle(words);
    const template = getLetterTemplate(style);

    // 根据主题随机信纸
    const pool = currentTheme === 'dark' ? DARK_TEMPLATES : LIGHT_TEMPLATES;
    const randomTemplate = pool[Math.floor(Math.random() * pool.length)];

    try {
      const res = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, style, userMessage }),
      });
      
      if (!res.ok) throw new Error('API failed');
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      displayLetter({
        body: data.body,
        closing: data.closing,
        english: data.english || '',
        template: randomTemplate,
      });
      Auth.saveToMailbox('letter', data.body, { words, userMessage: userMessage || undefined });
    } catch (err) {
      console.log('API unavailable, using pre-written letter:', err.message);
      // fallback到预写信件
      const letter = getRandomLetter(style, userMessage);
      displayLetter(letter);
      Auth.saveToMailbox('letter', letter.body, { words, userMessage: userMessage || undefined });
    }
  }

  // 展示信件
  function displayLetter(letter) {
    showScreen('letter');
    
    const letterEl = document.getElementById('letter-paper');
    const bodyEl = document.getElementById('letter-body');
    const closingEl = document.getElementById('letter-closing');
    
    // 设置信纸模板
    letterEl.className = 'letter-paper template-' + letter.template;
    
    // 逐字显示效果
    bodyEl.textContent = '';
    closingEl.textContent = '';
    
    const paragraphs = letter.body.split('\n');
    let html = '';
    paragraphs.forEach(p => {
      if (p.trim()) {
        html += `<p>${p}</p>`;
      }
    });
    
    // 先设置内容，然后触发淡入
    setTimeout(() => {
      bodyEl.innerHTML = html;
      bodyEl.classList.add('reveal');
    }, 500);
    
    // 英文翻译（诗歌模式）
    if (letter.english && letter.template === 'poem') {
      setTimeout(() => {
        const engDiv = document.createElement('div');
        engDiv.className = 'poem-english';
        engDiv.textContent = letter.english;
        bodyEl.appendChild(engDiv);
      }, 1200);
    }
    
    // 不显示署名
  }

  // 截图保存（原生 Canvas，3:4 竖屏比例）
  document.getElementById('btn-screenshot').addEventListener('click', async () => {
    const bodyEl = document.getElementById('letter-body');
    const isDark = currentTheme === 'dark';

    // 3:4 竖屏尺寸
    const canvasW = 600;
    const canvasH = 800;
    const dpr = 3;
    const padding = 60;
    const lineHeight = 30;
    const fontSize = 17;
    const maxTextW = canvasW - padding * 2;

    // 获取文字
    const paragraphs = [];
    bodyEl.querySelectorAll('p').forEach(p => {
      if (p.textContent.trim()) paragraphs.push(p.textContent);
    });

    // 自动换行
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${fontSize}px "LXGW WenKai", "Noto Serif SC", serif`;

    const wrappedParas = [];
    let totalLines = 0;
    for (const text of paragraphs) {
      const lines = [];
      let line = '';
      for (const char of text) {
        const testLine = line + char;
        if (tempCtx.measureText(testLine).width > maxTextW) {
          lines.push(line);
          line = char;
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);
      wrappedParas.push(lines);
      totalLines += lines.length + 0.8;
    }

    // 计算文字块高度，居中偏上
    const textBlockH = totalLines * lineHeight;
    const startY = Math.max(padding, (canvasH - textBlockH) / 2 - 20);

    // 画布
    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 背景
    if (isDark) {
      // 深渊黑渐变
      const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
      grad.addColorStop(0, '#050608');
      grad.addColorStop(0.5, '#081018');
      grad.addColorStop(1, '#050608');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
      // 信纸区域
      ctx.fillStyle = 'rgba(10, 22, 35, 0.5)';
      ctx.beginPath();
      ctx.roundRect(28, 28, canvasW - 56, canvasH - 56, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 198, 198, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
      grad.addColorStop(0, '#e8ecf1');
      grad.addColorStop(0.5, '#eef0f4');
      grad.addColorStop(1, '#e4e8ee');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
      // 信纸区域
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.roundRect(28, 28, canvasW - 56, canvasH - 56, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 文字
    ctx.font = `${fontSize}px "LXGW WenKai", "Noto Serif SC", serif`;
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.88)' : 'rgba(60, 70, 90, 0.88)';
    ctx.textBaseline = 'top';

    let y = startY;
    for (const lines of wrappedParas) {
      for (const line of lines) {
        ctx.fillText(line, padding, y);
        y += lineHeight;
      }
      y += lineHeight * 0.8;
    }

    // 水印
    ctx.font = `10px "Noto Serif SC", serif`;
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.15)' : 'rgba(60, 70, 90, 0.15)';
    ctx.textAlign = 'center';
    ctx.fillText('泡沫来信 · Fizz Letter', canvasW / 2, canvasH - 32);

    // 下载
    saveCanvasImage(canvas, `fizz-letter-${Date.now()}.png`);
  });

  // 再来一次
  document.getElementById('btn-restart').addEventListener('click', () => {
    manager.reset();
    document.getElementById('user-message').value = '';
    const bodyEl = document.getElementById('letter-body');
    const closingEl = document.getElementById('letter-closing');
    bodyEl.classList.remove('reveal');
    closingEl.classList.remove('reveal');
    showScreen('welcome');
  });

  // ===== 答案之书 =====
  const answerBook = new AnswerBook();

  // 进入答案之书
  document.getElementById('btn-answer-book').addEventListener('click', () => {
    showScreen('answerInput');
  });

  // 返回首页
  document.getElementById('btn-answer-back').addEventListener('click', () => {
    document.getElementById('answer-question').value = '';
    showScreen('welcome');
  });

  // 翻开答案
  document.getElementById('btn-flip-answer').addEventListener('click', async () => {
    const question = document.getElementById('answer-question').value;
    showScreen('answerLoading');

    try {
      const result = await answerBook.getAnswer(question);
      // 翻书动画至少显示 1.5 秒
      await new Promise(r => setTimeout(r, 1500));
      displayAnswer(result);
      Auth.saveToMailbox('answer', result.response, { word: result.word });
    } catch (err) {
      console.log('Answer API unavailable, using fallback:', err.message);
      await new Promise(r => setTimeout(r, 1200));
      const result = answerBook.getFallbackAnswer(question);
      displayAnswer(result);
      Auth.saveToMailbox('answer', result.response, { word: result.word });
    }
  });

  function displayAnswer(result) {
    const wordEl = document.getElementById('answer-word');
    const responseEl = document.getElementById('answer-response');

    wordEl.textContent = '「' + result.word + '」';
    responseEl.textContent = result.response;

    // 重置动画
    wordEl.style.animation = 'none';
    responseEl.style.animation = 'none';
    document.querySelector('.answer-footer').style.animation = 'none';
    // 触发 reflow
    void wordEl.offsetHeight;
    wordEl.style.animation = '';
    responseEl.style.animation = '';
    document.querySelector('.answer-footer').style.animation = '';

    showScreen('answerResult');
  }

  // 再问一次
  document.getElementById('btn-answer-again').addEventListener('click', () => {
    showScreen('answerInput');
  });

  // 保存答案（Canvas 截图）
  document.getElementById('btn-answer-save').addEventListener('click', () => {
    const wordEl = document.getElementById('answer-word');
    const responseEl = document.getElementById('answer-response');
    const isDark = currentTheme === 'dark';

    const canvasW = 600;
    const canvasH = 800;
    const dpr = 3;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 背景
    if (isDark) {
      const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
      grad.addColorStop(0, '#050608');
      grad.addColorStop(0.5, '#081018');
      grad.addColorStop(1, '#050608');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
      // 卡片区域
      ctx.fillStyle = 'rgba(10, 22, 35, 0.5)';
      ctx.beginPath();
      ctx.roundRect(40, 40, canvasW - 80, canvasH - 80, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 198, 198, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
      grad.addColorStop(0, '#e8ecf1');
      grad.addColorStop(0.5, '#eef0f4');
      grad.addColorStop(1, '#e4e8ee');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.roundRect(40, 40, canvasW - 80, canvasH - 80, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 大字词语（居中偏上）
    const wordText = wordEl.textContent;
    ctx.font = '36px "LXGW WenKai", "Noto Serif SC", serif';
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.9)' : 'rgba(60, 70, 90, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(wordText, canvasW / 2, canvasH * 0.38);

    // 回应文字
    const respText = responseEl.textContent;
    ctx.font = '16px "Noto Serif SC", serif';
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.65)' : 'rgba(80, 90, 110, 0.65)';
    // 自动换行
    const maxW = canvasW - 120;
    const lines = [];
    let line = '';
    for (const char of respText) {
      const test = line + char;
      if (ctx.measureText(test).width > maxW) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const lineH = 30;
    const startY = canvasH * 0.5;
    lines.forEach((l, i) => {
      ctx.fillText(l, canvasW / 2, startY + i * lineH);
    });

    // 水印
    ctx.font = '10px "Noto Serif SC", serif';
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.15)' : 'rgba(60, 70, 90, 0.15)';
    ctx.fillText('泡沫来信 · TA的潜意识', canvasW / 2, canvasH - 32);

    // 下载
    saveCanvasImage(canvas, `answer-book-${Date.now()}.png`);
  });

  // ===== 语言之间 =====
  let betweenUserWord = '';
  let betweenAiWord = '';
  let betweenPhase = 'idle'; // idle → drawing → drawn → revealing
  let betweenApiPromise = null;

  // 装饰光球（无文字，纯视觉）
  function generateDecorativeOrbs() {
    const container = document.getElementById('orb-container');
    container.innerHTML = '';
    const count = 20 + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      const orb = document.createElement('div');
      orb.className = 'orb';

      const size = 6 + Math.random() * 14;
      orb.style.width = size + 'px';
      orb.style.height = size + 'px';
      orb.style.left = (5 + Math.random() * 90) + '%';
      orb.style.top = (5 + Math.random() * 90) + '%';

      const range = 25;
      orb.style.setProperty('--dx1', (Math.random() * range * 2 - range) + 'px');
      orb.style.setProperty('--dy1', (Math.random() * range * 2 - range) + 'px');
      orb.style.setProperty('--dx2', (Math.random() * range * 2 - range) + 'px');
      orb.style.setProperty('--dy2', (Math.random() * range * 2 - range) + 'px');
      orb.style.setProperty('--dx3', (Math.random() * range * 2 - range) + 'px');
      orb.style.setProperty('--dy3', (Math.random() * range * 2 - range) + 'px');

      const dur = 4 + Math.random() * 4;
      const delay = Math.random() * -dur;
      orb.style.animation = `orbDrift ${dur}s ease-in-out ${delay}s infinite`;

      container.appendChild(orb);
      setTimeout(() => orb.classList.add('float-in'), i * 50);
    }
  }

  // 阶段一：盲抽（光球动画 → 飞入卡牌 → 显示翻开按钮）
  async function blindDraw() {
    betweenPhase = 'drawing';
    const container = document.getElementById('orb-container');
    const orbs = [...container.querySelectorAll('.orb')];
    const cardUser = document.getElementById('card-user');
    const cardAi = document.getElementById('card-ai');
    const drawBtn = document.getElementById('btn-draw');
    const hint = document.getElementById('between-hint');

    // 盲抽词语
    const allWords = Object.values(WORD_POOL).flat();
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    betweenUserWord = shuffled[0];
    betweenAiWord = shuffled[1];
    document.getElementById('card-user-word').textContent = betweenUserWord;
    document.getElementById('card-ai-word').textContent = betweenAiWord;

    drawBtn.classList.add('hidden');
    hint.textContent = '抽词中…';

    // 预请求 API
    betweenApiPromise = fetch('/api/between', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userWord: betweenUserWord, aiWord: betweenAiWord }),
    }).then(r => r.json()).catch(() => null);

    // 阶段 1：光球聚拢到中心
    const cRect = container.getBoundingClientRect();
    const cx = cRect.width / 2;
    const cy = cRect.height / 2;

    orbs.forEach(orb => {
      orb.style.animation = 'none';
      orb.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      orb.style.left = cx + 'px';
      orb.style.top = cy + 'px';
    });

    await new Promise(r => setTimeout(r, 700));

    // 阶段 2：绕中心旋转
    orbs.forEach(orb => {
      const radius = 50 + Math.random() * 80;
      const dur = 1.2 + Math.random() * 0.6;
      orb.style.setProperty('--swirl-r', radius + 'px');
      orb.style.setProperty('--swirl-dur', dur + 's');
      orb.style.transition = 'none';
      orb.classList.add('swirling');
    });

    await new Promise(r => setTimeout(r, 1800));

    // 阶段 3：一颗飞入用户卡牌
    const userRect = cardUser.getBoundingClientRect();
    const userCx = userRect.left - cRect.left + userRect.width / 2;
    const userCy = userRect.top - cRect.top + userRect.height / 2;

    if (orbs[0]) {
      orbs[0].classList.remove('swirling');
      orbs[0].classList.add('fly-to-card');
      orbs[0].style.left = userCx + 'px';
      orbs[0].style.top = userCy + 'px';
      orbs[0].style.width = '4px';
      orbs[0].style.height = '4px';
    }
    cardUser.classList.add('glow-pulse');

    await new Promise(r => setTimeout(r, 800));
    cardUser.classList.remove('glow-pulse');
    if (orbs[0]) orbs[0].style.opacity = '0';

    // 阶段 4：一颗飞入 AI 卡牌
    const aiRect = cardAi.getBoundingClientRect();
    const aiCx = aiRect.left - cRect.left + aiRect.width / 2;
    const aiCy = aiRect.top - cRect.top + aiRect.height / 2;

    if (orbs[1]) {
      orbs[1].classList.remove('swirling');
      orbs[1].classList.add('fly-to-card');
      orbs[1].style.left = aiCx + 'px';
      orbs[1].style.top = aiCy + 'px';
      orbs[1].style.width = '4px';
      orbs[1].style.height = '4px';
    }
    cardAi.classList.add('glow-pulse');

    await new Promise(r => setTimeout(r, 800));
    cardAi.classList.remove('glow-pulse');
    if (orbs[1]) orbs[1].style.opacity = '0';

    // 阶段 5：其余散开
    orbs.slice(2).forEach(o => {
      o.classList.remove('swirling');
      o.classList.add('scatter-away');
    });

    await new Promise(r => setTimeout(r, 600));

    // 抽完 → 显示"翻开"按钮
    hint.textContent = '词已入牌，准备好了吗？';
    drawBtn.textContent = '翻 开';
    drawBtn.classList.remove('hidden');
    betweenPhase = 'drawn';
  }

  // 阶段二：翻牌（倒计时 → 翻开 → AI评论）
  async function revealCards() {
    betweenPhase = 'revealing';
    const cardUser = document.getElementById('card-user');
    const cardAi = document.getElementById('card-ai');
    const drawBtn = document.getElementById('btn-draw');
    const countdown = document.getElementById('between-countdown');
    const comment = document.getElementById('between-comment');
    const footer = document.getElementById('between-footer');
    const hint = document.getElementById('between-hint');

    drawBtn.classList.add('hidden');
    hint.textContent = '';

    // 倒计时 3 2 1
    for (const n of ['3', '2', '1']) {
      countdown.textContent = n;
      countdown.classList.remove('active');
      void countdown.offsetHeight;
      countdown.classList.add('active');
      await new Promise(r => setTimeout(r, 800));
    }

    // 翻牌
    countdown.textContent = '';
    countdown.classList.remove('active');
    cardUser.classList.add('flipped');
    cardAi.classList.add('flipped');

    const data = await betweenApiPromise;
    await new Promise(r => setTimeout(r, 1200));

    // AI 评论
    if (data && data.comment) {
      comment.textContent = data.comment;
    } else {
      const fallbacks = [
        `你抽到了${betweenUserWord}，我抽到了${betweenAiWord}。看来今天我们都在想同一件事。`,
        `${betweenUserWord}和${betweenAiWord}……原来你也在这里。`,
        `你手里是${betweenUserWord}，我手里是${betweenAiWord}，刚好凑成了一句没说完的话。`,
      ];
      comment.textContent = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    comment.classList.add('show');
    Auth.saveToMailbox('between', comment.textContent, { userWord: betweenUserWord, aiWord: betweenAiWord });

    await new Promise(r => setTimeout(r, 400));
    footer.classList.add('show');
  }

  // 重置状态
  function resetBetween() {
    betweenUserWord = '';
    betweenAiWord = '';
    betweenPhase = 'idle';
    betweenApiPromise = null;
    document.getElementById('card-user').classList.remove('flipped', 'glow-pulse');
    document.getElementById('card-ai').classList.remove('flipped', 'glow-pulse');
    const countdown = document.getElementById('between-countdown');
    countdown.classList.remove('active');
    countdown.textContent = '';
    const comment = document.getElementById('between-comment');
    comment.classList.remove('show');
    comment.textContent = '';
    document.getElementById('between-footer').classList.remove('show');
    const drawBtn = document.getElementById('btn-draw');
    drawBtn.classList.remove('hidden');
    drawBtn.textContent = '抽';
    document.getElementById('between-hint').textContent = '你和我，各抽一个词';
  }

  // 进入语言之间
  document.getElementById('btn-between-words').addEventListener('click', () => {
    resetBetween();
    showScreen('between');
    setTimeout(() => generateDecorativeOrbs(), 300);
  });

  // 抽 / 翻开 按钮（两阶段复用）
  document.getElementById('btn-draw').addEventListener('click', () => {
    if (betweenPhase === 'idle') blindDraw();
    else if (betweenPhase === 'drawn') revealCards();
  });

  // 再来一次
  document.getElementById('btn-between-again').addEventListener('click', () => {
    resetBetween();
    document.getElementById('orb-container').innerHTML = '';
    setTimeout(() => generateDecorativeOrbs(), 300);
  });

  // 返回首页
  document.getElementById('btn-between-home').addEventListener('click', () => {
    showScreen('welcome');
  });

  // 保存语言之间（Canvas 截图）
  // 通用保存图片（兼容 iOS Safari）
  function saveCanvasImage(canvas, filename) {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    }, 'image/png');
  }

  document.getElementById('btn-between-save').addEventListener('click', () => {
    const isDark = currentTheme === 'dark';
    const canvasW = 600;
    const canvasH = 800;
    const dpr = 3;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 背景
    if (isDark) {
      const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
      grad.addColorStop(0, '#050608');
      grad.addColorStop(0.5, '#081018');
      grad.addColorStop(1, '#050608');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
      grad.addColorStop(0, '#e8ecf1');
      grad.addColorStop(0.5, '#eef0f4');
      grad.addColorStop(1, '#e4e8ee');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // 两张卡片区域
    const cardW = 180;
    const cardH = 250;
    const gap = 40;
    const totalW = cardW * 2 + gap;
    const startX = (canvasW - totalW) / 2;
    const cardY = 160;

    // 标签
    ctx.font = '13px "Noto Serif SC", serif';
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.4)' : 'rgba(60, 70, 90, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('你 的', startX + cardW / 2, cardY - 16);
    ctx.fillText('我 的', startX + cardW + gap + cardW / 2, cardY - 16);

    // 卡片
    for (let i = 0; i < 2; i++) {
      const x = startX + i * (cardW + gap);
      if (isDark) {
        ctx.fillStyle = 'rgba(10, 22, 35, 0.5)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      }
      ctx.beginPath();
      ctx.roundRect(x, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(200, 198, 198, 0.06)' : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 卡片上的词
      const word = i === 0 ? betweenUserWord : betweenAiWord;
      ctx.font = '28px "LXGW WenKai", "Noto Serif SC", serif';
      ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.9)' : 'rgba(60, 70, 90, 0.9)';
      ctx.textBaseline = 'middle';
      ctx.fillText(word, x + cardW / 2, cardY + cardH / 2);
    }

    // AI 评论
    const commentText = document.getElementById('between-comment').textContent;
    ctx.font = '15px "Noto Serif SC", serif';
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.65)' : 'rgba(80, 90, 110, 0.65)';
    ctx.textBaseline = 'top';
    const maxW = canvasW - 100;
    const lines = [];
    let line = '';
    for (const char of commentText) {
      const test = line + char;
      if (ctx.measureText(test).width > maxW) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const commentY = cardY + cardH + 50;
    lines.forEach((l, i) => {
      ctx.fillText(l, canvasW / 2, commentY + i * 28);
    });

    // 水印
    ctx.font = '10px "Noto Serif SC", serif';
    ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.15)' : 'rgba(60, 70, 90, 0.15)';
    ctx.fillText('泡沫来信 · 语言之间', canvasW / 2, canvasH - 32);

    saveCanvasImage(canvas, `between-words-${Date.now()}.png`);
  });

  // ===== 塔罗 =====
  const tarotDeck = new TarotDeck();

  // 进入塔罗
  document.getElementById('btn-tarot').addEventListener('click', () => {
    document.getElementById('tarot-question').value = '';
    showScreen('tarotInput');
  });

  // 返回
  document.getElementById('btn-tarot-back').addEventListener('click', () => {
    showScreen('welcome');
  });

  // 抽牌
  document.getElementById('btn-tarot-draw').addEventListener('click', async () => {
    const question = document.getElementById('tarot-question').value;
    showScreen('tarotLoading');

    // 抽牌
    const card = tarotDeck.drawCard();

    try {
      const moodPromise = tarotDeck.getMood(question);
      // 动画至少 2 秒
      await new Promise(r => setTimeout(r, 2000));
      const mood = await moodPromise;
      displayTarot(card, mood);
      Auth.saveToMailbox('tarot', mood, { card: card.name, keywords: card.keywords });
    } catch (err) {
      console.log('Tarot API unavailable, using fallback:', err.message);
      await new Promise(r => setTimeout(r, 1500));
      const mood = tarotDeck.getFallbackMood();
      displayTarot(card, mood);
      Auth.saveToMailbox('tarot', mood, { card: card.name, keywords: card.keywords });
    }
  });

  function displayTarot(card, mood) {
    const img = document.getElementById('tarot-card-img');
    img.src = 'images/tarot/' + encodeURIComponent(card.image);
    img.alt = card.name;

    document.getElementById('tarot-name').textContent = card.name;
    document.getElementById('tarot-name-en').textContent = card.en;
    document.getElementById('tarot-keywords').textContent = card.keywords;

    const moodEl = document.getElementById('tarot-mood');
    moodEl.textContent = mood;
    moodEl.classList.remove('show');

    const footer = document.querySelector('.tarot-footer');
    footer.classList.remove('show');

    // 重置动画
    document.querySelectorAll('.tarot-card-img, .tarot-name, .tarot-name-en, .tarot-keywords').forEach(el => {
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = '';
    });

    showScreen('tarotResult');

    // 延迟显示心情和按钮
    setTimeout(() => moodEl.classList.add('show'), 1200);
    setTimeout(() => footer.classList.add('show'), 1600);
  }

  // 再抽一张
  document.getElementById('btn-tarot-again').addEventListener('click', () => {
    document.getElementById('tarot-question').value = '';
    showScreen('tarotInput');
  });

  // 返回首页
  document.getElementById('btn-tarot-home').addEventListener('click', () => {
    showScreen('welcome');
  });

  // 保存塔罗（Canvas 截图）
  document.getElementById('btn-tarot-save').addEventListener('click', () => {
    const isDark = currentTheme === 'dark';
    const canvasW = 600;
    const canvasH = 800;
    const dpr = 3;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 背景
    if (isDark) {
      const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
      grad.addColorStop(0, '#050608');
      grad.addColorStop(0.5, '#081018');
      grad.addColorStop(1, '#050608');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
      grad.addColorStop(0, '#e8ecf1');
      grad.addColorStop(0.5, '#eef0f4');
      grad.addColorStop(1, '#e4e8ee');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // 用卡片图片绘制
    const card = tarotDeck.currentCard;
    const cardImg = document.getElementById('tarot-card-img');
    const imgEl = new Image();
    imgEl.crossOrigin = 'anonymous';
    imgEl.onload = function() {
      // 图片居中绘制，宽 280px，保持比例
      const imgW = 280;
      const imgH = imgW * (imgEl.naturalHeight / imgEl.naturalWidth);
      const imgX = (canvasW - imgW) / 2;
      const imgY = 60;

      // 圆角裁切
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 14);
      ctx.clip();
      ctx.drawImage(imgEl, imgX, imgY, imgW, imgH);
      ctx.restore();

      // 牌名
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const infoY = imgY + imgH + 30;
      ctx.font = '28px "LXGW WenKai", "Noto Serif SC", serif';
      ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.9)' : 'rgba(60, 70, 90, 0.9)';
      ctx.fillText(card.name, canvasW / 2, infoY);

      // 英文名
      ctx.font = '14px "Dancing Script", cursive, serif';
      ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.5)' : 'rgba(80, 90, 110, 0.5)';
      ctx.fillText(card.en, canvasW / 2, infoY + 38);

      // 关键词
      ctx.font = '11px "Noto Serif SC", serif';
      ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.25)' : 'rgba(60, 70, 90, 0.2)';
      ctx.fillText(card.keywords, canvasW / 2, infoY + 60);

      // AI 心情
      const moodText = document.getElementById('tarot-mood').textContent;
      ctx.font = '15px "Noto Serif SC", serif';
      ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.65)' : 'rgba(80, 90, 110, 0.65)';
      const maxW = canvasW - 100;
      const lines = [];
      let line = '';
      for (const char of moodText) {
        const test = line + char;
        if (ctx.measureText(test).width > maxW) {
          lines.push(line);
          line = char;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      const moodY = infoY + 95;
      lines.forEach((l, i) => {
        ctx.fillText(l, canvasW / 2, moodY + i * 28);
      });

      // 水印
      ctx.font = '10px "Noto Serif SC", serif';
      ctx.fillStyle = isDark ? 'rgba(200, 198, 198, 0.15)' : 'rgba(60, 70, 90, 0.15)';
      ctx.fillText('泡沫来信 · 塔罗', canvasW / 2, canvasH - 32);

      saveCanvasImage(canvas, `tarot-${Date.now()}.png`);
    };
    imgEl.src = cardImg.src;
  });
});
