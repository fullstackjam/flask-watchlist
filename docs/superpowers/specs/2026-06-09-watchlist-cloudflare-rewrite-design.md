# Watchlist 现代化重构 — Cloudflare 原生设计

**日期**: 2026-06-09
**状态**: 已批准，进入实现计划

## 背景

现仓库是经典 Flask 入门教程版的 watchlist 应用：单用户、电影仅有标题+年份、Jinja 服务端渲染、SQLite、经 Helm/Docker 部署到 K8s。本次目标是在「agentic engineering」时代做一次前后端全面重构，并让仓库**从第一天起就原生构建并部署在 Cloudflare 上**。

## 目标与非目标

### 目标
- 前后端彻底分离重写，采用现代 TypeScript 全栈。
- 后端、前端、数据库、认证全部**原生运行在 Cloudflare 运行时**（Workers + Static Assets + D1）。
- 功能升级为「影视清单增强版」：观看状态、评分、笔记、TMDB 海报/元数据。
- 认证使用 GitHub OAuth，owner 白名单控制写权限，访客匿名只读。
- 一条 `wrangler deploy` 完成部署。

### 非目标（YAGNI）
- 不做公开多用户注册体系（数据模型留好口子，但不实现注册/计费）。
- 不做订阅/付费墙。
- 本轮不实现旧的 K8s/Helm 部署路径（将被删除）。

## 产品形态

- **单 owner + 公开只读**：访客匿名可浏览清单；只有 owner（GitHub 登录且命中白名单）能增删改。
- 这延续原应用「首页公开 GET、编辑需登录」的精神。

## 技术选型

| 层 | 选型 | 说明 / CF 契合点 |
|---|---|---|
| 包管理 | pnpm workspace（monorepo） | — |
| 运行时 | **Cloudflare Workers**（workerd） | 后端入口即 Worker `fetch` handler |
| 后端框架 | **Hono + TypeScript** | Workers 原生支持 |
| 校验 | Zod + `@hono/zod-validator` | — |
| ORM/DB | **Drizzle ORM + Cloudflare D1**（`drizzle-orm/d1`） | 迁移经 drizzle-kit + `wrangler d1 migrations apply` |
| 认证 | GitHub OAuth（**arctic**）+ JWT httpOnly cookie（`hono/jwt`，Web Crypto） | 无服务端 session 存储，Workers 友好 |
| 前端 | **React 19 + Vite + TypeScript** | 构建产物由同一 Worker 经 Static Assets 提供 |
| 样式/组件 | **Tailwind CSS v4 + shadcn/ui** | — |
| 数据/路由 | **TanStack Query + TanStack Router** | — |
| 端到端类型 | **Hono RPC（`hc` 类型化 client）** | 前端复用后端类型，零手写接口类型 |
| 测试 | API: `@cloudflare/vitest-pool-workers`（真实 D1 绑定）；前端: Vitest + Testing Library | — |
| Lint/格式化 | Biome | 单一工具 |

## 架构

### 部署形态：单 Worker + Static Assets（已选定）

一个 Worker 同时：
- 处理 `/api/*` 请求（Hono 路由）；
- 其余请求作为静态资源提供前端 SPA，`not_found_handling: "single-page-application"`，未命中回落 `index.html`。

→ 一条 `wrangler deploy` 同时上线前端 + 后端。不使用单独的 CF Pages 项目。

### 目录结构

```
flask-watchlist/
├─ apps/
│  ├─ api/                 # Hono 后端（Worker 入口）
│  │  ├─ src/
│  │  │  ├─ index.ts       # Worker fetch handler，挂载 Hono app + assets
│  │  │  ├─ app.ts         # Hono app 装配，导出 AppType 供 RPC
│  │  │  ├─ db/            # drizzle schema + 连接 + migrations
│  │  │  ├─ routes/        # movies / auth / tmdb / me
│  │  │  ├─ middleware/    # auth(owner) 守卫
│  │  │  └─ lib/           # tmdb client, github oauth(arctic), jwt
│  │  ├─ wrangler.jsonc    # D1 binding / assets binding / vars
│  │  └─ tests/
│  └─ web/                 # React SPA
│     └─ src/
│        ├─ routes/        # TanStack Router 页面
│        ├─ components/    # shadcn/ui + 业务组件
│        ├─ lib/api.ts     # hono hc 客户端
│        └─ hooks/         # TanStack Query hooks
├─ packages/shared/        # 共享 Zod schema / 枚举（status 等）
├─ pnpm-workspace.yaml
├─ .dev.vars.example
└─ README.md               # 更新：说明已非 Flask，含 CF 部署指南
```

旧文件删除：`watchlist/`、`Dockerfile`、`requirements.txt`、`.flaskenv`、`helm/`（git 历史保留）。

## 数据模型（Drizzle / D1）

