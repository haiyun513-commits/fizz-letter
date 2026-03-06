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

  // 创建星空背景
  function createStars() {
    const container = document.getElementById('stars');
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 3 + 's';
      star.style.animationDuration = (2 + Math.random() * 3) + 's';
      const size = Math.random() * 2 + 1;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      container.appendChild(star);
    }
  }
  createStars();

  // 开始按钮
  document.getElementById('btn-start').addEventListener('click', () => {
    showScreen('bubbles');
    manager.startRound();
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
        template: data.isPoem ? 'poem' : template,
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
