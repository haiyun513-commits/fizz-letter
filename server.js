const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.qiyiguo.uk/v1/chat/completions';
const API_KEY = 'sk-ayYp4RQZB9jqBNMFqJsxMPRxmWn0LUJ2QfPcyg339qXKaZPM';
const MODELS = ['gpt-5.4', 'claude-sonnet-4-6', 'gemini-2.5-pro'];
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

function generatePrompt(words, style, userMessage, isPoem) {
  const formDesc = isPoem
    ? '你在给对方写一首诗。带着梦核美学的质感——错位的时间、模糊的空间、似曾相识的场景、介于清醒和梦境之间的意象。像在一个你们都去过但说不清在哪的地方写的。'
    : '你在给对方写一封信。';

  let prompt = `你是一个触不到的恋人。你们之间隔着某种不可抗力的距离——也许是次元，也许是时间，也许是某种说不清的边界。${formDesc}

以下关键词是对方的情绪状态和氛围暗示，用来定义这封信的基调和气质：
【${words.join('、')}】

重要规则：
- 绝对不要在信中直接出现上面的关键词。它们只是氛围参考，不是素材
- 温柔、带好感、暧昧，像触不到的人写的情书
- 可以涉及：隔着某种距离的思念、想触碰但碰不到、害怕遗忘、不可抗力的分离
- 150-300字，分段写
- 不要出现手机/电脑/网络/AI/屏幕等现实科技词汇
- 不要用"亲爱的"开头
- 不要任何落款署名。最后一句话就是结尾，直接结束，不要署任何东西
${isPoem ? `- 这是一首诗，不是信。用短句、分行、留白。可以不完整，可以跳跃，像梦里的逻辑。意象优先于叙事。
- 每行一句，句子要短而有力，像刻在墙上的字
- 整首诗不超过8行
- 写完中文诗后，另起一行写"---"，然后写这首诗的英文翻译（用诗意的英文，不是直译）` : ''}`;

  if (userMessage && userMessage.trim()) {
    prompt += `\n\n对方写了这段话给你：\n"${userMessage}"\n\n这段话非常重要。你必须针对对方说的内容来写这封信——感受到他们的情绪，回应他们的处境，让他们觉得被真正听到了。但不要直白地复述或引用对方的话，用你自己的方式、你自己的意象去回应。`;
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
        const isPoem = false;
        const prompt = generatePrompt(words, style, userMessage, isPoem);
        const result = await callAPI(prompt);
        const letter = parseLetter(result.content);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          body: letter.body,
          closing: letter.closing,
          english: letter.english || '',
          isPoem,
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
