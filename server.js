const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.qiyiguo.uk/v1/chat/completions';
const API_KEY = 'sk-ayYp4RQZB9jqBNMFqJsxMPRxmWn0LUJ2QfPcyg339qXKaZPM';
const MODELS = ['gpt-5.4', 'claude-sonnet-4-6'];
const PORT = 4000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
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

async function callAPI(prompt) {
  const model = MODELS[Math.floor(Math.random() * MODELS.length)];
  
  const payload = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: '你是一个文笔优美的写信人。只输出信的内容，不要加任何解释、标题或元信息。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.85,
    max_tokens: 800,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
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
            resolve({
              content: json.choices[0].message.content,
              model,
            });
          } else {
            reject(new Error('Invalid API response: ' + data));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + data));
        }
      });
    });
    
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint
  if (req.method === 'POST' && req.url === '/api/letter') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { words, style, userMessage } = JSON.parse(body);
        const prompt = generatePrompt(words, style, userMessage);
        const result = await callAPI(prompt);
        const letter = parseLetter(result.content);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          body: letter.body,
          closing: letter.closing,
          model: result.model,
        }));
      } catch (err) {
        console.error('API Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 静态文件
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`泡沫来信服务器启动: http://localhost:${PORT}`);
});
