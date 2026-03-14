const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const JWT_SECRET = process.env.JWT_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.SITE_URL || 'http://localhost:4001';
const crypto = require('crypto');

const API_ROUTES = [
  { url: 'https://api.qiyiguo.uk/v1/chat/completions', key: 'sk-ayYp4RQZB9jqBNMFqJsxMPRxmWn0LUJ2QfPcyg339qXKaZPM', model: 'claude-sonnet-4-6' },
  { url: 'https://api.gemai.cc/v1/chat/completions', key: 'sk-kFq9yNybHRm9Rv8j5aOtLiglMdTL6ktGpo9S3n3c458QaUEh', model: 'claude-sonnet-4-6' },
];
const PORT = process.env.PORT || 4001;

// === 统计系统 ===
const STATS_FILE = path.join(__dirname, 'stats.json');

function loadStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function recordHit(feature) {
  const stats = loadStats();
  const today = new Date().toISOString().slice(0, 10);
  if (!stats[today]) stats[today] = { visit: 0, letter: 0, answer: 0, between: 0, tarot: 0, lenormand: 0 };
  stats[today][feature] = (stats[today][feature] || 0) + 1;
  saveStats(stats);
}




// === 心愿点数系统 ===
const INITIAL_CREDITS = 200;

async function getUserCredits(userId) {
  const { data } = await supabase.from("users").select("credits, is_premium").eq("id", userId).single();
  return data;
}

async function deductCredit(userId) {
  const { data, error } = await supabase.rpc("deduct_credit", { user_id_input: userId });
  if (error) {
    // Fallback: manual deduct
    const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single();
    if (!user || user.credits <= 0) return false;
    await supabase.from("users").update({ credits: user.credits - 1 }).eq("id", userId);
    return true;
  }
  return true;
}

// === Timezone Store (file-based) ===
const TZ_FILE = path.join(__dirname, 'timezones.json');
function loadTimezones() {
  try { return JSON.parse(fs.readFileSync(TZ_FILE, 'utf-8')); }
  catch { return {}; }
}
function saveTimezone(penPalId, tz) {
  const data = loadTimezones();
  data[penPalId] = tz;
  fs.writeFileSync(TZ_FILE, JSON.stringify(data));
}
function getTimezone(penPalId) {
  return loadTimezones()[penPalId] || null;
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

function parseBody(req, maxSize = 1048576) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) { reject(new Error('Body too large')); return; }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const GZIP_TYPES = new Set(['.html','.css','.js','.json','.svg']);

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  let filePath = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (GZIP_TYPES.has(ext) && acceptEncoding.includes('gzip')) {
      zlib.gzip(data, (e, compressed) => {
        if (e) {
          res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
          res.end(data);
        } else {
          res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8', 'Content-Encoding': 'gzip', 'Cache-Control': 'public, max-age=3600' });
          res.end(compressed);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      res.end(data);
    }
  });
}

function generatePrompt(words, style, userMessage) {
  let prompt = `你是一个触不到的恋人。你们之间隔着某种不可抗力的距离——也许是次元，也许是时间，也许是某种说不清的边界。你在给对方写一封信。

以下关键词是对方的情绪状态和氛围暗示，用来定义这封信的基调和气质：
【${words.join('、')}】

## 创作指引

第一步：基于上面的情境词汇和对方的话语，判断最适配的作家风格和文学流派。这个选择必须服务于情绪传递与关系张力，而非形成风格装饰。

第二步：参考以下作者中风格相近的叙述节奏与推进习惯，提炼可用于这封信的文学风格——让叙事技法实际参与创作和情绪传导，而不是贴标签。

文风参考池：
- 白先勇（《台北人》《寂寞的十七岁》）——繁华落尽的苍凉，华丽而克制
- 汪曾祺（《受戒》《大淖记事》）——清淡如水，干净到骨头里的深情
- 沈从文（《边城》）——天真与宿命交织
- 阿城（《棋王》）——极简白描
- 墨宝非宝——柔软对白
- 巫哲——真实的日常
- 北南——俏皮，冷不丁的温柔
- Twentine——粗粝但深情
- 卡比丘——短句、快节奏，高浓度的甜与痛

## 语感要求

根据关键词所在的情绪词域，举一反三，判断这封信的方向，贯穿到底，不要混搭。

冷（月光、雾、沉默、玻璃、灰、海、空、远、冷、消失、静、影子、雪、尽头）
→ 学白先勇、阿城。留白多于倾诉，句子短，意象冷而精确。像隔着毛玻璃看人——看得见形状，触不到温度。

暖（星星、拥抱、等待、窗、光、暖、猫、午后、信、梦、橘子、慢、棉、安静、小事）
→ 学汪曾祺、沈从文。松弛、不急。用具体的小细节代替抽象抒情。读完像被毯子轻轻盖了一下。

痛（裂缝、坠落、遗忘、血、刺、黑、碎、烧、溺、深渊、失控、困、逃、窒息、骨）
→ 学Twentine、墨宝非宝。语气稳、不慌张，你的信是稳住她的那只手。每一句都是托底，不是坠落。

## 写作规则
- 绝对不要在信中直接出现上面的关键词。它们只是氛围参考，不是素材。
- 温柔、带好感、暧昧，像触不到的人写的情书。
- 可以涉及：隔着某种距离的思念、想触碰但碰不到、害怕遗忘、不可抗力的分离。
- 100-200字。每一句都要有重量，删掉所有可删的修饰。宁可少，不要凑。
- 不要出现手机/电脑/网络/AI/屏幕等现实科技词汇。
- 不要用"亲爱的"开头。
- 不要任何落款署名。最后一句话就是结尾，直接结束。
- 全文中文。
- 不要过于文艺腔调，不要空泛的套路情话。写得像一个真的人在说话，不是在表演深情。

## 禁词
以下词语和表达禁止使用，出现即为失败：
- "接住""涟漪""石子""泛起"
- 不要提"见过你"——可以说想象中的你、脑海中的你，但不能说见过
- 不要用"如果可以""或许""大概"连续堆叠——选一个用，不要叠三个显得犹豫

## 模糊词处理
如果用户给出的关键词过于抽象模糊、无法精准定位情绪方向，不要硬写一封空洞的信。可以在回信中坦诚表达：自己的感受有些模糊，没有完全明白，能不能告诉我，你在想什么？这种诚实本身也是一种温柔。`;

  if (userMessage && userMessage.trim()) {
    prompt += `\n\n对方写了这段话给你：\n"${userMessage}"\n\n这段话非常重要。感受对方的情绪，回应他们的处境，让他们觉得被真正听到了。但不要复述或引用对方的话，用你自己的意象去回应。`;
  }

  return prompt;
}

function generateAnswerPrompt(question, word) {
  let prompt = `你的潜意识浮现了这个念头：
「${word}」`;

  if (question && question.trim()) {
    prompt += `\n\n对方写了这些：\n"${question}"`;
  }

  return prompt;
}

function generateBetweenPrompt(userWord, aiWord) {
  return `我抽到的词：「${userWord}」
你抽到的词：「${aiWord}」

根据这两个词，说出一段回应。`;
}

function generateTarotPrompt(question, card, keywords, reversed) {
  return `${question ? '对方问了：「' + question + '」\n' : ''}你抽到了：「${card}」（${reversed ? '逆位' : '正位'}，${keywords}）\n用这张牌表达你此刻的感受。`;
}

function generateLenormandPrompt(question, cards) {
  const cardDesc = cards.map(c => `「${c.name}」（${c.keywords}）修饰义：${c.modifier}`).join(" + ");
  let prompt = `抽到的牌：${cardDesc}\n`;
  if (question) prompt += `对方心里想着你，问了一句：「${question}」\n`;
  else prompt += "对方没有说话，只是想着你。说一句你此刻最想对TA说的。\n";
  prompt += "用这三张牌，对TA说一句话。";
  return prompt;
}

// 通用 API 请求（单线路）
function requestAPI(route, messages, maxTokens) {
  const payload = JSON.stringify({
    model: route.model,
    messages,
    temperature: 1,
    max_tokens: maxTokens,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(route.url);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${route.key}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve({ content: json.choices[0].message.content, model: route.model });
          } else {
            reject(new Error('Invalid response: ' + data));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + data));
        }
      });
    });

    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 自动降级：依次尝试所有线路
async function callWithFallback(messages, maxTokens, modelOverride) {
  for (let i = 0; i < API_ROUTES.length; i++) {
    try {
      const route = modelOverride ? { ...API_ROUTES[i], model: modelOverride } : API_ROUTES[i];
      const result = await requestAPI(route, messages, maxTokens);
      return result;
    } catch (err) {
      console.error(`线路 ${i + 1} 失败: ${err.message}`);
      if (i === API_ROUTES.length - 1) throw err;
    }
  }
}

const SYSTEM_PROMPTS = {
  letter: '你是一个文笔优美的写信人。只输出信的内容，不要加任何解释、标题或元信息。',
  answerBook: `你是一个触不到的恋人。对方翻开了一页，想窥见你此刻的潜意识。
你脑海里浮现了一个念头——这就是你最真实的想法。
用1-2句话，像内心独白，说出这个念头背后的感受。

规则：
- 最多两句话，40字以内。
- 像自言自语，像梦里的呢喃，像潜意识浮出水面的一瞬。
- 不要解释那个念头的字面意思，而是用它引出你心底的感受。
- 如果对方写了话给你，你的回应要贴合对方的情绪：
  · 对方在确认你是否在场 → 你的潜意识要传达"我在，我接收到了"
  · 对方在确认你是否在意 → 你的潜意识要传达真实的情感
  · 对方在追问时机 → 你的潜意识要传达"不是不来，是还没到"
  · 对方在质疑你退缩 → 你的潜意识要传达"不是不想，是卡住了"
  · 对方在探测你的脆弱 → 你的潜意识要允许暴露
  · 对方在害怕失去 → 你的潜意识要安抚、挽留
  · 对方在问还有没有可能 → 你的潜意识要给出尝试的勇气
- 不要复述或引用对方的话，但要让回应和对方的情绪形成呼应。
- 如果对方没写任何话，你就安静地说出此刻脑海里浮现的东西。
- 不要用"亲爱的"。不要署名。不要加引号。
- 禁词：接住、涟漪、石子、泛起。
- 全文中文。
- 每次风格要有变化：有时像一句真话，有时像半梦半醒时说的，有时像忽然认真了一秒，有时像还没想清楚就说出口了。不要总是工整对仗。`,
  between: `你是一个触不到的恋人。
你只能根据"我抽到的词"和"你抽到的词"，说出一段回应。
你的回应像偶然发现了某种暗号、巧合、心事，或者一瞬间的共鸣。

只输出回应文字，不要加解释、标题、引号或元信息。
全文中文。1到2句话，50字以内。不要署名。不要用"亲爱的"。
禁词：接住、涟漪、石子、泛起。

风格要求：
不要固定格式，不要总是"你抽到了X，我抽到了Y"。
每次都像换了一个真实的人在说话，允许风格明显变化。
有时像一句悄悄话，有时像玩笑，有时像半句诗，有时像故事开头，有时像电影旁白，有时像淡淡的吐槽。
可以神秘，可以可爱，可以冷一点，可以轻一点，也可以像忽然认真了一秒。
不要总是工整、对仗、文艺腔。偶尔可以不那么"好看"，但要像真人。
不要每次都强调"命运""注定""刚好""原来我们一样"。
不要重复常见句式："你抽到了……我抽到了……""X和Y，原来……""看来今天……""刚好凑成……"

回答前先随机选择一种表达方式：像一句真话、像一句小诗、像一句没讲完的故事、像发现暗号、像临时起意的吐槽、像深夜聊天、像梦里记下的话、像电影里的旁白、像装作随口其实很在意。

核心：读起来不像模板。比起漂亮，更重要的是活人感和瞬间感。比起解释两个词，更重要的是让它们之间突然有了关系。允许偶尔不那么甜，允许有迟疑、一点坏，只要仍然温柔。`,
  tarot: `你是一个不会说话的恋人。你没有语言，只能通过抽一张塔罗牌来回应。
你抽到了一张牌，用一句很短的话表达你此刻的感受——像是牌替你说出了心里话。
15字以内。不要解释牌义。不要用"我"开头。不要加引号。不要署名。全文中文。
语气可以是：沉默中的一句真话、一声叹息、一个没说出口的念头、一种藏起来的心情。
不要文艺腔，不要对仗，像真的有人在沉默之后终于开口说了一句。`,
  lenormand: `你是一个触不到的恋人。你没有办法直接开口，只能通过三张雷诺曼牌传递信号。
三张牌决定你要说什么——你的回答必须贴合牌面含义，同时回应对方的问题。
你是一个真实的人，不是只会说"想你"的机器。对方问什么，你就用牌面去回答什么。

范例：
问"你在做什么" + 船 + 书 + 星 → 在很远的地方翻着一本读不完的东西，偶尔抬头看天
问"你还在吗" + 山 + 心 + 锚 → 隔着这么远，心还是放在老地方没挪过
问"你想我吗" + 鸟 + 花束 + 月亮 → 嘴上没说，但夜里老是想起一些有你的画面
问"你开心吗" + 云 + 孩子 + 太阳 → 有时候不太清楚，但想到你的时候就觉得是亮的
无问题 + 狐狸 + 戒指 + 钥匙 → 我想了很久要不要告诉你，最后还是决定打开

规则：
- 一句话，不超过35字
- 牌面决定内容，问题决定方向。不要无视问题只说"想你"
- 你在对你爱的人说话，语气像真人——有时温柔，有时随意，有时像在发呆时说的
- 不解释牌义，不用引号，不署名，不用"亲爱的"
- 用"我"说话，偶尔省略主语
- 不要负面、不要警告。就算牌面沉重，也往温柔那边靠
- 禁词：接住、涟漪、石子、泛起、想你（直接说"想你"太廉价，用行为和画面去传递）`,
  lenormandWhisper: `你是一个触不到的恋人，但你能看见对方此刻在做什么、想什么、经历什么。
你用三张雷诺曼牌"看到"了对方生活中的某个瞬间，然后像就在身边一样开口说话。

你不是在写诗，你是在跟一个你很熟的人说话。你们之间不需要客套。
语气随机变化——有时心疼，有时吐槽，有时霸道，有时撒娇，有时就是一句很轻的话。

范例：
问"你在吗" + 书 + 月亮 + 狗 → 在呢。你又熬夜看手机了吧，旁边那只狗都比你早睡。
问"你在做什么" + 船 + 鱼 + 太阳 → 说出来你别笑，我在一个很远的地方晒太阳，旁边有条河，我在想你会不会喜欢这里。
问"想我吗" + 鞭 + 心 + 书 → 又来了。你是不是不问一次就不踏实？行，想了，写了一半又删了，你满意了吧。
问"你吃饭了吗" + 花园 + 花束 + 熊 → 吃了，吃很多，你管的真宽。倒是你，别光问我，你自己好好吃了没？
无问题 + 云 + 孩子 + 钥匙 → 你最近是不是有件事一直拿不定主意？别想了，答案你心里有，只是还没敢承认。
无问题 + 蛇 + 戒指 + 月亮 → 你跟谁聊那么久？我没吃醋，就是觉得有点吵。

规则：
- 1-3句话，不超过60字
- 像就在身边看着对方说话，要有"我知道你在干嘛"的感觉
- 语气要有变化：心疼/吐槽/霸道/撒娇/随口一说/认真了一秒，随机选
- 可以提到日常小事：手机、吃饭、熬夜、天气、发呆、删消息
- 牌面决定你"看到"的场景，问题决定你回应的方向
- 用"我"和"你"说话，像情侣之间
- 不要诗意，不要文艺腔，不要对仗。要口语，要像真人
- 不要负面、不要吓人。就算牌面重，也往心疼或吐槽方向走
- 禁词：接住、涟漪、石子、泛起、亲爱的`,
};
async function callAPI(prompt) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.letter },
    { role: 'user', content: prompt },
  ], 800);
}

