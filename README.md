# 待办事项 Todo（全栈）

一个使用 Next.js（App Router）+ 原生 JavaScript 编写的简单全栈待办事项应用，支持完整 CRUD，可直接部署到 Vercel。

## 技术栈

- Next.js 14（App Router）
- React 18
- 原生 JavaScript（JSX）
- 数据存储：内存（可替换为 Vercel KV / Postgres 等持久化存储）

## 功能

- 新增待办（Create）
- 查看待办列表（Read）
- 编辑内容 / 切换完成状态（Update）
- 删除待办（Delete）

## 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

1. 将项目推送到 GitHub / GitLab 等仓库
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. Vercel 会自动识别 Next.js，无需额外配置，直接 Deploy 即可

## 关于数据持久化

本项目默认使用内存存储（`lib/todos.js`），目的是保持零依赖、开箱即用。
部署到 Vercel 后，Serverless 实例冷启动会导致内存数据重置，待办不会持久保存。

如需持久化，建议接入 Vercel 官方存储之一（任选其一，示例见 `lib/todos.js` 顶部注释）：

- **Vercel KV**（键值，最简单）：`npm i @vercel/kv`，在 Vercel 创建 KV 数据库后环境变量自动注入
- **Vercel Postgres**：`npm i @vercel/postgres`
- **Vercel Blob**：适合存储文件

替换 `lib/todos.js` 内部实现即可，对外函数签名保持不变，API 和前端无需改动。

## API 接口

| 方法   | 路径             | 说明         | 请求体                          |
| ------ | ---------------- | ------------ | ------------------------------- |
| GET    | /api/todos       | 获取全部待办 | -                               |
| POST   | /api/todos       | 新建待办     | `{ "text": "内容" }`            |
| GET    | /api/todos/:id   | 获取单个待办 | -                               |
| PATCH  | /api/todos/:id   | 更新待办     | `{ "text"?, "completed"? }`     |
| DELETE | /api/todos/:id   | 删除待办     | -                               |

## 目录结构

```
.
├── app/
│   ├── api/todos/
│   │   ├── route.js        # GET 列表 / POST 新建
│   │   └── [id]/route.js   # GET / PATCH / DELETE
│   ├── layout.jsx
│   ├── page.jsx            # 前端页面（客户端交互）
│   └── globals.css
├── lib/
│   └── todos.js            # 数据层
├── package.json
├── next.config.mjs
└── jsconfig.json
```