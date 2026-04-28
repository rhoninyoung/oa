# 周报 — 2026/04/24

## 本周主题

**彻底重构技术栈：从 Full-Stack Monorepo 降级为纯 HTML 单机版 MVP**

---

## 1. 重大架构变更（commit `f2cbf5c6` — feat: OA MVP HTML单机版）

### 弃用旧架构
- 删除了 NestJS + React + Postgres + pnpm monorepo
- 删除了 Prisma、Playwright E2E、GitHub CI、ESLint/Prettier 配置
- 归档了旧 TASKS 任务卡（31张）到 `docs/ARCHIVE/`
- 归档了 backend testing docs 和 cursor rules

### 新增纯 HTML 单机版
- **零依赖、零构建、零后端**，浏览器打开即用
- 所有数据存 `localStorage`（key: `oa.state.v1`）
- ES Modules via `python3 -m http.server 8080`
- 核心业务完整保留：状态机、主从同步、WBS表格、依赖+日历联动

### 新增文件清单
| 文件 | 说明 |
|------|------|
| `index.html` + `styles.css` | 单页三栏布局 |
| `src/store.js` | 发布订阅状态管理 + localStorage 持久化 |
| `src/seed.js` | 种子数据（2组/1迭代/5任务/3用户）|
| `src/io/importExport.js` | JSON 导入/导出 |
| `src/hooks/autoSave.js` | 30s 防抖自动保存 |
| `src/domain/*.js` | 5个纯函数：stateMachine/permissions/calendar/dependency/tableOps |
| `src/components/*.js` | roleSwitcher/projectTree/wbsTable/activityLog/toast |
| `tests/*.test.js` | 76条 `node --test` 单测 |
| `docs/PLAN.md` + `SMOKE.md` + `TDD-GUIDE.md` + `TEST-PLAN.md` | 文档 |

---

## 2. 未提交变更（待提交）

### P2-1: projectTree.js 性能优化 ✅ 已实现
- **问题**：O(n³) 任务计数（`schedules.find` 在 `tasks.filter` 内部循环）
- **修复**：预建 `scheduleId → {groupId, iterationId}` Map，O(1) 查询
- **效果**：侧边树渲染随数据量线性增长

### P1-1: wbsTable.js 事件委托重构 ✅ 已实现
- **问题**：`tbody.cloneNode(true)` 每次渲染销毁并重建整个 tbody DOM 树，丢失所有事件处理器
- **修复**：改用事件委托（`initWBSEventListeners`），所有监听器挂载在稳定父元素 `#wbs-table` 上，只绑定一次
- **新增** `isCellEditing()` 公开函数 + `_isEditing` 守卫，防止编辑期间重渲染破坏 DOM

### P1-2: autoSave.js 脏检查优化 ✅ 已实现
- **问题**：每次触发保存先 O(n) 序列化再比对，浪费 CPU
- **修复**：在 `store.js` 的 `setState` 中维护 `_version` 计数器，autoSave 只做 O(1) 版本号比对，再决定是否序列化

### P1-3: 编辑期间跳过 ActivityLog ✅ 已实现
- **问题**：cell 编辑时 `addLogEntry` → `setState` → `render` → `renderActivityLog` 不必要重渲染
- **修复**：`main.js` 的 `render()` 入口增加 `isCellEditing()` guard，编辑期间只更新 roleSwitcher 和 projectTree

### P0: 调试代码清理（来自 TODOFIX.md）
- ❌ 待处理：`wbsTable.js:40` — `isCellEditing()` 中仍有 `fetch('http://localhost:7283/ingest/...')`
- ❌ 待处理：`store.js:13` — `setState()` 中仍有无效 `fetch` 调用
- ❌ 待处理：`projectTree.js:7,63,78` — 仍有 3 处 `console.log` 调试输出

### 其他未提交变更
- `src/domain/permissions.js`：增加 `canDeleteRow(null)` 守卫，返回 `UNKNOWN_SOURCE`
- `src/main.js`：增加 `statusLabel()` helper；render 路径加 try/catch + toast 错误提示；master-view-wrapper 独立容器，与 group-view-wrapper 分离
- `index.html`：新增 `#master-view-wrapper` 容器（class=`hidden`），与 `#group-view-wrapper` 并列
- `styles.css`：projectTree 样式增强（iteration-block、iteration-name）；两个 view wrapper 分离
- 测试用例补充：calendar 4条、dependency 7条、permissions 4条、stateMachine 3条、tableOps 3条（覆盖边界条件和更多 DAG 场景）

---

## 3. Git 提交历史

```
f2cbf5c6  feat: OA MVP HTML单机版 — 完整实现          (2026/04/24 11:20)
db6e483d  chore: wipe old monorepo, reset to docs     (2026/04/24 10:51)
3755638b  stash based stupid agent minimax2.7          (2026/04/??)
408fa1b9  Initial commit: OA project MVP skeleton     (2026/04/??)
```

---

## 4. 下一步待办

- [ ] **P0-1/2/3**：删除 3 处调试代码（fetch + console.log）
- [ ] **P3-1**：架构重构 — 从"全量订阅无差异化"改为 selector-based subscription
- [ ] 提交当前所有未提交变更