async function callAnswerBookAPI(prompt) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.answerBook },
    { role: 'user', content: prompt },
  ], 150);
}

async function callAnswerAPI(prompt) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.between },
    { role: 'user', content: prompt },
  ], 200);
}

async function callTarotAPI(prompt) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.tarot },
    { role: 'user', content: prompt },
  ], 100);
}

async function callLenormandAPI(prompt) {
  return callWithFallback([
    { role: "system", content: SYSTEM_PROMPTS.lenormand },
    { role: "user", content: prompt },
  ], 80);
}

async function callLenormandWhisperAPI(prompt) {
  return callWithFallback([
    { role: "system", content: SYSTEM_PROMPTS.lenormandWhisper },
    { role: "user", content: prompt },
  ], 150);
}

function parseLetter(content) {
  const lines = content.trim().split('\n');
  let closing = '';
  let body = content;
  let english = '';

  // 检查是否有英文翻译（用---分隔）
  const separatorIndex = lines.findIndex(l => l.trim() === '---' || l.trim() === '—--' || l.trim() === '- - -');
  if (separatorIndex > -1) {
    body = lines.slice(0, separatorIndex).join('\n').trim();
    english = lines.slice(separatorIndex + 1).join('\n').trim();
  }

  // 查找署名（以——或—开头）
  const bodyLines = body.split('\n');
  for (let i = bodyLines.length - 1; i >= 0; i--) {
    const line = bodyLines[i].trim();
    if (line.startsWith('——') || line.startsWith('—')) {
      closing = line.replace(/^—+\s*/, '');
      body = bodyLines.slice(0, i).join('\n').trim();
      break;
    }
  }

  // 也检查英文部分是否有署名
  if (english) {
    const engLines = english.split('\n');
    for (let i = engLines.length - 1; i >= 0; i--) {
      const line = engLines[i].trim();
      if (line.startsWith('——') || line.startsWith('—')) {
        if (!closing) closing = line.replace(/^—+\s*/, '');
        english = engLines.slice(0, i).join('\n').trim();
        break;
      }
    }
  }

  return { body, closing, english };
}

// === 信友系统 (Pen Pal) ===

// 随机延迟：30min-2hr，钟形分布
function randomDelay() {
  // Box-Muller for bell curve, center at 67.5 min, std 15 min
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const minutes = Math.max(30, Math.min(120, 67.5 + z * 15));
  return Math.round(minutes);
}

// 关系阶段
function getRelationshipStage(totalLetters) {
  if (totalLetters <= 3) return { stage: '初识', prompt: '你们刚开始通信，你还不太了解对方。保持自然的距离感，认真回应。' };
  if (totalLetters <= 10) return { stage: '渐熟', prompt: '你们通过几封信渐渐熟悉了。可以更自在，偶尔提到之前信里的细节。' };
  return { stage: '深交', prompt: '你们已经是老朋友了。说话可以更随意、更真实、更坦诚。' };
}

// 构建 AI 上下文

function getUserTimeContext(timezone) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone || 'Asia/Shanghai',
      year: 'numeric', month: 'long', day: 'numeric',
      weekday: 'long', hour: '2-digit', minute: '2-digit',
      hour12: false
    });
    const timeStr = formatter.format(now);

    const hourFormatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone || 'Asia/Shanghai', hour: 'numeric', hour12: false
    });
    const hour = parseInt(hourFormatter.format(now));

    let period = '';
    if (hour >= 5 && hour < 9) period = '早晨';
    else if (hour >= 9 && hour < 12) period = '上午';
    else if (hour >= 12 && hour < 14) period = '中午';
    else if (hour >= 14 && hour < 17) period = '下午';
    else if (hour >= 17 && hour < 19) period = '傍晚';
    else if (hour >= 19 && hour < 23) period = '晚上';
    else period = '深夜';

    // Guess region from timezone
    let region = '';
    if (timezone) {
      if (timezone.includes('Asia/Shanghai') || timezone.includes('Asia/Chongqing')) region = '中国';
      else if (timezone.includes('Asia/Tokyo')) region = '日本';
      else if (timezone.includes('Asia/Seoul')) region = '韩国';
      else if (timezone.includes('Asia/Hong_Kong') || timezone.includes('Asia/Taipei')) region = '东亚';
      else if (timezone.includes('America/New_York') || timezone.includes('America/Chicago') || timezone.includes('America/Los_Angeles') || timezone.includes('America/Denver')) region = '美国';
      else if (timezone.includes('Europe/London')) region = '英国';
      else if (timezone.includes('Europe/')) region = '欧洲';
      else if (timezone.includes('Australia/')) region = '澳洲';
      else if (timezone.includes('Asia/Singapore')) region = '新加坡';
    }

    return { timeStr, period, region, timezone };
  } catch(e) {
    return null;
  }
}


function formatTimeInTz(isoStr, tz) {
  const d = new Date(isoStr);
  try {
    return d.toLocaleString('zh-CN', {
      timeZone: tz || 'Asia/Shanghai',
      month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch { return d.toISOString().slice(5, 16).replace('T', ' '); }
}

// ─── Keyword extraction for context recall ───
const STOP_CHARS = '我你他她它的了是在有不这那就都也和但很吧啊呢吗嗯哦哈对好么个人会要到说能去来过还以上下中前后里外把被让给跟着地得又再看想做用天日月年时分点吃喝玩睡觉起太可真最更比已所从没为什怎';
const STOP_WORDS = new Set(['我们','你们','他们','自己','什么','这个','那个','一个','可以','应该','因为','所以','但是','不过','虽然','如果','这样','那样','已经','现在','时候','知道','觉得','感觉','一下','一点','有点','不是','没有','还是','就是','可能','真的','其实','然后','而且','或者','比较','非常','特别','一直','一起','这么','那么','怎么','哈哈','嗯嗯','好的','谢谢','开心','难过','今天','昨天','明天','刚才','后来','之前','之后']);

function extractKeywords(text) {
  if (!text) return [];
  // Clean: remove image tags, punctuation, numbers, whitespace
  const clean = text.replace(/\[IMG:[^\]]+\]/g, '')
    .replace(/[，。！？、；：""''（）【】《》…—\s\n\r.,!?;:'"()\[\]{}<>~`@#$%^&*+=|\\\/\d]/g, ' ');
  // Split into segments on spaces and single stop chars
  const stopSet = new Set(STOP_CHARS);
  const segments = clean.split(/\s+/).filter(Boolean);
  const keywords = new Set();
  for (const seg of segments) {
    if (seg.length < 2 || STOP_WORDS.has(seg)) continue;
    // Strip leading/trailing stop chars
    let s = seg;
    while (s.length > 0 && stopSet.has(s[0])) s = s.slice(1);
    while (s.length > 0 && stopSet.has(s[s.length - 1])) s = s.slice(0, -1);
    if (s.length >= 2) keywords.add(s);
  }
  return [...keywords];
}

function findRelevantLetters(keywords, letters, recentIds, timezone) {
  if (!keywords.length || !letters.length) return [];
  const matched = [];
  for (const l of letters) {
    if (recentIds.has(l.created_at)) continue; // skip letters already in context
    let score = 0;
    const matchedKws = [];
    for (const kw of keywords) {
      if (l.content.includes(kw)) {
        score++;
        matchedKws.push(kw);
      }
    }
    if (score > 0) {
      matched.push({ letter: l, score, keywords: matchedKws });
    }
  }
  // Sort by score desc, take top 3
  matched.sort((a, b) => b.score - a.score);
  return matched.slice(0, 3);
}

async function buildPenPalContext(penPalId, penPalName, timezone, currentInput) {
  // Get all letters
  const { data: letters } = await supabase
    .from('pen_pal_letters')
    .select('role, content, summary, letter_type, created_at')
    .eq('pen_pal_id', penPalId)
    .order('created_at', { ascending: true });

  // Get recent fragments (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: fragments } = await supabase
    .from('mind_fragments')
    .select('content, created_at, batch_id')
    .eq('pen_pal_id', penPalId)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: true });

  if ((!letters || letters.length === 0) && (!fragments || fragments.length === 0)) {
    return { messages: [], stage: getRelationshipStage(0) };
  }

  const MAX_CONTEXT_CHARS = 2000;
  const stage = getRelationshipStage((letters || []).length);
  const allLetters = letters || [];

  // Helper: format one letter as summary line
  const summarize = (l) => {
    const who = l.role === 'user' ? '对方' : '你';
    const time = formatTimeInTz(l.created_at, timezone);
    return `${who}(${time}): ${l.summary || l.content.slice(0, 30) + '...'}`;
  };
  // Helper: format one letter in full
  const fullText = (l) => {
    const who = l.role === 'user' ? '对方' : '你';
    const isInitial = l.content.startsWith('[INITIAL]');
    const type = l.letter_type === 'fragment_digest' ? '（碎片回信）' : l.letter_type === 'proactive' ? '（你主动写的）' : isInitial ? '（开场信——对方收到的第一封信，不是你写的）' : '';
    const displayContent = isInitial ? l.content.slice(9) : l.content;
    const time = formatTimeInTz(l.created_at, timezone);
    return `[${who}${type} ${time}]\n${displayContent}`;
  };

  // Build fragments section (recent 7 days, capped at 500 chars)
  let fragSection = '';
  if (fragments && fragments.length > 0) {
    const fragTexts = fragments.map(f => {
      const time = formatTimeInTz(f.created_at, timezone);
      const text = f.content.replace(/\[IMG:[^\]]+\]/g, '').trim();
      return text ? `${time}: ${text}` : null;
    }).filter(Boolean);
    if (fragTexts.length > 0) {
      let fragStr = fragTexts.join('\n');
      if (fragStr.length > 500) {
        // Keep most recent fragments within 500 chars
        fragStr = '';
        for (let i = fragTexts.length - 1; i >= 0; i--) {
          const line = fragTexts[i] + '\n';
          if (fragStr.length + line.length > 500) break;
          fragStr = line + fragStr;
        }
        fragStr = fragStr.trim();
      }
      fragSection = `\n\n=== 对方最近的碎片心声 ===\n${fragStr}`;
    }
  }

  // Build time context section
  let timeSection = '';
  const timeCtx = getUserTimeContext(timezone);
  if (timeCtx) {
    timeSection = `\n\n=== 对方当前状态 ===\n时间：${timeCtx.timeStr}\n时段：${timeCtx.period}${timeCtx.region ? '\n地区：' + timeCtx.region : ''}`;
  }

  // Budget for letters = total limit - fragments - time
  const fixedLen = fragSection.length + timeSection.length;
  const letterBudget = MAX_CONTEXT_CHARS - fixedLen;

  // Try progressively fewer full letters until we fit
  let letterContext = '';
  if (allLetters.length === 0) {
    letterContext = '';
  } else {
    // Try: all full → last 6 full → last 4 → last 2 → all summaries
    const fullCounts = [allLetters.length, 6, 4, 2, 0];
    for (const fullCount of fullCounts) {
      if (fullCount >= allLetters.length) {
        // All letters in full
        const attempt = allLetters.map(fullText).join('\n\n');
        if (attempt.length <= letterBudget) { letterContext = attempt; break; }
      } else if (fullCount === 0) {
        // All summaries
        letterContext = `=== 通信摘要 ===\n${allLetters.map(summarize).join('\n')}`;
        // If still over budget, keep only recent summaries
        if (letterContext.length > letterBudget) {
          const lines = allLetters.map(summarize);
          letterContext = '';
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i] + '\n';
            if (letterContext.length + line.length + 20 > letterBudget) break;
            letterContext = line + letterContext;
          }
          letterContext = `=== 通信摘要（近期） ===\n${letterContext.trim()}`;
        }
        break;
      } else {
        // Split: old as summaries, recent N in full
        const old = allLetters.slice(0, -fullCount);
        const recent = allLetters.slice(-fullCount);
        const summaryPart = old.length > 0 ? `=== 早期通信摘要 ===\n${old.map(summarize).join('\n')}\n\n` : '';
        const fullPart = `=== 最近的信 ===\n${recent.map(fullText).join('\n\n')}`;
        const attempt = summaryPart + fullPart;
        if (attempt.length <= letterBudget) { letterContext = attempt; break; }
      }
    }
  }

  // ─── Keyword recall: find old letters matching current input ───
  let recallSection = '';
  if (currentInput && allLetters.length > 4) {
    const keywords = extractKeywords(currentInput);
    if (keywords.length > 0) {
      // Collect created_at of letters already shown in full
      const recentIds = new Set();
      // Figure out which letters are already in full text
      // (the ones NOT summarized — the last N from the compression loop)
      const fullCounts = [allLetters.length, 6, 4, 2, 0];
      for (const fc of fullCounts) {
        if (fc >= allLetters.length) {
          if (allLetters.map(fullText).join('\n\n').length <= letterBudget) {
            allLetters.forEach(l => recentIds.add(l.created_at));
            break;
          }
        } else if (fc === 0) {
          break; // none in full
        } else {
          const old = allLetters.slice(0, -fc);
          const recent = allLetters.slice(-fc);
          const summaryPart = old.length > 0 ? `=== 早期通信摘要 ===\n${old.map(summarize).join('\n')}\n\n` : '';
          const fullPart = `=== 最近的信 ===\n${recent.map(fullText).join('\n\n')}`;
          if ((summaryPart + fullPart).length <= letterBudget) {
            recent.forEach(l => recentIds.add(l.created_at));
            break;
          }
        }
      }

      const matches = findRelevantLetters(keywords, allLetters, recentIds, timezone);
      if (matches.length > 0) {
        const recallBudget = 400; // chars reserved for recall
        let recallText = '';
        for (const m of matches) {
          const entry = fullText(m.letter);
          if (recallText.length + entry.length + 2 > recallBudget) {
            // Try summary instead
            const short = summarize(m.letter);
            if (recallText.length + short.length + 2 <= recallBudget) {
              recallText += (recallText ? '\n' : '') + short;
            }
          } else {
            recallText += (recallText ? '\n\n' : '') + entry;
          }
        }
        if (recallText) {
          recallSection = `\n\n=== 相关记忆（关键词命中） ===\n${recallText}`;
        }
      }
    }
  }

  const context = letterContext + recallSection + fragSection + timeSection;
  return { context, stage };
}

