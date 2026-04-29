# OA MVP — 架构审查与云端部署缺口分析

> 分析日期：2026-04-29
> 分析人：Claude Code 架构审查
> 对应文档：`OA_requirement.pdf`、GAP-ANALYSIS.md、ARCHITECTURE.md

---

## 一、当前架构评价（Strengths）

| 维度 | 评价 |
|------|------|
| **分层架构** | ✅ 前端（纯 SPA）/ 后端（NestJS）/ shared（Pure TS）三件套分离清晰 |
| **离线优先** | ✅ localStorage 主存 + API 双模式，切换逻辑完整 |
| **状态管理** | ✅ 极简 pub/sub store，版本控制，去重持久化 |
| **数据库** | ✅ Prisma ORM，类型安全，迁移机制完整 |
| **容器化** | ✅ Dockerfile + docker-compose 本地开发就绪 |
| **领域逻辑** | ✅ `packages/shared/src/` 纯函数无副作用，可独立测试 |
| **工作流状态机** | ✅ `stateMachine.js` 实现 PENDING→REVIEWING→APPROVED/REJECTED |

---

## 二、部署上云的核心缺口（Critical）

### 1. 认证层——完全空白 🔴 P0

**现状**：`x-user-id` header 直接传 userId，完全可伪造。

```ts
// 任何人都可以这样冒充
fetch('/api/tasks/xxx', { headers: { 'x-user-id': 'u_pm' } })
```

**重构方案**：

| 方案 | 实现方式 | 适合场景 |
|------|---------|---------|
| **JWT (Passport.js)** | `POST /api/auth/login` 返回 token，路由守卫验证 | 标准的 REST API 上云 |
| **Session + Redis** | Cookie session 存 Redis，水平扩展 | 有 WebSocket 或需要 CSRF 保护 |

NestJS 推荐 `@nestjs/jwt` + `@nestjs/passport`，前端登录页存储 token 到内存（避免 localStorage XSS）。

### 2. 输入校验层——完全空白 🔴 P0

**现状**：所有 controller 接收裸 `body: any`，无任何 `@IsString()`/`@IsEmail()` 校验。

```ts
// 现在是这样的
async create(@Body() body: { name: string; email?: string }) { ... }

// 应该这样的
async create(@Body() dto: CreateUserDto) { ... }  // dto 有 class-validator 装饰器
```

**重构**：`class-validator` + `ValidationPipe` 全局开启，Zod 作为替代（已在 shared 包中作为 devDep 但未使用）。

### 3. API 调用一致性——局部混乱 🟡 P1

**现状**：部分 view 绕过 `api/client.js`，直接用 `fetch('/api/...')`，API URL 动态配置会失效。

```js
// kanbanView.js 直接用绝对路径
const res = await fetch(`/api/schedules/${scheduleId}/tasks`);  // ❌ 硬编码 /api
// 而 api/client.js 用的是 buildURL(path) 动态拼接
```

**重构**：全部统一到 `src/api/client.js`，禁止直接 `fetch`。建立 ESLint 规则禁止裸 `fetch`。

### 4. 前端非生产级服务 🟡 P1

**现状**：用 `python3 -m http.server` 开发，无 nginx/Caddy 等生产 Web Server。

**重构**：二选一：

- **方案 A（推荐）**：前端构建产物（index.html + styles.css + src/ 编译后的 bundle）上传到 **Cloudflare Pages / Vercel / S3+CloudFront**，纯静态托管，CDN 全球加速。
- **方案 B**：nginx 容器同时托管前端静态文件 + 反向代理到后端 `/api`。

### 5. 安全中间件缺失 🟡 P1

| 缺失项 | 风险 | 修复 |
|--------|------|------|
| `helmet` | 缺少 security headers | `app.use(helmet())` |
| `@nestjs/throttler` | API 无限流，可被刷 | 限流 100 req/min |
| CORS wildcard | 任何网站可调用 API | 配置 allowed origins |
| 无请求体大小限制 | 大 payload 攻击 | `body-parser limit: '1mb'` |
| 无超时 | 慢查询撑爆连接 | request timeout 30s |

