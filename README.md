# OA 平台项目管理 MVP

> 基于 TDD 驱动的 OA 项目管理平台最小可行实现。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vite + React 18 + TypeScript + TailwindCSS + `@tanstack/react-table` |
| 后端 | NestJS + Prisma + PostgreSQL |
| 共享 | `packages/shared` — 状态机 / 依赖检测 / 工作日历纯函数 |
| E2E | Playwright |
| 单仓 | pnpm workspaces |

## 快速启动

```bash
# 1. 启动数据库
docker compose up -d

# 2. 安装依赖
pnpm install

# 3. 初始化 Prisma（创建表）
cd packages/backend
npx prisma migrate dev --name init
npx prisma db seed
cd ../..

# 4. 启动开发服务
pnpm dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- Prisma Studio：`cd packages/backend && npx prisma studio`

## 测试

本项目使用 **Jest** 做单元测试，**Playwright** 做 E2E 测试。暂无独立的 DT/FT 分层。

```bash
# Lint（所有包）
pnpm lint

# 运行所有包的单元测试（backend + shared）
pnpm test

# 仅运行 shared 包单元测试（状态机 / 依赖检测 / 工作日历 / 权限）
pnpm --filter @oa-mvp/shared test

# 仅运行 backend 包单元测试（NestJS service 层；建议先 build shared，见 docs/BACKEND_TESTING.md）
pnpm --filter @oa-mvp/backend test

# E2E 端到端测试（需要先启动：docker compose up -d && pnpm dev）
pnpm test:e2e
```

> **注意**：`packages/frontend` 当前没有测试文件。`vitest` 存在于 `node_modules` 但未被使用。

## 角色演示

页面右上角角色切换器可切换：

| ID | 姓名 | 角色 |
|----|------|------|
| u1 | 胡孟瑶 | 组长 (G1) |
| u2 | 陈思远 | 组长 (G2) |
| p1 | 王架构 | 项目经理 |

## 文档

- [PLAN.md](docs/PLAN.md) — 开发计划与 MVP 范围
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — 架构设计
- [TDD-GUIDE.md](docs/TDD-GUIDE.md) — TDD 开发指南
- [TEST-PLAN.md](docs/TEST-PLAN.md) — 三层测试用例清单
- [BACKEND_TESTING.md](docs/BACKEND_TESTING.md) — Backend Jest / workspace / Prisma mock 常见故障与约定
- [TASKS/](docs/TASKS/) — 原子任务卡

## 目录结构

```
packages/
├── shared/          # 纯函数、Zod schema、TS 类型（T1.1-T1.4）
├── backend/        # NestJS + Prisma + PostgreSQL（T2.x）
│   ├── prisma/     # schema.prisma + seed.ts
│   └── src/        # Modules: projects, schedules, tasks, master, outbox, exports
└── frontend/       # Vite + React + Tailwind（T3.x）
    └── src/
        ├── components/   # Layout, RoleSwitcher, WbsTable, ApprovalPanel
        ├── hooks/        # useAutoSave
        ├── pages/        # ProjectsPage, IterationDetailPage, SchedulePage, MasterPage
        └── stores/       # Zustand: userStore
e2e/                # Playwright E2E tests
docs/               # PLAN, ARCHITECTURE, TDD-GUIDE, TEST-PLAN, BACKEND_TESTING, TASKS/
```
