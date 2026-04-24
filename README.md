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

## 演示流程（推荐）

按以下步骤走完 GL → PM → 总表完整主链路：

```
1. 访问 http://localhost:5173 ，默认以 u1（组长 G1）登录
2. 左侧栏点击"2026-Q2 迭代" → 双击"组: g1"进入排期表
3. 在"任务名"列输入内容（如"需求文档编写"），等待 30 秒自动保存（网络面板见 PATCH 200）
4. 点击"提交"按钮 → 状态变为"撤回"（REVIEWING）
5. 右上角切换为 p1（王架构，PM）→ 左侧栏再次点击"2026-Q2 迭代"
   → g1 行显示 REVIEWING 黄底标签
6. 点击"组: g1"进入排期表 → 点"同意" → 状态变为"已审批"（绿色）
7. 访问 http://localhost:5173/iterations/iter-1/master 进入项目总表
   → 看到来自 g1 的"组"来源行（蓝色标签）
8. （可选）作为 PM 点击"+ 新增行"，输入 u1 可新增 PM 直接分配的 MASTER 行（紫色标签）
```

## 常见问题排查

### 页面空白或数据加载失败

1. 检查后端启动日志是否有 `[oa-mvp] DB ready:` 行
2. 如果计数为 0 或有警告，运行 `pnpm seed` 填充种子数据
3. 确认 docker compose 容器在运行：`docker compose ps`
4. 检查浏览器控制台 Network 面板是否有 5xx 响应

### 后端启动报错

```bash
# 重置数据库（清空 + 重新 seed）
cd packages/backend
npx prisma migrate reset --force
```

## 测试

E2E 测试（T4.1/T4.2/T4.8 已覆盖完整链路）：

```bash
# 需要先启动：docker compose up -d && pnpm dev
pnpm test:e2e
```

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