---

## 三、功能缺口（Feature Gaps）

### 3.1 缺失的 REST 端点

| 端点 | 用途 | 状态 |
|------|------|------|
| `POST /api/auth/login` | 登录认证 | ❌ 不存在 |
| `POST /api/auth/register` | 用户注册 | ❌ 不存在 |
| `PATCH /api/tasks/:id` | 更新任务字段（通用） | ❌ 不存在 |
| `GET /api/tasks/:id` | 获取单个任务 | ❌ 不存在 |
| `PATCH /api/tasks/:id/progress` | 更新进度 | ⚠️ service 已实现，controller 未暴露（Task #19） |
| `GET /api/schedules` | 列出所有排期（过滤/分页） | ❌ 不存在 |
| `GET /api/iterations/:id/schedules` | 某迭代下所有排期 | ❌ 不存在 |
| `GET /api/groups/:id/members` | 小组成员列表 | ❌ 不存在 |
| `GET /api/notifications` | 用户通知列表 | ❌ 不存在（只有 outbox 队列） |
| `PATCH /api/notifications/:id/read` | 标记通知已读 | ❌ 不存在 |
| `GET /api/projects/:id/iterations` | 项目下所有迭代 | ❌ 不存在 |

### 3.2 数据模型缺口

| 模型 | 缺失字段 | 优先级 |
|------|---------|--------|
| **User** | `password`/`hashedPassword`、`phone`、`department`、`status`、`avatar` | P0 |
| **Project** | `code`（项目编号）、`pm_user_id`、`status`（筹备/进行中/已结项） | P1 |
| **Iteration** | `status`（planning/active/completed）、`goal` | P1 |
| **Task** | `status`（todo/in-progress/done）、`priority`、`estimatedHours`、`actualHours`、`labels` | P1 |
| **GroupSchedule** | `submittedAt`、`approvedAt`、`reviewedById` | P1 |
| **无** | 里程碑（Milestone）模型 | P1 |
| **无** | 评论（Comment）模型 | P1 |
| **无** | 审计日志（AuditLog）表 | P2 |

### 3.3 角色体系缺口

| PDF 需求 | 现状 | 缺口 |
|----------|------|------|
| 4 种角色：PM / 项目总调度 / GL / 组员 | 只有 GL 和 PM 两种 | **缺失：项目总调度（PM 助手，读写主计划）、组员（仅看本人任务）** |
| 详细权限矩阵（R/W per 角色/功能） | `permit()` 覆盖部分行级权限 | **不完整：系统管理/主计划分解/任务分配等权限未严格校验** |
| 用户密码加密存储（bcrypt） | 明文无加密 | **P0 安全缺口** |

---

## 四、运维/可观测性缺口

| 缺口 | 影响 | 建议 |
|------|------|------|
| 无结构化日志（JSON） | 无法接入 ELK/Splunk | 切换到 `pino` |
| 无 metrics 端点 | 无法监控 | `/metrics` (Prometheus format) |
| `/health` 不检查 DB | K8s liveness probe 假阳性 | health controller 应 `prisma.$queryRaw` |
| 无 `.env.example` | 部署时易漏环境变量 | 新建 `.env.example` |
| 无 secrets 管理 | 生产密码在代码中 | K8s Secrets / AWS SSM Parameter Store |
| 无 CI/CD | 手动部署 | GitHub Actions + ECR/GCR |
| 无数据库连接池调参 | 高并发时连接耗尽 | Prisma connection limit 配置 |

---

## 五、可优化部分（Nice-to-have）

