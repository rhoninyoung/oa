# 三层测试计划 — 可勾选清单

> 每个用例后附 `[ ]` 待实现/通过，`[x]` 已实现/通过。
> 由 Agent 每任务完成后回填。
> P0 标注项为发布阻塞门禁。

---

## A.1 需求-用例追溯矩阵

| 需求章节 | DT | FT | E2E | 备注 |
|---------|----|----|-----|------|
| §1.2 角色权限矩阵 | DT-PERM-01..04 | FT-AUTH-01..02, FT-PERM-01..02 | E2E-PERM-01..02 | |
| §2.1 模块入口导航 | — | FT-NAV-01..02 | E2E-NAV-01 | |
| §3.1 状态机 4 状态 | DT-SM-01..12 | FT-SM-01..06 | E2E-SM-01..04 | **P0** |
| §3.2 双击入口详情页 | — | FT-NAV-02 | E2E-NAV-01 | |
| §3.2 Excel 级表格 | DT-TBL-01..08 | FT-TBL-01..05 | E2E-TBL-01..02 | |
| §3.3 自动保存 30s | DT-SAVE-01..03 | FT-SAVE-01..02 | E2E-SAVE-01 | |
| §3.3 提交/撤回触发器 | DT-SM-05..08 | FT-SM-01..04 | E2E-SM-01 | |
| §4.1-4.2 主从同步 | — | FT-MASTER-01..06 | E2E-MASTER-01..02 | **P0** |
| §4.2 删除约束 | DT-TBL-07 | FT-MASTER-04 | E2E-MASTER-02 | **P0** |
| §4.3 审批同意/拒绝 | DT-SM-09..10 | FT-APPROVE-01..03 | E2E-SM-02..03 | |
| §4.3 重新排期+覆盖风险 | DT-SM-11 | FT-RESCHED-01 | E2E-SM-04 | |
| §5.1 1-to-1/循环检测/时间联动 | DT-DEP-01..06, DT-CAL-01..08 | FT-DEP-01..05 | E2E-DEP-01..03 | **P0** |
| §5.2 依赖交互流程 | — | FT-TBL-04 | E2E-DEP-04 | |
| §6.1 备忘录 stub | — | FT-MEMO-01..02 | — | |
| §6.2 导出 stub | — | FT-EXP-01..02 | — | |
| 并发乐观锁（派生） | DT-LOCK-01 | FT-SAVE-02, FT-LOCK-01 | E2E-LOCK-01 | |
| 钉钉 Outbox（派生） | DT-OBX-01 | FT-OBX-01..02 | E2E-NOTIF-01 | |

---

## A.2 DT（Developer Test）清单

### A.2.1 状态机 `stateMachine.canTransition` — 12 条

- [ ] **DT-SM-01** PENDING → REVIEWING by GL，任务非空 → 允许
- [ ] **DT-SM-02** PENDING → REVIEWING，任务为空 → 拒绝，code `CONTENT_EMPTY`
- [ ] **DT-SM-03** REJECTED → REVIEWING by GL → 允许（重新提交）
- [ ] **DT-SM-04** APPROVED → REVIEWING by GL → 允许（再次修改提交）
- [ ] **DT-SM-05** REVIEWING → PENDING by GL（撤回） → 允许
- [ ] **DT-SM-06** REVIEWING → PENDING by PM → 拒绝，`ACTOR_NOT_OWNER`
- [ ] **DT-SM-07** REVIEWING → APPROVED by PM → 允许
- [ ] **DT-SM-08** REVIEWING → APPROVED by GL → 拒绝，`ACTOR_NOT_PM`
- [ ] **DT-SM-09** REVIEWING → REJECTED by PM，reason 长度 ∈ [1,200] → 允许
- [ ] **DT-SM-10** REVIEWING → REJECTED，reason 空或 >200 → 拒绝，`REASON_INVALID`
- [ ] **DT-SM-11** APPROVED → REJECTED by PM（reschedule） → 允许
- [ ] **DT-SM-12** PENDING → APPROVED（跳过 REVIEWING） → 拒绝，`INVALID_TRANSITION`

### A.2.2 权限矩阵 `permissions` — 4 条

- [ ] **DT-PERM-01** GL 对本组 schedule：edit/submit/withdraw allow，approve deny
- [ ] **DT-PERM-02** GL 对他组 schedule：read allow，edit deny
- [ ] **DT-PERM-03** PM 对任意 schedule：read/approve/reject/reschedule allow，直接改任务字段 deny
- [ ] **DT-PERM-04** PM 对 master：addRow allow；deleteRow 仅 source=MASTER 时 allow