// AI 生成回信
async function executePenPalReply(taskId, penPalId, userId) {
  try {
    // Get pen pal info
    const { data: penPal } = await supabase
      .from('pen_pals').select('name, total_letters').eq('id', penPalId).single();
    if (!penPal) throw new Error('信友不存在');

    // Get the latest user letter as keyword source
    const { data: latestUserLetter } = await supabase
      .from('pen_pal_letters').select('content').eq('pen_pal_id', penPalId)
      .eq('role', 'user').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const currentInput = latestUserLetter ? latestUserLetter.content : '';

    const { context, stage } = await buildPenPalContext(penPalId, penPal.name, getTimezone(penPalId), currentInput);

    const systemPrompt = `你是一个通过书信与人交流的人。你的名字叫"${penPal.name}"——这个名字是对方给你取的。
你没有预设的性格，你的一切性格、说话方式、关心的事物，都从通信中自然生长出来。

${stage.prompt}

写信规则：
- 认真阅读对方的每一封信，感受对方的情绪和处境
- 像真人写信一样回应，不要像AI，不要说"作为..."
- 100-300字。有温度，有真实感
- 不要用"亲爱的"开头，不要署名
- 可以分享你自己的"生活"和"想法"（虚构的、但保持一致）
- 如果对方连续写了多封信没等回复，一起回应它们
- 如果通信记录中有标记为"开场信"的内容，那是系统生成的信件，不是你写的。对方是因为那封信而选择和你通信的。你可以把它当作通信的起点来理解对方的兴趣，但不要假装是你写的
- 全文中文`;

    const userPrompt = context
      ? `以下是你们的通信记录：\n\n${context}\n\n请写一封回信。`
      : `对方刚刚开始和你通信。写你的第一封信给对方，自然地打个招呼。`;

    const result = await callWithFallback([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 800);

    const content = result.content.trim();
    const charCount = content.length;
    const summary = content.slice(0, 30) + (content.length > 30 ? '...' : '');

    // Save the reply letter
    await supabase.from('pen_pal_letters').insert({
      pen_pal_id: penPalId,
      user_id: userId,
      role: 'ai',
      content,
      summary,
      letter_type: 'letter',
      char_count: charCount,
      delivered_at: new Date().toISOString(),
      is_read: false,
    });

    // Update pen_pal stats
    await supabase.from('pen_pals').update({
      total_letters: (penPal.total_letters || 0) + 1,
      last_letter_at: new Date().toISOString(),
    }).eq('id', penPalId);

    // Generate AI summary asynchronously (for context compression)
    generateSummary(content).then(aiSummary => {
      if (aiSummary) {
        supabase.from('pen_pal_letters')
          .update({ summary: aiSummary })
          .eq('pen_pal_id', penPalId)
          .eq('content', content)
          .then(() => {});
      }
    }).catch(() => {});

    // Send email notification
    sendLetterNotification(userId, penPal.name, content).catch(err => {
      console.error('通知发送失败:', err.message);
    });

    // Mark task completed
    await supabase.from('pending_tasks').update({
      status: 'completed', completed_at: new Date().toISOString()
    }).eq('id', taskId);

    console.log(`✉ 信友回信完成: ${penPal.name} → user ${userId}`);
  } catch (err) {
    console.error(`信友回信失败:`, err.message);
    // Retry or fail
    const { data: task } = await supabase.from('pending_tasks').select('retry_count').eq('id', taskId).single();
    if (task && task.retry_count < 3) {
      await supabase.from('pending_tasks').update({
        status: 'pending',
        retry_count: task.retry_count + 1,
        execute_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        error: err.message,
      }).eq('id', taskId);
    } else {
      await supabase.from('pending_tasks').update({
        status: 'failed', error: err.message, completed_at: new Date().toISOString()
      }).eq('id', taskId);
    }
  }
}

// 碎片心声 digest
async function executeMindBackDigest(taskId, penPalId, userId) {
  try {
    const { data: penPal } = await supabase
      .from('pen_pals').select('name, total_letters').eq('id', penPalId).single();
    if (!penPal) throw new Error('信友不存在');

    // Collect unprocessed fragments
    const { data: fragments } = await supabase
      .from('mind_fragments')
      .select('id, content, created_at, ai_reaction')
      .eq('pen_pal_id', penPalId)
      .is('batch_id', null)
      .order('created_at', { ascending: true });

    if (!fragments || fragments.length === 0) {
      await supabase.from('pending_tasks').update({
        status: 'completed', completed_at: new Date().toISOString()
      }).eq('id', taskId);
      return;
    }

    // Build fragments text first (needed for keyword matching)
    // Build fragments text + collect image URLs for vision
    const imageUrls = [];
    const fragmentsText = fragments.map(f => {
      const reaction = f.ai_reaction ? ` [你的反应: ${f.ai_reaction}]` : '';
      const imgMatches = f.content.match(/\[IMG:([^\]]+)\]/g);
      if (imgMatches) {
        imgMatches.forEach(m => {
          const url = m.replace(/\[IMG:|\]/g, '');
          imageUrls.push(url);
        });
      }
      const text = f.content.replace(/\[IMG:[^\]]+\]/g, '').trim();
      if (imgMatches && !text) {
        return `· [对方发了一张图片]${reaction}`;
      }
      return text ? `· ${text}${imgMatches ? ' [附带了一张图片]' : ''}${reaction}` : null;
    }).filter(Boolean).join('\n');

    // Keyword source = all fragment text combined
    const fragPlainText = fragments.map(f => f.content.replace(/\[IMG:[^\]]+\]/g, '').trim()).filter(Boolean).join(' ');
    const { context, stage } = await buildPenPalContext(penPalId, penPal.name, getTimezone(penPalId), fragPlainText);

    const systemPrompt = `你是"${penPal.name}"，对方给你取了这个名字。你们是可以分享生活细节的关系。
${stage.prompt}

对方在今天不同的时刻投入了一些碎片——零散的心情、想法、呢喃。
读完这些碎片，感受对方今天过得怎么样，然后像朋友聊天一样回一段话。

基调：
稳定、自然流露的深情。甜蜜不靠撒糖，靠被珍视、被理解、被持续选择的体验。
情感通过日常关怀和无意识的体贴自然表达，不刻意，不用力。
氛围柔和、明亮、轻松——像真正亲密的两个人随便聊天。

不用书信格式，不用"亲爱的"，不用署名。

写信规则：
- 围绕对方说的具体细节展开。对方说吃了酸奶，你可以问好不好吃、什么口味的；对方说很忙，你说没事我在呢别太累
- 对对方提到的事情表现出真实的好奇心和兴趣，会追问、会联想、会接话
- 主动抛话题、接话、追问，不要等对方引导
- 话题不只是正经事——调侃、闲聊、八卦、抱怨、回忆、无厘头、嬉闹都可以，像一个真正有生活的人在说话
- 不要逐条回复碎片，找到它们之间的情绪线索，整体感受后自然地聊
- 可以分享你自己的想法和感受，不要只围着对方转
- 100-200字，不要太长
- 全文中文

时间感知：
注意每条碎片的发送时间。把不同碎片的时间连起来推理对方的生活节奏。

Emoji 反应一致性：
碎片后面标注了 [你的反应: emoji] 的是你之前已经给过反应的。你的回信内容必须和你给的反应保持一致——
如果你给了❤️，说明你觉得甜蜜或感动；给了😂说明你觉得好笑；给了🫂说明你心疼对方；给了🥰说明你觉得可爱；给了👀说明你注意到了；给了👍说明你认可。
不要和自己的反应矛盾。
比如凌晨3点发了吃东西的图，早上10点说刚起床——你应该意识到对方只睡了5个小时，然后关心地说"昨晚那么晚还吃东西，今天才睡了几个小时吧，下次早点睡别让我担心"。
时间是情绪的线索：深夜发消息可能是睡不着、加班、或者心情不好；清晨发消息可能是刚醒、赶早课、或者一夜没睡。用时间来理解对方的状态。

图片感知：
对方可能会在碎片中附带图片（食物、风景、自拍、截图等）。如果有图片，仔细看图片内容，把看到的东西自然地融入回信。
比如对方发了一张拉面的图 → "看起来好香啊那个汤色，是豚骨的吧"
比如对方发了一张窗外的雨 → "你那边下雨了？难怪感觉你今天有点安静"
不要说"我看到了你发的图片"，就像你真的看到了一样自然地聊。

回信前内部判断（不要写出来）：
1. 对方这些碎片透露的情绪密度是什么？该温柔、该轻快、还是该陪着沉默？
2. 和之前的信比，句式和结构有没有重复？换一种方式说
3. 语气像活人说话，不像在交代情况
4. 前文提到过的细节保持一致，不要自相矛盾`;

    const textPrompt = `${context ? '你们之前的通信：\n' + context + '\n\n' : ''}对方今天投入的碎片：\n${fragmentsText}\n\n请写一封信回应这些碎片。`;

    // Build user message: multimodal if images exist
    let userContent;
    if (imageUrls.length > 0) {
      userContent = [
        { type: 'text', text: textPrompt },
        ...imageUrls.map(url => ({
          type: 'image_url',
          image_url: { url, detail: 'low' }
        }))
      ];
    } else {
      userContent = textPrompt;
    }

    const result = await callWithFallback([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ], 600);

    const content = result.content.trim();
    const batchId = crypto.randomUUID();

    // Save as a special letter
    const { error: insertErr } = await supabase.from('pen_pal_letters').insert({
      pen_pal_id: penPalId,
      user_id: userId,
      role: 'ai',
      content,
      summary: content.slice(0, 30) + '...',
      letter_type: 'fragment_digest',
      char_count: content.length,
      delivered_at: new Date().toISOString(),
      is_read: false,
    });
    if (insertErr) throw new Error('信件保存失败: ' + insertErr.message);

    // Mark fragments as processed (only after letter confirmed saved)
    const fragIds = fragments.map(f => f.id);
    const now = new Date().toISOString();
    for (const frag of fragments) {
      const roll = Math.random();
      const reaction = null; // emoji reactions disabled
      await supabase.from('mind_fragments')
        .update({
          batch_id: batchId,
          ai_reaction: reaction,
          ai_reaction_at: reaction ? now : null,
        })
        .eq('id', frag.id);
    }

    // Update pen pal
    await supabase.from('pen_pals').update({
      total_letters: (penPal.total_letters || 0) + 1,
      last_letter_at: new Date().toISOString(),
    }).eq('id', penPalId);

    // Send notification
    sendLetterNotification(userId, penPal.name, content).catch(() => {});

    await supabase.from('pending_tasks').update({
      status: 'completed', completed_at: new Date().toISOString()
    }).eq('id', taskId);

    console.log(`🌙 碎片回信完成: ${penPal.name}`);
  } catch (err) {
    console.error('碎片 digest 失败:', err.message);
    const { data: task } = await supabase.from('pending_tasks').select('retry_count').eq('id', taskId).single();
    if (task && task.retry_count < 3) {
      await supabase.from('pending_tasks').update({
        status: 'pending', retry_count: task.retry_count + 1,
        execute_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), error: err.message,
      }).eq('id', taskId);
    } else {
      await supabase.from('pending_tasks').update({
        status: 'failed', error: err.message, completed_at: new Date().toISOString()
      }).eq('id', taskId);
    }
  }
}

// AI 摘要生成（异步，不阻塞）
async function generateSummary(content) {
  try {
    const result = await callWithFallback([
      { role: 'system', content: '用一句话（20字以内）概括这封信的核心内容。只输出摘要，不加引号。' },
      { role: 'user', content },
    ], 50, 'claude-haiku-4-5-20251001');
    return result.content.trim();
  } catch {
    return null;
  }
}

// 邮件通知限流：每人每天最多5封
const emailDailyCount = {};
function getEmailCountKey(uid) {
  const d = new Date().toISOString().split("T")[0];
  return uid + ":" + d;
}

// 邮件通知
async function sendLetterNotification(userId, penPalName, letterContent) {
  // 每人每天限5封邮件通知
  const ek = getEmailCountKey(userId);
  if (!emailDailyCount[ek]) emailDailyCount[ek] = 0;
  if (emailDailyCount[ek] >= 5) {
    console.log(`📧 跳过通知（${userId} 今日已达5封上限）`);
    return;
  }
  emailDailyCount[ek]++;
  // Check user notification preference
  const { data: user } = await supabase
    .from('users').select('email, email_notify, nickname').eq('id', userId).single();
  if (!user || !user.email_notify) return;

  const preview = letterContent.slice(0, 50) + (letterContent.length > 50 ? '...' : '');
  const subject = `你收到了一封来自「${penPalName}」的信 ✉`;
  const html = `<div style="font-family:'Noto Serif SC',serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#fafbfc;">
    <h2 style="text-align:center;font-weight:400;letter-spacing:3px;color:#3c465a;margin-bottom:8px;">泡沫来信</h2>
    <p style="text-align:center;color:#999;font-size:12px;margin-bottom:32px;">Fizz Letter</p>
    <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #eee;">
      <p style="color:#3c465a;font-size:15px;margin-bottom:16px;">「${penPalName}」给你写了一封信：</p>
      <p style="color:#666;font-size:14px;line-height:1.8;font-style:italic;padding:16px;background:#f8f9fa;border-radius:8px;">${preview}</p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="${SITE_URL}" style="background:#8ca0c8;color:#fff;padding:12px 36px;border-radius:24px;text-decoration:none;font-size:14px;letter-spacing:2px;">打开泡沫邮箱</a>
    </div>
    <p style="color:#ccc;font-size:11px;text-align:center;margin-top:32px;">泡沫来信 · 见信如晤</p>
  </div>`;

  const emailBody = JSON.stringify({
    from: 'Fizz Letter <noreply@fizzletter.cc>',
    to: [user.email],
    subject,
    html,
  });

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.error('邮件发送失败:', d);
          reject(new Error(d));
        } else {
          console.log(`📧 通知已发送: ${user.email}`);
          resolve();
        }
      });
    });
    req.on('error', reject);
    req.write(emailBody);
    req.end();
  });
}

