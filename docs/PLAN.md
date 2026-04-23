# OA 平台 MVP 架构与 Agent 开发计划

> 本文件是 Agent 每次任务的单一事实源（Single Source of Truth）。
> 如与 `requirement.md` 冲突，以本文件为准，请提 Issue 通知维护者。

---

## 1. MVP 范围决策

**保留（首版必做）**

| 功能 | 说明 |
|------|------|
| 角色切换 | `GroupLeader` / `ProjectManager` mock 登录（header `X-User-Id`） |
| 项目/迭代树 | 侧边栏，按 项目(L1) → 迭代(L2) 展示 |
| 小组 WBS 排期表 | Excel 级交互：单元格编辑、多选、复制/粘贴、撤销/重做、`Alt+Enter` 换行、列冻结、右键增删行 |
| 状态机 | `PENDING → REVIEWING → APPROVED | REJECTED`；`APPROVED → REJECTED`（重新排期） |
| 30s 自动保存 | 草稿异步持久化，失败重试 + 冲突提示 |
| 主从双向同步 | `APPROVED` 汇总到总表；PM 在总表新增 `source=MASTER` 行回写至组 |
| 任务依赖 | 1-to-1、DFS 循环检测、按工作日历的时间联动 |
| PM 审批 | 同意/拒绝（200字理由）/ 重新排期 + 覆盖风险弹窗 |

**Stub 接口（有契约 + 基础测试）**

- 钉钉通知 → `NotificationOutbox` 事件表 + 控制台 JSON 日志
- 导出 `.xlsx` → 路由 + 权限校验，返回 mock buffer
- 备忘录 → 纯文本 CRUD，富文本/图片留扩展
- 法定节假日日历 → 内置周末 + 可配置假日表，MVP 不接第三方 API

**不做**：真实 SSO、审计日志全量、高并发分布式锁（`version` 乐观锁足够）。

---

## 2. 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vite + React 18 + TypeScript + TailwindCSS + `@tanstack/react-table` |
| 后端 | NestJS + Prisma + PostgreSQL |
| 共享 | `packages/shared` — Zod schema、TS 类型、状态机/依赖/日历纯函数 |
| E2E | Playwright（独立 `e2e/` 包） |
| 单仓 | pnpm workspaces |

---

## 3. 仓库结构

```
/home/rhonin/oa/
├── packages/
│   ├── shared/           # 纯函数、Zod schema、TS 类型
│   ├── backend/          # NestJS + Prisma
│   └── frontend/         # Vite + React + Tailwind
├── e2e/                  # Playwright
├── tools/
│   └── docx-extract/     # Python 图片抽取脚本
├── docs/
│   ├── PLAN.md           # 单一事实源（本文件）
│   ├── ARCHITECTURE.md   # 架构图、数据模型、状态机图
│   ├── TDD-GUIDE.md      # TDD 红/绿/重构模板
│   ├── TEST-PLAN.md      # 三层用例清单（可勾选）
│   └── TASKS/            # 原子任务卡（每卡 ~1-3h）
├── docker-compose.yml
├── package.json
├── requirement.md
└── OA平台项目管理需求规格说明书20260417.docx
```

---

## 4. 状态机

```
PENDING ──submit──> REVIEWING
REJECTED ──submit──> REVIEWING
APPROVED ──submit──> REVIEWING（组长再次提交）
REVIEWING ──withdraw──> PENDING（组长撤回）
REVIEWING ──approve──> APPROVED（PM 同意）
REVIEWING ──reject──> REJECTED（PM 拒绝，reason ≤ 200字）
APPROVED ──reschedule──> REJECTED（PM 发起，组长覆盖风险提示）
```

`canTransition(from, to, actor, ctx)` 是纯函数，放在 `packages/shared`，首批 TDD。

---

## 5. TDD 节奏

每张任务卡的固定节奏：

```
1. 写验收 E2E（红） → 2. 写服务/组件测试（红） → 3. 实现（绿） → 4. 重构
```

详见 `docs/TDD-GUIDE.md`。

三层测试策略：

| 层 | 工具 | 目标 |
|----|------|------|
| L1 Domain Unit | Jest | 纯函数覆盖 ≥ 95%，无 I/O |
| L2 Backend FT | `@nestjs/testing` + test Postgres | API 契约 + 业务规则，单条 < 2s |
| L3 Frontend FT | Vitest + RTL + MSW | 组件行为 + 状态契约 |
| L4 E2E | Playwright | 真实浏览器 + 真实 DB，多角色多 Tab |

