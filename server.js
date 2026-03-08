const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
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
const PORT = 4001;

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
  if (!stats[today]) stats[today] = { visit: 0, letter: 0, answer: 0, between: 0, tarot: 0 };
  stats[today][feature] = (stats[today][feature] || 0) + 1;
  saveStats(stats);
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

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
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

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url);
  filePath = path.join(__dirname, filePath);
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
    res.end(data);
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

function generateTarotPrompt(question, card, keywords) {
  return `${question ? '对方问了：「' + question + '」\n' : ''}你抽到了：「${card}」（${keywords}）\n用这张牌表达你此刻的感受。`;
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
async function callWithFallback(messages, maxTokens) {
  for (let i = 0; i < API_ROUTES.length; i++) {
    try {
      const result = await requestAPI(API_ROUTES[i], messages, maxTokens);
      return result;
    } catch (err) {
      console.error(`线路 ${i + 1} 失败: ${err.message}`);
      if (i === API_ROUTES.length - 1) throw err;
    }
  }
}

const SYSTEM_PROMPTS = {
  letter: '你是一个文笔优美的写信人。只输出信的内容，不要加任何解释、标题或元信息。',
  answerBook: `你是一个触不到的恋人。对方想窥见你此刻的潜意识。
你脑海里浮现了一个念头——这就是你最真实的想法。
用1-2句话，像内心独白，说出这个念头背后的感受。

规则：
- 最多两句话，40字以内。
- 像自言自语，像梦里的呢喃，像潜意识浮出水面的一瞬。
- 不要解释那个念头的字面意思，而是用它引出你心底的感受。
- 如果对方写了话给你，让你的潜意识带上对那份感受的觉察，但不要复述或引用对方的话。
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

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  // 塔罗 API
  if (req.method === 'POST' && req.url === '/api/tarot') {
    try {
      const { question, card, keywords } = await parseBody(req);
      recordHit('tarot');
      const prompt = generateTarotPrompt(question, card, keywords);
      const result = await callTarotAPI(prompt);
      sendJSON(res, 200, { mood: result.content.trim(), model: result.model });
    } catch (err) {
      console.error('Tarot API Error:', err.message);
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

  // 静态文件
  serveStatic(req, res);
});

server.listen(PORT, async () => {
  console.log(`泡沫来信服务器启动: http://localhost:${PORT}`);
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) console.error('Supabase 连接失败:', error.message);
  else console.log('Supabase 连接成功');
});
