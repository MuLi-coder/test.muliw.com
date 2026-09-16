# 北京景点候选

一个帮助挑选「想去的北京景点」的全栈小应用（Next.js + 原生 JS）。

## 功能

- **首页**：规则说明 + 22 个景点候选总览
- **景点页**：逐个展示景点图片 + 简介，选择「可以考虑去 / 不是很想去」，支持上一个 / 下一个
- **统计页**：统一勾选想去的景点（可修改），底部提交，结果保存到后端

## 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 提交结果保存

提交后，每次结果以一条记录追加保存，包含提交时间和每个景点的选择。

- **Vercel 部署**：结果存入 Vercel KV（`@vercel/kv`），列表键为 `submissions`。
- **本地开发**：未配置 KV 环境变量时，自动回退为写 `results/` 文件夹下的 JSON 文件。

### 在 Vercel 配置 KV

1. 打开 Vercel 项目 → **Storage** → **Create Database**，选择 **KV (Redis)**，创建并 **Connect** 到本项目。
2. Vercel 会自动注入 `KV_REST_API_URL`、`KV_REST_API_TOKEN`、`KV_URL` 三个环境变量，无需手动配置。
3. 重新部署一次（`vercel --prod` 或 Git Push），提交接口即可正常写 KV。
4. 若仓库里没有 `vercel.json`，首次「Connect 数据库」后重新触发一次部署，让环境变量生效。

## 技术栈

- Next.js 14（App Router）
- React 18
- 原生 JavaScript（JSX）
- @vercel/kv（提交结果存储，本地回退写文件）
- 图片为网络搜索获取，可随时在 `lib/spots.js` 中替换为自有图片

## 目录结构

```
.
├── app/
│   ├── api/submit/route.js      # 提交 API（KV / 本地回退写文件）
│   ├── api/submissions/route.js # 读取提交结果 API
│   ├── spot/[index]/page.jsx    # 景点详情页
│   ├── summary/page.jsx         # 统计页
│   ├── results/page.jsx         # 提交结果展示页
│   ├── layout.jsx
│   ├── page.jsx               # 首页
│   └── globals.css
├── lib/spots.js               # 景点数据
├── results/                   # 提交结果（仅本地开发时生成）
└── package.json
```