### A.2.3 依赖图 `detectCycle` + `setDependency` — 6 条

- [ ] **DT-DEP-01** 空图 → 无环
- [ ] **DT-DEP-02** 自环 A→A → `CYCLE_SELF`
- [ ] **DT-DEP-03** 二节点 A→B→A → `CYCLE`，返回回路 `[A,B,A]`
- [ ] **DT-DEP-04** 链式 A→B→C→A → `CYCLE`，返回完整回路
- [ ] **DT-DEP-05** DAG A→B, A→C, B→D → 无环
- [ ] **DT-DEP-06** 已有依赖的任务设第二前置 → `ONE_TO_ONE_VIOLATION`

### A.2.4 工作日历 & 时间联动 — 8 条

- [ ] **DT-CAL-01** `addWorkDays(周一, 1) = 周二`
- [ ] **DT-CAL-02** `addWorkDays(周五, 1) = 下周一`（跳过周末）
- [ ] **DT-CAL-03** `addWorkDays(周五, 3) = 下周三`
- [ ] **DT-CAL-04** 注入周五为法定假日：`addWorkDays(周四, 2) = 下周二`
- [ ] **DT-CAL-05** duration=0 → 同日返回
- [ ] **DT-CAL-06** 下游任务 `start = dep.finish + 1 workDay`
- [ ] **DT-CAL-07** 链式传播 B.finish 变更 → C、D 级联；非下游不动
- [ ] **DT-CAL-08** 上游 finish 提前 → 下游 start 也前移，保持 +1 WD 偏移

### A.2.5 WBS 表格纯逻辑 — 8 条

- [ ] **DT-TBL-01** `normalizeRange` 规整任意方向拖选为 `{r1≤r2,c1≤c2}`
- [ ] **DT-TBL-02** 复制生成 TSV，换行字段用 `"` 包裹并转义
- [ ] **DT-TBL-03** TSV 粘贴映射：目标小于源 → 左上对齐 + 返回 `overflow` 行列数
- [ ] **DT-TBL-04** undo/redo 栈上限 50，溢出丢最旧
- [ ] **DT-TBL-05** Alt+Enter 在值中插入 `\n`，不触发提交
- [ ] **DT-TBL-06** `insertRowBelow(i)` 重排 `orderIndex`，保证稳定序
- [ ] **DT-TBL-07** `canDeleteRow(task, schedule)`：source=MASTER → true；source=GROUP 且 schedule 非 PENDING/REJECTED → false
- [ ] **DT-TBL-08** 冻结前 N 列 → 列布局 metadata 标 `stickyLeft`

### A.2.6 自动保存 `useAutoSave` — 3 条

- [ ] **DT-SAVE-01** 编辑后 30s 触发 saveFn；期间再次编辑则重新计时
- [ ] **DT-SAVE-02** 组件卸载取消未触发的定时器，无 leak
- [ ] **DT-SAVE-03** saveFn 连续失败 → 指数退避重试 ≤3 次，再失败抛给 UI

### A.2.7 乐观锁 & Outbox — 2 条

- [ ] **DT-LOCK-01** `applyPatch(current, patch, version)`：version 不一致 → `VERSION_CONFLICT`
- [ ] **DT-OBX-01** `buildNotification` 幂等键 = `type|scheduleId|action|version`；同键重复构造结果一致

### A.2.8 docx-extract — 2 条

- [ ] **DT-DOCX-01** Fixture .docx 含 3 张图 → 输出 3 个 png + index.yaml 3 条
- [ ] **DT-DOCX-02** index 中 `section_path` 正确回溯到最近 Heading 1/2

**DT 小计：43 条 | 已通过：0 条**

---

## A.3 FT（Functional Test）清单

### A.3.1 鉴权与导航

- [ ] **FT-AUTH-01** 无 `X-User-Id` 访问任意受保护接口 → 401
- [ ] **FT-AUTH-02** GL 访问 `POST /master/:iterationId/rows` → 403
- [ ] **FT-NAV-01** `GET /projects`：返回项目+迭代树，按角色过滤可见范围
- [ ] **FT-NAV-02** `GET /iterations/:id`：返回该迭代下各组排期状态摘要

### A.3.2 排期状态机 API