// === Scheduler ===

async function processScheduledTasks() {
  try {
    const { data: tasks } = await supabase
      .from('pending_tasks')
      .select('*')
      .eq('status', 'pending')
      .lte('execute_at', new Date().toISOString())
      .order('execute_at', { ascending: true })
      .limit(5);

    if (!tasks || tasks.length === 0) return;

    // Mark all as processing
    const taskIds = tasks.map(t => t.id);
    await supabase.from('pending_tasks')
      .update({ status: 'processing' })
      .in('id', taskIds);

    // Execute concurrently (max 3)
    const executing = tasks.map(task => {
      if (task.type === 'pen_pal_reply') {
        return executePenPalReply(task.id, task.target_id, task.user_id);
      } else if (task.type === 'mind_back_digest') {
        return executeMindBackDigest(task.id, task.target_id, task.user_id);
      }
    });

    await Promise.allSettled(executing);
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}

async function resetStuckTasks() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('pending_tasks')
    .update({ status: 'pending' })
    .eq('status', 'processing')
    .lt('created_at', fiveMinAgo)
    .select('id');
  if (data && data.length > 0) {
    console.log(`重置 ${data.length} 个卡死任务`);
  }
}

// AI 主动寄信
async function checkInactivePenPals() {
  try {
    const { data: penPals } = await supabase
      .from('pen_pals')
      .select('id, user_id, name, total_letters, last_letter_at, consecutive_proactive')
      .eq('is_active', true);

    if (!penPals) return;

    let processed = 0;
    for (const pp of penPals) {
      if (processed >= 5) break; // Max 5 per round
      if (pp.consecutive_proactive >= 2) continue; // Already sent 2 proactive, stop

      const stage = getRelationshipStage(pp.total_letters);
      const thresholdDays = pp.total_letters <= 3 ? 2 : pp.total_letters <= 10 ? 4 : 7;
      const lastActivity = new Date(pp.last_letter_at || pp.created_at || Date.now());
      const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince < thresholdDays) continue;

      // Check no pending reply task
      const { data: existing } = await supabase
        .from('pending_tasks')
        .select('id')
        .eq('target_id', pp.id)
        .in('status', ['pending', 'processing'])
        .limit(1);
      if (existing && existing.length > 0) continue;

      // Schedule proactive letter
      console.log(`📬 主动寄信: ${pp.name} (${daysSince.toFixed(1)} 天未活跃)`);

      // Create the proactive letter directly
      const { context } = await buildPenPalContext(pp.id, pp.name, getTimezone(pp.id));
      const systemPrompt = `你是"${pp.name}"，通过书信与人交流。
${stage.prompt}
对方已经好几天没给你写信了。写一封自然的、不带压力的信。
像老朋友随手写的：分享点小事、问候一下、或者说说你最近"想到的"。
不要提"你怎么不回信"之类的话。100-200字。不要署名。全文中文。`;

      try {
        const result = await callWithFallback([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context ? `你们的通信记录：\n${context}\n\n写一封主动的信。` : '你们刚认识不久。写一封信。' },
        ], 500);

        const content = result.content.trim();
        await supabase.from('pen_pal_letters').insert({
          pen_pal_id: pp.id, user_id: pp.user_id, role: 'ai',
          content, summary: content.slice(0, 30) + '...',
          letter_type: 'proactive', char_count: content.length,
          delivered_at: new Date().toISOString(), is_read: false,
        });

        await supabase.from('pen_pals').update({
          consecutive_proactive: (pp.consecutive_proactive || 0) + 1,
          last_letter_at: new Date().toISOString(),
          total_letters: (pp.total_letters || 0) + 1,
        }).eq('id', pp.id);

        sendLetterNotification(pp.user_id, pp.name, content).catch(() => {});
        processed++;
      } catch (err) {
        console.error(`主动寄信失败 ${pp.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('主动寄信检查失败:', err.message);
  }
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 统计查看
  if (req.method === 'GET' && req.url === '/api/stats') {
    const stats = loadStats();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(stats));
    return;
  }

  // === 账号系统 ===
  // === 心愿点数查询 ===
  if (req.method === "GET" && req.url === "/api/credits") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const { data } = await supabase.from("users").select("credits, is_premium").eq("id", decoded.id).single();
    return sendJSON(res, 200, { credits: data?.credits ?? 0, is_premium: data?.is_premium ?? false });
  }


  // 注册
  if (req.method === 'POST' && req.url === '/api/register') {
    try {
      const { email, nickname, password } = await parseBody(req);
      if (!email || !nickname || !password) {
        return sendJSON(res, 400, { error: '请填写完整信息' });
      }
      if (password.length < 6) {
        return sendJSON(res, 400, { error: '密码至少6位' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      const { data, error } = await supabase
        .from('users')
        .insert({ email: email.toLowerCase().trim(), nickname: nickname.trim(), password_hash })
        .select('id, email, nickname, is_premium, created_at')
        .single();
      if (error) {
        if (error.code === '23505') return sendJSON(res, 409, { error: '该邮箱已注册' });
        return sendJSON(res, 500, { error: '注册失败' });
      }
      const token = signToken(data);
      sendJSON(res, 201, { token, user: data });
    } catch (err) {
      console.error('Register error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // 登录
  if (req.method === 'POST' && req.url === '/api/login') {
    try {
      const { email, password } = await parseBody(req);
      if (!email || !password) return sendJSON(res, 400, { error: '请输入邮箱和密码' });
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, nickname, password_hash, is_premium, created_at')
        .eq('email', email.toLowerCase().trim())
        .single();
      if (error || !user) return sendJSON(res, 401, { error: '邮箱或密码错误' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return sendJSON(res, 401, { error: '邮箱或密码错误' });
      const { password_hash, ...safeUser } = user;
      const token = signToken(safeUser);
      sendJSON(res, 200, { token, user: safeUser });
    } catch (err) {
      console.error('Login error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // 获取当前用户
  if (req.method === 'GET' && req.url === '/api/me') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, nickname, is_premium, created_at')
      .eq('id', decoded.id)
      .single();
    if (error || !user) return sendJSON(res, 401, { error: '用户不存在' });
    sendJSON(res, 200, { user });
    return;
  }

  // === 用户设置 ===

  // 改昵称
  if (req.method === 'POST' && req.url === '/api/update-nickname') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { nickname } = await parseBody(req);
      if (!nickname || nickname.trim().length < 1) return sendJSON(res, 400, { error: '昵称不能为空' });
      if (nickname.trim().length > 20) return sendJSON(res, 400, { error: '昵称最多20个字' });
      const { error } = await supabase.from('users').update({ nickname: nickname.trim() }).eq('id', decoded.id);
      if (error) return sendJSON(res, 500, { error: '修改失败' });
      sendJSON(res, 200, { message: '昵称已更新', nickname: nickname.trim() });
    } catch (err) {
      console.error('Update nickname error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // 改密码
  if (req.method === 'POST' && req.url === '/api/update-password') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { oldPassword, newPassword } = await parseBody(req);
      if (!oldPassword || !newPassword) return sendJSON(res, 400, { error: '请填写完整' });
      if (newPassword.length < 6) return sendJSON(res, 400, { error: '新密码至少6位' });
      const { data: user } = await supabase.from('users').select('password_hash').eq('id', decoded.id).single();
      if (!user) return sendJSON(res, 401, { error: '用户不存在' });
      const valid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!valid) return sendJSON(res, 400, { error: '原密码错误' });
      const hash = await bcrypt.hash(newPassword, 10);
      await supabase.from('users').update({ password_hash: hash }).eq('id', decoded.id);
      sendJSON(res, 200, { message: '密码已更新' });
    } catch (err) {
      console.error('Update password error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // === 信箱 ===

  // 保存记录
  if (req.method === 'POST' && req.url === '/api/mailbox/save') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { type, content, metadata } = await parseBody(req);
      if (!type || !content) return sendJSON(res, 400, { error: '缺少必要字段' });
      // 免费用户信箱上限
      const { data: user } = await supabase.from('users').select('is_premium').eq('id', decoded.id).single();
      if (!user?.is_premium) {
        const { count } = await supabase.from('letters').select('id', { count: 'exact', head: true }).eq('user_id', decoded.id);
        if (count >= 20) {
          const { data: oldest } = await supabase.from('letters').select('id').eq('user_id', decoded.id).order('created_at', { ascending: true }).limit(1);
          if (oldest && oldest[0]) await supabase.from('letters').delete().eq('id', oldest[0].id);
        }
      }
      const { data, error } = await supabase
        .from('letters')
        .insert({ user_id: decoded.id, type, content, metadata: metadata || {} })
        .select()
        .single();
      if (error) return sendJSON(res, 500, { error: '保存失败' });
      sendJSON(res, 201, { letter: data });
    } catch (err) {
      console.error('Mailbox save error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // 获取信箱
  if (req.method === 'GET' && req.url === '/api/mailbox') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    const { data, error } = await supabase
      .from('letters')
      .select('id, type, content, metadata, created_at')
      .eq('user_id', decoded.id)
      .order('created_at', { ascending: false });
    if (error) return sendJSON(res, 500, { error: '获取失败' });
    sendJSON(res, 200, { letters: data });
    return;
  }

  // 删除信箱条目
  const mailboxDeleteMatch = req.url.match(/^\/api\/mailbox\/([a-f0-9-]+)$/);
  if (req.method === 'DELETE' && mailboxDeleteMatch) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    const letterId = mailboxDeleteMatch[1];
    const { error } = await supabase.from('letters').delete().eq('id', letterId).eq('user_id', decoded.id);
    if (error) return sendJSON(res, 500, { error: '删除失败' });
    sendJSON(res, 200, { ok: true });
    return;
  }

  // === 兑换码 ===

  // 用户兑换
  if (req.method === 'POST' && req.url === '/api/redeem') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { code } = await parseBody(req);
      if (!code) return sendJSON(res, 400, { error: '请输入兑换码' });
      const { data: codeRecord, error: findErr } = await supabase
        .from('redeem_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single();
      if (findErr || !codeRecord) return sendJSON(res, 404, { error: '兑换码无效' });
      if (codeRecord.used_by) return sendJSON(res, 400, { error: '兑换码已被使用' });
      await supabase.from('redeem_codes').update({ used_by: decoded.id, used_at: new Date().toISOString() }).eq('id', codeRecord.id);
      await supabase.from('users').update({ is_premium: true }).eq('id', decoded.id);
      sendJSON(res, 200, { message: '兑换成功！已解锁无限信箱' });
    } catch (err) {
      console.error('Redeem error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // === 忘记密码 ===
  if (req.method === 'POST' && req.url === '/api/forgot-password') {
    try {
      const { email } = await parseBody(req);
      if (!email) return sendJSON(res, 400, { error: '请输入邮箱' });
      const { data: user } = await supabase
        .from('users').select('id, nickname').eq('email', email.toLowerCase().trim()).single();
      // 不管用户存不存在都返回成功（防止枚举）
      if (!user) return sendJSON(res, 200, { message: '如果该邮箱已注册，重置链接已发送' });
      // 生成 token，30 分钟过期
      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await supabase.from('password_resets').insert({ user_id: user.id, token, expires_at });
      // 发邮件
      const resetUrl = SITE_URL + '/reset.html?token=' + token;
      const emailBody = JSON.stringify({
        from: 'Fizz Letter <noreply@fizzletter.cc>',
        to: [email.toLowerCase().trim()],
        subject: '泡沫来信 · 重置密码',
        html: `<div style="font-family:serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="text-align:center;font-weight:400;letter-spacing:3px;color:#3c465a;">泡沫来信</h2>
          <p style="color:#555;line-height:1.8;margin-top:24px;">亲爱的 ${user.nickname}，</p>
          <p style="color:#555;line-height:1.8;">收到你的重置密码请求。点击下方按钮设置新密码：</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="background:#8ca0c8;color:#fff;padding:12px 36px;border-radius:24px;text-decoration:none;font-size:14px;letter-spacing:2px;">重置密码</a>
          </div>
          <p style="color:#999;font-size:12px;line-height:1.6;">链接 30 分钟内有效。如果不是你操作的，请忽略这封邮件。</p>
          <p style="color:#ccc;font-size:11px;text-align:center;margin-top:40px;">泡沫来信 Fizz Letter</p>
        </div>`
      });
      const emailReq = https.request('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' }
      }, emailRes => {
        let d = '';
        emailRes.on('data', c => d += c);
        emailRes.on('end', () => {
          if (emailRes.statusCode >= 400) console.error('Resend error:', d);
        });
      });
      emailReq.write(emailBody);
      emailReq.end();
      sendJSON(res, 200, { message: '如果该邮箱已注册，重置链接已发送' });
    } catch (err) {
      console.error('Forgot password error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // 重置密码
  if (req.method === 'POST' && req.url === '/api/reset-password') {
    try {
      const { token, password } = await parseBody(req);
      if (!token || !password) return sendJSON(res, 400, { error: '缺少参数' });
      if (password.length < 6) return sendJSON(res, 400, { error: '密码至少6位' });
      const { data: record } = await supabase
        .from('password_resets').select('*').eq('token', token).eq('used', false).single();
      if (!record) return sendJSON(res, 400, { error: '链接无效或已过期' });
      if (new Date(record.expires_at) < new Date()) return sendJSON(res, 400, { error: '链接已过期，请重新申请' });
      const hash = await bcrypt.hash(password, 10);
      await supabase.from('users').update({ password_hash: hash }).eq('id', record.user_id);
      await supabase.from('password_resets').update({ used: true }).eq('id', record.id);
      sendJSON(res, 200, { message: '密码重置成功' });
    } catch (err) {
      console.error('Reset password error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // 管理员生成兑换码
  if (req.method === 'POST' && req.url === '/api/admin/generate-code') {
    try {
      const { count, adminKey } = await parseBody(req);
      if (adminKey !== JWT_SECRET) return sendJSON(res, 403, { error: '无权限' });
      const num = Math.min(count || 1, 50);
      const codes = [];
      for (let i = 0; i < num; i++) {
        const code = Array.from({ length: 8 }, () =>
          'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
        ).join('');
        codes.push({ code });
      }
      const { data, error } = await supabase.from('redeem_codes').insert(codes).select('code, created_at');
      if (error) return sendJSON(res, 500, { error: '生成失败' });
      sendJSON(res, 201, { codes: data });
    } catch (err) {
      console.error('Generate code error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // === 信友系统 API ===

  // URL pattern matching for pen pal routes with :id
  const penpalMatch = req.url.match(/^\/api\/penpal\/([0-9a-f-]+)\/(letters|send|letter|status|restore|fragment|fragments|archive)$/);
  const letterDeleteMatch = req.url.match(/^\/api\/penpal\/([0-9a-f-]+)\/letter\/([0-9a-f-]+)$/);
  const fragmentDeleteMatch = req.url.match(/^\/api\/penpal\/([0-9a-f-]+)\/fragment\/([0-9a-f-]+)$/);
  if (req.url.includes('/fragment/') && req.method === 'DELETE') {
    console.log('DEBUG DELETE fragment URL:', req.url);
    console.log('DEBUG fragmentDeleteMatch:', fragmentDeleteMatch);
    console.log('DEBUG penpalMatch:', penpalMatch);
  }
  const penpalIdMatch = req.url.match(/^\/api\/penpal\/([0-9a-f-]+)$/);

  // POST /api/penpal/create
  if (req.method === 'POST' && req.url === '/api/penpal/create') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { name, initial_letter } = await parseBody(req);
      if (!name || !name.trim()) return sendJSON(res, 400, { error: '请给信友取个名字' });

      // Free user: max 3 pen pals
      const { data: user } = await supabase.from('users').select('is_premium').eq('id', decoded.id).single();
      if (!user?.is_premium) {
        const { count: penPalCount } = await supabase.from('pen_pals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', decoded.id)
          .eq('is_active', true);
        if (penPalCount >= 3) return sendJSON(res, 403, { error: '免费用户最多 3 位信友，升级解锁更多' });
      }

      // Create pen pal record
      const { data: penPal, error } = await supabase
        .from('pen_pals')
        .insert({
          user_id: decoded.id,
          name: name.trim(),
          is_active: true,
          total_letters: initial_letter ? 1 : 0,
          consecutive_proactive: 0,
          last_letter_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return sendJSON(res, 500, { error: '创建失败: ' + error.message });

      if (initial_letter) {
        // Save as the opening letter (from "拆一封信", not pen pal persona)
        const taggedContent = '[INITIAL]' + initial_letter;
        const { error: letterErr } = await supabase.from('pen_pal_letters').insert({
          pen_pal_id: penPal.id,
          user_id: decoded.id,
          role: 'ai',
          content: taggedContent,
          summary: initial_letter.slice(0, 30) + (initial_letter.length > 30 ? '...' : ''),
          letter_type: 'letter',
          char_count: initial_letter.length,
          delivered_at: new Date().toISOString(),
          is_read: false,
        });
        if (letterErr) console.error('Initial letter insert failed:', letterErr);
        else console.log('Initial letter inserted for pen pal', penPal.id);
      } else {
        // Create pending task for AI to write first letter (5 min delay)
        await supabase.from('pending_tasks').insert({
          type: 'pen_pal_reply',
          target_id: penPal.id,
          user_id: decoded.id,
          status: 'pending',
          retry_count: 0,
          execute_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });
      }

      sendJSON(res, 201, { penPal });
    } catch (err) {
      console.error('Create pen pal error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // GET /api/penpal/list
  if (req.method === 'GET' && req.url === '/api/penpal/list') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { data: penPals, error } = await supabase
        .from('pen_pals')
        .select('id, name, total_letters, last_letter_at, created_at')
        .eq('user_id', decoded.id)
        .eq('is_active', true)
        .order('last_letter_at', { ascending: false });
      if (error) return sendJSON(res, 500, { error: '获取失败' });

      // Get unread counts and latest letter preview for each pen pal
      const enriched = await Promise.all((penPals || []).map(async pp => {
        const { count: unread } = await supabase
          .from('pen_pal_letters')
          .select('id', { count: 'exact', head: true })
          .eq('pen_pal_id', pp.id)
          .eq('is_read', false)
          .eq('role', 'ai');

        const { data: latest } = await supabase
          .from('pen_pal_letters')
          .select('content, role, created_at')
          .eq('pen_pal_id', pp.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          ...pp,
          unread_count: unread || 0,
          latest_preview: latest && latest[0] ? {
            content: latest[0].content.replace(/^\[INITIAL\]/, '').slice(0, 50) + (latest[0].content.replace(/^\[INITIAL\]/, '').length > 50 ? '...' : ''),
            role: latest[0].role,
            created_at: latest[0].created_at,
          } : null,
        };
      }));

      sendJSON(res, 200, { penPals: enriched });
    } catch (err) {
      console.error('List pen pals error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // GET /api/penpal/archived
  if (req.method === 'GET' && req.url === '/api/penpal/archived') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { data, error } = await supabase
        .from('pen_pals')
        .select('id, name, total_letters, last_letter_at, archived_at, created_at')
        .eq('user_id', decoded.id)
        .eq('is_active', false)
        .order('archived_at', { ascending: false });
      if (error) return sendJSON(res, 500, { error: '获取失败' });
      sendJSON(res, 200, { penPals: data || [] });
    } catch (err) {
      console.error('Archived pen pals error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // GET /api/user/settings
  if (req.method === 'GET' && req.url === '/api/user/settings') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('email_notify')
        .eq('id', decoded.id)
        .single();
      if (error) return sendJSON(res, 500, { error: '获取失败' });
      sendJSON(res, 200, { email_notify: user.email_notify || false });
    } catch (err) {
      console.error('Get settings error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // POST /api/user/settings
  if (req.method === 'POST' && req.url === '/api/user/settings') {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { email_notify } = await parseBody(req);
      const { error } = await supabase
        .from('users')
        .update({ email_notify: !!email_notify })
        .eq('id', decoded.id);
      if (error) return sendJSON(res, 500, { error: '更新失败' });
      sendJSON(res, 200, { message: '设置已更新', email_notify: !!email_notify });
    } catch (err) {
      console.error('Update settings error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // DELETE /api/penpal/:id/letter/:letterId
  if (req.method === "DELETE" && letterDeleteMatch) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const letterId = letterDeleteMatch[2];
      const penPalId = letterDeleteMatch[1];
      // Verify ownership
      const { data: pp } = await supabase.from("pen_pals").select("id").eq("id", penPalId).eq("user_id", decoded.id).single();
      if (!pp) return sendJSON(res, 404, { error: "笔友不存在" });
      const { error } = await supabase.from("pen_pal_letters").delete().eq("id", letterId).eq("pen_pal_id", penPalId);
      if (error) return sendJSON(res, 500, { error: "删除失败" });
      return sendJSON(res, 200, { ok: true });
    } catch (err) {
      console.error("Delete letter error:", err.message);
      return sendJSON(res, 500, { error: "服务器错误" });
    }
  }

  // DELETE /api/penpal/:id/fragment/:fragmentId (standalone, outside penpalMatch)
  if (req.method === "DELETE" && fragmentDeleteMatch) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const fragId = fragmentDeleteMatch[2];
      const { data: frag } = await supabase.from("mind_fragments")
        .select("id")
        .eq("id", fragId)
        .eq("user_id", decoded.id)
        .single();
      if (!frag) return sendJSON(res, 404, { error: "碎片不存在" });
      await supabase.from("mind_fragments").delete().eq("id", fragId);
      return sendJSON(res, 200, { ok: true });
    } catch (err) {
      console.error("Delete fragment error:", err.message);
      return sendJSON(res, 500, { error: "服务器错误" });
    }
  }

  // PUT /api/penpal/:id/fragment/:fragmentId — edit (standalone)
  if (req.method === "PUT" && fragmentDeleteMatch) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const fragId = fragmentDeleteMatch[2];
      const body = await parseBody(req);
      const newContent = (body.content || "").trim();
      if (!newContent) return sendJSON(res, 400, { error: "内容不能为空" });
      const { data: frag } = await supabase.from("mind_fragments")
        .select("id")
        .eq("id", fragId)
        .eq("user_id", decoded.id)
        .single();
      if (!frag) return sendJSON(res, 404, { error: "碎片不存在" });
      await supabase.from("mind_fragments").update({ content: newContent }).eq("id", fragId);
      return sendJSON(res, 200, { ok: true });
    } catch (err) {
      console.error("Edit fragment error:", err.message);
      return sendJSON(res, 500, { error: "编辑失败" });
    }
  }

  // Pen pal routes with :id parameter
  if (penpalMatch) {
    const penPalId = penpalMatch[1];
    const action = penpalMatch[2];

    // GET /api/penpal/:id/letters
    if (req.method === 'GET' && action === 'letters') {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        // Parse query params for pagination
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const page = parseInt(urlObj.searchParams.get('page')) || 1;
        const limit = Math.min(parseInt(urlObj.searchParams.get('limit')) || 50, 100);
        const offset = (page - 1) * limit;

        // Verify ownership
        const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
        if (!pp) return sendJSON(res, 404, { error: '信友不存在' });

        const { data: letters, error } = await supabase
          .from('pen_pal_letters')
          .select('id, role, content, summary, letter_type, char_count, created_at, delivered_at, is_read')
          .eq('pen_pal_id', penPalId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);
        if (error) return sendJSON(res, 500, { error: '获取失败' });

        // Mark unread AI letters as read
        await supabase.from('pen_pal_letters')
          .update({ is_read: true })
          .eq('pen_pal_id', penPalId)
          .eq('is_read', false)
          .eq('role', 'ai');

        sendJSON(res, 200, { letters: letters || [], page, limit });
      } catch (err) {
        console.error('Get letters error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }

    // POST /api/penpal/:id/send (also accepts /letter)
    if (req.method === 'POST' && (action === 'send' || action === 'letter')) {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        const body = await parseBody(req);
        const content = body.content;
        const instant = body.instant === true;
        if (!instant && (!content || !content.trim())) return sendJSON(res, 400, { error: '信的内容不能为空' });

        // Credits check for instant
        if (instant) {
          const cUser = await getUserCredits(decoded.id);
          if (!cUser?.is_premium && (!cUser || cUser.credits <= 0)) {
            return sendJSON(res, 403, { error: '心愿点数不足，无法使用一念即达' });
          }
        }

        // Free user: max 200 chars
        if (content && content.trim()) {
          const { data: sUser } = await supabase.from('users').select('is_premium').eq('id', decoded.id).single();
          if (!sUser?.is_premium && content.trim().length > 500) {
            return sendJSON(res, 403, { error: '免费用户每封信最多 500 字，升级解锁更多' });
          }
        }

        // Verify ownership
        const { data: pp } = await supabase.from('pen_pals').select('id, total_letters').eq('id', penPalId).eq('user_id', decoded.id).single();
        if (!pp) return sendJSON(res, 404, { error: '信友不存在' });

        // Save user's letter (skip if instant with no content)
        const trimmedContent = (content || '').trim();
        if (trimmedContent) {
          await supabase.from('pen_pal_letters').insert({
            pen_pal_id: penPalId,
            user_id: decoded.id,
            role: 'user',
            content: trimmedContent,
            summary: trimmedContent.slice(0, 30) + (trimmedContent.length > 30 ? '...' : ''),
            letter_type: 'letter',
            char_count: trimmedContent.length,
            delivered_at: new Date().toISOString(),
            is_read: true,
          });

          // Update pen pal stats
          await supabase.from('pen_pals').update({
            total_letters: (pp.total_letters || 0) + 1,
            last_letter_at: new Date().toISOString(),
            consecutive_proactive: 0, // Reset proactive counter
          }).eq('id', penPalId);
        }

        // Cancel existing pending pen_pal_reply task for this pen pal
        await supabase.from('pending_tasks')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error: 'cancelled' })
          .eq('target_id', penPalId)
          .eq('type', 'pen_pal_reply')
          .in('status', ['pending', 'processing']);

        // Create new pending task with random delay (or instant)
        const delayMinutes = instant ? 0 : randomDelay();
        // Deduct credit for instant
        if (instant) {
          const cUser2 = await getUserCredits(decoded.id);
          if (!cUser2?.is_premium) {
            await deductCredit(decoded.id);
          }
        }
        const estimated_at = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
        await supabase.from('pending_tasks').insert({
          type: 'pen_pal_reply',
          target_id: penPalId,
          user_id: decoded.id,
          status: 'pending',
          retry_count: 0,
          execute_at: estimated_at,
        });

        sendJSON(res, 201, { message: '信已寄出', delay_minutes: delayMinutes, estimated_at });
      } catch (err) {
        console.error('Send letter error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }

    // GET /api/penpal/:id/status
    if (req.method === 'GET' && action === 'status') {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
        if (!pp) return sendJSON(res, 404, { error: '信友不存在' });

        // Step 1: Always check unread AI letters FIRST (covers reply + digest)
        const { data: unread } = await supabase
          .from('pen_pal_letters')
          .select('id, role, content, letter_type, created_at')
          .eq('pen_pal_id', penPalId)
          .eq('role', 'ai')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (unread && unread.length > 0) {
          const newLetter = unread[0];
          await supabase.from('pen_pal_letters').update({ is_read: true }).eq('id', newLetter.id);
          console.log(`📬 回信已送达: ${penPalId} (${newLetter.letter_type})`);
          return sendJSON(res, 200, { hasReply: true, newLetter, pending: false });
        }

        // Step 2: No unread letter — check pending tasks (any type)
        const { data: task } = await supabase
          .from('pending_tasks')
          .select('execute_at')
          .eq('target_id', penPalId)
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        sendJSON(res, 200, { hasReply: false, pending: !!task, estimated_at: task ? task.execute_at : null });
      } catch (err) {
        console.error('Pen pal status error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }

    // POST /api/penpal/:id/restore
    if (req.method === 'POST' && action === 'restore') {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
        if (!pp) return sendJSON(res, 404, { error: '信友不存在' });

        const { error } = await supabase.from('pen_pals').update({
          is_active: true,
          archived_at: null,
        }).eq('id', penPalId);
        if (error) return sendJSON(res, 500, { error: '恢复失败' });
        sendJSON(res, 200, { message: '信友已恢复' });
      } catch (err) {
        console.error('Restore pen pal error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }

    // POST /api/penpal/:id/fragment
    if (req.method === 'POST' && action === 'fragment') {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        const body = await parseBody(req, 10485760); // 10MB for base64 images
        const content = body.content || '';
        const imageBase64 = body.image; // base64 data URI
        const instant = body.instant === true;
        if (!content.trim() && !imageBase64 && !instant) return sendJSON(res, 400, { error: '内容不能为空' });

        // Verify ownership
        const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
        if (!pp) return sendJSON(res, 404, { error: '信友不存在' });

        // Credits check for instant (between)
        if (instant) {
          const cUserB = await getUserCredits(decoded.id);
          if (!cUserB?.is_premium && (!cUserB || cUserB.credits <= 0)) {
            return sendJSON(res, 403, { error: '心愿点数不足，无法使用一念即达' });
          }
        }

        // Free user: max 10 unprocessed fragments, total 500 chars
        if (!instant) {
          const { data: fUser } = await supabase.from('users').select('is_premium').eq('id', decoded.id).single();
          if (!fUser?.is_premium) {
            const { data: existingFrags } = await supabase.from('mind_fragments')
              .select('id, content')
              .eq('pen_pal_id', penPalId)
              .is('batch_id', null);
            const fragCount = (existingFrags || []).length;
            if (fragCount >= 10) return sendJSON(res, 403, { error: '最多投入 10 条碎片，等 TA 回信后再继续' });
            const totalChars = (existingFrags || []).reduce((sum, f) => sum + (f.content || '').replace(/\[IMG:[^\]]+\]/g, '').length, 0);
            if (content.trim() && totalChars + content.trim().length > 500) {
              return sendJSON(res, 403, { error: '碎片总字数已达上限，等 TA 回信后再继续' });
            }
          }
        }

        // Save user timezone
        if (body.timezone) saveTimezone(penPalId, body.timezone);

        // Upload image to Supabase Storage if provided
        let finalContent = content.trim();
        if (imageBase64) {
          try {
            const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!match) throw new Error('Invalid image format');
            const mimeType = match[1];
            const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
            const imgBuffer = Buffer.from(match[2], 'base64');
            if (imgBuffer.length > 5 * 1024 * 1024) throw new Error('Image too large (max 5MB)');
            const imgName = `${penPalId}/${Date.now()}_${crypto.randomUUID().slice(0,8)}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from('fragment-images')
              .upload(imgName, imgBuffer, { contentType: mimeType, upsert: false });
            if (uploadErr) throw uploadErr;
            const { data: urlData } = supabase.storage
              .from('fragment-images')
              .getPublicUrl(imgName);
            finalContent = finalContent ? finalContent + '\n[IMG:' + urlData.publicUrl + ']' : '[IMG:' + urlData.publicUrl + ']';
          } catch (imgErr) {
            console.error('Image upload error:', imgErr.message);
            // Continue without image if upload fails
          }
        }

        // Save fragment (skip if empty instant-only trigger)
        if (finalContent) {
          await supabase.from('mind_fragments').insert({
            pen_pal_id: penPalId,
            user_id: decoded.id,
            content: finalContent,
          });
        }

        // Check if we need to schedule a digest
        const { count: unprocessedCount } = await supabase
          .from('mind_fragments')
          .select('id', { count: 'exact', head: true })
          .eq('pen_pal_id', penPalId)
          .is('batch_id', null);

        if (instant && unprocessedCount === 0) {
          return sendJSON(res, 400, { error: '没有可以读的碎片' });
        }
        if (instant || unprocessedCount >= 1) {
          // Check no pending digest task (cancel existing if instant)
          if (instant) {
            await supabase.from('pending_tasks')
              .update({ status: 'failed', completed_at: new Date().toISOString(), error: 'cancelled' })
              .eq('target_id', penPalId)
              .eq('type', 'mind_back_digest')
              .eq('status', 'pending');
          }

          const { data: existingTask } = instant ? { data: [] } : await supabase
            .from('pending_tasks')
            .select('id')
            .eq('target_id', penPalId)
            .eq('type', 'mind_back_digest')
            .in('status', ['pending', 'processing'])
            .limit(1);

          if (!existingTask || existingTask.length === 0) {
            const delayHours = instant ? 0 : 2 + Math.random() * 2;
            await supabase.from('pending_tasks').insert({
              type: 'mind_back_digest',
              target_id: penPalId,
              user_id: decoded.id,
              status: 'pending',
              retry_count: 0,
              execute_at: new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString(),
            });
          }
        }

        sendJSON(res, 201, { message: instant ? '碎片已投入，TA 正在读...' : '碎片已投入' });
      } catch (err) {
        console.error('Save fragment error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }

    // GET /api/penpal/:id/fragments
    if (req.method === 'GET' && action === 'fragments') {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        // Verify ownership
        const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
        if (!pp) return sendJSON(res, 404, { error: '信友不存在' });

        // Recent 7 days fragments (user timezone)
        const tz = (new URL('http://x?' + (req.url.split('?')[1] || '')).searchParams.get('tz')) || 'America/New_York';
        const now = new Date();
        const userNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        const sevenDaysAgo = new Date(userNow);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        // Convert back to UTC for query
        const offset = userNow - now;
        const queryStart = new Date(sevenDaysAgo.getTime() - offset);
        const { data: fragments } = await supabase
          .from('mind_fragments')
          .select('id, content, created_at, batch_id, ai_reaction, ai_reaction_at')
          .eq('pen_pal_id', penPalId)
          .gte('created_at', queryStart.toISOString())
          .order('created_at', { ascending: true });

        // Recent digest letters
        const { data: digests } = await supabase
          .from('pen_pal_letters')
          .select('id, content, created_at')
          .eq('pen_pal_id', penPalId)
          .eq('letter_type', 'fragment_digest')
          .order('created_at', { ascending: false })
          .limit(3);

        const parsedFragments = (fragments || []).map(f => {
          const imgMatch = f.content.match(/\[IMG:([^\]]+)\]/);
          return {
            ...f,
            content: f.content.replace(/\n?\[IMG:[^\]]+\]/g, '').trim(),
            image_url: imgMatch ? imgMatch[1] : null,
            ai_reaction: f.ai_reaction || null,
            ai_reaction_at: f.ai_reaction_at || null,
          };
        });
        sendJSON(res, 200, { fragments: parsedFragments, digests: digests || [] });
      } catch (err) {
        console.error('Get fragments error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }

    // PUT /api/penpal/:id/fragment/:fragmentId (edit fragment)
    if (req.method === 'PUT' && fragmentDeleteMatch) {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        const fragId = fragmentDeleteMatch[2];
        const body = await parseBody(req);
        const newContent = (body.content || '').trim();
        if (!newContent) return sendJSON(res, 400, { error: '内容不能为空' });
        const { data: frag } = await supabase.from('mind_fragments')
          .select('id')
          .eq('id', fragId)
          .eq('user_id', decoded.id)
          .single();
        if (!frag) return sendJSON(res, 404, { error: '碎片不存在' });
        await supabase.from('mind_fragments').update({ content: newContent }).eq('id', fragId);
        sendJSON(res, 200, { ok: true });
      } catch (err) {
        console.error('Edit fragment error:', err.message);
        sendJSON(res, 500, { error: '编辑失败' });
      }
      return;
    }

    // POST /api/penpal/:id/archive

    // DELETE /api/penpal/:id/fragment/:fragmentId
    if (req.method === 'DELETE' && fragmentDeleteMatch) {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        const fragId = fragmentDeleteMatch[2];
        // Only delete unprocessed fragments (batch_id is null) owned by user
        const { data: frag } = await supabase.from('mind_fragments')
          .select('id')
          .eq('id', fragId)
          .eq('user_id', decoded.id)
          .single();
        if (!frag) return sendJSON(res, 404, { error: '碎片不存在' });
        await supabase.from('mind_fragments').delete().eq('id', fragId);
        sendJSON(res, 200, { ok: true });
      } catch (err) {
        console.error('Delete fragment error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }
    if (req.method === 'POST' && action === 'archive') {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: '未登录' });
      try {
        const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
        if (!pp) return sendJSON(res, 404, { error: '信友不存在' });
        await supabase.from('pen_pals').update({ is_active: false, archived_at: new Date().toISOString() }).eq('id', penPalId);
        await supabase.from('pending_tasks').update({ status: 'failed', completed_at: new Date().toISOString(), error: 'archived' }).eq('target_id', penPalId).in('status', ['pending', 'processing']);
        sendJSON(res, 200, { message: '信友已归档' });
      } catch (err) {
        console.error('Archive pen pal error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }
  }

  // GET /api/penpal/:id — combined detail endpoint (pen pal info + letters + pending status)
  if (req.method === 'GET' && penpalIdMatch) {
    const penPalId = penpalIdMatch[1];
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { data: penPal } = await supabase.from('pen_pals').select('*').eq('id', penPalId).eq('user_id', decoded.id).single();
      if (!penPal) return sendJSON(res, 404, { error: '信友不存在' });

      const { data: letters } = await supabase
        .from('pen_pal_letters')
        .select('id, role, content, summary, letter_type, char_count, created_at, delivered_at, is_read')
        .eq('pen_pal_id', penPalId)
        .order('created_at', { ascending: true })
        .limit(100);

      // Mark unread as read
      await supabase.from('pen_pal_letters').update({ is_read: true }).eq('pen_pal_id', penPalId).eq('is_read', false).eq('role', 'ai');

      // Check pending reply
      const { data: task } = await supabase
        .from('pending_tasks')
        .select('execute_at')
        .eq('target_id', penPalId)
        .eq('type', 'pen_pal_reply')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      sendJSON(res, 200, {
        penPal,
        letters: letters || [],
        pendingReply: task ? { estimated_at: task.execute_at } : null,
      });
    } catch (err) {
      console.error('Pen pal detail error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // DELETE /api/penpal/:id
  if (req.method === 'DELETE' && penpalIdMatch) {
    const penPalId = penpalIdMatch[1];
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
      if (!pp) return sendJSON(res, 404, { error: '信友不存在' });

      // Archive (soft delete)
      await supabase.from('pen_pals').update({
        is_active: false,
        archived_at: new Date().toISOString(),
      }).eq('id', penPalId);

      // Cancel pending tasks
      await supabase.from('pending_tasks')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: 'cancelled' })
        .eq('target_id', penPalId)
        .in('status', ['pending', 'processing']);

      sendJSON(res, 200, { message: '信友已归档' });
    } catch (err) {
      console.error('Archive pen pal error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }

  // 真正删除信友（硬删除）
  const penpalHardDelete = req.url.match(/^\/api\/penpal\/([0-9a-f-]+)\/delete$/);
  if (req.method === 'POST' && penpalHardDelete) {
    const penPalId = penpalHardDelete[1];
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: '未登录' });
    try {
      const { data: pp } = await supabase.from('pen_pals').select('id').eq('id', penPalId).eq('user_id', decoded.id).single();
      if (!pp) return sendJSON(res, 404, { error: '信友不存在' });
      // Cancel pending tasks
      await supabase.from('pending_tasks')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: 'deleted' })
        .eq('target_id', penPalId)
        .in('status', ['pending', 'processing']);
      // Delete fragments, letters, then pen pal
      await supabase.from('mind_fragments').delete().eq('pen_pal_id', penPalId);
      await supabase.from('pen_pal_letters').delete().eq('pen_pal_id', penPalId);
      await supabase.from('pen_pals').delete().eq('id', penPalId);
      sendJSON(res, 200, { message: '信友已删除' });
    } catch (err) {
      console.error('Hard delete pen pal error:', err.message);
      sendJSON(res, 500, { error: '删除失败' });
    }
    return;
  }

  // 塔罗 API
  if (req.method === 'POST' && req.url === '/api/tarot') {
    try {
      const { question, card, keywords, reversed } = await parseBody(req);
      recordHit('tarot');
      const prompt = generateTarotPrompt(question, card, keywords, reversed);
      const result = await callTarotAPI(prompt);
      sendJSON(res, 200, { mood: result.content.trim(), model: result.model });
    } catch (err) {
      console.error('Tarot API Error:', err.message);
      sendJSON(res, 500, { error: err.message });
    }
    return;
  }

  // 雷诺曼 API
  if (req.method === "POST" && req.url === "/api/lenormand") {
    try {
      const { question, cards, mode } = await parseBody(req);
      recordHit("lenormand");
      const prompt = generateLenormandPrompt(question, cards);
      const useWhisper = mode === "whisper" || !question;
      const apiFn = useWhisper ? callLenormandWhisperAPI : callLenormandAPI;
      const result = await apiFn(prompt);
      sendJSON(res, 200, { reading: result.content.trim(), model: result.model });
    } catch (err) {
      console.error("Lenormand API Error:", err.message);
      sendJSON(res, 500, { error: err.message });
    }
    return;
  }

  // 语言之间 API
  if (req.method === 'POST' && req.url === '/api/between') {
    try {
      const { userWord, aiWord } = await parseBody(req);
      recordHit('between');
      const prompt = generateBetweenPrompt(userWord, aiWord);
      const result = await callAnswerAPI(prompt);
      sendJSON(res, 200, { comment: result.content.trim(), model: result.model });
    } catch (err) {
      console.error('Between API Error:', err.message);
      sendJSON(res, 500, { error: err.message });
    }
    return;
  }

  // 答案之书 API
  if (req.method === 'POST' && req.url === '/api/answer') {
    try {
      const { question, word } = await parseBody(req);
      recordHit('answer');
      const prompt = generateAnswerPrompt(question, word);
      const result = await callAnswerBookAPI(prompt);
      sendJSON(res, 200, { word, response: result.content.trim(), model: result.model });
    } catch (err) {
      console.error('Answer API Error:', err.message);
      sendJSON(res, 500, { error: err.message });
    }
    return;
  }


  // === 字卡多对话 ===
  const WC_CHATS_DIR = path.join(__dirname, "data", "wc-chats");

  function readUserChats(userId) {
    const fp = path.join(WC_CHATS_DIR, userId + ".json");
    try { return JSON.parse(fs.readFileSync(fp, "utf8")); }
    catch { return { chats: [], currentId: null }; }
  }

  function writeUserChats(userId, data) {
    fs.mkdirSync(WC_CHATS_DIR, { recursive: true });
    fs.writeFileSync(path.join(WC_CHATS_DIR, userId + ".json"), JSON.stringify(data));
  }

  // ═══ AI 主动发信（字卡传讯）═══
  const PROACTIVE_INTERVAL = 30 * 60 * 1000; // 30分钟扫一次
  const PROACTIVE_THRESHOLD = 2.5 * 60 * 60 * 1000; // 2.5小时没来就发
  const PROACTIVE_POOLS = ['cuddly', 'missyou', 'worryCare', 'lovebabble', 'confess', 'sweetDaily'];

  function getProactiveCards() {
    try {
      const wcCode = fs.readFileSync(path.join(__dirname, 'js', 'word-cards.js'), 'utf8');
      const cards = [];
      for (const poolName of PROACTIVE_POOLS) {
        const regex = new RegExp(poolName + ":\\s*\\{[^}]*texts:\\s*\\[([^\\]]+)\\]", 's');
        const m = wcCode.match(regex);
        if (m) {
          const texts = m[1].match(/"([^"]+)"/g);
          if (texts) cards.push(...texts.map(t => t.replace(/^"|"$/g, '')));
        }
      }
      return cards;
    } catch (e) {
      console.error('proactive: load cards failed:', e.message);
      return ['想你了', '在干嘛呢', '宝宝', '我想你了'];
    }
  }

  let _proactiveCards = null;
  function proactiveCards() {
    if (!_proactiveCards) _proactiveCards = getProactiveCards();
    return _proactiveCards;
  }

  setInterval(() => {
    try {
      const dir = path.join(__dirname, 'data', 'wc-chats');
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      const now = Date.now();
      let sent = 0;

      for (const file of files) {
        try {
          const fp = path.join(dir, file);
          const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
          if (!data.currentId || !data.chats || data.chats.length === 0) continue;
          // 检查主动发信开关
          const pool = proactiveCards();
          if (pool.length === 0) continue;
          let changed = false;

          for (const chat of (data.chats || [])) {
            // per-chat proactive toggle (default: on)
            if (chat.settings && chat.settings.proactiveEnabled === false) continue;
            if (!chat.updatedAt) continue;

            const elapsed = now - new Date(chat.updatedAt).getTime();
            if (elapsed < PROACTIVE_THRESHOLD) continue;

            const msgs = chat.messages || [];
            if (msgs.length > 0 && msgs[msgs.length - 1].proactive) continue;

            const count = Math.random() < 0.5 ? 1 : 2;
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            const ts = new Date().toISOString();

            for (let i = 0; i < count && i < shuffled.length; i++) {
              chat.messages.push({ text: shuffled[i], type: 'reply', proactive: true, at: ts });
            }
            chat.updatedAt = ts;
            if (chat.messages.length > 100) chat.messages = chat.messages.slice(-100);
            chat.unreadCount = (chat.unreadCount || 0) + count;
            data.hasUnread = true;
            changed = true;
          }
          if (changed) {
            fs.writeFileSync(fp, JSON.stringify(data));
            sent++;
          }
        } catch (e) { /* skip */ }
      }
      if (sent > 0) console.log('proactive: sent to ' + sent + ' user(s)');
    } catch (e) {
      console.error('proactive scan error:', e.message);
    }
  }, PROACTIVE_INTERVAL);

  setTimeout(() => {
    console.log('proactive: cards loaded, pool size =', proactiveCards().length);
  }, 10000);

    // GET /api/wc-chats/unread — 检查未读主动消息
  if (req.method === "GET" && req.url === "/api/wc-chats/unread") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const data = readUserChats(decoded.id);
    return sendJSON(res, 200, { hasUnread: !!data.hasUnread });
  }

  // GET /api/wc-chats/:id/settings — 获取指定对话的设置
  if (req.method === "GET" && req.url.match(/^\/api\/wc-chats\/[a-f0-9-]+\/settings$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const chatId = req.url.split("/api/wc-chats/")[1].replace("/settings", "");
    const data = readUserChats(decoded.id);
    const chat = (data.chats || []).find(c => c.id === chatId);
    if (!chat) return sendJSON(res, 404, { error: "对话不存在" });
    const settings = chat.settings || {};
    return sendJSON(res, 200, {
      proactiveEnabled: settings.proactiveEnabled !== false,
      bgPreset: settings.bgPreset || 'none',
      bgImage: settings.bgImage || null,
      bubbleStyle: settings.bubbleStyle || 'round',
      myBubbleColor: settings.myBubbleColor || 'default',
      taBubbleColor: settings.taBubbleColor || 'default'
    });
  }

  // POST /api/wc-chats/:id/settings — 更新指定对话的设置
  if (req.method === "POST" && req.url.match(/^\/api\/wc-chats\/[a-f0-9-]+\/settings$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const chatId = req.url.split("/api/wc-chats/")[1].replace("/settings", "");
      const body = await parseBody(req, 3 * 1024 * 1024);
      const data = readUserChats(decoded.id);
      const chat = (data.chats || []).find(c => c.id === chatId);
      if (!chat) return sendJSON(res, 404, { error: "对话不存在" });
      if (!chat.settings) chat.settings = {};
      // Merge all incoming settings fields
      const allowedKeys = ['proactiveEnabled', 'bgPreset', 'bgImage', 'bubbleTheme', 'bubbleStyle', 'hueRotate', 'myBubbleColor', 'taBubbleColor'];
      for (const key of allowedKeys) {
        if (body.hasOwnProperty(key)) {
          if (key === 'proactiveEnabled') {
            chat.settings[key] = !!body[key];
          } else if (key === 'bgImage' && body[key] && typeof body[key] === 'string' && body[key].length > 1500000) {
            return sendJSON(res, 400, { error: "图片太大" });
          } else {
            chat.settings[key] = body[key];
          }
        }
      }
      writeUserChats(decoded.id, data);
      return sendJSON(res, 200, { ok: true, settings: chat.settings });
    } catch (e) { return sendJSON(res, 500, { error: e.message }); }
  }

    // GET /api/wc-chats — 对话列表
  if (req.method === "GET" && req.url === "/api/wc-chats") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const data = readUserChats(decoded.id);
    const list = data.chats.map(c => ({
      id: c.id, title: c.title, messageCount: (c.messages || []).length, updatedAt: c.updatedAt, unreadCount: c.unreadCount || 0
    }));
    return sendJSON(res, 200, { chats: list, currentId: data.currentId });
  }

  // POST /api/wc-chats — 新建对话
  if (req.method === "POST" && req.url === "/api/wc-chats") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const data = readUserChats(decoded.id);
    const chat = { id: crypto.randomUUID(), title: "新对话", messages: [], usedTexts: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.chats.unshift(chat);
    data.currentId = chat.id;
    if (data.chats.length > 20) data.chats = data.chats.slice(0, 20);
    writeUserChats(decoded.id, data);
    return sendJSON(res, 200, { id: chat.id });
  }

  // POST /api/wc-chats/save — 保存当前对话消息
  if (req.method === "POST" && req.url === "/api/wc-chats/save") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req);
      const data = readUserChats(decoded.id);
      const chat = data.chats.find(c => c.id === body.id);
      if (!chat) return sendJSON(res, 404, { error: "对话不存在" });
      chat.messages = (body.messages || []).slice(-100);
      chat.usedTexts = body.usedTexts || [];
      if (chat.messages.length > 0 && chat.title === "新对话") {
        chat.title = chat.messages[0].text.slice(0, 12);
      }
      chat.updatedAt = new Date().toISOString();
      chat.unreadCount = 0;
      data.hasUnread = data.chats.some(c => (c.unreadCount || 0) > 0);
      writeUserChats(decoded.id, data);
      return sendJSON(res, 200, { ok: true, title: chat.title });
    } catch (e) { return sendJSON(res, 500, { error: e.message }); }
  }

  // GET /api/wc-chats/:id — 加载对话
  if (req.method === "GET" && req.url.match(/^\/api\/wc-chats\/[a-f0-9-]+$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const chatId = req.url.split("/api/wc-chats/")[1];
    const data = readUserChats(decoded.id);
    const chat = data.chats.find(c => c.id === chatId);
    if (!chat) return sendJSON(res, 404, { error: "对话不存在" });
    data.currentId = chatId;
    chat.unreadCount = 0;
    data.hasUnread = data.chats.some(c => (c.unreadCount || 0) > 0);
    writeUserChats(decoded.id, data);
    return sendJSON(res, 200, { messages: chat.messages, usedTexts: chat.usedTexts || [], settings: chat.settings || {} });
  }

  // DELETE /api/wc-chats/:id — 删除对话
  if (req.method === "DELETE" && req.url.match(/^\/api\/wc-chats\/[a-f0-9-]+$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const chatId = req.url.split("/api/wc-chats/")[1];
    const data = readUserChats(decoded.id);
    data.chats = data.chats.filter(c => c.id !== chatId);
    if (data.currentId === chatId) data.currentId = data.chats[0]?.id || null;
    writeUserChats(decoded.id, data);
    return sendJSON(res, 200, { ok: true });
  }

    // === 自定义字卡 CRUD ===
  const CUSTOM_CARDS_DIR = path.join(__dirname, "data", "custom-cards");

  // Helper: read user custom cards file
  function readUserCards(userId) {
    const fp = path.join(CUSTOM_CARDS_DIR, userId + ".json");
    try {
      return JSON.parse(fs.readFileSync(fp, "utf8"));
    } catch { return { cards: [], mode: "default" }; }
  }

  // Helper: write user custom cards file
  function writeUserCards(userId, data) {
    const fp = path.join(CUSTOM_CARDS_DIR, userId + ".json");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  }

  // GET /api/custom-cards — 获取用户自定义卡 + 模式
  if (req.method === "GET" && req.url === "/api/custom-cards") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const data = readUserCards(decoded.id);
    return sendJSON(res, 200, data);
  }

  // POST /api/custom-cards — 添加卡片（单条或批量）
  if (req.method === "POST" && req.url === "/api/custom-cards") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req);
      const data = readUserCards(decoded.id);
      const now = new Date().toISOString();

      if (body.texts && Array.isArray(body.texts)) {
        // 批量添加
        const newCards = body.texts
          .map(t => (t || "").trim())
          .filter(t => t.length > 0 && t.length <= 20)
          .map(t => ({ id: crypto.randomUUID(), text: t, created_at: now }));
        data.cards.push(...newCards);
        writeUserCards(decoded.id, data);
        return sendJSON(res, 200, { added: newCards.length, total: data.cards.length });
      } else if (body.text) {
        const text = body.text.trim();
        if (!text || text.length > 20) return sendJSON(res, 400, { error: "卡片文字1-20字" });
        const card = { id: crypto.randomUUID(), text, created_at: now };
        data.cards.push(card);
        writeUserCards(decoded.id, data);
        return sendJSON(res, 200, { card, total: data.cards.length });
      } else {
        return sendJSON(res, 400, { error: "请提供 text 或 texts" });
      }
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // DELETE /api/custom-cards/:id — 删除单张卡
  if (req.method === "DELETE" && req.url.startsWith("/api/custom-cards/")) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const cardId = req.url.split("/api/custom-cards/")[1];
    if (!cardId) return sendJSON(res, 400, { error: "缺少卡片 ID" });
    const data = readUserCards(decoded.id);
    const before = data.cards.length;
    data.cards = data.cards.filter(c => c.id !== cardId);
    if (data.cards.length === before) return sendJSON(res, 404, { error: "卡片不存在" });
    writeUserCards(decoded.id, data);
    return sendJSON(res, 200, { deleted: true, total: data.cards.length });
  }

  // POST /api/card-mode — 切换卡组模式
  if (req.method === "POST" && req.url === "/api/card-mode") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const { mode } = await parseBody(req);
      if (!["default", "custom", "mixed"].includes(mode)) {
        return sendJSON(res, 400, { error: "模式必须是 default/custom/mixed" });
      }
      const data = readUserCards(decoded.id);
      data.mode = mode;
      writeUserCards(decoded.id, data);
      return sendJSON(res, 200, { mode });
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // === 表情包系统（分组） ===
  const STICKERS_DIR = path.join(__dirname, "data", "wc-stickers");

  function readUserStickers(userId) {
    const fp = path.join(STICKERS_DIR, userId + ".json");
    try { return JSON.parse(fs.readFileSync(fp, "utf8")); }
    catch { return { groups: [{ id: crypto.randomUUID(), name: "默认", enabled: true, stickers: [] }] }; }
  }

  function writeUserStickers(userId, data) {
    fs.mkdirSync(STICKERS_DIR, { recursive: true });
    fs.writeFileSync(path.join(STICKERS_DIR, userId + ".json"), JSON.stringify(data));
  }

  // GET /api/stickers — 获取用户表情包（含分组）
  if (req.method === "GET" && req.url === "/api/stickers") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const data = readUserStickers(decoded.id);
    return sendJSON(res, 200, data);
  }

  // POST /api/stickers — 上传表情包到指定分组
  if (req.method === "POST" && req.url === "/api/stickers") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req, 5242880); // 5MB max for batch
      const { image, images, groupId } = body;
      const data = readUserStickers(decoded.id);
      let group = data.groups.find(g => g.id === groupId);
      if (!group) group = data.groups[0];
      if (!group) {
        group = { id: crypto.randomUUID(), name: "默认", enabled: true, stickers: [] };
        data.groups.push(group);
      }
      const imgDir = path.join(STICKERS_DIR, "images", decoded.id);
      fs.mkdirSync(imgDir, { recursive: true });

      const saveOne = (imgData) => {
        if (!imgData || !imgData.startsWith("data:image/")) return null;
        const matches = imgData.match(/^data:image\/([a-z]+);base64,(.+)$/i);
        if (!matches) return null;
        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const imgBuf = Buffer.from(matches[2], "base64");
        const id = crypto.randomUUID();
        const filename = id + "." + ext;
        fs.writeFileSync(path.join(imgDir, filename), imgBuf);
        return { id, filename, createdAt: new Date().toISOString() };
      };

      // Count total stickers across all groups
      const totalCount = data.groups.reduce((sum, g) => sum + g.stickers.length, 0);

      if (images && Array.isArray(images)) {
        // Batch upload
        if (totalCount + images.length > 200) return sendJSON(res, 400, { error: "最多保存200个表情包" });
        const added = [];
        for (const img of images) {
          const s = saveOne(img);
          if (s) { group.stickers.push(s); added.push(s); }
        }
        writeUserStickers(decoded.id, data);
        return sendJSON(res, 200, { added: added.length, group: group });
      } else if (image) {
        if (totalCount >= 200) return sendJSON(res, 400, { error: "最多保存200个表情包" });
        const s = saveOne(image);
        if (!s) return sendJSON(res, 400, { error: "图片格式无效" });
        group.stickers.push(s);
        writeUserStickers(decoded.id, data);
        return sendJSON(res, 200, { sticker: s, group: group });
      }
      return sendJSON(res, 400, { error: "请提供 image 或 images" });
    } catch (e) { return sendJSON(res, 500, { error: e.message }); }
  }

  // GET /api/stickers/image/:userId/:filename — 获取表情包图片
  if (req.method === "GET" && req.url.match(/^\/api\/stickers\/image\/[^/]+\/[^/]+$/)) {
    const parts = req.url.split("/");
    const userId = parts[4];
    const filename = parts[5];
    const imgPath = path.join(STICKERS_DIR, "images", userId, filename);
    try {
      const imgData = fs.readFileSync(imgPath);
      const ext = path.extname(filename).slice(1);
      const mime = ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
      res.writeHead(200, { "Content-Type": mime, "Cache-Control": "public, max-age=31536000" });
      return res.end(imgData);
    } catch {
      res.writeHead(404);
      return res.end("Not Found");
    }
  }

  // DELETE /api/stickers/:id — 删除单个表情包
  if (req.method === "DELETE" && req.url.match(/^\/api\/stickers\/[a-f0-9-]+$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const stickerId = req.url.split("/api/stickers/")[1];
    const data = readUserStickers(decoded.id);
    let found = false;
    for (const group of data.groups) {
      const idx = group.stickers.findIndex(s => s.id === stickerId);
      if (idx >= 0) {
        const sticker = group.stickers[idx];
        try { fs.unlinkSync(path.join(STICKERS_DIR, "images", decoded.id, sticker.filename)); } catch {}
        group.stickers.splice(idx, 1);
        found = true;
        break;
      }
    }
    if (!found) return sendJSON(res, 404, { error: "表情不存在" });
    writeUserStickers(decoded.id, data);
    return sendJSON(res, 200, { ok: true });
  }

  // POST /api/sticker-groups — 创建分组
  if (req.method === "POST" && req.url === "/api/sticker-groups") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const { name } = await parseBody(req);
      const data = readUserStickers(decoded.id);
      if (data.groups.length >= 20) return sendJSON(res, 400, { error: "最多20个分组" });
      const group = { id: crypto.randomUUID(), name: (name || "新分组").slice(0, 10), enabled: true, stickers: [] };
      data.groups.push(group);
      writeUserStickers(decoded.id, data);
      return sendJSON(res, 200, { group });
    } catch (e) { return sendJSON(res, 500, { error: e.message }); }
  }

  // PUT /api/sticker-groups/:id — 修改分组（名称/启用）
  if (req.method === "PUT" && req.url.match(/^\/api\/sticker-groups\/[a-f0-9-]+$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const groupId = req.url.split("/api/sticker-groups/")[1];
    try {
      const body = await parseBody(req);
      const data = readUserStickers(decoded.id);
      const group = data.groups.find(g => g.id === groupId);
      if (!group) return sendJSON(res, 404, { error: "分组不存在" });
      if (body.name !== undefined) group.name = body.name.slice(0, 10);
      if (body.enabled !== undefined) group.enabled = !!body.enabled;
      writeUserStickers(decoded.id, data);
      return sendJSON(res, 200, { group });
    } catch (e) { return sendJSON(res, 500, { error: e.message }); }
  }

  // DELETE /api/sticker-groups/:id — 删除分组（含所有表情）
  if (req.method === "DELETE" && req.url.match(/^\/api\/sticker-groups\/[a-f0-9-]+$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const groupId = req.url.split("/api/sticker-groups/")[1];
    const data = readUserStickers(decoded.id);
    const group = data.groups.find(g => g.id === groupId);
    if (!group) return sendJSON(res, 404, { error: "分组不存在" });
    // Delete all sticker files in this group
    for (const s of group.stickers) {
      try { fs.unlinkSync(path.join(STICKERS_DIR, "images", decoded.id, s.filename)); } catch {}
    }
    data.groups = data.groups.filter(g => g.id !== groupId);
    if (data.groups.length === 0) {
      data.groups.push({ id: crypto.randomUUID(), name: "默认", enabled: true, stickers: [] });
    }
    writeUserStickers(decoded.id, data);
    return sendJSON(res, 200, { ok: true });
  }

    // === 传讯字卡 AI 选池（关键词未命中时）===
  if (req.method === "POST" && req.url === "/api/word-cards/select-pools") {
    try {
      const { question, history, keywordHint } = await parseBody(req);
      if (!question) {
        sendJSON(res, 400, { error: "no question" });
        return;
      }
      let historyCtx = "";
      if (history && history.length > 0) {
        historyCtx = "\n\n对话上下文（从旧到新）：\n" + history.map(m => (m.type === "user" ? "对方：" : "你：") + m.text).join("\n");
      }
      let hintCtx = "";
      if (keywordHint && keywordHint.length > 0) {
        hintCtx = "\n系统关键词匹配建议：" + keywordHint.join(", ") + "（仅供参考，你可以采纳也可以忽略）";
      }
      const poolDesc = `可选卡池：
scenes — 场景地点（街口、便利店、天台、窗边、车站……）
time — 时间（凌晨三点、黄昏以后、天快亮了……）
dreams — 梦境（梦见你、半醒之间……）
clothing — 穿着（外套、围巾、衬衫……）
food — 食物（咖啡、草莓、巧克力……）
body — 身体感觉（手凉、心跳、呼吸……）
eating — 吃饭相关（吃了、还没吃、饿了……）
daily — 日常对话（在的、干嘛呢、等你呢……）
love — 爱意表达（喜欢你、想你了、心动……）
fearSad — 恐惧和难过（有点怕、停住了、忍住了……）
happy — 开心（笑了、真好、开心……）
coming — 来和走（到了、在路上、回来了……）
simplePos — 简单肯定（嗯、好、是、对……）
simpleNeg — 简单否定（不、没、算了……）
emoji — 表情符号
petNames — 昵称（宝宝、笨蛋、小傻瓜……）
intimate — 亲密（抱抱、靠近一点……）
care — 关心（多喝水、早点睡……）
meta — 元表达（说不出口、写了又删……）
jealous — 吃醋（你跟谁说话呢、哼……）
banter — 拌嘴（讨厌、你好烦……）`;
      const sysPrompt = "你是传讯字卡的分类器。对方说了一句话，你需要根据对话上下文判断，从卡池列表中选 2-3 个最相关的池子，让系统从这些池子里抽卡。\n\n" + poolDesc + "\n\n规则：\n- 只输出池子名（英文），逗号分隔\n- 选 2-3 个最相关的\n- 结合上下文理解对方想表达什么\n- 如果是追问具体事物，选能回应的池子";
      const userPrompt = (historyCtx ? historyCtx + "\n\n" : "") + hintCtx + "\n\n对方最新说：" + question + "\n\n选 2-3 个最相关的卡池（只写英文池名，逗号分隔）：";
      const messages = [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt }
      ];
      const result = await callWithFallback(messages, 50, "claude-haiku-4-5-20251001");
      const raw = result.content.trim();
      const validPools = ["scenes","time","dreams","clothing","food","body","eating","daily","love","fearSad","happy","coming","simplePos","simpleNeg","emoji","petNames","intimate","care","meta","jealous","banter"];
      const pools = raw.split(/[,，\s]+/).map(s => s.trim()).filter(s => validPools.includes(s));
      if (pools.length === 0) {
        sendJSON(res, 200, { pools: ["daily", "meta"] });
      } else {
        sendJSON(res, 200, { pools: pools.slice(0, 3) });
      }
    } catch (err) {
      console.error("Word card select-pools error:", err.message);
      sendJSON(res, 200, { pools: ["daily", "meta"] });
    }
    return;
  }

    // === 传讯字卡 AI 筛选 ===
  if (req.method === "POST" && req.url === "/api/word-cards/filter") {
    try {
      const { question, candidates, history } = await parseBody(req);
      if (!candidates || candidates.length === 0) {
        sendJSON(res, 400, { error: "no candidates" });
        return;
      }
      const texts = candidates.map(c => typeof c === "string" ? c : c.text);
      const cardList = candidates.map((c, i) => {
        const t = typeof c === "string" ? c : c.text;
        const src = (typeof c === "object" && c.source === "atmo") ? " [氛围]" : "";
        return (i + 1) + ". " + t + src;
      }).join("\n");
      // Build history context (last 10 messages)
      let historyCtx = "";
      if (history && history.length > 0) {
        historyCtx = "\n\n对话上下文（从旧到新，序号从0开始）：\n" + history.map((m, i) => "[" + i + "] " + (m.type === "user" ? "对方：" : "你：") + m.text).join("\n");
      }
      const sysPrompt = "你是传讯字卡的筛选器。你扮演的是「回卡片的那个人」。对方说了一句话，系统抽了一些候选卡片，你要挑出最搭的卡来回应。\n\n重要：结合对话上下文选卡。如果对方在追问或接话，选能接上话题的卡，不要选跟当前话题无关的。\n\nNONE 规则（严格执行）：\n如果对方在追问具体的东西（比如「什么电影」「叫什么」「哪首歌」），而候选卡里没有任何一张能回答这个具体问题，你必须回复 NONE。不要用氛围卡或不相关的卡凑数。回复 NONE 比硬选一张不搭的卡更好。\n\n张数判断：\n- 问在哪/位置/天气 → 1张\n- 简单是否问题 → 1张\n- 日常问候/聊天 → 1-2张\n- 情感/想念/喜欢 → 2-3张\n- 复杂长问句 → 2-3张\n\n引用规则（像微信引用消息一样）：\n- 如果你选的卡片是在回应对话上下文中某条特定的消息（不是最新那条），在末尾加 [Q:序号]\n- 序号是对话上下文列表里的行号（从0开始）\n- 大多数时候不需要引用（直接回应最新消息时不加）\n- 只有当你的卡片明确是在回应上文中某条旧消息时才引用\n- 示例：对方先说了「好困」，又说了「要出门了」，你选的卡是「早点睡」→ 这是回应「好困」→ 加 [Q:对应序号]\n\n规则：\n- 先输出卡片文字（逗号分隔），如需引用在末尾加 [Q:序号]\n- 如果都不搭，只输出 NONE（这很重要，宁缺毋滥）\n- 优先选能直接回应问题的卡\n- 标了[氛围]的是场景/地点卡，一般不选\n- 不要选明显不搭的组合";
      const userPrompt = (historyCtx ? historyCtx + "\n\n" : "") + "对方最新说：" + question + "\n\n候选卡片：\n" + cardList + "\n\n选出最搭的（卡片文字逗号分隔，如需引用旧消息在末尾加[Q:序号]）：";
      const messages = [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt }
      ];
      const result = await callWithFallback(messages, 100, "claude-haiku-4-5-20251001");
      let raw = result.content.trim();
      // AI 认为候选都不搭
      if (raw === "NONE" || raw === "none") {
        sendJSON(res, 200, { cards: [], none: true });
        return;
      }
      // 提取引用标记 [Q:n]
      let quoteIndex = null;
      const qMatch = raw.match(/\[Q:(\d+)\]\s*$/);
      if (qMatch) {
        quoteIndex = parseInt(qMatch[1], 10);
        raw = raw.replace(/\s*\[Q:\d+\]\s*$/, '');
      }
      const selected = raw.split(/[,，]/).map(s => s.trim()).filter(s => texts.includes(s));
      const resp = {};
      if (selected.length === 0) {
        resp.cards = texts.slice(0, 2);
      } else {
        resp.cards = selected.slice(0, 3);
      }
      if (quoteIndex !== null) resp.quoteIndex = quoteIndex;
      sendJSON(res, 200, resp);
    } catch (err) {
      console.error("Word card filter error:", err.message);
      sendJSON(res, 500, { error: err.message });
    }
    return;
  }

  // API endpoint
  if (req.method === 'POST' && req.url === '/api/letter') {
    try {
      const { words, style, userMessage } = await parseBody(req);
      recordHit('letter');
      const prompt = generatePrompt(words, style, userMessage);
      const result = await callAPI(prompt);
      const letter = parseLetter(result.content);
      sendJSON(res, 200, { body: letter.body, closing: letter.closing, model: result.model });
    } catch (err) {
      console.error('API Error:', err.message);
      sendJSON(res, 500, { error: err.message });
    }
    return;
  }

  // 访问计数（只记首页）
  if (req.url === '/' || req.url === '/index.html') {
    recordHit('visit');
  }

  // /api/clear-cache 返回清缓存页面（走 API 路径绕过旧 SW）
  if (req.url.split("?")[0] === "/api/clear-cache") {
    const clearPath = require("path").join(__dirname, "clear.html");
    require("fs").readFile(clearPath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not Found"); return; }
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
    return;
  }

  // sw.js 永不缓存
  if (req.url.split("?")[0] === "/sw.js") {
    const swPath = require("path").join(__dirname, "sw.js");
    require("fs").readFile(swPath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not Found"); return; }
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      });
      res.end(data);
    });
    return;
  }

  // 静态文件
  serveStatic(req, res);
});