完整用例目录见 `docs/TEST-PLAN.md`。

---

## 6. 任务分解（阶段 0-5）

### 阶段 0 — 脚手架

| 任务 | 目标 |
|------|------|
| T0.1 | pnpm 单仓 + ESLint/Prettier + CI（GitHub Actions：lint/DT/FT/E2E） |
| T0.2 | `packages/shared` 类型 + Zod schema |
| T0.3 | NestJS + Prisma + docker-compose Postgres + 基础 seed |
| T0.4 | Vite + React + Tailwind + 路由 + mock 登录 |
| T0.5 | Playwright 初始化 + 一条冒烟 E2E |
| T0.6 | `tools/docx-extract/` Python 脚本（含 2 条 pytest） |

### 阶段 1 — 领域核心（纯函数，100% TDD）

| 任务 | 目标 |
|------|------|
| T1.1 | 状态机转换 + 角色守卫 |
| T1.2 | 依赖图 1-to-1 约束 + DFS 循环检测 |
| T1.3 | 工作日历 + 时间联动（周末/节假日/持续天数） |
| T1.4 | 权限矩阵 |

### 阶段 2 — 后端 API（TDD）

| 任务 | 目标 |
|------|------|
| T2.1 | Project / Iteration CRUD |
| T2.2 | GroupSchedule CRUD + 草稿自动保存（乐观锁 `version`） |
| T2.3 | Task CRUD（增删行、排序、字段校验） |
| T2.4 | 状态机端点：submit / withdraw / approve / reject / reschedule |
| T2.5 | Dependency 端点（复用 T1.2/T1.3） |
| T2.6 | Master 视图 + PM 新增/删除 `MASTER` 行（删除约束） |
| T2.7 | `NotificationOutbox` + 钉钉 stub worker |
| T2.8 | Export stub（返回固定 xlsx buffer + 权限校验） |

### 阶段 3 — 前端（组件优先 TDD）

| 任务 | 目标 |
|------|------|
| T3.1 | 角色切换器 + 项目/迭代侧边树 |
| T3.2 | WBS 表格骨架（`@tanstack/react-table` + 自建键盘层） |
| T3.3 | WBS 表格交互：选择/复制/粘贴/Undo-Redo/`Alt+Enter`/冻结/右键菜单 |
| T3.4 | `useAutoSave` Hook（30s 节流 + 失败重试 + 冲突提示） |
| T3.5 | 审批面板（提交/撤回/同意/拒绝/重新排期 + 理由校验） |
| T3.6 | 依赖选择器（列置灰/目标高亮/Esc 退出） |
| T3.7 | 总表页面（PM 新增/删除行，行来源徽标） |

### 阶段 4 — E2E（Playwright）

| 任务 | 场景 |
|------|------|
| T4.1 | GL 编辑 + 30s 自动保存 → 提交 → PM 待办 badge |
| T4.2 | PM approve → 主表出现该组任务 |
| T4.3 | PM reject（理由为空/超长拦截） → GL 侧显示 REJECTED |
| T4.4 | 双 context 冲突（GL 编辑中 + PM reschedule） |
| T4.5 | Excel 级交互（复制粘贴/Undo/Alt+Enter/冻结） |
| T4.6 | PM 总表新增/删除行（含 source=GROUP 不可删验证） |
| T4.7 | 依赖循环检测 + 时间联动（跨周末） |
| T4.8 | 完整链路 submit→approve→reschedule + Outbox 验证 |

### 阶段 5 — 打磨 & 交付

| 任务 | 目标 |
|------|------|
| T5.1 | 种子数据 + README 运行指引 |
| T5.2 | 覆盖率阈值 + CI 门禁定稿 |
| T5.3 | `docs/ARCHITECTURE.md` 定稿 + UI 参考图嵌入 |

---

## 7. 关键风险与缓解

| 风险 | 缓解 |
|------|------|
| Excel 级表格复杂度 | 限定 MVP 交互清单；`@tanstack/react-table` + 自建键盘层，避免商业控件 |
| 并发编辑覆盖 | `version` 乐观锁 + 412 冲突 UI，不引入 CRDT |
| 时间联动正确性 | 工作日历做成可注入纯函数，便于矩阵覆盖 |
| 钉钉依赖 | Outbox 模式彻底解耦，后续换真实通道零业务改动 |
