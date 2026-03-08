# Fizz Letter 信箱 + 付费系统设计

## 目标

给泡沫来信加账号系统和信箱功能，让用户可以回看历史信件。通过付费解锁（爱发电兑换码）实现轻度变现。

## 现状

- 3000+ 小红书赞，1500 活跃用户（3 个群）
- 4 个功能：写信、翻答案、语言之间、塔罗
- 3 台服务器：US(45)/HK(43)/北京(120)，域名 fizzletter.cc
- 纯前端体验，无账号系统，信件只能截图保存
- 用户最大需求：收藏/回看历史信件

## 架构

```
用户 → fizzletter.cc (Nginx/HTTPS, HK server)
         ↓
       Node.js server (port 4001)
         ↓
       Supabase (用户数据 + 信箱)
```

开发/测试在 45 服务器，验证后部署到 HK 和北京。

## 账号系统

### 第一版：邮箱登录
- 注册：邮箱 + 昵称 + 密码
- 登录：邮箱 + 密码
- 暂不做邮箱验证（降低门槛）
- 密码用 bcrypt 哈希存储

### 第二版（后续）：微信登录
- 公司资质注册微信开放平台
- 已有用户可绑定微信
- 微信内打开自动授权，浏览器扫码登录

### 前端体验
- 首页右上角小 "登录" 按钮，不强制
- 未登录：所有功能正常用，跟现在一样
- 已登录：多一个 "信箱" 入口，信件自动存档

## 信箱

### 存储内容
每条记录包含：
- type: letter / answer / between / tarot
- content: 信件正文 / 答案 / 评论 / 塔罗解读
- metadata: 选的词、牌名等上下文
- created_at: 时间戳

### 限制
- 免费用户：保留最近 20 条
- 付费用户：无限存储

### 前端
- 信箱页面：按时间线展示所有历史记录
- 每条记录可展开查看完整内容
- 保持现有的视觉风格（极光背景、毛玻璃）

## 付费解锁

### 第一版：爱发电 + 兑换码
- 爱发电页面挂打赏链接
- 用户打赏后，你手动生成兑换码发给用户
- 用户在网站输入兑换码 → is_premium = true
- 解锁内容：无限信箱（后续加更多信纸风格等）

### 第二版（后续）：微信支付
- 公司资质接微信支付
- 网站内直接付费解锁

## 数据库（Supabase）

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| email | text | 唯一，登录用 |
| nickname | text | 显示名 |
| password_hash | text | bcrypt |
| is_premium | boolean | 是否付费用户 |
| created_at | timestamp | 注册时间 |

### letters 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 外键 → users |
| type | text | letter/answer/between/tarot |
| content | text | 主要内容 |
| metadata | jsonb | 上下文（词、牌名等） |
| created_at | timestamp | 创建时间 |

### redeem_codes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| code | text | 唯一，8位随机码 |
| used_by | uuid | 外键 → users，null=未使用 |
| created_at | timestamp | 生成时间 |
| used_at | timestamp | 使用时间 |

## API 端点

### 账号
- `POST /api/register` — { email, nickname, password }
- `POST /api/login` — { email, password } → { token, user }
- `GET /api/me` — 当前用户信息（需 token）

### 信箱
- `GET /api/mailbox` — 获取历史记录（需 token）
- `POST /api/mailbox/save` — 保存一条记录（需 token）

### 兑换码
- `POST /api/redeem` — { code } 兑换付费（需 token）
- `POST /api/admin/generate-code` — 生成兑换码（管理员）

### 现有 API 改动
- 写信/答案/语言之间/塔罗的返回值不变
- 前端收到结果后，如果已登录，自动调 /api/mailbox/save

## 实施顺序

1. Supabase 建表
2. 后端：注册/登录/JWT 认证
3. 前端：登录/注册 UI
4. 后端：信箱 CRUD
5. 前端：信箱页面
6. 前端：各功能自动存信箱
7. 兑换码系统
8. 爱发电页面
9. 测试（45 服务器）
10. 部署到 HK + 北京