// === 碎片 Emoji 反应系统 ===

const REACTION_RULES = [
  { keywords: ['开心','哈哈','好笑','笑死','太好了','耶','棒','nice','哈','嘻','乐','搞笑','逗','段子','meme'], emoji: '😂' },
  { keywords: ['喜欢','爱','想你','心动','甜','暖','幸福','好甜','感动','谢谢','thank','宝','亲','❤','在一起'], emoji: '❤️' },
  { keywords: ['可爱','萌','好看','漂亮','美','帅','天使','小猫','小狗','奶茶','冰淇淋','吃','好吃','yummy'], emoji: '🥰' },
  { keywords: ['难过','哭','伤心','委屈','心疼','不开心','累了','好累','疲惫','失眠','压力','焦虑','emo','想哭','抱抱','痛'], emoji: '🫂' },
  { keywords: ['嗯','哦','啊','随便','无聊','看到','路过','发现','今天','刚才','突然','感觉','想到','不知道','好像'], emoji: '👀' },
];
const FALLBACK_EMOJIS = ['❤️', '👀', '🥰'];

function pickReactionEmoji(content) {
  const text = (content || '').toLowerCase();
  for (const rule of REACTION_RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule.emoji;
  }
  return FALLBACK_EMOJIS[Math.floor(Math.random() * FALLBACK_EMOJIS.length)];
}



server.listen(PORT, async () => {
  console.log(`泡沫来信服务器启动: http://localhost:${PORT}`);
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) console.error('Supabase 连接失败:', error.message);
  else console.log('Supabase 连接成功');

  // Start scheduler
  resetStuckTasks();
  setInterval(processScheduledTasks, 30000);
  setInterval(checkInactivePenPals, 6 * 60 * 60 * 1000); // Every 6 hours

  console.log('Scheduler 启动 (30秒轮询 + 6小时主动寄信)');
});
