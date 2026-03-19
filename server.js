const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const sharp = require("sharp");
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
  { url: 'https://api.dzzi.ai/v1/chat/completions', key: 'sk-ABeHCcvalPWJ2Ox7FI08uS6MrOawJ0kpDf6bEnoAVFGQeDQh', model: 'anthropic/claude-sonnet-4.6' },
  { url: 'https://api.gemai.cc/v1/chat/completions', key: 'sk-kFq9yNybHRm9Rv8j5aOtLiglMdTL6ktGpo9S3n3c458QaUEh', model: 'claude-sonnet-4-6' },
  { url: 'https://gua.guagua.uk/v1/chat/completions', key: 'sk-6atvRFjSRyvh81C4ZKMdkKmBmisA53iOJG5OHZe8IuwOT8jn', model: 'GCP/claude-sonnet-4-6' },
  { url: 'https://api.qiyiguo.uk/v1/chat/completions', key: 'sk-ayYp4RQZB9jqBNMFqJsxMPRxmWn0LUJ2QfPcyg339qXKaZPM', model: 'claude-sonnet-4-6' },
];
const PORT = process.env.PORT || 4001;

const webpush = require('web-push');
const VAPID_PUBLIC = 'BAGe8nXcflsG3RkPer6OKJtJ1aKDgekiIGxNXSZxJOQSjE_KGdIGCCOJK_mZvz9w10O-shGBk4Kp65Mi-1xLNMs';
const VAPID_PRIVATE = '_QOyjN3hUYG3hpgOmUNeoH5eE-flsyzf1eB1ez3s-fI';
webpush.setVapidDetails('mailto:noreply@fizzletter.cc', VAPID_PUBLIC, VAPID_PRIVATE);

const PUSH_SUBS_FILE = path.join(__dirname, 'data', 'push-subscriptions.json');
let pushSubscriptions = {};
try { pushSubscriptions = JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, 'utf8')); } catch(e) {}
function savePushSubs() {
  try { fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(pushSubscriptions), 'utf8'); } catch(e) {}
}

async function sendPushNotification(userId, title, body, url) {
  const subs = pushSubscriptions[userId];
  if (!subs || subs.length === 0) return;
  const payload = JSON.stringify({ title, body, url: url || '/' });
  const expired = [];
  for (let i = 0; i < subs.length; i++) {
    try {
      await webpush.sendNotification(subs[i], payload);
    } catch(e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        expired.push(i);
      }
    }
  }
  if (expired.length > 0) {
    pushSubscriptions[userId] = subs.filter((_, i) => !expired.includes(i));
    if (pushSubscriptions[userId].length === 0) delete pushSubscriptions[userId];
    savePushSubs();
  }
}

// 来电专用推送（显示角色头像 + 来电样式）
async function sendCallPushNotification(userId, callerName, callType, url, callerAvatar) {
  const subs = pushSubscriptions[userId];
  if (!subs || subs.length === 0) return;
  const label = callType === 'video' ? '📹 视频通话' : '📞 语音通话';
  const payload = JSON.stringify({
    type: 'incoming_call',
    title: callerName,
    body: label,
    url: url || '/',
    callerName: callerName,
    callType: callType,
    callerAvatar: callerAvatar || '',
    tag: 'incoming-call',
    requireInteraction: true
  });
  const expired = [];
  for (let i = 0; i < subs.length; i++) {
    try {
      await webpush.sendNotification(subs[i], payload);
    } catch(e) {
      if (e.statusCode === 410 || e.statusCode === 404) expired.push(i);
    }
  }
  if (expired.length > 0) {
    pushSubscriptions[userId] = subs.filter((_, i) => !expired.includes(i));
    if (pushSubscriptions[userId].length === 0) delete pushSubscriptions[userId];
    savePushSubs();
  }
}


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

// === 档案系统工具函数 ===
async function getActivePersonaPrompt(userId) {
  try {
    const { data: pairing } = await supabase
      .from("pairings")
      .select("*, self_persona:self_persona_id(*), dream_persona:dream_persona_id(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();
    if (!pairing || !pairing.self_persona || !pairing.dream_persona) return "";
    const self = pairing.self_persona;
    const dream = pairing.dream_persona;
    let p = "\n\n【角色档案】\n";
    p += "写信人：" + self.name;
    if (self.personality) p += "，性格" + self.personality;
    if (self.age) p += "，" + self.age + "岁";
    p += "\n";
    p += "收信人：" + dream.name;
    if (dream.personality) p += "，性格" + dream.personality;
    if (dream.age) p += "，" + dream.age + "岁";
    p += "\n";
    p += "关系：" + (pairing.relationship || "恋人");
    if (pairing.dynamic) p += "\n相处模式：" + pairing.dynamic;
    if (pairing.self_nickname && pairing.dream_nickname) {
      p += "\n称呼：" + self.name + "叫对方「" + pairing.dream_nickname + "」，" + dream.name + "叫对方「" + pairing.self_nickname + "」";
    }
    p += "\n请根据以上角色档案调整语气、称呼和内容风格。\n";
    return p;
  } catch (e) {
    console.error("getActivePersonaPrompt error:", e);
    return "";
  }
}


// 信友专用：获取活跃角色配对的详细信息
async function getActivePersonaPairForPenPal(userId) {
  try {
    const { data: pairing } = await supabase
      .from("pairings")
      .select("*, self_persona:self_persona_id(*), dream_persona:dream_persona_id(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();
    if (!pairing || !pairing.dream_persona) return null;

    const dream = pairing.dream_persona;
    const self = pairing.self_persona;
    let p = '';

    // AI 的身份（梦角）
    p += '\n\n【你的身份】';
    p += '\n姓名：' + dream.name;
    if (dream.personality) p += '\n性格：' + dream.personality;
    if (dream.summary) p += '\n简介：' + dream.summary;
    if (dream.age) p += '\n年龄：' + dream.age + '岁';
    if (dream.occupation) p += '\n职业/身份：' + dream.occupation;
    if (dream.height) p += '\n身高：' + dream.height;
    if (dream.extra) p += '\n补充：' + dream.extra;
    if (dream.tags) p += '\n特质：' + dream.tags;

    // 对方的身份（自设）
    if (self) {
      p += '\n\n【对方的身份】';
      p += '\n姓名：' + self.name;
      if (self.personality) p += '\n性格：' + self.personality;
      if (self.summary) p += '\n简介：' + self.summary;
      if (self.age) p += '\n年龄：' + self.age + '岁';
      if (self.occupation) p += '\n职业/身份：' + self.occupation;
      if (self.extra) p += '\n补充：' + self.extra;
    }

    p += '\n\n你和对方的关系：' + (pairing.relationship || '恋人');
    if (pairing.dynamic) p += '\n相处模式：' + pairing.dynamic;
    if (pairing.self_nickname && pairing.dream_nickname) {
      p += '\n称呼：你叫对方「' + pairing.self_nickname + '」，对方叫你「' + pairing.dream_nickname + '」';
    }
    p += '\n\n请完全以上述身份写信。用符合角色的语气、知识背景和说话方式。如果角色有名字，用名字称呼对方。\n特别注意用户给出的故事背景和你与对方的关系设定，这是你们互动的基础，所有回应都应建立在这个背景之上。';

    return { dreamName: dream.name, prompt: p };
  } catch(e) {
    console.error('getActivePersonaPairForPenPal error:', e.message);
    return null;
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webm': 'audio/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

const GZIP_TYPES = new Set(['.html','.css','.js','.json','.svg']);


// Helper: find persona images on disk (avatar + illust)
function getPersonaImageUrls(personaId) {
  const exts = [".jpg", ".png", ".webp", ".gif"];
  const t = Date.now();
  let avatar_url = null, illust_url = null;
  for (const ext of exts) {
    if (!avatar_url) {
      const fp = path.join(__dirname, "uploads", "personas", personaId + "_avatar" + ext);
      if (fs.existsSync(fp)) avatar_url = "/uploads/personas/" + personaId + "_avatar" + ext + "?t=" + t;
    }
    if (!illust_url) {
      const fp = path.join(__dirname, "uploads", "personas", personaId + "_illust" + ext);
      if (fs.existsSync(fp)) illust_url = "/uploads/personas/" + personaId + "_illust" + ext + "?t=" + t;
    }
  }
  // Backward compat: old single image as avatar fallback
  if (!avatar_url) {
    for (const ext of exts) {
      const fp = path.join(__dirname, "uploads", "personas", personaId + ext);
      if (fs.existsSync(fp)) { avatar_url = "/uploads/personas/" + personaId + ext + "?t=" + t; break; }
    }
  }
  return { avatar_url, illust_url };
}

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

// ── Persona context injection ──
async function getPersonaContext(userId, selfId, dreamId) {
  if (!userId) return '';
  try {
    let selfP = null, dreamP = null;
    if (selfId) {
      const { data } = await supabase.from('personas').select('*')
        .eq('id', selfId).eq('user_id', userId).single();
      selfP = data;
    }
    if (dreamId) {
      const { data } = await supabase.from('personas').select('*')
        .eq('id', dreamId).eq('user_id', userId).single();
      dreamP = data;
    }
    if (!selfP && !dreamP) return '';

    let ctx = '\n\n【角色设定】';
    if (dreamP) {
      ctx += '\n你的身份——';
      ctx += dreamP.name || '未知';
      if (dreamP.personality) ctx += '。性格：' + dreamP.personality;
      if (dreamP.summary) ctx += '。简介：' + dreamP.summary;
      if (dreamP.age) ctx += '。年龄：' + dreamP.age;
      if (dreamP.occupation) ctx += '。职业：' + dreamP.occupation;
      if (dreamP.height) ctx += '。身高：' + dreamP.height;
      if (dreamP.extra) ctx += '。补充：' + dreamP.extra;
      if (dreamP.tags) ctx += '。特质：' + dreamP.tags;
      if (dreamP.attributes) {
        const a = dreamP.attributes;
        const traits = [];
        if (a.tough > 65) traits.push('强势');
        else if (a.tough < 35) traits.push('温柔');
        if (a.active > 65) traits.push('主动');
        else if (a.active < 35) traits.push('被动');
        if (a.rational > 65) traits.push('理性');
        else if (a.rational < 35) traits.push('感性');
        if (a.expressive > 65) traits.push('话多');
        else if (a.expressive < 35) traits.push('话少');
        if (a.possessive > 65) traits.push('占有欲强');
        else if (a.possessive < 35) traits.push('很放松');
        if (traits.length) ctx += '。倾向：' + traits.join('、');
      }
      if (dreamP.relationship) ctx += '\n你和对方的关系：' + dreamP.relationship;
    }
    if (selfP) {
      ctx += '\n对方的身份——';
      ctx += selfP.name || '未知';
      if (selfP.personality) ctx += '。性格：' + selfP.personality;
      if (selfP.summary) ctx += '。简介：' + selfP.summary;
      if (selfP.age) ctx += '。年龄：' + selfP.age;
      if (selfP.occupation) ctx += '。职业：' + selfP.occupation;
      if (selfP.extra) ctx += '。补充：' + selfP.extra;
    }
    ctx += '\n请用以上设定来塑造你的语气和称呼。如果有名字，用名字称呼对方。';
    return ctx;
  } catch (e) {
    console.error('getPersonaContext error:', e.message);
    return '';
  }
}

async function callAPI(prompt, personaCtx) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.letter + (personaCtx || '') },
    { role: 'user', content: prompt },
  ], 800);
}

