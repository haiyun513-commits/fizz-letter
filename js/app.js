// 主流程控制
document.addEventListener('DOMContentLoaded', () => {
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    bubbles: document.getElementById('screen-bubbles'),
    message: document.getElementById('screen-message'),
    loading: document.getElementById('screen-loading'),
    letter: document.getElementById('screen-letter'),
  };

  const bubbleContainer = document.getElementById('bubble-container');
  const manager = new BubbleManager(bubbleContainer);

  let currentScreen = 'welcome';

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    currentScreen = name;
  }

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
    } catch (err) {
      console.log('API unavailable, using pre-written letter:', err.message);
      // fallback到预写信件
      const letter = getRandomLetter(style, userMessage);
      displayLetter(letter);
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
    const link = document.createElement('a');
    link.download = `fizz-letter-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
});
