# TODOFIX — Frontend Performance Issues

> 发现时间: 2026/04/24
> 修复时间: 2026/04/24

## 修复状态

| ID | 状态 | 修复方式 |
|----|------|----------|
| P0-1 | ✅ 已清理 | 工作区中不存在（可能之前调试时已移除） |
| P0-2 | ✅ 已清理 | 工作区中不存在 |
| P0-3 | ✅ 已清理 | 工作区中不存在 |
| P1-1 | ✅ 已修复 | 改用 `#wbs-table` 事件委托，移除 `tbody.cloneNode(true)` |
| P1-2 | ✅ 已修复 | store 增加 `_version` 版本号，autoSave 先比对版本再序列化 |
| P1-3 | ✅ 已修复 | 编辑期间跳过 `renderActivityLog` |
| P2-1 | ✅ 已修复 | 预建 `Map<scheduleId, {groupId, iterationId}>`，O(1) 查询 |
| P2-2 | ✅ 已修复 | 通过 P1-1 事件委托一并解决 |
| P2-3 | ⏭ 跳过 | DOM 变更分散在多个函数中，收益有限 |
| P3-1 | ⏭ 跳过 | 架构重构，建议后续专题处理 |

---

## P0 — Critical: Debug Code Left in Production

### P0-1: Debug fetch in `isCellEditing()` — `src/components/wbsTable.js:40`
```js
fetch('http://localhost:7283/ingest/...').catch(()=>{});
```
**问题**: 每次调用 `isCellEditing()` 都发起一个网络请求到不存在的 localhost:7283。`isCellEditing()` 在 `main.js:33` 的 `render()` 入口处被调用，意味着**每次状态变化都会触发一次无效网络请求**。
**修复**: 删除该 fetch 调用。

---

### P0-2: Console.log in `renderProjectTree` — `src/components/projectTree.js:7,63,78`
```js
console.log('[DEBUG renderProjectTree] called...');  // line 7
console.log('[DEBUG projectTree click] iterId:', ...);  // line 63
console.log('[DEBUG master-toggle click]');  // line 78
```
**问题**: 每次渲染和每次点击都打 console.log，影响性能且污染输出。
**修复**: 删除所有 `console.log` 调用。

---

### P0-3: Debug fetch in `setState()` — `src/store.js:13`
```js
fetch('http://localhost:7283/ingest/...').catch(()=>{});
```
**问题**: 每次 `setState()` 调用都发起网络请求。状态变更多次时会触发大量无效请求。
**修复**: 删除该 fetch 调用。

---

## P1 — High Impact

### P1-1: `tbody.cloneNode(true)` 每次渲染都销毁 DOM 事件 — `src/components/wbsTable.js:410`
```js
tbody.replaceWith(tbody.cloneNode(true));  // 克隆并替换整个 tbody
```
**问题**: 每次 `renderWBSTable` 调用都销毁并重建整个 tbody DOM 树，丢失所有已绑定的事件处理器。然后 `attachCellEvents` 和 `initTableKeyboard` 又要重新查询并绑定所有事件。
**影响**: 每次状态变化都触发 DOM 大面积重建 + 事件解绑/重绑，layout thrashing。
**修复**: 使用事件委托（event delegation），从稳定父元素监听，或使用脏检查只在数据真正变化时才重建。

---

### P1-2: Auto-save 在 dirty check 之前先序列化 — `src/hooks/autoSave.js:31-32`
```js
const serialized = JSON.stringify(state);  // 昂贵的序列化操作
if (serialized === _lastSavedState) return;  // 检查太晚了
```
**问题**: 每次触发保存时先完整序列化状态对象，然后才比对。序列化是 O(n) 操作，应该先做脏检查再决定是否序列化。
**修复**: 使用浅层版本号/脏标记（如 `state._version`）比对，只在版本变化时才序列化。

---