| 优化项 | 现状 | 建议 |
|--------|------|------|
| **前端 bundle 优化** | ES Modules 直出，无打包压缩 | 用 Vite/Rollup 打包 + gzip，体积减少 60%+ |
| **Chart.js / SheetJS** | CDN 加载，离线不可用 | 构建时打入 bundle |
| **前端单元测试** | 只有 E2E（Playwright） | 补充 Vitest 组件测试 |
| **Prisma 软删除** | 全是硬删除 | 加 `deletedAt` 字段 |
| **数据索引** | 无 DB 索引 | 对 `scheduleId`、`iterationId` 加索引 |
| **Webhook / 事件总线** | 无 | 任务状态变更 → 发布事件，通知/审计订阅 |
| **Zod 使用** | 已作为 devDep 安装但未使用 | 替换 class-validator，共享给前后端 |

---

## 六、本次实现发现的 Bug 修复记录

| Bug | 文件 | 修复方式 | 测试覆盖 |
|-----|------|---------|---------|
| `iter.schedules is not iterable` — Prisma 返回 `{}` 而非 `{schedules:[]}` | `statistics.service.ts:59` | 加 `?? []` 守卫 | ✅ BUG-P8-02（`statistics.service.spec.ts`）|
| E2E selector 错误：`data-task-id` 在 `<tr>` 而非 `<td>` | `progress.spec.js` | 改用 `xpath=..` 取父 tr 后再查 td | ✅ 测试已修复并通过 |
| `textContent()` 读 `<input>` 返回空字符串 | `progress.spec.js` | 改用 `inputValue()` | ✅ 测试已修复并通过 |

---

## 七、重构优先级路线图

```
P0（上线前必须）:
  1. JWT 认证层（NestJS Passport + JWT）
  2. 全局输入校验（class-validator + ValidationPipe）
  3. 安全中间件（helmet + throttler + CORS 限定）
  4. Task #19: PATCH /api/tasks/:id/progress 端点

P1（功能完整度）:
  5. REST 端点补全（tasks CRUD、schedules 列表、notifications）
  6. 数据模型补全（User password/phone/dept、Project status/PM）
  7. 前端静态资源生产化（Vite 打包 + CDN）
  8. 生产化前端部署（Cloudflare Pages / S3+CloudFront）
  9. 数据库迁移 Pipeline（GitHub Actions + prisma migrate deploy）

P2（可延迟）:
  10. 里程碑模型
  11. 审计日志
  12. 结构化日志（pino）+ ELK 接入
  13. metrics + Prometheus
```

---

## 八、关键文件索引

| 分类 | 文件 | 说明 |
|------|------|------|
| **前端核心** | `src/main.js` | 初始化序列、双模式 mutation handlers |
| | `src/store.js` | pub/sub state，localStorage 持久化 |
| | `src/api/client.js` | 集中式 REST 客户端（需统一所有调用） |
| | `src/seed.js` | 初始种子数据 |
| **前端组件** | `src/components/wbsTable.js` | WBS 表格主件 |
| | `src/components/dashboardView.js` | Dashboard 首页视图 |
| | `src/components/roleSwitcher.js` | 角色切换 + API URL 配置 |
| | `src/components/kanbanView.js` | ⚠️ 直接用 fetch，绕过 api/client.js |
| | `src/components/statsView.js` | ⚠️ 直接用 fetch，绕过 api/client.js |
| **后端** | `packages/backend/src/main.ts` | NestJS 启动，无 helmet/throttler/ValidationPipe |
| | `packages/backend/src/modules/tasks/tasks.service.ts` | `updateProgress` 方法已实现 |
| | `packages/backend/src/modules/tasks/tasks.controller.ts` | ⚠️ 缺少 PATCH `:id/progress` 路由 |
| | `packages/backend/src/modules/statistics/statistics.service.ts` | 已修复 `?? []` 空值守卫 |
| | `packages/backend/prisma/schema.prisma` | Task 有 `progressPercent`，User 无 password |
| **共享层** | `packages/shared/src/stateMachine.js` | 状态机纯函数 |
| | `packages/shared/src/permissions.js` | `permit()` 权限函数 |
| **部署** | `docker-compose.yml` | postgres + backend 两个容器 |
| | `packages/backend/Dockerfile` | 单阶段构建，开发用 |
| | `packages/backend/.env` | 仅 `DATABASE_URL`，无 `.env.example` |