```
users
  id (pk)
  github_id (unique)
  github_login
  name
  avatar_url
  created_at

movies
  id (pk)
  user_id (FK → users.id)        # 现在恒为 owner，留多用户口子
  tmdb_id?                        # 来自 TMDB，可空（手动条目）
  title
  year
  poster_url?
  overview?
  genres (json?)
  tmdb_rating?
  status: 'want' | 'watching' | 'watched'   # 想看 / 在看 / 看完
  user_rating? (1–10)
  notes?
  watched_at?
  created_at
  updated_at
```

## API（Hono，全部 `/api/*`）

| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/me` | 公开 | 返回当前登录态 / owner 信息 |
| GET | `/api/auth/github` | 公开 | 发起 OAuth（写 state 签名 cookie） |
| GET | `/api/auth/github/callback` | 公开 | 回调、校验 state、校验 owner 白名单、下发 JWT cookie |
| POST | `/api/auth/logout` | 登录 | 清 cookie |
| GET | `/api/movies` | 公开只读 | 列表（支持按 status 过滤、排序） |
| POST | `/api/movies` | owner | 新增（可带 tmdb_id 自动填充元数据） |
| PATCH | `/api/movies/:id` | owner | 改状态/评分/笔记/看完日期等 |
| DELETE | `/api/movies/:id` | owner | 删除 |
| GET | `/api/tmdb/search?q=` | owner | 代理 TMDB 搜索（后端持有 key） |

### 认证流程

1. 访客点 "Sign in with GitHub" → `GET /api/auth/github`：arctic 生成授权 URL + state，state 存短时签名 cookie，302 跳 GitHub。
2. GitHub 回调 `GET /api/auth/github/callback`：校验 state cookie，用 code 换 token，拉 GitHub 用户信息。
3. 校验 `github_login` 是否命中 `OWNER_GITHUB_LOGIN` 白名单：
   - 命中 → upsert users 记录，签发 JWT 存 httpOnly secure cookie，重定向回首页。
   - 未命中 → 拒绝（不下发 owner 权限）。
4. 受保护路由经 auth 中间件校验 JWT cookie；非 owner 一律 401/403。

## 前端页面

- **首页**：海报网格卡片，按 想看/在看/看完 分栏（Tab）或筛选，支持排序；未登录只读。
- **添加流程**：owner 点「添加」→ TMDB 搜索弹窗 → 选中自动填充海报/简介/年份/类型 → 选初始状态保存。
- **条目详情/编辑**：改状态、打分（1–10）、写笔记、标记看完日期。
- **登录**："Sign in with GitHub" 按钮。
- **顶栏**：登录态/头像、登出。

## 配置与密钥

- `wrangler.jsonc`：D1 database binding、Assets binding、非敏感 vars。
- 密钥本地放 `.dev.vars`，线上用 `wrangler secret put`：
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `TMDB_API_KEY`
  - `JWT_SECRET`
  - `OWNER_GITHUB_LOGIN`
- 提供 `.dev.vars.example` 模板。
- **用户需自备**：① GitHub OAuth App（client id/secret + callback URL）；② TMDB API key。

## 本地开发

- `pnpm dev` 经 `concurrently` 同时拉起：
  - `wrangler dev`（Worker + 本地 D1）；
  - Vite dev server（前端 HMR，`/api` 代理到 wrangler）。

## 测试策略

- TDD（实现阶段遵循 test-driven-development skill）。
- API：`@cloudflare/vitest-pool-workers`，在真实 workerd + D1 绑定里跑集成测试，覆盖：
  - movies CRUD；
  - owner 守卫（未登录 / 非 owner 被拒）；
  - TMDB 代理（mock 外部 fetch）；
  - 认证回调（state 校验、白名单命中/未命中）。
- 前端：Vitest + Testing Library，覆盖关键组件与 Query hooks。

## 部署

- 一条 `wrangler deploy` 同时上线前端 + 后端。
- README 文档化：创建 D1、跑 migrations、设置 secrets、注册 GitHub OAuth App。

## 实现里程碑（将展开为正式 plan）

1. Monorepo 脚手架 + 工具链（pnpm workspace、Biome、wrangler.jsonc 骨架）
2. DB schema + drizzle-kit migrations + D1 绑定
3. Auth（GitHub OAuth via arctic + owner 守卫中间件 + JWT cookie）
4. Movies CRUD API + 测试
5. TMDB 代理 + 测试
6. 前端框架（TanStack Router + Query + shadcn/ui + hc client）
7. 各页面与交互（首页/添加/编辑/登录/顶栏）
8. Static Assets 装配 + 单 Worker 部署打通
9. README + `.dev.vars.example` + 删除旧 Flask/Helm 文件

## 风险与开放点

- **D1 限制**：D1 是 SQLite 语义，单库写吞吐有限——个人应用规模完全够用。
- **arctic + Workers**：基于 Web 标准，已验证可在 workerd 运行；实现时以 cloudflare/workers-best-practices skill 核对最新写法。
- **Tailwind v4 + shadcn/ui**：v4 配置方式与 v3 不同，实现时按当前文档配置。
