# 北京景点候选

一个帮助挑选「想去的北京景点」的全栈小应用（Next.js + 原生 JS）。

## 功能

- **首页**：规则说明 + 22 个景点候选总览
- **景点页**：逐个展示景点图片 + 简介，选择「可以考虑去 / 不是很想去」，支持上一个 / 下一个
- **统计页**：统一勾选想去的景点（可修改），底部提交，结果保存到后端项目文件夹

## 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 提交结果保存

提交后，结果会以 JSON 文件写入项目根目录的 `results/` 文件夹，
文件名形如 `submission-2026-09-16T11-30-00.json`，内容包含提交时间与每个景点的选择。

> 注意：本地开发时文件会写入项目文件夹；若部署到 Vercel（Serverless），
> 文件系统只读（仅 /tmp 可写），写文件无法持久保存，建议改用 Vercel KV / Blob。

## 技术栈

- Next.js 14（App Router）
- React 18
- 原生 JavaScript（JSX）
- 图片为网络搜索获取，可随时在 `lib/spots.js` 中替换为自有图片

## 目录结构

```
.
├── app/
│   ├── api/submit/route.js    # 提交 API（写文件）
│   ├── spot/[index]/page.jsx  # 景点详情页
│   ├── summary/page.jsx       # 统计页
│   ├── layout.jsx
│   ├── page.jsx               # 首页
│   └── globals.css
├── lib/spots.js               # 景点数据
├── results/                   # 提交结果（运行时生成）
└── package.json
```