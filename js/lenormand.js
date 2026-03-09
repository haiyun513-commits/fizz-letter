// 雷诺曼牌数据（36 张 + 修饰义）
const LENORMAND_CARDS = [
  { id: 1, name: '骑士', en: 'The Rider', keywords: '消息、到来、速度', modifier: '迅速的、带来消息的', image: '1 骑士.png' },
  { id: 2, name: '幸运草', en: 'The Clover', keywords: '小幸运、机遇、轻松', modifier: '轻松的、短暂的', image: '2 幸运草.png' },
  { id: 3, name: '船', en: 'The Ship', keywords: '远方、旅途、离别', modifier: '远离的、变化中的', image: '3 船.png' },
  { id: 4, name: '房屋', en: 'The House', keywords: '家、安全、稳定', modifier: '稳定的、私密的', image: '4 房屋.png' },
  { id: 5, name: '树', en: 'The Tree', keywords: '健康、成长、根基', modifier: '缓慢生长的、深层的', image: '5 树.png' },
  { id: 6, name: '云', en: 'The Clouds', keywords: '困惑、不确定、迷雾', modifier: '不清晰的、隐藏的', image: '6 云.png' },
  { id: 7, name: '蛇', en: 'The Snake', keywords: '诱惑、纠缠、欲望', modifier: '曲折的、欺骗性的', image: '7 蛇.png' },
  { id: 8, name: '棺材', en: 'The Coffin', keywords: '结束、告别、转化', modifier: '终结的、转化中的', image: '8 棺材.png' },
  { id: 9, name: '花束', en: 'The Bouquet', keywords: '礼物、喜悦、赞美', modifier: '美好的、被欣赏的', image: '9 花束.png' },
  { id: 10, name: '镰刀', en: 'The Scythe', keywords: '突变、警告、切断', modifier: '突然的、切断的', image: '10 镰刀.png' },
  { id: 11, name: '鞭子', en: 'The Whip', keywords: '争论、对话、反复', modifier: '反复的、冲突的', image: '11 鞭子.png' },
  { id: 12, name: '鸟', en: 'The Birds', keywords: '交流、焦虑、喧闹', modifier: '不安的、喧嚷的', image: '12 鸟.png' },
  { id: 13, name: '孩童', en: 'The Child', keywords: '新开始、纯真、小事', modifier: '小的、天真的', image: '13 孩童.png' },
  { id: 14, name: '狐狸', en: 'The Fox', keywords: '谨慎、策略、怀疑', modifier: '狡猾的、自我保护的', image: '14 狐狸.png' },
  { id: 15, name: '熊', en: 'The Bear', keywords: '力量、保护、权威', modifier: '强大的、掌控的', image: '15 熊.png' },
  { id: 16, name: '星星', en: 'The Stars', keywords: '希望、灵感、方向', modifier: '灵性的、有指引的', image: '16 星星.png' },
  { id: 17, name: '鹳鸟', en: 'The Stork', keywords: '变化、迁移、新阶段', modifier: '过渡中的、循环的', image: '17 鹳鸟.png' },
  { id: 18, name: '狗', en: 'The Dog', keywords: '忠诚、友谊、信任', modifier: '忠实的、可信赖的', image: '18 狗.png' },
  { id: 19, name: '塔', en: 'The Tower', keywords: '孤独、权威、隔离', modifier: '隔离的、官方的', image: '19 塔.png' },
  { id: 20, name: '花园', en: 'The Garden', keywords: '社交、公开、人群', modifier: '众人的、公开的', image: '20 花园.png' },
  { id: 21, name: '山', en: 'The Mountain', keywords: '阻碍、困难、等待', modifier: '被阻挡的、延迟的', image: '21 山.png' },
  { id: 22, name: '十字路口', en: 'The Crossroad', keywords: '选择、犹豫、可能', modifier: '犹豫的、有多条路的', image: '22 十字路口.png' },
  { id: 23, name: '老鼠', en: 'The Mice', keywords: '流失、消耗、担忧', modifier: '逐渐减少的、损耗的', image: '23 老鼠.png' },
  { id: 24, name: '心', en: 'The Heart', keywords: '爱、温柔、感情', modifier: '温柔的、充满感情的', image: '24 心.png' },
  { id: 25, name: '戒指', en: 'The Ring', keywords: '承诺、约定、循环', modifier: '绑定的、循环的', image: '25 戒指.png' },
  { id: 26, name: '书', en: 'The Book', keywords: '秘密、知识、未知', modifier: '未知的、隐藏的', image: '26 书.png' },
  { id: 27, name: '信', en: 'The Letter', keywords: '消息、文字、沟通', modifier: '书面的、正式的', image: '27 信.png' },
  { id: 28, name: '男人', en: 'The Man', keywords: '男性、他、阳性能量', modifier: '与他相关的', image: '28 男人.png' },
  { id: 29, name: '女人', en: 'The Woman', keywords: '女性、她、阴性能量', modifier: '与她相关的', image: '29 女人.png' },
  { id: 30, name: '百合', en: 'The Lily', keywords: '和谐、纯洁、成熟', modifier: '平静的、成熟的', image: '30 百合.png' },
  { id: 31, name: '太阳', en: 'The Sun', keywords: '成功、快乐、光明', modifier: '光明的、温暖的', image: '31 太阳.png' },
  { id: 32, name: '月亮', en: 'The Moon', keywords: '情感、直觉、潜意识', modifier: '感性的、梦幻的', image: '32 月亮.png' },
  { id: 33, name: '钥匙', en: 'The Key', keywords: '答案、确定、解锁', modifier: '关键的、解锁的', image: '33 钥匙.png' },
  { id: 34, name: '鱼', en: 'The Fish', keywords: '丰盛、流动、价值', modifier: '充裕的、流动的', image: '34 鱼.png' },
  { id: 35, name: '锚', en: 'The Anchor', keywords: '稳定、坚持、扎根', modifier: '扎根的、不动摇的', image: '35 锚.png' },
  { id: 36, name: '十字架', en: 'The Cross', keywords: '命运、负担、信仰', modifier: '沉重的、注定的', image: '36 十字架.png' },
];

class LenormandDeck {
  constructor() {
    this.currentCards = [];
    this.currentReading = '';
  }

  drawCards(count = 3) {
    const shuffled = [...LENORMAND_CARDS].sort(() => Math.random() - 0.5);
    this.currentCards = shuffled.slice(0, count);
    return this.currentCards;
  }

  async getReading(question) {
    const cards = this.currentCards;
    const res = await fetch('/api/lenormand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question || '',
        cards: cards.map(c => ({ name: c.name, keywords: c.keywords, modifier: c.modifier })),
      }),
    });
    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    this.currentReading = data.reading;
    return data.reading;
  }

  getFallbackReading() {
    const fallbacks = [
      '两个符号交汇在一起。你看到了什么，就是什么。',
      '信号已经给出。剩下的，你比谁都清楚。',
      '有些事不需要翻译。你心里早就知道了。',
      '远方传来两个字。闭上眼，你就能读懂。',
      '这两张牌之间，藏着一句没说出口的话。',
    ];
    this.currentReading = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return this.currentReading;
  }
}
