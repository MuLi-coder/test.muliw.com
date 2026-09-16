# 北京景点候选

一个帮助挑选「想去的北京景点」的全栈小应用（Next.js + 原生 JS）。

## 功能

- **首页**：规则说明 + 22 个景点候选总览
- **景点页**：逐个展示景点图片 + 简介，选择「可以考虑去 / 不是很想去」，支持上一个 / 下一个
- **统计页**：统一勾选想去的景点（可修改），底部提交
- **结果页**：提交后展示所有历史提交记录

## 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 提交结果保存

提交后，每次结果作为一个字典（对象）追加保存，包含提交时间和每个景点的选择；
提交完成后跳转到结果页，读取并展示。

- **Vercel 部署**：结果存入 Upstash Redis（`@upstash/redis`），列表键为 `submissions`。
- **本地开发**：未配置 Redis 环境变量时，自动回退为内存列表（`lib/store.js`）。

### 在 Vercel 配置 Redis（必须）

> 注意：Vercel 原「KV」产品已下线，现在请使用 Marketplace 里的 **Redis（Upstash）** 集成。

1. Vercel 项目 → **Storage** → 安装/创建 **Redis（Upstash）** 数据库。
2. 把它 **Connect** 到本项目（选择要关联的 Vercel 项目）。
3. 回到 **Deployments** 重新部署一次（或 Git Push），让环境变量生效。

> 配置完成后 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN` 会自动注入，无需手动填写。

## 技术栈

- Next.js 14（App Router）
- React 18
- 原生 JavaScript（JSX）
- @upstash/redis（提交结果持久化，本地回退内存列表）
- 图片为网络搜索获取，可随时在 `lib/spots.js` 中替换为自有图片

## 目录结构

```
.
├── app/
│   ├── api/submit/route.js      # 提交 API（Redis / 本地内存）
│   ├── api/submissions/route.js # 读取提交结果 API
│   ├── spot/[index]/page.jsx    # 景点详情页
│   ├── summary/page.jsx         # 统计页
│   ├── results/page.jsx         # 提交结果展示页
│   ├── layout.jsx
│   ├── page.jsx                 # 首页
│   └── globals.css
├── lib/spots.js                 # 景点数据
├── lib/store.js                 # 本地开发内存列表兜底
└── package.json
```