- [ ] **FT-SM-01** `POST /schedules/:id/submit`（PENDING + 非空） → 200，version+1，Outbox 新增 `SCHEDULE_SUBMITTED`
- [ ] **FT-SM-02** `POST /submit` 空任务 → 422 `CONTENT_EMPTY`
- [ ] **FT-SM-03** `POST /withdraw`（REVIEWING） → 200；Outbox `SCHEDULE_SUBMITTED` 置 `dismissedAt`
- [ ] **FT-SM-04** `POST /withdraw` 非 REVIEWING → 409 `INVALID_STATE`
- [ ] **FT-SM-05** `POST /approve` by PM → status=APPROVED，写 ApprovalRecord，master 视图立即可见
- [ ] **FT-SM-06** `POST /reject` reason 空/>200 → 422

### A.3.3 草稿与乐观锁

- [ ] **FT-SAVE-01** `PATCH /schedules/:id/draft` version 匹配 → 200，返回 version+1
- [ ] **FT-SAVE-02** 并发 2 次 `PATCH`，后者 version 旧 → 409，载荷含 `latestVersion`
- [ ] **FT-LOCK-01** PM 发起 reschedule 时检测到 GL 在编辑 → 返回 `OVERWRITE_RISK` + diff

### A.3.4 任务与依赖

- [ ] **FT-DEP-01** `PUT /tasks/:id/dependency` 有效依赖 → 200，任务图含新边
- [ ] **FT-DEP-02** 建立导致循环 → 422 `CYCLE` + 回路 ids
- [ ] **FT-DEP-03** 有依赖的任务再加第二前置 → 422 `ONE_TO_ONE_VIOLATION`
- [ ] **FT-DEP-04** 上游 finish 变更 → `PATCH /tasks/:id` 返回受影响下游 diff 列表
- [ ] **FT-DEP-05** 跨组依赖：下游组未审批 → 仍返回重算结果，标 `pendingRecalc=true`

### A.3.5 主从同步

- [ ] **FT-MASTER-01** approve 后 `GET /master/:iterationId` 含该组任务，source=GROUP，顺序与组内一致
- [ ] **FT-MASTER-02** `POST /master/:iterationId/rows`（PM）指定 ownerId → 在对应组末尾追加 source=MASTER；Outbox 写入 2 条
- [ ] **FT-MASTER-03** GL `GET /schedules/:id` 看到 source=MASTER 任务在末尾，含只读字段清单
- [ ] **FT-MASTER-04** `DELETE /master/rows/:taskId`：source=MASTER → 200；source=GROUP → 422 `SYNC_ROW_READONLY` **[P0]**
- [ ] **FT-MASTER-05** reschedule 后该组任务从 master 视图移除
- [ ] **FT-MASTER-06** source=MASTER 行负责人变更由 PM 发起 allow；由 GL 发起 403

### A.3.6 审批与重新排期

- [ ] **FT-APPROVE-01** 非 PM 发起 approve → 403
- [ ] **FT-APPROVE-02** reject 持久化 reason 到 ApprovalRecord；可查询历史
- [ ] **FT-APPROVE-03** 同迭代同组多次 approve（重新提交后） → 以最新 version 为准
- [ ] **FT-RESCHED-01** PM reschedule → 写 Outbox 给 GL；master 移除；返回变更前后 snapshot

### A.3.7 表格功能组件 FT

- [ ] **FT-TBL-01** 粘贴 3×2 到 2×3 目标 → 左上对齐 + toast "列被裁剪"
- [ ] **FT-TBL-02** Undo 50 次后第 51 次不可再回退（按钮 disabled）
- [ ] **FT-TBL-03** Ctrl+B 加粗：视觉变化，保存 payload 不含字体字段
- [ ] **FT-TBL-04** 点击"选择依赖项" → 其他列 `aria-disabled=true` + 目标列高亮；Esc 退出
- [ ] **FT-TBL-05** 冻结首列后水平滚动 → 首列保留 sticky；右键菜单包含"插入/删除行"

### A.3.8 Outbox & 通知 stub

- [ ] **FT-OBX-01** Outbox worker tick 后 `dispatchedAt` 非空；控制台输出结构化 JSON
- [ ] **FT-OBX-02** 同幂等键连续入列 → 仅保留最新未派发

### A.3.9 导出 & 备忘录 stub