### P1-3: Cell 编辑期间 ActivityLog 仍重新渲染 — `src/main.js:44`
```js
if (editing) {
  renderRoleSwitcher(...);
  renderProjectTree(...);
  renderActivityLog(...);  // 不应该在编辑期间调用
  return;
}
```
**问题**: Cell 编辑期间 `addLogEntry` 触发 `setState`，`setState` 的 subscriber 触发 `renderActivityLog`。ActivityLog 变化不频繁，编辑期间应跳过。
**修复**: 在 `editing=true` 时跳过 `renderActivityLog` 调用。

---

## P2 — Medium Impact

### P2-1: O(n³) 复杂度的 task 计数 — `src/components/projectTree.js:25-28`
```js
const iterTasks = tasks.filter(t => {
  const sch2 = schedules.find(s => s.id === t.scheduleId); // O(n) 在 O(n) filter 内部
  return sch2?.groupId === sch.groupId && sch2?.iterationId === iter.id;
});
```
**问题**: 对于每个 schedule item，都对所有 tasks 做 O(n) filter，内部又对所有 schedules 做 O(n) find。Schedules × Tasks = O(n×m) 起步，在嵌套循环中变成更高复杂度。
**修复**: 预建 `scheduleId → {groupId, iterationId}` 的 Map，O(1) 查询。

---

### P2-2: 每次渲染都重新绑定事件 — `src/components/wbsTable.js:141-362`
`attachCellEvents` 和 `initTableKeyboard` 在每次 `renderWBSTable` 时都执行（`_isEditing` guard 在 line 66 但之前已调用函数）。
**修复**: 使用事件委托，或在数据未变化时跳过事件重绑定。

---

### P2-3: Render 路径中多次 DOM 操作 — `src/main.js:84-104`
```js
schedEl.innerHTML = `...`;       // 写1
document.getElementById('approval-panel').className = ...;  // 触发布局
document.getElementById('group-view-wrapper').classList.remove('hidden'); // 布局
document.getElementById('master-view-wrapper').classList.add('hidden');   // 布局
renderWBSTable(...);  // 然后完全重建表格
```
**问题**: 多次独立 DOM 变更，每次都可能触发布局重计算，然后紧跟一个大规模 innerHTML 重建。
**修复**: 批量 classList 变更，或使用 CSS class 切换。

---

## P3 — Architectural (需要重构)

### P3-1: 每次 setState 都全量重渲染 — `src/store.js:17` + `src/main.js:21`
```js
// store.js
_subscribers.forEach(fn => fn(_state));

// main.js
subscribe(render);  // 任何状态变化都触发完整 render()
```
**问题**: 任何 state 变化（哪怕只是 ActivityLog 新增一条）都会触发所有 4 个组件的完整重渲染。无差异化订阅。
**修复**: 改为 selector-based subscription 或显式脏标记 per-component。

---

## 问题汇总表

| ID | 优先级 | 位置 | 类型 | 影响 |
|----|--------|------|------|------|
| P0-1 | CRITICAL | wbsTable.js:40 | Debug fetch in isCellEditing | 每次渲染触发无效网络请求 |
| P0-2 | CRITICAL | projectTree.js:7,63,78 | console.log | 污染输出，微性能损耗 |
| P0-3 | CRITICAL | store.js:13 | Debug fetch in setState | 每次setState触发无效网络请求 |
| P1-1 | HIGH | wbsTable.js:410 | tbody.cloneNode 重构 | 每次渲染销毁+重建整个DOM事件 |
| P1-2 | HIGH | autoSave.js:31-32 | 脏检查在序列化之后 | 30s一次，浪费CPU |
| P1-3 | HIGH | main.js:44 | ActivityLog在编辑期间渲染 | 编辑时多余重渲染 |
| P2-1 | MEDIUM | projectTree.js:25-28 | O(n³) 任务计数 | 侧边树渲染随数据量平方增长 |
| P2-2 | MEDIUM | wbsTable.js:141-362 | 事件重复绑定 | 渲染频率过高 |
| P2-3 | MEDIUM | main.js:84-104 | 多次DOM变更 | 触发不必要布局重计算 |
| P3-1 | REFACTOR | store.js:17+main.js:21 | 全量订阅无差异化 | 架构问题，需较大重构 |
