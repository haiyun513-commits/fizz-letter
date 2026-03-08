# Fizz Letter 信箱 + 付费系统 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 给泡沫来信加账号系统、信箱功能和兑换码付费解锁，让用户可以登录后自动保存和回看历史信件。

**Architecture:** 在现有纯 Node.js HTTP 服务器（server.js）上新增认证和信箱 API。用 Supabase 做数据库（users/letters/redeem_codes 三张表）。前端在现有单页应用基础上加登录弹窗和信箱页面，保持毛玻璃/极光视觉风格。先在 45 测试服务器验证，再部署到 HK 和北京。

**Tech Stack:** Node.js (原生 http)、Supabase (PostgreSQL)、JWT (jsonwebtoken)、bcrypt、原生 JS 前端

**设计文档：** `docs/plans/2026-03-08-mailbox-premium-design.md`

---

## 项目文件结构（新增/修改）

```
fizz-letter/
├── server.js              ← 修改：加 auth/mailbox/redeem API
├── index.html             ← 修改：加登录/注册/信箱 HTML
├── css/style.css          ← 修改：加登录/注册/信箱样式
├── js/app.js              ← 修改：加登录状态管理、信箱页面、自动存档
├── js/auth.js             ← 新增：前端认证模块
├── package.json           ← 新增：依赖管理
└── .env                   ← 新增：Supabase 密钥（不提交 git）
```

---

## Task 1: Supabase 建表 + 项目依赖

**Files:**
- Create: `package.json`
- Create: `.env`
- Create: `.gitignore`（或修改）

**Step 1: 在 Supabase Dashboard 建表**

登录 https://supabase.com，创建项目（或用已有项目），在 SQL Editor 执行：

```sql
-- 用户表
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 信箱表
CREATE TABLE letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('letter', 'answer', 'between', 'tarot')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_letters_user_id ON letters(user_id);
CREATE INDEX idx_letters_created_at ON letters(created_at DESC);

-- 兑换码表
CREATE TABLE redeem_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  used_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);
```

**Step 2: 获取 Supabase 凭据**

在 Supabase Dashboard → Settings → API，复制：
- Project URL (如 `https://xxx.supabase.co`)
- Service Role Key (用于服务端，不是 anon key)

**Step 3: 初始化 package.json**

```json
{
  "name": "fizz-letter",
  "private": true,
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```

**Step 4: 创建 .env**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...your-service-key
JWT_SECRET=your-random-secret-string-at-least-32-chars
```

**Step 5: 确保 .gitignore 包含 .env**

```
node_modules/
.env
stats.json
```

**Step 6: 安装依赖**

Run: `cd /Users/songhaiyun/Projects/fizz-letter && npm install`

**Step 7: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: add package.json with supabase, bcrypt, jwt deps"
```

---

## Task 2: 后端 — Supabase 连接 + 工具函数

**Files:**
- Modify: `server.js` (顶部加 require + Supabase 初始化 + JWT 工具)

**Step 1: 在 server.js 顶部添加依赖和初始化**

在 `const path = require('path');` 之后添加：

```javascript
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const JWT_SECRET = process.env.JWT_SECRET;
```

注意：还需要 `npm install dotenv` 并加到 package.json。

**Step 2: 添加 JWT 工具函数和请求体解析**

在 `recordHit` 函数之后添加：

```javascript
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
```

**Step 3: 验证 Supabase 连接**

在 `server.listen` 回调里添加测试查询：

```javascript
server.listen(PORT, async () => {
  console.log(`泡沫来信服务器启动: http://localhost:${PORT}`);
  // 验证 Supabase 连接
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) console.error('Supabase 连接失败:', error.message);
  else console.log('Supabase 连接成功');
});
```

**Step 4: 测试启动**

Run: `cd /Users/songhaiyun/Projects/fizz-letter && node server.js`
Expected: "Supabase 连接成功"

**Step 5: Commit**

```bash
git add server.js package.json
git commit -m "feat: add supabase connection, jwt utils, body parser"
```

---

## Task 3: 后端 — 注册 API

**Files:**
- Modify: `server.js` (在 stats API 之后添加注册端点)

**Step 1: 添加 POST /api/register 端点**

在 `// 统计查看` 块之后，`// 塔罗 API` 块之前，添加：

```javascript
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
        if (error.code === '23505') {
          return sendJSON(res, 409, { error: '该邮箱已注册' });
        }
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
```

**Step 2: 用 curl 测试注册**