- [ ] **FT-EXP-01** `GET /exports/iterations/:id.xlsx` 返回正确 content-type、非空 body
- [ ] **FT-EXP-02** GL 请求导出非本组总表 → 403
- [ ] **FT-MEMO-01** memo CRUD 最小契约（create/get/update）
- [ ] **FT-MEMO-02** 关闭未保存 memo：`isDirty=true`，route guard 弹窗可被驱动

**FT 小计：31 条 | 已通过：0 条**

---

## A.4 E2E（Playwright）清单

> 所有用例使用 `seed.ts` 初始化同一数据集；`beforeEach` 重置 DB。
> `[@p0]` 为发布阻塞门禁。

### A.4.1 权限与导航

- [ ] **E2E-PERM-01** GL U1 打开 G2 的排期页 → 编辑区 readOnly、工具栏只剩"查看"
- [ ] **E2E-PERM-02** PM 打开任一组 → 审批按钮可见、任务单元格编辑被屏蔽
- [ ] **E2E-NAV-01** 登录 → 侧边树 → 双击迭代 → 路由 `/projects/:p/iterations/:i`，各组状态徽标匹配种子

### A.4.2 状态机全流程

- [ ] **E2E-SM-01** `[@p0]` GL 编辑 → ≥30s 后断言 `PATCH .../draft` 已发送 → 点提交 → toast "已提交"；PM 侧 badge +1
- [ ] **E2E-SM-02** `[@p0]` PM approve → `/master` 页出现该组任务，顺序一致
- [ ] **E2E-SM-03** PM reject：reason 为空时按钮 disabled；填 10 字 → 提交成功；GL 侧显示 REJECTED + reason
- [ ] **E2E-SM-04** 双 context 冲突：GL 正在编辑；PM 点 reschedule → PM 侧出现 `OVERWRITE_RISK` 弹窗；GL 侧出现 banner "PM 发起重新排期"

### A.4.3 表格交互

- [ ] **E2E-TBL-01** 复制 3×3 TSV → 选中 1×1 粘贴 → 展开成 3×3；Ctrl+Z 两次完全回滚
- [ ] **E2E-TBL-02** 在备注列 Alt+Enter 插入换行 → 显示两行；冻结首列后水平滚动首列仍可见

### A.4.4 自动保存

- [ ] **E2E-SAVE-01** 底部出现 "已自动保存 HH:mm:ss"；断网后重试 3 次失败 → 红色错误条 + 手动重试按钮

### A.4.5 主从同步

- [ ] **E2E-MASTER-01** PM 在总表新增 1 行、指定 owner → 切 GL 视图：任务在组末尾、负责人正确；`/dev/outbox` 观察到 2 条通知
- [ ] **E2E-MASTER-02** `[@p0]` PM 删除 source=MASTER 成功；删除 source=GROUP → toast "系统同步行不可删除"；DB 数据未变

### A.4.6 依赖管理

- [ ] **E2E-DEP-01** `[@p0]` GL 设 T2 依赖 T1 → 保存成功 + 箭头可见
- [ ] **E2E-DEP-02** `[@p0]` GL 设 T1 依赖 T2（已存在 T2→T1） → 弹窗"存在循环依赖：T1→T2→T1"，保存被拦截
- [ ] **E2E-DEP-03** T1 finish 从周五改周二 → T2 start 变下周一（跨周末），变更单元格高亮
- [ ] **E2E-DEP-04** 点"选择依赖项" → 其他列置灰；点目标行 → 当前行显示依赖标识；Esc 取消

### A.4.7 并发

- [ ] **E2E-LOCK-01** 两 GL tab 同时编辑同一单元格 → 后提交者看到版本冲突提示 + 刷新/合并按钮

### A.4.8 通知链路

- [ ] **E2E-NOTIF-01** 走完 submit→approve→reschedule 全链路 → `/dev/outbox` 观察到 4 条 notification 均 `dispatchedAt` 非空

**E2E 小计：18 条 | 已通过：0 条**

---

## A.5 覆盖率汇总

| 包 | 目标 | 当前 |
|----|------|------|
| `packages/shared` | ≥ 95% | 0% |
| `packages/backend` (service) | ≥ 85% | 0% |
| `packages/frontend` (关键组件) | ≥ 75% | 0% |

---

## A.6 CI 流水线状态

| 阶段 | 触发 | 门禁 |
|------|------|------|
| lint + DT | 每次 push | 必须全绿 |
| FT | PR 必跑 | 必须全绿 |
| E2E | PR + main | `@p0` 永远跑；其余用 sharding |

---

最后更新：计划固化时（Agent 初始规划阶段）
