# 北京景点候选

一个帮助挑选「想去的北京景点」的全栈小应用（Next.js + 原生 JS）。

## 功能

- **首页**：规则说明 + 22 个景点候选总览
- **景点页**：逐个展示景点图片 + 简介，选择「可以考虑去 / 不是很想去」，支持上一个 / 下一个
- **统计页**：统一勾选想去的景点（可修改），底部提交
- **结果页**：提交后展示后端列表中保存的所有提交记录

## 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 提交结果保存

提交后，每次结果作为一个字典（对象）追加到后端内存列表中（`lib/store.js`），
包含提交时间和每个景点的选择；提交完成后跳转到结果页，从该列表读取并展示。

> 注意：内存列表在进程重启后会清空。部署到 Vercel（Serverless）时，
> 函数实例不常驻、多实例之间互不共享，内存数据无法持久、且不稳定。
> 如需正式留存结果，建议后续接入 Vercel KV / Blob 等持久化存储。

## 技术栈

- Next.js 14（App Router）
- React 18
- 原生 JavaScript（JSX）
- 图片为网络搜索获取，可随时在 `lib/spots.js` 中替换为自有图片

## 目录结构

```
.
├── app/
│   ├── api/submit/route.js      # 提交 API（写入内存列表）
│   ├── api/submissions/route.js # 读取内存列表 API
│   ├── spot/[index]/page.jsx    # 景点详情页
│   ├── summary/page.jsx         # 统计页
│   ├── results/page.jsx         # 提交结果展示页
│   ├── layout.jsx
│   ├── page.jsx                 # 首页
│   └── globals.css
├── lib/spots.js                 # 景点数据
├── lib/store.js                 # 内存列表存储（元素为字典）
└── package.json
```