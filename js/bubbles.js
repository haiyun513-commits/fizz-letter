// 气泡管理器
class BubbleManager {
  constructor(container) {
    this.container = container;
    this.bubbles = [];
    this.selectedWords = [];
    this.currentGroupIndex = -1;
    this.round = 0;
    this.maxRounds = 3;
    this.maxPerRound = 2;
    this.selectedThisRound = 0;
    this.onRoundComplete = null;
    this.onAllComplete = null;
    this.usedGroups = new Set();
  }

  // 开始新一轮
  startRound() {
    this.round++;
    this.selectedThisRound = 0;
    this.clearBubbles();
    this.showNewGroup();
    this.updateRoundIndicator();
  }

  // 显示一组新词（从所有词库中混合抽取）
  showNewGroup() {
    // 从所有词库里混合抽取 10-14 个词
    const allWords = Object.values(WORD_POOL).flat();
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    const count = 10 + Math.floor(Math.random() * 5);
    const words = shuffled.slice(0, count);
    
    words.forEach((word, i) => {
      setTimeout(() => this.createBubble(word), i * 120);
    });
  }

  // 已占用的区域
  placedRects = [];

  // 创建单个气泡（词云风格，防遮挡）
  createBubble(word) {
    const bubble = document.createElement('div');
    
    // 随机大小等级
    const sizeRoll = Math.random();
    let sizeClass;
    if (sizeRoll < 0.12) sizeClass = 'size-xl';
    else if (sizeRoll < 0.30) sizeClass = 'size-lg';
    else if (sizeRoll < 0.60) sizeClass = 'size-md';
    else sizeClass = 'size-sm';
    
    bubble.className = `bubble ${sizeClass}`;
    bubble.textContent = word;
    
    // 先隐藏放进DOM测量尺寸
    bubble.style.visibility = 'hidden';
    bubble.style.position = 'absolute';
    this.container.appendChild(bubble);
    
    const rect = bubble.getBoundingClientRect();
    const cRect = this.container.getBoundingClientRect();
    const w = rect.width + 16; // 加间距
    const h = rect.height + 12;
    
    // 尝试找不重叠的位置（最多50次）
    let x, y, placed = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      x = 3 + Math.random() * (90 - (w / cRect.width * 100));
      y = 8 + Math.random() * (75 - (h / cRect.height * 100));
      
      const newRect = {
        left: x / 100 * cRect.width,
        top: y / 100 * cRect.height,
        right: x / 100 * cRect.width + w,
        bottom: y / 100 * cRect.height + h,
      };
      
      const overlap = this.placedRects.some(r =>
        !(newRect.right < r.left || newRect.left > r.right ||
          newRect.bottom < r.top || newRect.top > r.bottom)
      );
      
      if (!overlap) {
        this.placedRects.push(newRect);
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      // 兜底：随机放
      x = 5 + Math.random() * 80;
      y = 10 + Math.random() * 70;
    }
    
    bubble.style.left = x + '%';
    bubble.style.top = y + '%';
    bubble.style.visibility = 'visible';
    
    bubble.addEventListener('click', () => this.popBubble(bubble, word));
    this.bubbles.push(bubble);
    
    requestAnimationFrame(() => bubble.classList.add('float-in'));
  }

  // 戳破气泡
  popBubble(bubble, word) {
    if (this.selectedThisRound >= this.maxPerRound) return;
    if (bubble.classList.contains('popping')) return;
    
    this.selectedThisRound++;
    this.selectedWords.push(word);
    
    // 弹出动画
    bubble.classList.add('popping');
    
    // 创建粒子效果
    this.createParticles(bubble);
    
    // 显示选中的词
    this.showSelectedWord(word);
    
    setTimeout(() => {
      bubble.remove();
      this.bubbles = this.bubbles.filter(b => b !== bubble);
      
      // 检查是否完成这一轮
      if (this.selectedThisRound >= this.maxPerRound) {
        setTimeout(() => this.completeRound(), 600);
      }
    }, 400);
  }

  // 粒子效果
  createParticles(bubble) {
    const rect = bubble.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const cx = rect.left - containerRect.left + rect.width / 2;
    const cy = rect.top - containerRect.top + rect.height / 2;
    
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const angle = (Math.PI * 2 * i) / 8;
      const distance = 30 + Math.random() * 40;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      
      particle.style.left = cx + 'px';
      particle.style.top = cy + 'px';
      particle.style.setProperty('--dx', dx + 'px');
      particle.style.setProperty('--dy', dy + 'px');
      
      this.container.appendChild(particle);
      setTimeout(() => particle.remove(), 600);
    }
  }

  // 显示已选中的词（可点击删除）
  showSelectedWord(word) {
    const indicator = document.getElementById('selected-words');
    const tag = document.createElement('span');
    tag.className = 'selected-tag';
    tag.textContent = word;
    tag.title = '点击删除';
    tag.addEventListener('click', () => {
      // 从已选词中移除
      const idx = this.selectedWords.indexOf(word);
      if (idx > -1) {
        this.selectedWords.splice(idx, 1);
        this.selectedThisRound = Math.max(0, this.selectedThisRound - 1);
      }
      tag.classList.add('removing');
      setTimeout(() => tag.remove(), 300);
    });
    indicator.appendChild(tag);
    requestAnimationFrame(() => tag.classList.add('show'));
  }

  // 完成一轮
  completeRound() {
    if (this.round >= this.maxRounds) {
      // 全部完成
      this.clearBubbles();
      if (this.onAllComplete) this.onAllComplete(this.selectedWords);
    } else {
      // 下一轮
      if (this.onRoundComplete) this.onRoundComplete(this.round);
      setTimeout(() => this.startRound(), 800);
    }
  }

  // 换一组
  shuffle() {
    this.clearBubbles();
    this.showNewGroup();
  }

  // 清除所有气泡
  clearBubbles() {
    this.bubbles.forEach(b => {
      b.classList.add('fade-out');
      setTimeout(() => b.remove(), 300);
    });
    this.bubbles = [];
    this.placedRects = [];
  }

  // 更新轮次指示器
  updateRoundIndicator() {
    const indicator = document.getElementById('round-indicator');
    if (indicator) {
      indicator.textContent = `第 ${this.round} / ${this.maxRounds} 轮`;
    }
  }

  // 重置
  reset() {
    this.clearBubbles();
    this.selectedWords = [];
    this.round = 0;
    this.selectedThisRound = 0;
    this.usedGroups.clear();
    const indicator = document.getElementById('selected-words');
    if (indicator) indicator.innerHTML = '';
  }
}
