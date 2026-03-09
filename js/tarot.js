// 塔罗牌数据（完整 78 张）
const TAROT_CARDS = [
  // 大阿尔卡纳 22 张
  { id: 0, numeral: '0', name: '愚者', en: 'The Fool', keywords: '自由、冒险、未知', image: '0愚人.png' },
  { id: 1, numeral: 'I', name: '魔术师', en: 'The Magician', keywords: '创造、意志、开始', image: '1魔术师.png' },
  { id: 2, numeral: 'II', name: '女祭司', en: 'The High Priestess', keywords: '直觉、神秘、沉默', image: '2女祭司.png' },
  { id: 3, numeral: 'III', name: '女皇', en: 'The Empress', keywords: '丰盈、温柔、滋养', image: '3皇后.png' },
  { id: 4, numeral: 'IV', name: '皇帝', en: 'The Emperor', keywords: '权威、秩序、守护', image: '4皇帝.png' },
  { id: 5, numeral: 'V', name: '教皇', en: 'The Hierophant', keywords: '传统、信仰、指引', image: '5教皇.png' },
  { id: 6, numeral: 'VI', name: '恋人', en: 'The Lovers', keywords: '选择、爱、连结', image: '6恋人.png' },
  { id: 7, numeral: 'VII', name: '战车', en: 'The Chariot', keywords: '前进、决心、征服', image: '7战车.png' },
  { id: 8, numeral: 'VIII', name: '力量', en: 'Strength', keywords: '勇气、耐心、柔韧', image: '8力量.png' },
  { id: 9, numeral: 'IX', name: '隐者', en: 'The Hermit', keywords: '独处、内省、寻找', image: '9隐士.png' },
  { id: 10, numeral: 'X', name: '命运之轮', en: 'Wheel of Fortune', keywords: '转变、循环、机遇', image: '10命运之轮.png' },
  { id: 11, numeral: 'XI', name: '正义', en: 'Justice', keywords: '公平、真相、因果', image: '11正义.png' },
  { id: 12, numeral: 'XII', name: '倒吊人', en: 'The Hanged Man', keywords: '等待、牺牲、换个角度', image: '12倒吊人.png' },
  { id: 13, numeral: 'XIII', name: '死神', en: 'Death', keywords: '结束、转化、重生', image: '13死神.png' },
  { id: 14, numeral: 'XIV', name: '节制', en: 'Temperance', keywords: '平衡、调和、耐心', image: '14节制.png' },
  { id: 15, numeral: 'XV', name: '恶魔', en: 'The Devil', keywords: '束缚、欲望、阴影', image: '15恶魔.png' },
  { id: 16, numeral: 'XVI', name: '塔', en: 'The Tower', keywords: '崩塌、觉醒、真相', image: '16塔.png' },
  { id: 17, numeral: 'XVII', name: '星星', en: 'The Star', keywords: '希望、灵感、治愈', image: '17星星.png' },
  { id: 18, numeral: 'XVIII', name: '月亮', en: 'The Moon', keywords: '幻觉、不安、潜意识', image: '18月亮.png' },
  { id: 19, numeral: 'XIX', name: '太阳', en: 'The Sun', keywords: '快乐、活力、光明', image: '19太阳.png' },
  { id: 20, numeral: 'XX', name: '审判', en: 'Judgement', keywords: '觉醒、召唤、重新开始', image: '20审判.png' },
  { id: 21, numeral: 'XXI', name: '世界', en: 'The World', keywords: '完成、圆满、旅程', image: '21世界.png' },
  // 权杖 14 张
  { id: 22, numeral: 'A', name: '权杖王牌', en: 'Ace of Wands', keywords: '灵感、新开始、潜力', image: '权杖1.png' },
  { id: 23, numeral: 'II', name: '权杖二', en: 'Two of Wands', keywords: '计划、决定、远方', image: '权杖2.png' },
  { id: 24, numeral: 'III', name: '权杖三', en: 'Three of Wands', keywords: '展望、等待、进展', image: '权杖3.png' },
  { id: 25, numeral: 'IV', name: '权杖四', en: 'Four of Wands', keywords: '庆祝、归属、安定', image: '权杖4.png' },
  { id: 26, numeral: 'V', name: '权杖五', en: 'Five of Wands', keywords: '冲突、竞争、混乱', image: '权杖5.png' },
  { id: 27, numeral: 'VI', name: '权杖六', en: 'Six of Wands', keywords: '胜利、认可、自信', image: '权杖6.png' },
  { id: 28, numeral: 'VII', name: '权杖七', en: 'Seven of Wands', keywords: '坚守、挑战、勇气', image: '权杖7.png' },
  { id: 29, numeral: 'VIII', name: '权杖八', en: 'Eight of Wands', keywords: '迅速、行动、消息', image: '权杖8.png' },
  { id: 30, numeral: 'IX', name: '权杖九', en: 'Nine of Wands', keywords: '坚持、警惕、疲惫', image: '权杖9.png' },
  { id: 31, numeral: 'X', name: '权杖十', en: 'Ten of Wands', keywords: '重担、责任、压力', image: '权杖10.png' },
  { id: 32, numeral: 'Pg', name: '权杖侍从', en: 'Page of Wands', keywords: '热情、探索、消息', image: '权杖侍从.png' },
  { id: 33, numeral: 'Kn', name: '权杖骑士', en: 'Knight of Wands', keywords: '冒险、冲动、行动', image: '权杖骑士.png' },
  { id: 34, numeral: 'Q', name: '权杖王后', en: 'Queen of Wands', keywords: '自信、温暖、魅力', image: '权杖王后.png' },
  { id: 35, numeral: 'K', name: '权杖国王', en: 'King of Wands', keywords: '领导、远见、果断', image: '权杖国王.png' },
  // 圣杯 14 张
  { id: 36, numeral: 'A', name: '圣杯王牌', en: 'Ace of Cups', keywords: '新感情、直觉、爱', image: '圣杯1.png' },
  { id: 37, numeral: 'II', name: '圣杯二', en: 'Two of Cups', keywords: '连结、吸引、伙伴', image: '圣杯2.png' },
  { id: 38, numeral: 'III', name: '圣杯三', en: 'Three of Cups', keywords: '友谊、庆祝、欢聚', image: '圣杯3.png' },
  { id: 39, numeral: 'IV', name: '圣杯四', en: 'Four of Cups', keywords: '倦怠、冷漠、反思', image: '圣杯4.png' },
  { id: 40, numeral: 'V', name: '圣杯五', en: 'Five of Cups', keywords: '失落、遗憾、悲伤', image: '圣杯5.png' },
  { id: 41, numeral: 'VI', name: '圣杯六', en: 'Six of Cups', keywords: '回忆、童年、怀旧', image: '圣杯6.png' },
  { id: 42, numeral: 'VII', name: '圣杯七', en: 'Seven of Cups', keywords: '幻想、选择、迷惑', image: '圣杯7.png' },
  { id: 43, numeral: 'VIII', name: '圣杯八', en: 'Eight of Cups', keywords: '离开、放下、寻找', image: '圣杯8.png' },
  { id: 44, numeral: 'IX', name: '圣杯九', en: 'Nine of Cups', keywords: '满足、愿望、幸福', image: '圣杯9.png' },
  { id: 45, numeral: 'X', name: '圣杯十', en: 'Ten of Cups', keywords: '圆满、家庭、和谐', image: '圣杯10.png' },
  { id: 46, numeral: 'Pg', name: '圣杯侍从', en: 'Page of Cups', keywords: '直觉、创意、消息', image: '圣杯侍从.png' },
  { id: 47, numeral: 'Kn', name: '圣杯骑士', en: 'Knight of Cups', keywords: '浪漫、追求、理想', image: '圣杯骑士.png' },
  { id: 48, numeral: 'Q', name: '圣杯王后', en: 'Queen of Cups', keywords: '温柔、共情、直觉', image: '圣杯王后.png' },
  { id: 49, numeral: 'K', name: '圣杯国王', en: 'King of Cups', keywords: '沉稳、智慧、包容', image: '圣杯国王.png' },
  // 宝剑 14 张
  { id: 50, numeral: 'A', name: '宝剑王牌', en: 'Ace of Swords', keywords: '真相、突破、清晰', image: '宝剑1.png' },
  { id: 51, numeral: 'II', name: '宝剑二', en: 'Two of Swords', keywords: '犹豫、僵局、回避', image: '宝剑2.png' },
  { id: 52, numeral: 'III', name: '宝剑三', en: 'Three of Swords', keywords: '心碎、伤痛、分离', image: '宝剑3.png' },
  { id: 53, numeral: 'IV', name: '宝剑四', en: 'Four of Swords', keywords: '休息、恢复、沉思', image: '宝剑4.png' },
  { id: 54, numeral: 'V', name: '宝剑五', en: 'Five of Swords', keywords: '冲突、输赢、代价', image: '宝剑5.png' },
  { id: 55, numeral: 'VI', name: '宝剑六', en: 'Six of Swords', keywords: '过渡、离开、平静', image: '宝剑6.png' },
  { id: 56, numeral: 'VII', name: '宝剑七', en: 'Seven of Swords', keywords: '策略、隐瞒、独行', image: '宝剑7.png' },
  { id: 57, numeral: 'VIII', name: '宝剑八', en: 'Eight of Swords', keywords: '困住、无力、自我限制', image: '宝剑8.png' },
  { id: 58, numeral: 'IX', name: '宝剑九', en: 'Nine of Swords', keywords: '焦虑、噩梦、担忧', image: '宝剑9.png' },
  { id: 59, numeral: 'X', name: '宝剑十', en: 'Ten of Swords', keywords: '终结、触底、释然', image: '宝剑10.png' },
  { id: 60, numeral: 'Pg', name: '宝剑侍从', en: 'Page of Swords', keywords: '好奇、观察、敏锐', image: '宝剑侍从.png' },
  { id: 61, numeral: 'Kn', name: '宝剑骑士', en: 'Knight of Swords', keywords: '果断、急切、直接', image: '宝剑骑士.png' },
  { id: 62, numeral: 'Q', name: '宝剑王后', en: 'Queen of Swords', keywords: '独立、理性、清醒', image: '宝剑王后.png' },
  { id: 63, numeral: 'K', name: '宝剑国王', en: 'King of Swords', keywords: '权威、逻辑、公正', image: '宝剑国王.png' },
  // 星币 14 张
  { id: 64, numeral: 'A', name: '星币王牌', en: 'Ace of Pentacles', keywords: '机会、财富、新起点', image: '星币1.png' },
  { id: 65, numeral: 'II', name: '星币二', en: 'Two of Pentacles', keywords: '平衡、灵活、取舍', image: '星币2.png' },
  { id: 66, numeral: 'III', name: '星币三', en: 'Three of Pentacles', keywords: '合作、技艺、建设', image: '星币3.png' },
  { id: 67, numeral: 'IV', name: '星币四', en: 'Four of Pentacles', keywords: '稳定、控制、保守', image: '星币4.png' },
  { id: 68, numeral: 'V', name: '星币五', en: 'Five of Pentacles', keywords: '困难、孤立、匮乏', image: '星币5.png' },
  { id: 69, numeral: 'VI', name: '星币六', en: 'Six of Pentacles', keywords: '慷慨、分享、公平', image: '星币6.png' },
  { id: 70, numeral: 'VII', name: '星币七', en: 'Seven of Pentacles', keywords: '耐心、等待、收获', image: '星币7.png' },
  { id: 71, numeral: 'VIII', name: '星币八', en: 'Eight of Pentacles', keywords: '专注、打磨、勤勉', image: '星币8.png' },
  { id: 72, numeral: 'IX', name: '星币九', en: 'Nine of Pentacles', keywords: '独立、丰盛、享受', image: '星币9.png' },
  { id: 73, numeral: 'X', name: '星币十', en: 'Ten of Pentacles', keywords: '传承、富足、家族', image: '星币10.png' },
  { id: 74, numeral: 'Pg', name: '星币侍从', en: 'Page of Pentacles', keywords: '学习、踏实、机遇', image: '星币侍从.png' },
  { id: 75, numeral: 'Kn', name: '星币骑士', en: 'Knight of Pentacles', keywords: '稳重、坚持、务实', image: '星币骑士.png' },
  { id: 76, numeral: 'Q', name: '星币王后', en: 'Queen of Pentacles', keywords: '务实、关怀、安全', image: '星币王后.png' },
  { id: 77, numeral: 'K', name: '星币国王', en: 'King of Pentacles', keywords: '成功、慷慨、稳健', image: '星币国王.png' },
];

class TarotDeck {
  constructor() {
    this.currentCard = null;
    this.currentMood = '';
  }

  drawCard() {
    const base = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    const reversed = Math.random() < 0.5;
    this.currentCard = { ...base, reversed };
    return this.currentCard;
  }

  async getMood(question) {
    const card = this.currentCard;
    const res = await fetch('/api/tarot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question || '',
        card: card.name,
        keywords: card.keywords,
        reversed: card.reversed,
      }),
    });

    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    this.currentMood = data.mood;
    return data.mood;
  }

  getFallbackMood() {
    const fallbacks = [
      '此刻无话可说，但你看到这张牌了。',
      '有些事情正在发生，你感觉到了吗。',
      '不需要解释。你会懂的。',
      '我抽到了这张。就是这样。',
      '看着它，你就知道了。',
    ];
    this.currentMood = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return this.currentMood;
  }
}