Run:
```bash
curl -s -X POST http://localhost:4001/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","nickname":"测试用户","password":"123456"}' | jq .
```

Expected: 返回 `{ "token": "...", "user": { "id": "...", ... } }`

**Step 3: 测试重复注册**

Run: 同上命令再执行一次
Expected: 返回 `{ "error": "该邮箱已注册" }` (status 409)

**Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add user registration API"
```

---

## Task 4: 后端 — 登录 + 获取当前用户 API

**Files:**
- Modify: `server.js` (在注册端点之后添加)

**Step 1: 添加 POST /api/login 端点**

```javascript
  // 登录
  if (req.method === 'POST' && req.url === '/api/login') {
    try {
      const { email, password } = await parseBody(req);

      if (!email || !password) {
        return sendJSON(res, 400, { error: '请输入邮箱和密码' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, nickname, password_hash, is_premium, created_at')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !user) {
        return sendJSON(res, 401, { error: '邮箱或密码错误' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return sendJSON(res, 401, { error: '邮箱或密码错误' });
      }

      const { password_hash, ...safeUser } = user;
      const token = signToken(safeUser);
      sendJSON(res, 200, { token, user: safeUser });
    } catch (err) {
      console.error('Login error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }
```

**Step 2: 添加 GET /api/me 端点**

```javascript
  // 获取当前用户
  if (req.method === 'GET' && req.url === '/api/me') {
    const decoded = verifyToken(req);
    if (!decoded) {
      return sendJSON(res, 401, { error: '未登录' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, nickname, is_premium, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return sendJSON(res, 401, { error: '用户不存在' });
    }

    sendJSON(res, 200, { user });
    return;
  }
```

**Step 3: 测试登录**

Run:
```bash
curl -s -X POST http://localhost:4001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' | jq .
```

Expected: 返回 token 和 user 信息

**Step 4: 测试 /api/me**

Run:
```bash
TOKEN="上一步拿到的token"
curl -s http://localhost:4001/api/me -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: 返回 user 信息

**Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add login and get-current-user APIs"
```

---

## Task 5: 后端 — 信箱 CRUD API

**Files:**
- Modify: `server.js`

**Step 1: 添加 POST /api/mailbox/save 端点**

在 `GET /api/me` 之后添加：

```javascript
  // === 信箱 ===

  // 保存记录
  if (req.method === 'POST' && req.url === '/api/mailbox/save') {
    const decoded = verifyToken(req);
    if (!decoded) {
      return sendJSON(res, 401, { error: '未登录' });
    }

    try {
      const { type, content, metadata } = await parseBody(req);

      if (!type || !content) {
        return sendJSON(res, 400, { error: '缺少必要字段' });
      }

      // 检查免费用户信箱上限
      const { data: user } = await supabase
        .from('users')
        .select('is_premium')
        .eq('id', decoded.id)
        .single();

      if (!user?.is_premium) {
        const { count } = await supabase
          .from('letters')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', decoded.id);

        if (count >= 20) {
          // 删除最早的记录，保持 20 条
          const { data: oldest } = await supabase
            .from('letters')
            .select('id')
            .eq('user_id', decoded.id)
            .order('created_at', { ascending: true })
            .limit(1);

          if (oldest && oldest[0]) {
            await supabase.from('letters').delete().eq('id', oldest[0].id);
          }
        }
      }

      const { data, error } = await supabase
        .from('letters')
        .insert({
          user_id: decoded.id,
          type,
          content,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        return sendJSON(res, 500, { error: '保存失败' });
      }

      sendJSON(res, 201, { letter: data });
    } catch (err) {
      console.error('Mailbox save error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }
```

**Step 2: 添加 GET /api/mailbox 端点**

```javascript
  // 获取信箱
  if (req.method === 'GET' && req.url.startsWith('/api/mailbox') && !req.url.includes('/save')) {
    const decoded = verifyToken(req);
    if (!decoded) {
      return sendJSON(res, 401, { error: '未登录' });
    }

    const { data, error } = await supabase
      .from('letters')
      .select('id, type, content, metadata, created_at')
      .eq('user_id', decoded.id)
      .order('created_at', { ascending: false });

    if (error) {
      return sendJSON(res, 500, { error: '获取失败' });
    }

    sendJSON(res, 200, { letters: data });
    return;
  }
```

**Step 3: 测试保存**

Run:
```bash
curl -s -X POST http://localhost:4001/api/mailbox/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"letter","content":"测试信件内容","metadata":{"words":["月光","沉默"]}}' | jq .
```

Expected: 返回保存的记录

**Step 4: 测试获取**

Run:
```bash
curl -s http://localhost:4001/api/mailbox -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: 返回 letters 数组

**Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add mailbox save and list APIs"
```

---

## Task 6: 后端 — 兑换码系统

**Files:**
- Modify: `server.js`

**Step 1: 添加 POST /api/redeem 端点**

```javascript
  // === 兑换码 ===

  // 用户兑换
  if (req.method === 'POST' && req.url === '/api/redeem') {
    const decoded = verifyToken(req);
    if (!decoded) {
      return sendJSON(res, 401, { error: '未登录' });
    }

    try {
      const { code } = await parseBody(req);
      if (!code) {
        return sendJSON(res, 400, { error: '请输入兑换码' });
      }

      // 查找兑换码
      const { data: codeRecord, error: findErr } = await supabase
        .from('redeem_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single();

      if (findErr || !codeRecord) {
        return sendJSON(res, 404, { error: '兑换码无效' });
      }
      if (codeRecord.used_by) {
        return sendJSON(res, 400, { error: '兑换码已被使用' });
      }

      // 标记使用
      await supabase
        .from('redeem_codes')
        .update({ used_by: decoded.id, used_at: new Date().toISOString() })
        .eq('id', codeRecord.id);

      // 升级用户
      await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', decoded.id);

      sendJSON(res, 200, { message: '兑换成功！已解锁无限信箱' });
    } catch (err) {
      console.error('Redeem error:', err.message);
      sendJSON(res, 500, { error: '服务器错误' });
    }
    return;
  }
```

**Step 2: 添加 POST /api/admin/generate-code 端点**

```javascript
  // 管理员生成兑换码
  if (req.method === 'POST' && req.url === '/api/admin/generate-code') {
    // 简单密码保护
    const { count, adminKey } = await parseBody(req);
    if (adminKey !== process.env.JWT_SECRET) {
      return sendJSON(res, 403, { error: '无权限' });
    }

    const num = Math.min(count || 1, 50);
    const codes = [];
    for (let i = 0; i < num; i++) {
      const code = Array.from({ length: 8 }, () =>
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
      ).join('');
      codes.push({ code });
    }

    const { data, error } = await supabase
      .from('redeem_codes')
      .insert(codes)
      .select('code, created_at');

    if (error) {
      return sendJSON(res, 500, { error: '生成失败' });
    }

    sendJSON(res, 201, { codes: data });
    return;
  }
```

**Step 3: 测试生成兑换码**

Run:
```bash
curl -s -X POST http://localhost:4001/api/admin/generate-code \
  -H "Content-Type: application/json" \
  -d '{"count":3,"adminKey":"你的JWT_SECRET"}' | jq .
```

Expected: 返回 3 个兑换码

**Step 4: 测试兑换**

Run:
```bash
curl -s -X POST http://localhost:4001/api/redeem \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"上一步生成的码"}' | jq .
```

Expected: `{ "message": "兑换成功！已解锁无限信箱" }`

**Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add redeem code system"
```

---

## Task 7: 后端 — 重构请求体解析

**Files:**
- Modify: `server.js`

现在 server.js 里原有的 4 个 API（letter/answer/between/tarot）各自手动解析请求体。用新的 `parseBody()` 和 `sendJSON()` 统一替换，减少重复代码。

**Step 1: 重构塔罗 API**

把原来的：
```javascript
  if (req.method === 'POST' && req.url === '/api/tarot') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { question, card, keywords } = JSON.parse(body);
        ...
```

改为：
```javascript
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
```

**Step 2: 同样重构 between、answer、letter 端点**

对每个端点做同样的替换：去掉手动的 `req.on('data')`，改用 `await parseBody(req)` 和 `sendJSON()`。

**Step 3: 测试所有 4 个功能正常**

从浏览器打开 http://localhost:4001，测试写信、翻答案、语言之间、塔罗都正常工作。

**Step 4: Commit**

```bash
git add server.js
git commit -m "refactor: unify request body parsing and JSON response"
```

---

## Task 8: 前端 — 认证模块 (js/auth.js)

**Files:**
- Create: `js/auth.js`

**Step 1: 创建 auth.js**

```javascript
// 前端认证模块
const Auth = {
  TOKEN_KEY: 'fizz_token',
  USER_KEY: 'fizz_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isPremium() {
    const user = this.getUser();
    return user?.is_premium || false;
  },

  save(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  authHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  async register(email, nickname, password) {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nickname, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    this.save(data.token, data.user);
    return data.user;
  },

  async login(email, password) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    this.save(data.token, data.user);
    return data.user;
  },

  async checkSession() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        this.logout();
        return null;
      }
      const data = await res.json();
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return null;
    }
  },

  // 保存到信箱（静默，不阻塞主流程）
  async saveToMailbox(type, content, metadata) {
    if (!this.isLoggedIn()) return;
    try {
      await fetch('/api/mailbox/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(),
        },
        body: JSON.stringify({ type, content, metadata }),
      });
    } catch {
      // 静默失败
    }
  },

  async getMailbox() {
    const res = await fetch('/api/mailbox', {
      headers: this.authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.letters;
  },

  async redeem(code) {
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    // 刷新用户信息
    await this.checkSession();
    return data.message;
  },
};
```

**Step 2: 在 index.html 引入 auth.js**

在 `<script src="js/tarot.js"></script>` 之后、`<script src="js/app.js"></script>` 之前添加：

```html
  <script src="js/auth.js"></script>
```

**Step 3: Commit**

```bash
git add js/auth.js index.html
git commit -m "feat: add frontend auth module"
```

---

## Task 9: 前端 — 登录/注册 UI

**Files:**
- Modify: `index.html` (加登录按钮 + 弹窗 HTML)
- Modify: `css/style.css` (弹窗样式)
- Modify: `js/app.js` (登录逻辑)

**Step 1: 在 index.html 欢迎屏加登录按钮和用户信息区**

在 `<div id="screen-welcome" class="screen active">` 内部，`<h1>` 之前添加：

```html
    <!-- 右上角登录/用户区 -->
    <div class="auth-area" id="auth-area">
      <button id="btn-login" class="auth-btn">登录</button>
    </div>
    <div class="auth-area auth-logged-in" id="auth-user-area" style="display:none;">
      <span id="auth-nickname" class="auth-nickname"></span>
      <button id="btn-mailbox" class="auth-btn">信箱</button>
      <button id="btn-logout" class="auth-btn auth-btn-small">退出</button>
    </div>
```

**Step 2: 在 body 末尾（scripts 之前）添加登录弹窗 HTML**

```html
  <!-- 登录/注册弹窗 -->
  <div id="auth-modal" class="auth-modal" style="display:none;">
    <div class="auth-modal-content">
      <button id="auth-modal-close" class="auth-modal-close">×</button>
      <div id="auth-form-login" class="auth-form">
        <h3 class="auth-title">登录</h3>
        <input type="email" id="login-email" class="auth-input" placeholder="邮箱">
        <input type="password" id="login-password" class="auth-input" placeholder="密码">
        <button id="btn-do-login" class="btn-glow auth-submit" style="animation:none;">登录</button>
        <div class="auth-switch">还没有账号？<span id="show-register">注册</span></div>
        <div id="login-error" class="auth-error"></div>
      </div>
      <div id="auth-form-register" class="auth-form" style="display:none;">
        <h3 class="auth-title">注册</h3>
        <input type="email" id="register-email" class="auth-input" placeholder="邮箱">
        <input type="text" id="register-nickname" class="auth-input" placeholder="昵称">
        <input type="password" id="register-password" class="auth-input" placeholder="密码（至少6位）">
        <button id="btn-do-register" class="btn-glow auth-submit" style="animation:none;">注册</button>
        <div class="auth-switch">已有账号？<span id="show-login">登录</span></div>
        <div id="register-error" class="auth-error"></div>
      </div>
    </div>
  </div>

  <!-- 兑换码弹窗 -->
  <div id="redeem-modal" class="auth-modal" style="display:none;">
    <div class="auth-modal-content">
      <button id="redeem-modal-close" class="auth-modal-close">×</button>
      <h3 class="auth-title">兑换码</h3>
      <p class="auth-hint">输入兑换码解锁无限信箱</p>
      <input type="text" id="redeem-code" class="auth-input" placeholder="请输入8位兑换码" maxlength="8" style="text-transform:uppercase;">
      <button id="btn-do-redeem" class="btn-glow auth-submit" style="animation:none;">兑换</button>
      <div id="redeem-error" class="auth-error"></div>
      <div id="redeem-success" class="auth-success"></div>
    </div>
  </div>
```

**Step 3: 添加样式到 css/style.css**

在文件末尾添加：

```css
/* === 认证系统 === */
.auth-area {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}
.auth-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(200,198,198,0.7);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.3s;
}
.auth-btn:hover {
  background: rgba(255,255,255,0.15);
  color: rgba(200,198,198,0.95);
}
.auth-btn-small {
  padding: 4px 10px;
  font-size: 11px;
}
.auth-nickname {
  color: rgba(200,198,198,0.6);
  font-size: 12px;
  margin-right: 4px;
}
.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
}
.auth-modal-content {
  background: rgba(15,20,35,0.9);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 32px 28px;
  width: 320px;
  max-width: 90vw;
  position: relative;
  backdrop-filter: blur(20px);
}
.auth-modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  color: rgba(200,198,198,0.5);
  font-size: 22px;
  cursor: pointer;
}
.auth-title {
  color: rgba(200,198,198,0.9);
  font-size: 20px;
  text-align: center;
  margin-bottom: 20px;
  font-weight: 400;
  letter-spacing: 3px;
}
.auth-input {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 10px 14px;
  color: rgba(200,198,198,0.9);
  font-size: 14px;
  margin-bottom: 12px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.3s;
}
.auth-input:focus {
  border-color: rgba(6,88,140,0.5);
}
.auth-input::placeholder {
  color: rgba(200,198,198,0.3);
}
.auth-submit {
  width: 100%;
  margin-top: 4px;
  font-size: 14px;
  padding: 10px;
}
.auth-switch {
  text-align: center;
  color: rgba(200,198,198,0.4);
  font-size: 12px;
  margin-top: 14px;
}
.auth-switch span {
  color: rgba(6,88,140,0.8);
  cursor: pointer;
  text-decoration: underline;
}
.auth-error {
  color: #e57373;
  font-size: 12px;
  text-align: center;
  margin-top: 8px;
  min-height: 16px;
}
.auth-success {
  color: #81c784;
  font-size: 12px;
  text-align: center;
  margin-top: 8px;
  min-height: 16px;
}
.auth-hint {
  color: rgba(200,198,198,0.5);
  font-size: 12px;
  text-align: center;
  margin-bottom: 16px;
}
```

**Step 4: 在 app.js 的 DOMContentLoaded 内添加登录/注册逻辑**

在 `document.addEventListener('DOMContentLoaded', () => {` 内，screens 定义之后添加：

```javascript
  // === 认证 ===
  const authArea = document.getElementById('auth-area');
  const authUserArea = document.getElementById('auth-user-area');
  const authModal = document.getElementById('auth-modal');

  function updateAuthUI() {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      authArea.style.display = 'none';
      authUserArea.style.display = 'flex';
      document.getElementById('auth-nickname').textContent = user?.nickname || '';
    } else {
      authArea.style.display = 'flex';
      authUserArea.style.display = 'none';
    }
  }

  // 页面加载时检查登录状态
  Auth.checkSession().then(updateAuthUI);

  // 打开登录弹窗
  document.getElementById('btn-login').addEventListener('click', () => {
    authModal.style.display = 'flex';
    document.getElementById('auth-form-login').style.display = 'block';
    document.getElementById('auth-form-register').style.display = 'none';
  });

  // 关闭弹窗
  document.getElementById('auth-modal-close').addEventListener('click', () => {
    authModal.style.display = 'none';
  });
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.style.display = 'none';
  });

  // 切换登录/注册
  document.getElementById('show-register').addEventListener('click', () => {
    document.getElementById('auth-form-login').style.display = 'none';
    document.getElementById('auth-form-register').style.display = 'block';
  });
  document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('auth-form-register').style.display = 'none';
    document.getElementById('auth-form-login').style.display = 'block';
  });

  // 登录
  document.getElementById('btn-do-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    try {
      await Auth.login(email, password);
      authModal.style.display = 'none';
      updateAuthUI();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  // 注册
  document.getElementById('btn-do-register').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value;
    const nickname = document.getElementById('register-nickname').value;
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';

    try {
      await Auth.register(email, nickname, password);
      authModal.style.display = 'none';
      updateAuthUI();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  // 退出
  document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.logout();
    updateAuthUI();
  });
```

**Step 5: 测试登录/注册 UI**

在浏览器打开 http://localhost:4001，右上角应该显示"登录"按钮，点击弹出登录弹窗，可以切换到注册。

**Step 6: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: add login/register UI with modal"
```

---

## Task 10: 前端 — 信箱页面

**Files:**
- Modify: `index.html` (加信箱屏)
- Modify: `css/style.css` (信箱样式)
- Modify: `js/app.js` (信箱逻辑)

**Step 1: 在 index.html 添加信箱屏**

在 `<!-- 塔罗：结果屏 -->` 块之后添加：

```html
  <!-- 信箱 -->
  <div id="screen-mailbox" class="screen">
    <div class="mailbox-header">
      <button id="btn-mailbox-back" class="btn-back">← 返回</button>
      <div class="mailbox-title">我的信箱</div>
      <div class="mailbox-info" id="mailbox-info"></div>
    </div>
    <div class="mailbox-list" id="mailbox-list">
      <div class="mailbox-loading">加载中...</div>
    </div>
    <div class="mailbox-empty" id="mailbox-empty" style="display:none;">
      <div class="mailbox-empty-text">信箱还是空的</div>
      <div class="mailbox-empty-hint">去写封信、翻个答案、抽张牌吧</div>
    </div>
    <button id="btn-redeem" class="btn-ghost mailbox-redeem-btn" style="display:none;">兑换码</button>
  </div>
```

**Step 2: 在 app.js 的 screens 对象中添加 mailbox**

```javascript
  const screens = {
    // ...existing...
    mailbox: document.getElementById('screen-mailbox'),
  };
```

**Step 3: 添加信箱样式到 css/style.css**

```css
/* === 信箱 === */
.mailbox-header {
  padding: 16px 20px;
  position: relative;
}
.mailbox-title {
  text-align: center;
  color: rgba(200,198,198,0.8);
  font-size: 16px;
  letter-spacing: 3px;
  margin-top: 8px;
}
.mailbox-info {
  text-align: center;
  color: rgba(200,198,198,0.35);
  font-size: 11px;
  margin-top: 4px;
}
.mailbox-list {
  padding: 0 16px 80px;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}
.mailbox-loading {
  text-align: center;
  color: rgba(200,198,198,0.4);
  padding: 40px;
}
.mailbox-item {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}
.mailbox-item:hover {
  background: rgba(255,255,255,0.07);
}
.mailbox-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.mailbox-item-type {
  color: rgba(6,88,140,0.7);
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(6,88,140,0.1);
  border-radius: 10px;
}
.mailbox-item-date {
  color: rgba(200,198,198,0.3);
  font-size: 11px;
}
.mailbox-item-preview {
  color: rgba(200,198,198,0.6);
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.mailbox-item-full {
  display: none;
  color: rgba(200,198,198,0.75);
  font-size: 13px;
  line-height: 1.7;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
  white-space: pre-wrap;
}
.mailbox-item.expanded .mailbox-item-preview {
  display: none;
}
.mailbox-item.expanded .mailbox-item-full {
  display: block;
}
.mailbox-empty {
  text-align: center;
  padding: 60px 20px;
}
.mailbox-empty-text {
  color: rgba(200,198,198,0.5);
  font-size: 16px;
  margin-bottom: 8px;
}
.mailbox-empty-hint {
  color: rgba(200,198,198,0.3);
  font-size: 12px;
}
.mailbox-redeem-btn {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}
```

**Step 4: 在 app.js 添加信箱逻辑**

```javascript
  // === 信箱 ===
  const TYPE_LABELS = { letter: '来信', answer: '答案', between: '语言之间', tarot: '塔罗' };

  document.getElementById('btn-mailbox').addEventListener('click', () => {
    showScreen('mailbox');
    loadMailbox();
  });

  document.getElementById('btn-mailbox-back').addEventListener('click', () => {
    showScreen('welcome');
  });

  async function loadMailbox() {
    const listEl = document.getElementById('mailbox-list');
    const emptyEl = document.getElementById('mailbox-empty');
    const infoEl = document.getElementById('mailbox-info');
    const redeemBtn = document.getElementById('btn-redeem');

    listEl.innerHTML = '<div class="mailbox-loading">加载中...</div>';
    emptyEl.style.display = 'none';

    try {
      const letters = await Auth.getMailbox();
      const user = Auth.getUser();

      // 显示信箱信息
      if (user?.is_premium) {
        infoEl.textContent = `✦ 无限信箱 · ${letters.length} 封`;
        redeemBtn.style.display = 'none';
      } else {
        infoEl.textContent = `${letters.length} / 20 封`;
        redeemBtn.style.display = 'block';
      }

      if (letters.length === 0) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
      }

      listEl.innerHTML = letters.map(l => {
        const date = new Date(l.created_at).toLocaleString('zh-CN', {
          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const meta = l.metadata || {};
        let metaHint = '';
        if (meta.words) metaHint = meta.words.join(' · ');
        if (meta.card) metaHint = meta.card;
        if (meta.userWord && meta.aiWord) metaHint = `${meta.userWord} × ${meta.aiWord}`;
        if (meta.word) metaHint = `「${meta.word}」`;

        return `<div class="mailbox-item" onclick="this.classList.toggle('expanded')">
          <div class="mailbox-item-header">
            <span class="mailbox-item-type">${TYPE_LABELS[l.type] || l.type}</span>
            <span class="mailbox-item-date">${date}</span>
          </div>
          ${metaHint ? `<div style="color:rgba(200,198,198,0.35);font-size:11px;margin-bottom:4px;">${metaHint}</div>` : ''}
          <div class="mailbox-item-preview">${l.content}</div>
          <div class="mailbox-item-full">${l.content}</div>
        </div>`;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div class="mailbox-loading" style="color:#e57373;">${err.message}</div>`;
    }
  }

  // 兑换码
  document.getElementById('btn-redeem').addEventListener('click', () => {
    document.getElementById('redeem-modal').style.display = 'flex';
  });
  document.getElementById('redeem-modal-close').addEventListener('click', () => {
    document.getElementById('redeem-modal').style.display = 'none';
  });
  document.getElementById('redeem-modal').addEventListener('click', (e) => {
    if (e.target.id === 'redeem-modal') e.target.style.display = 'none';
  });
  document.getElementById('btn-do-redeem').addEventListener('click', async () => {
    const code = document.getElementById('redeem-code').value;
    const errorEl = document.getElementById('redeem-error');
    const successEl = document.getElementById('redeem-success');
    errorEl.textContent = '';
    successEl.textContent = '';

    try {
      const msg = await Auth.redeem(code);
      successEl.textContent = msg;
      updateAuthUI();
      setTimeout(() => {
        document.getElementById('redeem-modal').style.display = 'none';
        loadMailbox();
      }, 1500);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
```

**Step 5: 测试信箱页面**

登录后，点击"信箱"按钮，应该看到信箱页面（目前是空的）。

**Step 6: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: add mailbox page with letter list and redeem"
```

---

## Task 11: 前端 — 各功能自动存信箱

**Files:**
- Modify: `js/app.js`

在每个功能收到 API 结果后，调用 `Auth.saveToMailbox()` 自动保存。

**Step 1: 写信功能 — 在 displayLetter 之后保存**

在 `generateLetter` 函数的 `displayLetter(...)` 调用之后添加：

```javascript
      // 自动存信箱
      Auth.saveToMailbox('letter', data.body, {
        words: words,
        userMessage: userMessage || undefined,
      });
```

对 fallback 分支也做同样处理：
```javascript
      Auth.saveToMailbox('letter', letter.body, {
        words: words,
        userMessage: userMessage || undefined,
      });
```

**Step 2: 翻答案功能 — 在 displayAnswer 调用前保存**

在 `btn-flip-answer` 的 click handler 中，`displayAnswer(result)` 之前添加：

```javascript
      Auth.saveToMailbox('answer', result.response, { word: result.word });
```

**Step 3: 语言之间功能 — 在 AI 评论显示后保存**

在 `revealCards` 函数中，`comment.classList.add('show')` 之后添加：

```javascript
    Auth.saveToMailbox('between', comment.textContent, {
      userWord: betweenUserWord,
      aiWord: betweenAiWord,
    });
```

**Step 4: 塔罗功能 — 在 displayTarot 调用后保存**

在 `btn-tarot-draw` 的 click handler 中，`displayTarot(card, mood)` 调用之后添加：

```javascript
      Auth.saveToMailbox('tarot', mood, {
        card: card.name,
        keywords: card.keywords,
      });
```

对 fallback 分支也做同样处理。

**Step 5: 测试自动存档**

1. 登录
2. 使用任意一个功能（写信/翻答案/语言之间/塔罗）
3. 打开信箱，确认自动保存了

**Step 6: Commit**

```bash
git add js/app.js
git commit -m "feat: auto-save to mailbox after each feature result"
```

---

## Task 12: Service Worker 更新

**Files:**
- Modify: `sw.js`

**Step 1: 更新缓存版本和静态资源列表**

```javascript
const CACHE_NAME = 'fizz-letter-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/letters.js',
  '/js/bubbles.js',
  '/js/answer.js',
  '/js/tarot.js',
  '/js/auth.js',
  '/images/favicon-32.png',
  '/images/favicon-16.png',
  '/images/apple-touch-icon.png',
  '/manifest.json'
];
```

**Step 2: Commit**

```bash
git add sw.js
git commit -m "chore: update service worker cache for auth.js"
```

---

## Task 13: 在 45 测试服务器部署测试

**Files:**
- 无新文件，部署操作

**Step 1: 推送代码到 GitHub**

```bash
cd /Users/songhaiyun/Projects/fizz-letter
git push origin main
```

**Step 2: 在 45 服务器上拉取并安装依赖**

```bash
ssh root@45.32.213.180
cd /root/fizz-letter
git pull origin main
npm install
```

**Step 3: 创建 .env 文件**

```bash
cat > .env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
JWT_SECRET=your-random-secret
EOF
```

**Step 4: 重启服务**

```bash
# 如果用 PM2:
pm2 restart fizz-letter
# 或直接重启:
pkill -f "node server.js" && cd /root/fizz-letter && node server.js &
```

**Step 5: 端到端测试**

1. 打开 http://45.32.213.180:4001
2. 右上角点"登录" → 注册一个账号
3. 登录后看到昵称和"信箱"按钮
4. 使用写信功能 → 打开信箱确认自动保存
5. 使用翻答案 → 确认保存
6. 使用语言之间 → 确认保存
7. 使用塔罗 → 确认保存
8. 退出登录 → 确认功能正常（无登录时和之前一样）
9. 测试兑换码：`curl` 生成码 → 登录后兑换 → 确认 is_premium 变 true

**Step 6: 确认无 bug 后继续**

---

## Task 14: 部署到 HK 服务器

**Files:**
- 无新文件，部署操作

**Step 1: SCP 到 HK 服务器**

```bash
sshpass -p '19941104Yuner' scp -r /Users/songhaiyun/Projects/fizz-letter/{server.js,index.html,package.json,js/auth.js,sw.js,css/style.css} ubuntu@43.161.220.72:/home/ubuntu/fizz-letter/
```

或通过 git pull（如果 HK 服务器有 git）。

**Step 2: SSH 到 HK 服务器安装依赖**

```bash
sshpass -p '19941104Yuner' ssh ubuntu@43.161.220.72
cd /home/ubuntu/fizz-letter
npm install
```

**Step 3: 创建 .env（同45服务器的 Supabase 凭据）**

**Step 4: 重启服务**

**Step 5: 测试 https://fizzletter.cc**

---

## Task 15: 部署到北京服务器

**Files:**
- 无新文件

**Step 1: 在 OrcaTerm 上操作**

北京服务器无法 SSH，用 OrcaTerm：
```bash
cd /root/fizz-letter
curl -L -o server.js "https://raw.githubusercontent.com/haiyun513-commits/fizz-letter/main/server.js"
curl -L -o index.html "https://raw.githubusercontent.com/haiyun513-commits/fizz-letter/main/index.html"
curl -L -o js/auth.js "https://raw.githubusercontent.com/haiyun513-commits/fizz-letter/main/js/auth.js"
curl -L -o sw.js "https://raw.githubusercontent.com/haiyun513-commits/fizz-letter/main/sw.js"
curl -L -o css/style.css "https://raw.githubusercontent.com/haiyun513-commits/fizz-letter/main/css/style.css"
curl -L -o package.json "https://raw.githubusercontent.com/haiyun513-commits/fizz-letter/main/package.json"
npm install
# 创建 .env 文件
# 重启服务
```

---

## 总结

| Task | 内容 | 估计复杂度 |
|------|------|-----------|
| 1 | Supabase 建表 + 依赖 | 简单 |
| 2 | 后端 Supabase 连接 + 工具函数 | 简单 |
| 3 | 后端注册 API | 中等 |
| 4 | 后端登录 + /api/me | 中等 |
| 5 | 后端信箱 CRUD | 中等 |
| 6 | 后端兑换码 | 中等 |
| 7 | 后端重构（统一 parseBody） | 简单 |
| 8 | 前端认证模块 auth.js | 中等 |
| 9 | 前端登录/注册 UI | 较复杂 |
| 10 | 前端信箱页面 | 较复杂 |
| 11 | 前端自动存信箱 | 简单 |
| 12 | Service Worker 更新 | 简单 |
| 13 | 45 服务器测试 | 简单 |
| 14 | HK 服务器部署 | 简单 |
| 15 | 北京服务器部署 | 简单 |