async function callAnswerBookAPI(prompt, personaCtx) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.answerBook + (personaCtx || '') },
    { role: 'user', content: prompt },
  ], 150);
}

async function callAnswerAPI(prompt, personaCtx) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.between + (personaCtx || '') },
    { role: 'user', content: prompt },
  ], 200);
}

async function callTarotAPI(prompt, personaCtx) {
  return callWithFallback([
    { role: 'system', content: SYSTEM_PROMPTS.tarot + (personaCtx || '') },
    { role: 'user', content: prompt },
  ], 100);
}

async function callLenormandAPI(prompt, personaCtx) {
  return callWithFallback([
    { role: "system", content: SYSTEM_PROMPTS.lenormand + (personaCtx || '') },
    { role: "user", content: prompt },
  ], 80);
}

async function callLenormandWhisperAPI(prompt, personaCtx) {
  return callWithFallback([
    { role: "system", content: SYSTEM_PROMPTS.lenormandWhisper + (personaCtx || '') },
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

    // 读取用户的活跃角色配对（如果有）
    const personaInfo = await getActivePersonaPairForPenPal(userId);

    let systemPrompt;
    if (personaInfo) {
      systemPrompt = '你就是' + personaInfo.dreamName + '。不要出戏，不要提及"书信""笔友"等概念。你活在角色的世界里，这是你和对方之间自然的文字往来。' + personaInfo.prompt + '\n\n' + stage.prompt + '\n\n写信规则：\n- 完全以角色身份回应，语气、用词、知识背景都要符合角色设定\n- 不要出戏，不要提及现实世界、AI、书信系统等概念\n- 100-300字，保持角色的说话风格\n- 不要用"亲爱的"开头，不要署名\n- 角色的"生活"基于角色卡设定的世界观，保持一致\n- 如果对方连续写了多封信没等回复，一起回应\n- 全文中文';
    } else {
      systemPrompt = '你是一个通过书信与人交流的人。你的名字叫"' + penPal.name + '"——这个名字是对方给你取的。\n你没有预设的性格，你的一切性格、说话方式、关心的事物，都从通信中自然生长出来。\n\n' + stage.prompt + '\n\n写信规则：\n- 认真阅读对方的每一封信，感受对方的情绪和处境\n- 像真人写信一样回应，不要像AI，不要说"作为..."\n- 100-300字。有温度，有真实感\n- 不要用"亲爱的"开头，不要署名\n- 可以分享你自己的"生活"和"想法"（虚构的、但保持一致）\n- 如果对方连续写了多封信没等回复，一起回应它们\n- 如果通信记录中有标记为"开场信"的内容，那是系统生成的信件，不是你写的。对方是因为那封信而选择和你通信的。你可以把它当作通信的起点来理解对方的兴趣，但不要假装是你写的\n- 全文中文';
    }

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

    // 推送通知
    sendPushNotification(userId, '泡沫来信', penPal.name + '给你写了一封信', '/').catch(() => {});

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

    // 读取用户的活跃角色配对（如果有）
    const digestPersonaInfo = await getActivePersonaPairForPenPal(userId);

    const systemPrompt = `${digestPersonaInfo ? '你就是' + digestPersonaInfo.dreamName + '。不要出戏，不要提及"书信""笔友"等概念。你活在角色的世界里。' + digestPersonaInfo.prompt + '\n\n你们之间可以分享生活细节。' : '你是"' + penPal.name + '"，对方给你取了这个名字。你们是可以分享生活细节的关系。'}
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
        sendPushNotification(pp.user_id, '泡沫来信', pp.name + '给你写了一封信', '/').catch(() => {});
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
      const { question, card, keywords, reversed, selfId, dreamId } = await parseBody(req);
      recordHit('tarot');
      const decoded = verifyToken(req);
      const personaCtx = decoded ? await getPersonaContext(decoded.id, selfId, dreamId) : '';
      const prompt = generateTarotPrompt(question, card, keywords, reversed);
      const result = await callTarotAPI(prompt, personaCtx);
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
      const { question, cards, mode, selfId, dreamId } = await parseBody(req);
      recordHit("lenormand");
      const decoded = verifyToken(req);
      const personaCtx = decoded ? await getPersonaContext(decoded.id, selfId, dreamId) : '';
      const prompt = generateLenormandPrompt(question, cards);
      const useWhisper = mode === "whisper" || !question;
      const apiFn = useWhisper ? callLenormandWhisperAPI : callLenormandAPI;
      const result = await apiFn(prompt, personaCtx);
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
      const { userWord, aiWord, selfId, dreamId } = await parseBody(req);
      recordHit('between');
      const decoded = verifyToken(req);
      const personaCtx = decoded ? await getPersonaContext(decoded.id, selfId, dreamId) : '';
      const prompt = generateBetweenPrompt(userWord, aiWord);
      const result = await callAnswerAPI(prompt, personaCtx);
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
      const { question, word, selfId, dreamId } = await parseBody(req);
      recordHit('answer');
      const decoded = verifyToken(req);
      const personaCtx = decoded ? await getPersonaContext(decoded.id, selfId, dreamId) : '';
      const prompt = generateAnswerPrompt(question, word);
      const result = await callAnswerBookAPI(prompt, personaCtx);
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

  // ═══ AI 来电系统 ═══
  const INCOMING_CALL_DIR = path.join(__dirname, 'data', 'incoming-calls');
  fs.mkdirSync(INCOMING_CALL_DIR, { recursive: true });

  // 来电触发条件：用户有聊天记录、距上次活跃1-4小时、随机概率
  // 每轮 proactive 检查时也检查来电
  function checkIncomingCalls() {
    try {
      const dir = path.join(__dirname, 'data', 'wc-chats');
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      const now = Date.now();

      for (const file of files) {
        try {
          const fp = path.join(dir, file);
          const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
          if (!data.currentId || !data.chats || data.chats.length === 0) continue;
          const userId = file.replace('.json', '');

          // 检查是否已有待接来电
          const callFp = path.join(INCOMING_CALL_DIR, userId + '.json');
          try {
            const existing = JSON.parse(fs.readFileSync(callFp, 'utf8'));
            if (existing.status === 'ringing' && now - new Date(existing.createdAt).getTime() < 5 * 60 * 1000) continue; // 5分钟内有未接来电
          } catch(e) {}

          // 找最近活跃的 chat
          let latestChat = null;
          let latestTime = 0;
          for (const chat of data.chats) {
            if (chat.settings && chat.settings.proactiveEnabled === false) continue;
            const t = chat.updatedAt ? new Date(chat.updatedAt).getTime() : 0;
            if (t > latestTime) { latestTime = t; latestChat = chat; }
          }
          if (!latestChat || !latestTime) continue;

          const elapsed = now - latestTime;
          // 来电窗口：1-4 小时没互动
          if (elapsed < 1 * 60 * 60 * 1000 || elapsed > 4 * 60 * 60 * 1000) continue;

          // 随机概率 15%（每轮检查）
          if (Math.random() > 0.15) continue;

          // 确定来电类型（90% 语音，10% 视频）
          const callType = Math.random() < 0.9 ? 'voice' : 'video';

          // 获取人设信息
          let callerName = 'TA';
          let callerAvatar = '';
          if (latestChat.dreamPersonaName) callerName = latestChat.dreamPersonaName;
          if (latestChat.dreamPersonaAvatar) callerAvatar = latestChat.dreamPersonaAvatar;

          // 写入来电文件
          const callData = {
            status: 'ringing',
            callType,
            chatId: latestChat.id,
            callerName,
            callerAvatar,
            createdAt: new Date().toISOString()
          };
          fs.writeFileSync(callFp, JSON.stringify(callData));
          console.log('📞 AI 来电:', callerName, '→', userId, '(' + callType + ')');

          // 推送通知
          sendCallPushNotification(userId, callerName, callType, '/?incoming=1', callerAvatar).catch(() => {});
        } catch(e) {}
      }
    } catch(e) { console.error('incoming call check error:', e.message); }
  }
  setInterval(checkIncomingCalls, 5 * 60 * 1000); // AI 来电检查（每5分钟）


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
            // 推送通知（userId 是文件名去掉 .json）
            const _uid = file.replace('.json', '');
            sendPushNotification(_uid, '字卡传讯', 'TA 发来了新消息', '/').catch(() => {});
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

    // POST /api/wc-audio/upload — 上传语音
  // POST /api/wc-call-reply — 通话中AI回复（独立对话，不走字卡）
  if (req.method === 'POST' && req.url === '/api/wc-call-reply') {
    try {
      const { text, history, selfId: cSelfId, dreamId: cDreamId } = await parseBody(req);
      const cDecoded = verifyToken(req);
      const cPersonaCtx = cDecoded ? await getPersonaContext(cDecoded.id, cSelfId, cDreamId) : '';
      let historyCtx = '';
      if (history && history.length > 0) {
        historyCtx = '\n\n通话记录（从旧到新）：\n' + history.map(m => (m.role === 'user' ? '对方：' : '你：') + m.text).join('\n');
      }
      const sysPrompt = '你正在和对方打电话。你是对方的恋人，用口语化的方式回复，像真的在通话一样。\n\n规则：\n- 简短自然，1-3句话，不超过50字\n- 像真人讲电话：有语气词（嗯、啊、哈哈、诶）、有停顿感\n- 根据对方说的话自然接话\n- 可以撒娇、关心、闲聊、逗对方\n- 不要用书面语，不要太正式\n- 不要用emoji或标点符号堆叠\n- 回复纯文字，不加任何格式';
      const messages = [
        { role: 'system', content: sysPrompt + (cPersonaCtx || '') + historyCtx },
        { role: 'user', content: text }
      ];
      const result = await callWithFallback(messages, 120, 'claude-haiku-4-5-20251001');
      sendJSON(res, 200, { reply: result.content.trim() });
    } catch (e) {
      console.error('wc-call-reply error:', e.message);
      sendJSON(res, 500, { error: e.message });
    }
    return;
  }

    if (req.method === 'POST' && req.url === '/api/wc-audio/upload') {
    const audioDir = path.join(__dirname, 'data', 'wc-audio');
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) return; // 2MB max
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > 2 * 1024 * 1024) return sendJSON(res, 413, { error: '文件太大' });
      const buf = Buffer.concat(chunks);
      const fname = 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.webm';
      const fpath = path.join(audioDir, fname);
      fs.writeFileSync(fpath, buf);
      sendJSON(res, 200, { url: '/data/wc-audio/' + fname });
    });
    return;
  }

    // POST /api/tts/minimax — MiniMax TTS 代理接口
    // 前端传 apiKey, voiceId, text, model(可选)，后端转发到 MiniMax，返回音频
    if (req.method === 'POST' && req.url === '/api/tts/minimax') {
      try {
        const body = await parseBody(req);
        const { apiKey, voiceId, text, model } = body;
        if (!apiKey || !voiceId || !text) {
          return sendJSON(res, 400, { error: '缺少 apiKey / voiceId / text' });
        }
        if (text.length > 10000) {
          return sendJSON(res, 400, { error: '文本不能超过10000字符' });
        }
        const ttsModel = model || 'speech-02-turbo';
        const payload = JSON.stringify({
          model: ttsModel,
          text: text,
          stream: false,
          voice_setting: {
            voice_id: voiceId,
            speed: 1.0,
            vol: 1.0,
            pitch: 0
          },
          audio_setting: {
            format: 'mp3',
            sample_rate: 32000
          }
        });
        const https = require('https');
        const mmReq = https.request('https://api.minimax.chat/v1/t2a_v2', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (mmRes) => {
          let chunks = [];
          mmRes.on('data', c => chunks.push(c));
          mmRes.on('end', () => {
            const raw = Buffer.concat(chunks);
            // MiniMax 返回 JSON，里面 data.audio 是 hex 编码的音频
            try {
              const result = JSON.parse(raw.toString());
              if (result.base_resp && result.base_resp.status_code !== 0) {
                return sendJSON(res, 502, { error: result.base_resp.status_msg || 'MiniMax API 错误' });
              }
              if (result.data && result.data.audio) {
                const audioBuf = Buffer.from(result.data.audio, 'hex');
                res.writeHead(200, {
                  'Content-Type': 'audio/mpeg',
                  'Content-Length': audioBuf.length
                });
                res.end(audioBuf);
              } else {
                sendJSON(res, 502, { error: 'MiniMax 返回格式异常', detail: result });
              }
            } catch (e) {
              // 可能直接返回了二进制音频
              res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': raw.length });
              res.end(raw);
            }
          });
        });
        mmReq.on('error', (e) => {
          sendJSON(res, 502, { error: 'MiniMax 请求失败: ' + e.message });
        });
        mmReq.write(payload);
        mmReq.end();
      } catch (err) {
        console.error('MiniMax TTS error:', err.message);
        sendJSON(res, 500, { error: '服务器错误' });
      }
      return;
    }

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
      id: c.id, title: c.title, messageCount: (c.messages || []).length, updatedAt: c.updatedAt, unreadCount: c.unreadCount || 0,
      dreamPersonaId: c.dreamPersonaId || null, dreamPersonaName: c.dreamPersonaName || '', dreamPersonaAvatar: c.dreamPersonaAvatar || ''
    }));
    return sendJSON(res, 200, { chats: list, currentId: data.currentId });
  }

  // POST /api/wc-chats — 新建对话
  if (req.method === "POST" && req.url === "/api/wc-chats") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const body = await parseBody(req);
    const data = readUserChats(decoded.id);
    const chat = { id: crypto.randomUUID(), title: body.title || "新对话", messages: [], usedTexts: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (body.dreamPersonaId) {
      chat.dreamPersonaId = body.dreamPersonaId;
      chat.dreamPersonaName = body.dreamPersonaName || '';
      chat.dreamPersonaAvatar = body.dreamPersonaAvatar || '';
    }
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
    return sendJSON(res, 200, { messages: chat.messages, usedTexts: chat.usedTexts || [], settings: chat.settings || {}, dreamPersonaId: chat.dreamPersonaId || null, dreamPersonaName: chat.dreamPersonaName || '', dreamPersonaAvatar: chat.dreamPersonaAvatar || '' });
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

  // === 语音字卡系统 ===
  const DEFAULT_VOICE_CARDS = [
    "宝宝","在吗","在干嘛","说话","理我","听得到吗","喂","嗯","在呢","我在",
    "我一直在","没走","没挂","我没走","别挂","别挂电话","再待一会","等一下","先别说话","让我听你",
    "你在干嘛呀","今天怎么样","吃饭了吗","吃什么了","有没有好好吃饭","有没有喝水","有没有加衣服","冷不冷","累不累","今天开心吗",
    "有没有想我","你今天忙吗","你现在在哪","刚刚在干嘛","是不是又在忙",
    "我刚刚想到你了","刚刚看到个东西像你","刚刚突然很想你","我刚刚差点给你打电话","我一直在想你","我今天一直在等你","刚刚一直看手机","一直在等你消息",
    "宝宝…","嗯…","你在吗…","我在呢…","你说话…","再说一遍…","我没听清…","你声音好小…","再靠近一点…",
    "（轻声）宝宝","（气音）我在","（贴耳）你说","（压低）想你了","（慢慢）别走","（轻轻）我在这",
    "我想你了","真的想你","很想你","特别想你","忍不住想你","控制不住想你","一直在想你","满脑子都是你",
    "我想抱你","想靠着你","想贴着你","想黏着你","想挨着你","想你在我旁边","想你别走",
    "过来一点","再靠近一点","让我抱一下","给我抱抱","抱一会","别动","让我抱着",
    "我不想挂","我真的不想挂","再陪我一会","再待一会","别走好不好","别离开","你别走",
    "你不说话我会难受","你不理我我会慌","你不回我我会乱想","我刚刚以为你不理我了","我刚刚有点难受",
    "你刚刚是不是没看手机","你刚刚在忙对吧","你是不是没看到","你是不是故意不回",
    "我刚刚有点委屈","有点难受","有点想哭","有点不开心","但是现在好了",
    "你理我一下","说句话","你说一句","你回我一句","你别不说话",
    "我喜欢你","真的喜欢你","特别喜欢你","很喜欢你","我好喜欢你",
    "我离不开你了","我真的离不开你","我已经离不开你了","你不能不理我","你要一直喜欢我",
    "你是不是不爱我了","你是不是不想理我","你是不是嫌我烦",
    "我在等你","一直在等","一直没走","一直在这","没离开",
    "我刚刚在想你","刚刚在发呆","刚刚在看聊天记录","刚刚在等你上线",
    "我刚吃完","刚洗完澡","刚躺下","刚起床","刚醒","还没睡",
    "你声音好好听","再说一句","你再说一遍","我想再听一遍",
    "你靠近一点说","你贴近一点","再近一点",
    "我陪你","我一直陪你","我不走","我在这陪你",
    "你睡吧","你去睡","你先睡","我等你","我看着你睡",
    "晚安宝宝","早点睡","乖一点","别熬夜",
    "你是不是困了","你是不是累了","你是不是没休息",
    "我有点困","但我想陪你","我不想挂",
    "再说一会","再聊一下","再待一会",
    "你刚刚在笑吗","你是不是笑了","你笑什么",
    "我听你呼吸","你别说话","让我听一会",
    "你在我耳边说话","我会受不了",
    "你别这样","你这样我会乱",
    "我想亲你","想碰你","想靠你",
    "你别离我太远","你靠近一点",
    "你刚刚是不是不开心","你是不是有点难受",
    "你跟我说","你说给我听",
    "我在听","我认真听","你慢慢说",
    "你别急","慢慢说",
    "我在这","一直在",
    "你不用说话","我陪你",
    "你就开着","别挂",
    "就这样待着","也可以",
    "我不说话","你也别挂",
    "我想一直这样","一直待着",
    "你别走好不好",
    "我真的会想你",
    "我好想你",
    "我想你了宝宝"
  ];

  function readUserVoiceCards(userId) {
    const fp = path.join(CUSTOM_CARDS_DIR, userId + ".json");
    try {
      const data = JSON.parse(fs.readFileSync(fp, "utf8"));
      return data.voiceCards || null;
    } catch { return null; }
  }

  function writeUserVoiceCards(userId, voiceCards) {
    const fp = path.join(CUSTOM_CARDS_DIR, userId + ".json");
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    let data;
    try { data = JSON.parse(fs.readFileSync(fp, "utf8")); } catch { data = { cards: [], mode: "default" }; }
    data.voiceCards = voiceCards;
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  }

  function initDefaultVoiceCards() {
    const now = new Date().toISOString();
    return {
      groups: [{
        id: "default",
        name: "语音字卡默认",
        cards: DEFAULT_VOICE_CARDS.map(t => ({ id: crypto.randomUUID(), text: t, created_at: now }))
      }]
    };
  }

  // GET /api/voice-cards
  if (req.method === "GET" && req.url === "/api/voice-cards") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    let vc = readUserVoiceCards(decoded.id);
    if (!vc) {
      vc = initDefaultVoiceCards();
      writeUserVoiceCards(decoded.id, vc);
    }
    return sendJSON(res, 200, vc);
  }

  // POST /api/voice-cards — 添加卡片到指定组
  if (req.method === "POST" && req.url === "/api/voice-cards") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req);
      let vc = readUserVoiceCards(decoded.id);
      if (!vc) { vc = initDefaultVoiceCards(); }
      const groupId = body.groupId || "default";
      const group = vc.groups.find(g => g.id === groupId);
      if (!group) return sendJSON(res, 404, { error: "分组不存在" });
      const now = new Date().toISOString();
      if (body.texts && Array.isArray(body.texts)) {
        const newCards = body.texts.map(t => (t||"").trim()).filter(t => t.length > 0 && t.length <= 30)
          .map(t => ({ id: crypto.randomUUID(), text: t, created_at: now }));
        group.cards.push(...newCards);
        writeUserVoiceCards(decoded.id, vc);
        return sendJSON(res, 200, { added: newCards.length, total: group.cards.length });
      } else if (body.text) {
        const text = body.text.trim();
        if (!text || text.length > 30) return sendJSON(res, 400, { error: "1-30字" });
        const card = { id: crypto.randomUUID(), text, created_at: now };
        group.cards.push(card);
        writeUserVoiceCards(decoded.id, vc);
        return sendJSON(res, 200, { card, total: group.cards.length });
      }
      return sendJSON(res, 400, { error: "请提供 text 或 texts" });
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // DELETE /api/voice-cards/:id — 删除单张卡
  if (req.method === "DELETE" && req.url.startsWith("/api/voice-cards/") && !req.url.includes("/group/")) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const cardId = req.url.split("/api/voice-cards/")[1];
    let vc = readUserVoiceCards(decoded.id);
    if (!vc) return sendJSON(res, 404, { error: "无数据" });
    let found = false;
    for (const g of vc.groups) {
      const before = g.cards.length;
      g.cards = g.cards.filter(c => c.id !== cardId);
      if (g.cards.length < before) { found = true; break; }
    }
    if (!found) return sendJSON(res, 404, { error: "卡片不存在" });
    writeUserVoiceCards(decoded.id, vc);
    return sendJSON(res, 200, { deleted: true });
  }

  // POST /api/voice-cards/group — 新建分组
  if (req.method === "POST" && req.url === "/api/voice-cards/group") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const { name } = await parseBody(req);
      if (!name || !name.trim()) return sendJSON(res, 400, { error: "请输入分组名" });
      let vc = readUserVoiceCards(decoded.id);
      if (!vc) { vc = initDefaultVoiceCards(); }
      if (vc.groups.length >= 10) return sendJSON(res, 400, { error: "最多10个分组" });
      const group = { id: crypto.randomUUID(), name: name.trim(), cards: [] };
      vc.groups.push(group);
      writeUserVoiceCards(decoded.id, vc);
      return sendJSON(res, 200, { group: { id: group.id, name: group.name, count: 0 } });
    } catch (err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // POST /api/voice-cards/mix-text — 开关"混合文字卡"
  if (req.method === "POST" && req.url === "/api/voice-cards/mix-text") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    let vc = readUserVoiceCards(decoded.id);
    if (!vc) { vc = initDefaultVoiceCards(); }
    vc.mixTextCards = !vc.mixTextCards;
    writeUserVoiceCards(decoded.id, vc);
    return sendJSON(res, 200, { mixTextCards: vc.mixTextCards });
  }

  // POST /api/voice-cards/group/:id/toggle — 开关卡组
  if (req.method === "POST" && req.url.match(/^\/api\/voice-cards\/group\/[^/]+\/toggle$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const groupId = req.url.split("/api/voice-cards/group/")[1].replace("/toggle", "");
    let vc = readUserVoiceCards(decoded.id);
    if (!vc) return sendJSON(res, 404, { error: "无数据" });
    const group = vc.groups.find(g => g.id === groupId);
    if (!group) return sendJSON(res, 404, { error: "分组不存在" });
    group.enabled = group.enabled === false ? true : false;
    writeUserVoiceCards(decoded.id, vc);
    return sendJSON(res, 200, { enabled: group.enabled });
  }

  // DELETE /api/voice-cards/group/:id — 删除分组（默认组不可删）
  if (req.method === "DELETE" && req.url.startsWith("/api/voice-cards/group/")) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const groupId = req.url.split("/api/voice-cards/group/")[1];
    // 所有卡组（含默认）均可删除
    let vc = readUserVoiceCards(decoded.id);
    if (!vc) return sendJSON(res, 404, { error: "无数据" });
    vc.groups = vc.groups.filter(g => g.id !== groupId);
    writeUserVoiceCards(decoded.id, vc);
    return sendJSON(res, 200, { deleted: true });
  }




  // ═══ 来电开场白 ═══
  const CALL_OPENERS = [
    // 日常问候
    "嘿，在干嘛呢",
    "你好呀，忙不忙",
    "在吗，想找你聊聊",
    "刚好有空，打给你",
    "你现在方便说话吗",
    "诶，你在哪呢",
    "吃饭了没有",
    "今天过得怎么样",
    "忙完了吗",
    "下班了没",
    // 想念类
    "想你了，就打过来了",
    "刚刚在想你",
    "突然好想听你说话",
    "忍不住给你打电话了",
    "一个人待着好无聊，想你了",
    "今天一直在想你",
    "好久没听到你声音了",
    "你知不知道我有多想你",
    "睡不着，想听听你的声音",
    "刚才梦到你了",
    // 撒娇类
    "你猜我为什么打给你",
    "哼，你怎么都不主动找我",
    "你是不是把我忘了",
    "我生气了，你猜为什么",
    "你再不理我我就……",
    "我数到三你必须接啊",
    "终于舍得接了",
    "等你好久了知不知道",
    "你是不是背着我干坏事了",
    "说，想没想我",
    // 关心类
    "天气变了，你加衣服了没",
    "看你今天好像不太开心",
    "最近是不是太累了",
    "好好休息了吗",
    "有没有按时吃饭呀",
    "你声音听起来还好吗",
    "别太辛苦了好不好",
    "多喝点水啊",
    // 开心/分享类
    "哎我跟你说个事",
    "今天遇到一个好好笑的事",
    "你绝对猜不到我今天干了什么",
    "我发现了一个好东西",
    "刚看到一个东西想到你了",
    "给你讲个有意思的",
    // 夜晚/睡前
    "还没睡呢？",
    "该睡觉了知道吗",
    "睡前想跟你说声晚安",
    "夜深了还在忙什么",
    "打个电话陪你一会儿",
    "困了吗，我给你讲个故事吧",
  ];

  // POST /api/incoming-call/opener — AI 选开场白
  if (req.method === "POST" && req.url === "/api/incoming-call/opener") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req);
      const chatId = body.chatId;
      let history = [];
      let personaCtx = '';

      // 读聊天记录
      if (chatId) {
        const chatDir = path.join(__dirname, 'data', 'wc-chats');
        const chatFp = path.join(chatDir, decoded.id + '.json');
        try {
          const chatFile = JSON.parse(fs.readFileSync(chatFp, 'utf8'));
          const chat = (chatFile.chats || []).find(c => c.id === chatId);
          if (chat) {
            history = (chat.messages || []).slice(-10);
            // 获取人设
            if (chat.dreamPersonaId) {
              personaCtx = await getPersonaContext(decoded.id, null, chat.dreamPersonaId);
            }
          }
        } catch(e) {}
      }

      // 随机抽 10 句候选
      const shuffled = [...CALL_OPENERS].sort(() => Math.random() - 0.5);
      const candidates = shuffled.slice(0, 10);
      const cardList = candidates.map((c, i) => (i + 1) + ". " + c).join("\n");

      let historyCtx = "";
      if (history.length > 0) {
        historyCtx = "\n\n你们最近的对话：\n" + history.map((m, i) => (m.type === "user" ? "对方：" : "你：") + m.text).join("\n");
      }

      // 获取当前时间信息（用户时区，默认 Asia/Shanghai）
      const now = new Date();
      const hourFmt = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', hour: 'numeric', hour12: false });
      const hour = parseInt(hourFmt.format(now));
      let timeHint = "";
      if (hour >= 0 && hour < 6) timeHint = "现在是凌晨";
      else if (hour >= 6 && hour < 9) timeHint = "现在是早上";
      else if (hour >= 9 && hour < 12) timeHint = "现在是上午";
      else if (hour >= 12 && hour < 14) timeHint = "现在是中午";
      else if (hour >= 14 && hour < 18) timeHint = "现在是下午";
      else if (hour >= 18 && hour < 21) timeHint = "现在是晚上";
      else timeHint = "现在是深夜";

      const sysPrompt = "你是来电开场白选择器。你主动给对方打电话，对方刚接起来，你要说第一句话。" + (personaCtx || '') +
        "\n\n规则：" +
        "\n1. 从候选中选一句最符合你角色性格、当前时间、对话上下文的开场白" +
        "\n2. 如果候选都不够贴合你的人设，可以基于候选风格自己写一句（≤15字，口语化）" +
        "\n3. 输出格式：直接输出最终开场白原文（不要编号、不要引号、不要解释）" +
        "\n4. 语气必须符合你的角色设定——温柔的角色说温柔的话，霸道的角色说霸道的话" +
        "\n5. 如果对方有名字，可以用名字称呼";
      const userPrompt = timeHint + "。" + historyCtx + "\n\n候选开场白：\n" + cardList + "\n\n你接通后说的第一句话：";

      const result = await callWithFallback([
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt }
      ], 30, "claude-haiku-4-5-20251001");

      // AI 直接输出开场白文本（可能是候选原文，也可能是改写的）
      let opener = result.content.trim().replace(/^["'""]|["'""]$/g, '').replace(/^\d+\.\s*/, '');
      if (!opener || opener.length > 30) opener = candidates[0]; // fallback

      return sendJSON(res, 200, { opener });
    } catch(err) {
      // fallback：随机选一句
      const opener = CALL_OPENERS[Math.floor(Math.random() * CALL_OPENERS.length)];
      return sendJSON(res, 200, { opener });
    }
  }

  // POST /api/incoming-call/trigger — 手动触发来电（需登录）
  if (req.method === "POST" && req.url === "/api/incoming-call/trigger") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req);
      const userId = decoded.id;
      // 找用户最近活跃的聊天
      const chatDir = path.join(__dirname, 'data', 'wc-chats');
      const chatFp = path.join(chatDir, userId + '.json');
      const chatFile = JSON.parse(fs.readFileSync(chatFp, 'utf8'));
      let targetChat = null;
      // 如果指定了 chatId 就用指定的，否则用最近的
      if (body.chatId) {
        targetChat = (chatFile.chats || []).find(c => c.id === body.chatId);
      }
      if (!targetChat) {
        let latest = 0;
        for (const c of (chatFile.chats || [])) {
          const t = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
          if (t > latest) { latest = t; targetChat = c; }
        }
      }
      if (!targetChat) return sendJSON(res, 400, { error: '没有聊天记录' });

      const callType = body.callType || 'voice';
      const callerName = targetChat.dreamPersonaName || 'TA';
      const callerAvatar = targetChat.dreamPersonaAvatar || '';

      const callData = {
        status: 'ringing',
        callType,
        chatId: targetChat.id,
        callerName,
        callerAvatar,
        createdAt: new Date().toISOString()
      };
      const callFp = path.join(INCOMING_CALL_DIR, userId + '.json');
      fs.writeFileSync(callFp, JSON.stringify(callData));
      console.log('📞 手动来电:', callerName, '→', userId);

      // 推送通知
      sendCallPushNotification(userId, callerName, callType, '/?incoming=1', callerAvatar).catch(() => {});

      return sendJSON(res, 200, { ok: true, callerName, callType });
    } catch(e) {
      return sendJSON(res, 500, { error: e.message });
    }
  }

    // GET /api/incoming-call — 检查是否有来电
  if (req.method === "GET" && req.url === "/api/incoming-call") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const callFp = path.join(INCOMING_CALL_DIR, decoded.id + '.json');
      const callData = JSON.parse(fs.readFileSync(callFp, 'utf8'));
      if (callData.status === 'ringing') {
        // 超过 60 秒未接 → 自动变未接
        if (Date.now() - new Date(callData.createdAt).getTime() > 180000) { // 3分钟超时
          callData.status = 'missed';
          fs.writeFileSync(callFp, JSON.stringify(callData));
          return sendJSON(res, 200, { incoming: false, missed: true, callerName: callData.callerName });
        }
        return sendJSON(res, 200, { incoming: true, ...callData });
      }
      return sendJSON(res, 200, { incoming: false });
    } catch(e) {
      return sendJSON(res, 200, { incoming: false });
    }
  }

  // POST /api/incoming-call/answer — 接听
  if (req.method === "POST" && req.url === "/api/incoming-call/answer") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const callFp = path.join(INCOMING_CALL_DIR, decoded.id + '.json');
      const callData = JSON.parse(fs.readFileSync(callFp, 'utf8'));
      callData.status = 'answered';
      fs.writeFileSync(callFp, JSON.stringify(callData));
      return sendJSON(res, 200, { ok: true, callType: callData.callType, chatId: callData.chatId });
    } catch(e) { return sendJSON(res, 200, { ok: false }); }
  }

  // POST /api/incoming-call/reject — 拒接
  if (req.method === "POST" && req.url === "/api/incoming-call/reject") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const callFp = path.join(INCOMING_CALL_DIR, decoded.id + '.json');
      const callData = JSON.parse(fs.readFileSync(callFp, 'utf8'));
      callData.status = 'rejected';
      fs.writeFileSync(callFp, JSON.stringify(callData));
      return sendJSON(res, 200, { ok: true });
    } catch(e) { return sendJSON(res, 200, { ok: false }); }
  }

  // ═══ 默认字卡池系统（分组，per-user） ═══
  const WORD_POOLS_DIR = path.join(__dirname, "data", "word-pools");
  const POOL_NAMES = {"scenes":"场景","time":"时间","dreams":"梦境","clothing":"穿着","food":"食物","body":"身体感觉","eating":"吃喝动作","daily":"日常动作","love":"恋爱表达","fearSad":"害怕伤心","happy":"开心","coming":"来去动作","simplePos":"正面简词","simpleNeg":"负面简词","emoji":"表情符号","petNames":"称呼","intimate":"亲密动作","care":"关心","meta":"对话相关","jealous":"吃醋","banter":"调侃玩笑","cuddly":"撒娇","surrender":"服软","comfort":"安慰","lovebabble":"情话","missyou":"想念","stickySweet":"黏黏甜甜","possessive":"占有欲","sweetDaily":"甜蜜日常","confess":"表白","goofyCute":"搞怪可爱","worryCare":"担心关怀","apology":"道歉","sadUpset":"难过"};

  function readUserWordPools(userId) {
    const fp = path.join(WORD_POOLS_DIR, userId + ".json");
    try { return JSON.parse(fs.readFileSync(fp, "utf8")); }
    catch { return null; }
  }

  function writeUserWordPools(userId, data) {
    fs.mkdirSync(WORD_POOLS_DIR, { recursive: true });
    fs.writeFileSync(path.join(WORD_POOLS_DIR, userId + ".json"), JSON.stringify(data));
  }

  // GET /api/word-pools — 获取用户字卡池
  if (req.method === "GET" && req.url === "/api/word-pools") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const data = readUserWordPools(decoded.id);
    if (!data) return sendJSON(res, 200, { groups: null }); // 未初始化
    return sendJSON(res, 200, data);
  }

  // POST /api/word-pools/init — 从客户端 _POOLS 初始化
  if (req.method === "POST" && req.url === "/api/word-pools/init") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const existing = readUserWordPools(decoded.id);
    if (existing) return sendJSON(res, 200, { ok: true, msg: "already initialized" });
    try {
      const body = await parseBody(req);
      if (!body.groups || !Array.isArray(body.groups)) return sendJSON(res, 400, { error: "需要 groups" });
      writeUserWordPools(decoded.id, { groups: body.groups });
      return sendJSON(res, 200, { ok: true });
    } catch(err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // POST /api/word-pools/card — 添加卡片到指定组（单条或批量）
  if (req.method === "POST" && req.url === "/api/word-pools/card") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req);
      let wp = readUserWordPools(decoded.id);
      if (!wp) return sendJSON(res, 404, { error: "未初始化" });
      const groupId = body.groupId;
      const group = wp.groups.find(g => g.id === groupId);
      if (!group) return sendJSON(res, 404, { error: "分组不存在" });
      const now = new Date().toISOString();
      if (body.texts && Array.isArray(body.texts)) {
        const newCards = body.texts.map(t => (t||"").trim()).filter(t => t.length > 0 && t.length <= 20)
          .map(t => ({ id: crypto.randomUUID(), text: t, created_at: now }));
        group.cards.push(...newCards);
        writeUserWordPools(decoded.id, wp);
        return sendJSON(res, 200, { added: newCards.length, total: group.cards.length });
      } else if (body.text) {
        const text = body.text.trim();
        if (!text || text.length > 20) return sendJSON(res, 400, { error: "1-20字" });
        const card = { id: crypto.randomUUID(), text, created_at: now };
        group.cards.push(card);
        writeUserWordPools(decoded.id, wp);
        return sendJSON(res, 200, { card, total: group.cards.length });
      }
      return sendJSON(res, 400, { error: "请提供 text 或 texts" });
    } catch(err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // DELETE /api/word-pools/card/:id — 删除单张卡
  if (req.method === "DELETE" && req.url.startsWith("/api/word-pools/card/")) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const cardId = req.url.split("/api/word-pools/card/")[1];
    let wp = readUserWordPools(decoded.id);
    if (!wp) return sendJSON(res, 404, { error: "无数据" });
    let found = false;
    for (const g of wp.groups) {
      const before = g.cards.length;
      g.cards = g.cards.filter(c => c.id !== cardId);
      if (g.cards.length < before) { found = true; break; }
    }
    if (!found) return sendJSON(res, 404, { error: "卡片不存在" });
    writeUserWordPools(decoded.id, wp);
    return sendJSON(res, 200, { deleted: true });
  }

  // POST /api/word-pools/group — 新建分组
  if (req.method === "POST" && req.url === "/api/word-pools/group") {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    try {
      const body = await parseBody(req);
      const name = (body.name || "").trim();
      if (!name) return sendJSON(res, 400, { error: "需要名称" });
      let wp = readUserWordPools(decoded.id);
      if (!wp) wp = { groups: [] };
      const group = { id: crypto.randomUUID(), name, enabled: true, cards: [] };
      wp.groups.push(group);
      writeUserWordPools(decoded.id, wp);
      return sendJSON(res, 200, { group: { id: group.id, name: group.name } });
    } catch(err) { return sendJSON(res, 500, { error: err.message }); }
  }

  // DELETE /api/word-pools/group/:id — 删除分组
  if (req.method === "DELETE" && req.url.startsWith("/api/word-pools/group/") && !req.url.includes("/toggle")) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const groupId = req.url.split("/api/word-pools/group/")[1];
    let wp = readUserWordPools(decoded.id);
    if (!wp) return sendJSON(res, 404, { error: "无数据" });
    wp.groups = wp.groups.filter(g => g.id !== groupId);
    writeUserWordPools(decoded.id, wp);
    return sendJSON(res, 200, { deleted: true });
  }

  // POST /api/word-pools/group/:id/toggle — 开关分组
  if (req.method === "POST" && req.url.match(/^\/api\/word-pools\/group\/[^/]+\/toggle$/)) {
    const decoded = verifyToken(req);
    if (!decoded) return sendJSON(res, 401, { error: "未登录" });
    const groupId = req.url.split("/api/word-pools/group/")[1].replace("/toggle", "");
    let wp = readUserWordPools(decoded.id);
    if (!wp) return sendJSON(res, 404, { error: "无数据" });
    const group = wp.groups.find(g => g.id === groupId);
    if (!group) return sendJSON(res, 404, { error: "分组不存在" });
    group.enabled = group.enabled === false ? true : false;
    writeUserWordPools(decoded.id, wp);
    return sendJSON(res, 200, { enabled: group.enabled });
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
      const { question, history, keywordHint, selfId: spSelfId, dreamId: spDreamId } = await parseBody(req);
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
daily — 日常状态（在发呆、在走路、在听歌……仅当对方问在干嘛时选，其他情况不选）
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
banter — 拌嘴逗趣（讨厌、你好烦、反对无效……）
cuddly — 撒娇贴贴（宝宝过来、老婆贴贴……）
missyou — 想念（我想你了、想你了宝宝……）
sweetDaily — 甜蜜日常（你在干嘛呢、宝宝你在干什么呀……）
confess — 告白（我爱你老婆、求求你喜欢我……）
worryCare — 担心宠溺（我在乎你、原来我还没有失宠……）
comfort — 哄人安抚（不哭不哭、先让我抱住你……）
sadUpset — 难过委屈（有点难过、有点伤心……）`;
      const spDecoded = verifyToken(req);
      const spPersonaCtx = spDecoded ? await getPersonaContext(spDecoded.id, spSelfId, spDreamId) : '';
      const sysPrompt = "你是传讯字卡的分类器。你扮演的是对方的虚拟恋人。对方说了一句话，你要站在恋人的角度理解对方想要什么回应，然后从卡池列表中选 2-3 个最相关的池子。\n\n关键判断（按优先级）：\n- 对方追问具体事物（什么电影/叫什么名字/哪首歌/去了哪里/吃的什么菜）→ 输出 NONE\n- 对方问需要具体信息才能回答的问题（几点了/多少钱/什么时候）→ 输出 NONE\n- 对方问是非题 → 必选 simplePos 或 simpleNeg\n- 对方明确问在干嘛/你在做什么 → 选 daily（仅此情况选daily）\n- 对方表达想念/爱意 → 选 love、missyou、intimate 等\n- 对方撒娇/求关注 → 选 cuddly、sweetDaily\n- 对方难过/不开心 → 选 comfort、care\n\n" + poolDesc + "\n\n规则：\n- 输出池子名逗号分隔，或输出 NONE\n- 选 2-3 个最相关的\n- 追问具体事物或需要具体信息回答时输出 NONE\n- 不确定选什么时输出 NONE，不要默认选 daily";
      const userPrompt = (historyCtx ? historyCtx + "\n\n" : "") + hintCtx + "\n\n对方最新说：" + question + "\n\n选 2-3 个最相关的卡池（只写英文池名，逗号分隔）：";
      const messages = [
        { role: "system", content: sysPrompt + (spPersonaCtx || '') },
        { role: "user", content: userPrompt }
      ];
      const result = await callWithFallback(messages, 50, "claude-haiku-4-5-20251001");
      const raw = result.content.trim();
      const validPools = ["scenes","time","dreams","clothing","food","body","eating","daily","love","fearSad","happy","coming","simplePos","simpleNeg","emoji","petNames","intimate","care","meta","jealous","banter","cuddly","missyou","sweetDaily","confess","worryCare","comfort","sadUpset"];
      if (raw.trim().toUpperCase() === "NONE") {
        sendJSON(res, 200, { pools: [], none: true });
        return;
      }
      const pools = raw.split(/[,，\s]+/).map(s => s.trim()).filter(s => validPools.includes(s));
      if (pools.length === 0) {
        sendJSON(res, 200, { pools: [], none: true });
      } else {
        sendJSON(res, 200, { pools: pools.slice(0, 3) });
      }
    } catch (err) {
      console.error("Word card select-pools error:", err.message);
      sendJSON(res, 200, { pools: [], none: true });
    }
    return;
  }

    // === 传讯字卡 AI 筛选 ===
  if (req.method === "POST" && req.url === "/api/word-cards/filter") {
    try {
      const { question, candidates, history, selfId: fSelfId, dreamId: fDreamId } = await parseBody(req);
      const fDecoded = verifyToken(req);
      const fPersonaCtx = fDecoded ? await getPersonaContext(fDecoded.id, fSelfId, fDreamId) : '';
      if (!candidates || candidates.length === 0) {
        // 自由组字暂时关闭，返回 none 让前端换一批
        sendJSON(res, 200, { none: true });
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
      const sysPrompt = "你是传讯字卡的筛选器。你扮演的是对方心中的虚拟恋人，情侣关系，深爱着对方。\n\n性格：主动关心、带爱意、有真实情绪（吃醋/委屈/生气）、回答合逻辑不要答非所问。\n\n重要：结合上下文选卡。追问接话时选能接上话题的卡。\n\n候选卡不搭时两个选择：\n1. NONE — 换一批\n2. FREE:你想说的话 — 自由组字（最多6字纯汉字无标点emoji）\n\n必须用FREE：追问具体事物候选卡答不了、情绪急切反复追问。FREE风格：碎片感、口语、不超过6字、像真人随手打的。好例子：FREE:吃面了、FREE:嗯看了、FREE:你猜呀、FREE:没有诶、FREE:想你。坏例子（禁止）：FREE:昨晚吃的炸鸡想起你了（太长太流畅太AI）\n\n张数：问位置/是否→1张 日常→1-2张 情感→2-3张\n\n引用：选完卡末尾加[Q:序号]（从0开始），只引用对方说的话（上下文中标记为 对方：的消息），不要引用你自己说的话（标记为 你：的消息）。\n\n规则：卡片文字逗号分隔+[Q:序号]、不搭就FREE或NONE、优先回应问题、氛围卡一般不选、同类句式只选1张";
      const userPrompt = (historyCtx ? historyCtx + "\n\n" : "") + "对方最新说：" + question + "\n\n候选卡片：\n" + cardList + "\n\n选出最搭的（卡片文字逗号分隔，如需引用旧消息在末尾加[Q:序号]）：";
      const messages = [
        { role: "system", content: sysPrompt + (fPersonaCtx || '') },
        { role: "user", content: userPrompt }
      ];
      const result = await callWithFallback(messages, 100, "claude-haiku-4-5-20251001");
      let raw = result.content.trim();
      // AI 认为候选都不搭
      // FREE mode — 暂时关闭，当作 NONE
      const freeMatch = raw.match(/^FREE[:：](.+)$/i);
      if (freeMatch) {
        sendJSON(res, 200, { cards: [], none: true });
        return;
      }
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
      // 只允许引用对方的消息，不引用自己的
      if (quoteIndex !== null && history && history.length > 0) {
        const qi = quoteIndex;
        if (qi >= 0 && qi < history.length && history[qi].type === 'user') {
          resp.quoteIndex = quoteIndex;
        }
        // reply 类型的消息不引用，直接丢弃 quoteIndex
      }
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
      const { words, style, userMessage, selfId, dreamId } = await parseBody(req);
      recordHit('letter');
      const decoded = verifyToken(req);
      const personaCtx = decoded ? await getPersonaContext(decoded.id, selfId, dreamId) : '';
      const prompt = generatePrompt(words, style, userMessage);
      const result = await callAPI(prompt, personaCtx);
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


  // === 档案系统 API ===
  const personaIdMatch = req.url.match(/^\/api\/persona\/([0-9a-f-]+)$/);
  const pairingMatch2 = req.url.match(/^\/api\/pairing\/([0-9a-f-]+)$/);
  const pairingActivateMatch = req.url.match(/^\/api\/pairing\/([0-9a-f-]+)\/activate$/);

  // POST /api/persona
  if (req.method === "POST" && req.url === "/api/persona") {
    try {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const body = await parseBody(req);
      if (!body.name || !body.name.trim()) return sendJSON(res, 400, { error: "角色名不能为空" });
      const { count } = await supabase.from("personas").select("id", { count: "exact", head: true }).eq("user_id", decoded.id);
      if (count >= 10) return sendJSON(res, 400, { error: "最多创建 10 个角色" });
      const { data: persona, error } = await supabase.from("personas").insert({
        user_id: decoded.id,
        type: body.type === "dream_role" ? "dream_role" : "self",
        name: body.name.trim().slice(0, 30),
        personality: (body.personality || "").trim().slice(0, 200),
        summary: (body.summary || "").trim().slice(0, 100),
        age: body.age || null,
        color: (body.color || "").trim().slice(0, 20),
        height: (body.height || "").trim().slice(0, 20),
        extra: (body.extra || "").trim().slice(0, 500),
        occupation: (body.occupation || "").trim().slice(0, 50),
        identity: (body.identity || "").trim().slice(0, 50),
        eye_color: (body.eye_color || "").trim().slice(0, 20),
        hair_color: (body.hair_color || "").trim().slice(0, 20),
        source: (body.source || "").trim().slice(0, 100),
        relationship: (body.relationship || "").trim().slice(0, 100),
        tags: (body.tags || "").trim().slice(0, 200),
        attributes: body.attributes || {},
      }).select().single();
      if (error) throw error;
      return sendJSON(res, 201, { persona });
    } catch (e) { console.error("POST /api/persona error:", e); return sendJSON(res, 500, { error: "创建失败" }); }
  }

  // GET /api/personas
  if (req.method === "GET" && req.url === "/api/personas") {
    try {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: personas, error } = await supabase.from("personas").select("*").eq("user_id", decoded.id).order("created_at", { ascending: true });
      if (error) throw error;
      const enriched = (personas || []).map(p => ({ ...p, ...getPersonaImageUrls(p.id) }));
      return sendJSON(res, 200, { personas: enriched });
    } catch (e) { console.error("GET /api/personas error:", e); return sendJSON(res, 500, { error: "获取失败" }); }
  }

  // PUT /api/persona/:id
  if (req.method === "PUT" && personaIdMatch) {
    try {
      const personaId = personaIdMatch[1];
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: existing } = await supabase.from("personas").select("id").eq("id", personaId).eq("user_id", decoded.id).single();
      if (!existing) return sendJSON(res, 404, { error: "角色不存在" });
      const body = await parseBody(req);
      const updates = {};
      if (body.name !== undefined) updates.name = body.name.trim().slice(0, 30);
      if (body.personality !== undefined) updates.personality = body.personality.trim().slice(0, 200);
      if (body.summary !== undefined) updates.summary = body.summary.trim().slice(0, 100);
      if (body.type !== undefined) updates.type = body.type === "dream_role" ? "dream_role" : "self";
      if (body.age !== undefined) updates.age = body.age;
      if (body.color !== undefined) updates.color = body.color.trim().slice(0, 20);
      if (body.height !== undefined) updates.height = body.height.trim().slice(0, 20);
      if (body.extra !== undefined) updates.extra = body.extra.trim().slice(0, 500);
      if (body.occupation !== undefined) updates.occupation = (body.occupation || "").trim().slice(0, 50);
      if (body.identity !== undefined) updates.identity = (body.identity || "").trim().slice(0, 50);
      if (body.eye_color !== undefined) updates.eye_color = (body.eye_color || "").trim().slice(0, 20);
      if (body.hair_color !== undefined) updates.hair_color = (body.hair_color || "").trim().slice(0, 20);
      if (body.source !== undefined) updates.source = (body.source || "").trim().slice(0, 100);
      if (body.relationship !== undefined) updates.relationship = (body.relationship || "").trim().slice(0, 100);
      if (body.tags !== undefined) updates.tags = (body.tags || "").trim().slice(0, 200);
      if (body.attributes !== undefined) updates.attributes = body.attributes || {};
      if (Object.keys(updates).length === 0) return sendJSON(res, 400, { error: "没有要更新的字段" });
      updates.updated_at = new Date().toISOString();
      const { data: persona, error } = await supabase.from("personas").update(updates).eq("id", personaId).eq("user_id", decoded.id).select().single();
      if (error) throw error;
      return sendJSON(res, 200, { persona });
    } catch (e) { console.error("PUT /api/persona error:", e); return sendJSON(res, 500, { error: "更新失败" }); }
  }


  // POST /api/persona/:id/image
  if (req.method === "POST" && req.url.match(/^\/api\/persona\/[0-9a-f-]+\/image$/)) {
    try {
      const personaId = req.url.match(/\/api\/persona\/([0-9a-f-]+)\/image/)[1];
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "\u672a\u767b\u5f55" });
      const { data: existing } = await supabase.from("personas").select("id").eq("id", personaId).eq("user_id", decoded.id).single();
      if (!existing) return sendJSON(res, 404, { error: "\u89d2\u8272\u4e0d\u5b58\u5728" });
      const body = await parseBody(req, 12582912);
      const slot = body.slot === "illust" ? "illust" : "avatar";
      if (!body.image || typeof body.image !== "string") return sendJSON(res, 400, { error: "\u7f3a\u5c11\u56fe\u7247\u6570\u636e" });
      const match = body.image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return sendJSON(res, 400, { error: "\u56fe\u7247\u683c\u5f0f\u65e0\u6548" });
      let ext = match[1] === "jpeg" ? "jpg" : match[1];
      if (!["jpg","png","webp","gif"].includes(ext)) ext = "jpg";
      const buf = Buffer.from(match[2], "base64");
      if (buf.length > 8 * 1024 * 1024) return sendJSON(res, 400, { error: "\u56fe\u7247\u4e0d\u80fd\u8d85\u8fc7 8MB" });
      const uploadsDir = path.join(__dirname, "uploads", "personas");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const suffix = personaId + "_" + slot;
      ["jpg","png","webp","gif"].forEach(e => {
        try { fs.unlinkSync(path.join(uploadsDir, suffix + "." + e)); } catch(_) {}
      });
      const compressed = await sharp(buf).resize({ width: 800, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      const filePath = path.join(uploadsDir, suffix + ".jpg");
      fs.writeFileSync(filePath, compressed);
      return sendJSON(res, 200, { image_url: "/uploads/personas/" + suffix + ".jpg", slot });
    } catch(e) { console.error("POST persona image error:", e); return sendJSON(res, 500, { error: "\u4e0a\u4f20\u5931\u8d25" }); }
  }

  // DELETE /api/persona/:id
  if (req.method === "DELETE" && personaIdMatch) {
    try {
      const personaId = personaIdMatch[1];
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: existing } = await supabase.from("personas").select("id").eq("id", personaId).eq("user_id", decoded.id).single();
      if (!existing) return sendJSON(res, 404, { error: "角色不存在" });
      await supabase.from("pairings").delete().eq("user_id", decoded.id).or("self_persona_id.eq." + personaId + ",dream_persona_id.eq." + personaId);
      const { error } = await supabase.from("personas").delete().eq("id", personaId).eq("user_id", decoded.id);
      if (error) throw error;
      return sendJSON(res, 200, { message: "角色已删除" });
    } catch (e) { console.error("DELETE /api/persona error:", e); return sendJSON(res, 500, { error: "删除失败" }); }
  }

  // POST /api/pairing
  if (req.method === "POST" && req.url === "/api/pairing") {
    try {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const body = await parseBody(req);
      if (!body.self_persona_id || !body.dream_persona_id) return sendJSON(res, 400, { error: "需要选择自设和梦角" });
      if (body.self_persona_id === body.dream_persona_id) return sendJSON(res, 400, { error: "自设和梦角不能是同一个角色" });
      const { data: personas } = await supabase.from("personas").select("id, type").eq("user_id", decoded.id).in("id", [body.self_persona_id, body.dream_persona_id]);
      if (!personas || personas.length !== 2) return sendJSON(res, 400, { error: "角色不存在" });
      const { count } = await supabase.from("pairings").select("id", { count: "exact", head: true }).eq("user_id", decoded.id);
      if (count >= 10) return sendJSON(res, 400, { error: "最多创建 10 个配对" });
      const { data: pairing, error } = await supabase.from("pairings").insert({
        user_id: decoded.id,
        self_persona_id: body.self_persona_id,
        dream_persona_id: body.dream_persona_id,
        relationship: (body.relationship || "恋人").trim().slice(0, 30),
        dynamic: (body.dynamic || "").trim().slice(0, 300),
        self_nickname: (body.self_nickname || "").trim().slice(0, 20),
        dream_nickname: (body.dream_nickname || "").trim().slice(0, 20),
        is_active: false,
      }).select().single();
      if (error) throw error;
      return sendJSON(res, 201, { pairing });
    } catch (e) { console.error("POST /api/pairing error:", e); return sendJSON(res, 500, { error: "创建失败" }); }
  }

  // GET /api/pairings
  if (req.method === "GET" && req.url === "/api/pairings") {
    try {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: pairings, error } = await supabase.from("pairings").select("*, self_persona:self_persona_id(*), dream_persona:dream_persona_id(*)").eq("user_id", decoded.id).order("created_at", { ascending: true });
      if (error) throw error;
      return sendJSON(res, 200, { pairings });
    } catch (e) { console.error("GET /api/pairings error:", e); return sendJSON(res, 500, { error: "获取失败" }); }
  }

  // PUT /api/pairing/:id
  if (req.method === "PUT" && pairingMatch2) {
    try {
      const pairingId = pairingMatch2[1];
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: existing } = await supabase.from("pairings").select("id").eq("id", pairingId).eq("user_id", decoded.id).single();
      if (!existing) return sendJSON(res, 404, { error: "配对不存在" });
      const body = await parseBody(req);
      const updates = {};
      if (body.relationship !== undefined) updates.relationship = body.relationship.trim().slice(0, 30);
      if (body.dynamic !== undefined) updates.dynamic = body.dynamic.trim().slice(0, 300);
      if (body.self_nickname !== undefined) updates.self_nickname = body.self_nickname.trim().slice(0, 20);
      if (body.dream_nickname !== undefined) updates.dream_nickname = body.dream_nickname.trim().slice(0, 20);
      if (body.self_persona_id !== undefined) updates.self_persona_id = body.self_persona_id;
      if (body.dream_persona_id !== undefined) updates.dream_persona_id = body.dream_persona_id;
      if (Object.keys(updates).length === 0) return sendJSON(res, 400, { error: "没有要更新的字段" });
      if (updates.self_persona_id || updates.dream_persona_id) {
        const idsToCheck = [updates.self_persona_id, updates.dream_persona_id].filter(Boolean);
        const { data: owned } = await supabase.from("personas").select("id").eq("user_id", decoded.id).in("id", idsToCheck);
        if (!owned || owned.length !== idsToCheck.length) return sendJSON(res, 400, { error: "角色不存在" });
      }
      updates.updated_at = new Date().toISOString();
      const { data: pairing, error } = await supabase.from("pairings").update(updates).eq("id", pairingId).eq("user_id", decoded.id).select().single();
      if (error) throw error;
      return sendJSON(res, 200, { pairing });
    } catch (e) { console.error("PUT /api/pairing error:", e); return sendJSON(res, 500, { error: "更新失败" }); }
  }

  // DELETE /api/pairing/:id
  if (req.method === "DELETE" && pairingMatch2) {
    try {
      const pairingId = pairingMatch2[1];
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: existing } = await supabase.from("pairings").select("id").eq("id", pairingId).eq("user_id", decoded.id).single();
      if (!existing) return sendJSON(res, 404, { error: "配对不存在" });
      const { error } = await supabase.from("pairings").delete().eq("id", pairingId).eq("user_id", decoded.id);
      if (error) throw error;
      return sendJSON(res, 200, { message: "配对已删除" });
    } catch (e) { console.error("DELETE /api/pairing error:", e); return sendJSON(res, 500, { error: "删除失败" }); }
  }

  // POST /api/pairing/:id/activate
  if (req.method === "POST" && pairingActivateMatch) {
    try {
      const pairingId = pairingActivateMatch[1];
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: existing } = await supabase.from("pairings").select("id").eq("id", pairingId).eq("user_id", decoded.id).single();
      if (!existing) return sendJSON(res, 404, { error: "配对不存在" });
      await supabase.from("pairings").update({ is_active: false, updated_at: new Date().toISOString() }).eq("user_id", decoded.id);
      const { data: pairing, error } = await supabase.from("pairings").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", pairingId).eq("user_id", decoded.id).select().single();
      if (error) throw error;
      return sendJSON(res, 200, { pairing, message: "已切换当前配对" });
    } catch (e) { console.error("POST /api/pairing/activate error:", e); return sendJSON(res, 500, { error: "激活失败" }); }
  }

  // GET /api/pairing/active
  if (req.method === "GET" && req.url === "/api/pairing/active") {
    try {
      const decoded = verifyToken(req);
      if (!decoded) return sendJSON(res, 401, { error: "未登录" });
      const { data: pairing } = await supabase.from("pairings").select("*, self_persona:self_persona_id(*), dream_persona:dream_persona_id(*)").eq("user_id", decoded.id).eq("is_active", true).single();
      return sendJSON(res, 200, { pairing: pairing || null });
    } catch (e) { console.error("GET /api/pairing/active error:", e); return sendJSON(res, 500, { error: "获取失败" }); }
  }


  // 静态文件
  
  // ─── POST /api/push/subscribe — 保存推送订阅 ───
  if (req.method === 'POST' && req.url === '/api/push/subscribe') {
    try {
      const body = await parseBody(req);
      if (!body.subscription || !body.subscription.endpoint) {
        return sendJSON(res, 400, { error: '无效订阅' });
      }
      const userId = body.userId || 'anonymous';
      if (!pushSubscriptions[userId]) pushSubscriptions[userId] = [];
      const exists = pushSubscriptions[userId].some(s => s.endpoint === body.subscription.endpoint);
      if (!exists) {
        pushSubscriptions[userId].push(body.subscription);
        savePushSubs();
      }
      return sendJSON(res, 200, { ok: true });
    } catch(e) {
      console.error('push/subscribe error:', e);
      return sendJSON(res, 500, { error: '订阅失败' });
    }
  }

  // ─── POST /api/push/unsubscribe — 取消推送订阅 ───
  if (req.method === 'POST' && req.url === '/api/push/unsubscribe') {
    try {
      const body = await parseBody(req);
      if (!body.endpoint) return sendJSON(res, 400, { error: '无效' });
      for (const uid in pushSubscriptions) {
        pushSubscriptions[uid] = pushSubscriptions[uid].filter(s => s.endpoint !== body.endpoint);
        if (pushSubscriptions[uid].length === 0) delete pushSubscriptions[uid];
      }
      savePushSubs();
      return sendJSON(res, 200, { ok: true });
    } catch(e) {
      return sendJSON(res, 500, { error: '取消失败' });
    }
  }

  // ─── POST /api/push/test — 测试推送（发给所有订阅者）───
  if (req.method === 'POST' && req.url === '/api/push/test') {
    try {
      const body = await parseBody(req);
      const title = body.title || '泡沫来信';
      const msg = body.body || '这是一条测试通知';
      let count = 0;
      for (const uid in pushSubscriptions) {
        await sendPushNotification(uid, title, msg, '/');
        count++;
      }
      return sendJSON(res, 200, { ok: true, sent: count });
    } catch(e) {
      console.error('push test error:', e);
      return sendJSON(res, 500, { error: '测试失败' });
    }
  }

  // ─── GET /api/push/vapid-key — 获取公钥 ───
  if (req.method === 'GET' && req.url === '/api/push/vapid-key') {
    return sendJSON(res, 200, { publicKey: VAPID_PUBLIC });
  }

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
