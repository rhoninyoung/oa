# 测试计划 — HTML 单机版

## 测试层级

| 层 | 工具 | 范围 |
|----|------|------|
| L1 Domain Unit | `node --test` | 纯函数：`src/domain/*.js` |
| L2 冒烟 | 手工 | 按 `docs/SMOKE.md` 10 步执行 |

---

## L1 DT 用例清单（与原 PLAN TEST-PLAN.md 对应裁剪）

### 状态机 `stateMachine.canTransition` — 13 条

| ID | 描述 | 状态 |
|----|------|------|
| DT-SM-01 | PENDING → REVIEWING by GL，任务非空 → 允许 | ✅ |
| DT-SM-02 | PENDING → REVIEWING，任务为空 → CONTENT_EMPTY | ✅ |
| DT-SM-03 | REJECTED → REVIEWING by GL → 允许 | ✅ |
| DT-SM-04 | APPROVED → REVIEWING by GL → 允许 | ✅ |
| DT-SM-05 | REVIEWING → PENDING by GL（撤回） → 允许 | ✅ |
| DT-SM-06 | REVIEWING → PENDING by PM → ACTOR_NOT_OWNER | ✅ |
| DT-SM-07 | REVIEWING → APPROVED by PM → 允许 | ✅ |
| DT-SM-08 | REVIEWING → APPROVED by GL → ACTOR_NOT_PM | ✅ |
| DT-SM-09 | REVIEWING → REJECTED by PM，reason ∈ [1,200] → 允许 | ✅ |
| DT-SM-10 | REVIEWING → REJECTED，reason 空或 >200 → REASON_INVALID | ✅ |
| DT-SM-11 | APPROVED → REJECTED by PM（reschedule） → 允许 | ✅ |
| DT-SM-12 | PENDING → APPROVED（跳过 REVIEWING） → INVALID_TRANSITION | ✅ |

### 权限矩阵 `permissions.permit` — 7 条

| ID | 描述 | 状态 |
|----|------|------|
| DT-PERM-01 | GL 对本组 edit/submit/withdraw → 允许 | ✅ |
| DT-PERM-02 | GL 对他组 edit → NOT_OWN_GROUP | ✅ |
| DT-PERM-03 | PM read/approve/reject/reschedule → 允许 | ✅ |
| DT-PERM-04 | PM edit 直接改任务 → PM_CANNOT_EDIT_DIRECTLY | ✅ |
| DT-PERM-05 | PM addRow → allowed | ✅ |
| DT-PERM-06 | canDeleteRow: source=MASTER → 允许 | ✅ |
| DT-PERM-07 | canDeleteRow: source=GROUP + 非 PENDING/REJECTED → SYNC_ROW_READONLY | ✅ |

### 依赖图 — 9 条

| ID | 描述 | 状态 |
|----|------|------|
| DT-DEP-01 | 空图 → 无环 | ✅ |
| DT-DEP-02 | 自环 → CYCLE_SELF | ✅ |
| DT-DEP-03 | A→B→A → CYCLE | ✅ |
| DT-DEP-04 | A→B→C→A → CYCLE | ✅ |
| DT-DEP-05 | DAG → 无环 | ✅ |
| DT-DEP-06 | 已有依赖的任务设第二前置 → ONE_TO_ONE_VIOLATION | ✅ |
| DT-CAL-01 | Mon + 1 WD = Tue | ✅ |
| DT-CAL-02 | Fri + 1 WD = next Mon | ✅ |
| DT-CAL-03 | Fri + 3 WD = next Wed | ✅ |
| DT-CAL-04 | holiday 跳过正确 | ✅ |
| DT-CAL-05 | duration=0 → 同日 | ✅ |

### 表格操作 — 8 条

| ID | 描述 | 状态 |
|----|------|------|
| DT-TBL-01 | normalizeRange 任意方向规整 | ✅ |
| DT-TBL-02 | TSV 换行/引号转义 | ✅ |
| DT-TBL-03 | mapPaste 溢出计数 | ✅ |
| DT-TBL-04 | Undo 栈上限 50 | ✅ |
| DT-TBL-05 | popUndo 恢复上一状态 | ✅ |
| DT-TBL-06 | popRedo 恢复未来状态 | ✅ |
| DT-TBL-07 | tsvToCells roundtrip | ✅ |
| DT-TBL-08 | 引号字段解析 | ✅ |

**L1 小计：43 条 | 已通过：43 条 | 覆盖率：~95%**

---

## L2 手工冒烟

按 `docs/SMOKE.md` 执行。
