# OA MVP — 单一事实源

> 本文件是 Agent 每次任务的唯一事实源。

---

## 1. 目标

双击 `index.html`（或 `python3 -m http.server 8080` 后打开 `http://localhost:8080`），一个人本地完成：
**GL 编辑排期 → 提交 → 切 PM → 审批 → 总表查看 → PM 新增总表行**的完整业务闭环。

---

## 2. MVP 范围

| 功能 | 状态 | 说明 |
|------|------|------|
| 角色切换 | ✅ | 右上角下拉切换 GL / PM（mock） |
| 项目/迭代树 | ✅ | 侧边栏按 项目 → 迭代 → 小组展示 |
| WBS 表格 | ✅ | 单元格编辑 / Ctrl+C/V / Ctrl+Z/Y / Alt+Enter 换行 / 右键增删行 / 首列冻结 |
| 30s 自动保存 | ✅ | localStorage 自动持久化 + Ctrl+S 手动保存 |
| 状态机 | ✅ | PENDING → REVIEWING → APPROVED/REJECTED；APPROVED 可重新排期 |
| PM 审批 | ✅ | 同意 / 拒绝（1-200字理由）/ 重新排期 |
| 主从同步 | ✅ | APPROVED 任务出现在总表；PM 可新增 MASTER 行回写 |
| 任务依赖 | ✅ | 1-to-1 / DFS 循环检测 / 按工作日历时间联动 |
| 活动日志 | ✅ | 记录所有操作 |
| JSON 导入导出 | ✅ | 右上角按钮做完整备份/恢复 |

**不做**：真实后端 / 数据库 / 钉钉通知 / E2E / CI / xlsx 导出 / 多人并发冲突处理。

---

## 3. 技术栈

| 层 | 技术 |
|----|------|
| 前端 | 原生 HTML + CSS + ES Module JS（零框架） |
| 状态 | 极简发布订阅 store（`src/store.js`） |
| 持久化 | localStorage + JSON 文件导入导出 |
| 域函数 | `src/domain/*.js`（纯函数，100% 可测） |
| 测试 | `node --test`（Node.js 内置，无需安装） |
| 服务 | `python3 -m http.server 8080` |

---

## 4. 状态机

```
PENDING ──submit──> REVIEWING
REJECTED ──submit──> REVIEWING
APPROVED ──submit──> REVIEWING
REVIEWING ──withdraw──> PENDING
REVIEWING ──approve──> APPROVED
REVIEWING ──reject──> REJECTED（reason 1-200字）
APPROVED ──reschedule──> REJECTED
```

---

## 5. 主从同步

- **总表** = APPROVED 组任务（source=GROUP）+ PM 总表手动行（source=MASTER）
- **删除约束**：GROUP 行任何时候不可从总表删；MASTER 行 PM 可删
- **源不可改**：GL 侧 source=GROUP 行不可删（由审批状态保护）

---

## 6. 数据模型（store 内）

```js
{
  users: [{id, name, role, groupId?}],
  groups: [{id, name}],
  projects: [{id, name}],
  iterations: [{id, projectId, name, startDate, endDate}],
  schedules: [{id, iterationId, groupId, status, rejectReason?}],
  tasks: [{id, scheduleId, orderIndex, name, ownerId, startDate, endDate,
            durationDays, dependencyTaskId?, source: 'GROUP'|'MASTER', note?}],
  activityLog: [{id, at, actorId, actorName, type, detail}],
  currentUserId, activeIterationId, activeGroupId, viewMode: 'GROUP'|'MASTER',
  holidays: ['YYYY-MM-DD', ...]
}
```

---

## 7. 关键纯函数

| 文件 | 职责 |
|------|------|
| `stateMachine.js` | `canTransition(from, action, actor, ctx)` → `{ok, code?}` |
| `permissions.js` | `permit(role, ...)` + `canDeleteRow(task, schedule)` |
| `calendar.js` | `addWorkDays`, `isWeekend`, `isHoliday`, `calcEndDate` |
| `dependency.js` | `detectCycle`, `checkDependencyCycle`, `propagateFinishChange` |
| `tableOps.js` | `normalizeRange`, `cellsToTSV/tsvToCells`, `pushUndo/popUndo/popRedo` |

---

## 8. 运行

```bash
# 启动服务
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080

# 运行测试
node --test

# 导出备份
# 页面右上角「导出」按钮

# 导入恢复
# 页面右上角「导入」按钮 → 选择 JSON 文件
```
