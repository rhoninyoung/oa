# OA MVP — 架构文档

## 一、架构概览

### 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 原生 ES Modules + HTML | 零构建工具，零框架，直接浏览器运行 |
| 状态管理 | 自研 Pub/Sub Store | `src/store.js`，localStorage 持久化 |
| 后端 | NestJS + Prisma + PostgreSQL | 模块化 Service/Controller 架构 |
| 通知 | Transactional Outbox | `NotificationOutbox` 表 + 后台 Worker |
| 图表 | Chart.js（CDN） | 统计看板、燃尽图 |
| Excel | SheetJS（CDN） | .xlsx 导入/导出 |

### 双模式设计

前端共享同一套 Store，数据来源可选：

- **localStorage 模式**（默认）：离线完整运行，数据存 `oa.state.v1`，无需后端
- **API 模式**：设置 `localStorage.setItem('oa.api.baseUrl', 'http://...')` 激活，前端通过 `src/api/client.js` 与后端 REST 通信

两种模式切换零代码改动，后端是事实来源（source of truth）。

---

## 二、前端架构

### 目录结构

```
src/
  store.js          # 中心化状态 + Pub/Sub + localStorage 持久化
  main.js           # 启动引导、渲染循环、事件总线
  seed.js           # 默认种子数据（1项目/2组/3用户）
  api/client.js     # REST 客户端（双模式自动切换）
  domain/           # 纯函数业务逻辑
    stateMachine.js # 状态机真值表（PENDING→REVIEWING→APPROVED/REJECTED）
    calendar.js     # 工作日计算（跳过周末+节假日）
    dependency.js   # 任务依赖（1对1 + DFS 循环检测 + 级联日期联动）
    permissions.js  # 行/字段级权限（permit / canDeleteRow / getFieldPermissions）
    tableOps.js     # Undo/Redo 栈
  components/       # DOM 渲染组件（innerHTML 替换模式）
    wbsTable.js     # WBS 主表格（双击编辑/Ctrl+C-V-Z-Y/右键菜单/依赖选择器）
    roleSwitcher.js # GL/PM 角色切换
    projectTree.js  # 项目树侧边栏
    activityLog.js  # 活动日志
    toast.js        # 临时通知
    statsView.js    # 统计看板（柱状图/饼图/进度条）
    calendarView.js # 日历视图（月度网格）
    ganttView.js   # 甘特图（SVG 依赖箭头）
    kanbanView.js  # 看板视图（拖拽改状态）
    burndownChart.js # 燃尽图
    searchFilter.js # 高级搜索过滤
  hooks/
    autoSave.js     # 定时自动保存 + Ctrl+S 拦截
  io/
    importExport.js # JSON 文件导入/导出
    excel.js       # SheetJS Excel 导入/导出
```

### 状态管理（`src/store.js`）

```js
// 状态形状
{
  _version,           // 版本号，用于跳过无变更序列化
  users, groups, projects, iterations,
  schedules,           // { id, iterationId, groupId, status, version, rejectReason }
  tasks,              // { id, scheduleId, source, orderIndex, dependencyTaskId, ... }
  activityLog,        // 追加式操作日志
  holidays,           // 节假日列表
  currentUserId, activeIterationId, activeGroupId,
  viewMode,           // 'GROUP' | 'MASTER'
}
```

**关键原则：永远不要在 `setState()` 后直接调用渲染函数** — Store Subscriber 负责触发重新渲染，直接调用会引发双重渲染。

### 领域层（`src/domain/`）

所有业务逻辑均为**无副作用纯函数**，可用 Node.js 内置测试运行器直接测试：

| 文件 | 职责 | 关键 API |
|------|------|----------|
| `stateMachine.js` | 状态转换合法性判断 | `canTransition()`, `nextStatus()` |
| `calendar.js` | 工作日/节假日计算 | `addWorkDays()`, `calcEndDate()`, `isWorkDay()` |
| `dependency.js` | 任务依赖 + 循环检测 + 级联日期 | `checkDependencyCycle()`, `propagateFinishChange()` |
| `permissions.js` | 行级/字段级权限 | `permit()`, `canDeleteRow()`, `getFieldPermissions()` |
| `tableOps.js` | Undo/Redo 历史栈 | `pushUndo()`, `popUndo()`, `popRedo()` |

### 渲染流程（`src/main.js`）

```
init()
  → getState() → 空则 loadSeedData()
  → render()
      → renderShell()        更新角色切换器/项目树/视图标签
      → renderGroupView()    WBS 表格 + 审批面板
      或 renderMasterView()  总表聚合视图
  → subscribe(render)        Store Subscriber，每次 setState 触发 render
```

---

## 三、后端架构（NestJS）

### 模块结构

```
packages/backend/src/
  app.module.ts                # 根模块
  prisma.service.ts            # Prisma 单例
  modules/
    projects/                  # 项目 CRUD
    iterations/                # 迭代 CRUD
    groups/                    # 小组 CRUD
    users/                     # 用户管理
    schedules/                 # 排期状态流转（submit/withdraw/approve/reject/reschedule）
    tasks/                     # 任务 CRUD + 依赖 + 日期级联
    master/                    # 总表视图（聚合 APPROVED 任务 + PM 新增行）
    outbox/                    # Transactional Outbox 写入
    notifications/             # Outbox Worker（轮询 → 发送邮件/钉钉）
    holidays/                  # 节假日管理
    health/                    # 健康检查
    statistics/                # 统计聚合（工作量/项目进度）
```

### 核心 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects` | 项目树（含迭代/小组嵌套） |
| `GET` | `/api/schedules/:id` | 排期详情（含任务列表） |
| `PATCH` | `/api/schedules/:id/draft` | 保存草稿（version 冲突检测） |
| `POST` | `/api/schedules/:id/submit` | GL 提交 → REVIEWING |
| `POST` | `/api/schedules/:id/withdraw` | GL 撤回 → PENDING |
| `POST` | `/api/schedules/:id/approve` | PM 批准 → APPROVED |
| `POST` | `/api/schedules/:id/reject` | PM 拒绝 → REJECTED（需理由） |
| `POST` | `/api/schedules/:id/reschedule` | PM 重新排期 → REJECTED |
| `GET` | `/api/master/:iterationId` | 总表视图 |
| `POST` | `/api/master/:iterationId/rows` | PM 新增总表行 |
| `DELETE` | `/api/master/rows/:taskId` | PM 删除总表行 |

---

## 四、数据模型（Prisma）

```
User ─────────────┬──► Group（members[]）
                  └──► groupId?（可选 FK，PM 此字段为 null）

Project
  └─► Iteration
        └─► GroupSchedule  (unique: [iterationId, groupId])
              ├─► Task[]（orderIndex, source: GROUP|MASTER, dependencyTaskId?）
              └─► ApprovalRecord[]

Holiday（year + date, unique）   — 工作日计算用

NotificationOutbox（idempotencyKey unique）
  └─ type: EMAIL|DINGTALK, status: PENDING|RESOLVED|FAILED
  └─ attempts, lastAttempt, scheduleId?
```

**枚举值：**
- `ScheduleStatus`: `PENDING | REVIEWING | APPROVED | REJECTED`
- `TaskSource`: `GROUP`（组长创建）| `MASTER`（PM 在总表创建）
- `Role`: `GROUP_LEADER | PROJECT_MANAGER`

---

## 五、通知系统架构（Transactional Outbox）

```
用户操作 → transition()
           ↓
    Prisma Transaction:
      1. 更新 schedule.status
      2. 写入 NotificationOutbox（status=PENDING）
           ↓
    Outbox Worker（每分钟轮询）
           ↓
    SELECT * FROM NotificationOutbox
    WHERE status = 'PENDING' AND attempts < 3
           ↓
    发送邮件（nodemailer）或 钉钉（HTTP POST）
           ↓
    更新 status = RESOLVED 或 FAILED（超过3次）
```

---

## 六、已知缺口与优先级

| 优先级 | 缺口 | 影响 |
|--------|------|------|
| **P0** | 无鉴权（任何人都可伪造 `x-user-id`） | 安全合规致命伤 |
| **P0** | 无数据库迁移（Prisma schema 变更无版本管理） | 部署无法标准化 |
| **P1** | Optimistic UI 缺失（每次操作都等 server response） | 用户体验差 |
| **P1** | 活动日志无 UI（存了但没用） | 审计链断裂 |
| **P1** | CORS 全开 + 无输入校验 | 安全漏洞 |
| **P2** | 无 WebSocket/SSE（多用户感知不到彼此） | 协作功能缺失 |
| **P2** | Kanban drag-drop 无状态持久化 | 功能残缺 |
| **P2** | 搜索 null 日期 bug（BUG-P9-01/04/05） | 数据可见性问题 |
| **P2** | WBS 表格无虚拟滚动（大项目会卡） | 性能问题 |
| **P3** | 甘特图 SVG 依赖箭头渲染性能差 | 体验问题 |

### 建议优先处理的三件事

1. **JWT 鉴权** — `AuthModule` + `@UseGuards`，前端登录后 token 随请求发送，同时修 CORS 白名单
2. **修 searchFilter null date bug** — 三行逻辑问题，导致带日期范围过滤时未填日期的任务被静默隐藏
3. **补 activityLog UI** — 审计链是 OA 合规刚需，参考 PDF 图 5-8 做成时间线面板

---

## 七、测试覆盖

```
前端（Node.js 内置测试）  132 tests
  src/domain/*.js          纯函数单元测试
  tests/                   组件逻辑测试（searchFilter/burndownChart）

后端（Jest）              L2 单元测试
  modules/*/*.spec.ts      Service 层 mock 测试
```

运行：
```bash
node --test                          # 前端单元测试
pnpm --filter @oa-mvp/backend test   # 后端 L2 测试
npx playwright test                  # E2E（需 python http.server）
```
