# TDD 开发指南

## 核心理念

> 写一行实现代码之前，必须先有一行失败的测试。
> 永远先写"这个函数会做什么"的描述（测试），再写"怎么做到"的实现。

**红 → 绿 → 重构** 是唯一节奏，不允许跳过红直接写绿。

---

## 每层的"红"定义

### L1 — Domain Unit（`packages/shared`）

```bash
# 工具：Jest
# 文件：*.test.ts（与实现文件同目录）
# 原则：无 I/O、无 DB、无网络、单条 < 50ms
```

**红 = 编译失败 + 断言失败**

```typescript
// src/stateMachine.test.ts
import { canTransition } from './stateMachine';

describe('canTransition', () => {
  it('REVIEWING → APPROVED by PM is allowed', () => {
    expect(canTransition('REVIEWING', 'APPROVED', 'PM', {})).toEqual({ ok: true });
  });

  it('REVIEWING → APPROVED by GL is denied', () => {
    expect(canTransition('REVIEWING', 'APPROVED', 'GL', {})).toMatchObject({
      ok: false,
      code: 'ACTOR_NOT_PM',
    });
  });
});
```

运行：`pnpm --filter shared test`

---

### L2 — Backend Functional Test（`packages/backend`）

```bash
# 工具：@nestjs/testing + test Postgres schema
# 文件：*.spec.ts（与 service 同目录）
# 原则：真实 DB，但不启动 HTTP 服务器；用 TestingModule 加载 Service
```

**红 = API 契约不满足或异常路径未处理**

```typescript
// schedules/schedules.service.spec.ts
describe('SchedulesService.submit', () => {
  it('throws CONTENT_EMPTY when tasks array is empty', async () => {
    const schedule = await createEmptySchedule();
    await expect(svc.submit(schedule.id, 'gl-user-id')).rejects.toMatchObject({
      code: 'CONTENT_EMPTY',
    });
  });
});
```

运行：`pnpm --filter backend test`

---

### L3 — Frontend Component（`packages/frontend`）

```bash
# 工具：Vitest + @testing-library/react + user-event
# 文件：*.test.tsx
# 原则：MSW 拦截 HTTP，不连真实后端
```

**红 = 组件行为与状态契约不符**

```typescript
// hooks/useAutoSave.test.ts
it('does NOT call saveFn before 30s elapsed', async () => {
  const saveFn = vi.fn();
  render(<UseAutoSave deps={[count]} saveFn={saveFn} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
  expect(saveFn).not.toHaveBeenCalled();
  await vi.advanceTimersByTime(29_000);
  expect(saveFn).not.toHaveBeenCalled();
});
```

运行：`pnpm --filter frontend test`

---

### L4 — E2E（`e2e/`）

```bash
# 工具：Playwright
# 文件：features/*.feature（支持多语言，此处用 JS/TS 直接写）
# 原则：真实浏览器 + 真实 DB，每例前重置数据
```

**红 = 用户操作后出现错误，或预期 UI 未出现**

```typescript
// e2e/schedule-sm.spec.ts
test('GL submit → PM badge increments', async ({ glBrowser, pmBrowser }) => {
  await glBrowser.goto('/iterations/iter-1');
  await glBrowser.getByRole('button', { name: '提交' }).click();
  const pmPage = await pmBrowser.newPage();
  await pmPage.goto('/iterations/iter-1');
  await expect(pmPage.locator('.pm-badge')).toHaveText('1');
});
```

运行：`pnpm --filter e2e test`

---

## 任务卡的标准节奏（以 T1.1 状态机为例）

```
┌─────────────────────────────────────────────────────────┐
│ Task 卡：T1.1 状态机转换 + 角色守卫                       │
├─────────────────────────────────────────────────────────┤
│ 前置：T0.2 shared 包已初始化                            │
│ 命中的用例 ID：DT-SM-01..12, DT-PERM-01..04            │
│                                                         │
│ 步骤 1 [RED]  写 DT-SM-01 的 12 条状态机测试            │
│ 步骤 2 [RED]  写 DT-PERM-01..04 权限测试                │
│ 步骤 3 [GREEN] 实现 stateMachine.ts（让所有测试通过）    │
│ 步骤 4 [REFACTOR] 提取 TransitionError 类型，优化          │
│ 验收：所有 DT-SM-* / DT-PERM-* 通过，覆盖率 ≥ 95%       │
└─────────────────────────────────────────────────────────┘
```

---

## 常见反模式（禁止）

| 反模式 | 正确做法 |
|--------|---------|
| 先写实现后补测试 | 先写测试（哪怕是占坑 test.only），再实现 |
| 测试依赖时间（`new Date()`） | 用 `vi.setSystemTime` 或注入 clock |
| 测试依赖随机值 | 固定 seed 或用 `Math.random` mock |
| E2E 测试顺序耦合 | 每个 E2E 独立 seed / teardown |
| 测 private 方法 | 透过 public contract 间接测 |
| 断言过多样本 | 每个 test 只测一个行为（one assertion concept） |

---

## 覆盖率门禁

| 包 | 阈值 |
|----|------|
| `packages/shared` | 行覆盖率 ≥ 95% |
| `packages/backend` (service 层) | 行覆盖率 ≥ 85% |
| `packages/frontend` (交互组件) | 行覆盖率 ≥ 75% |

低于阈值的 PR 在 CI 阶段标记为失败。

---

## 提交规范

每次提交信息格式：

```
<type>(<scope>): <short summary>

<optional body — mention ticket IDs>

Closes: DT-SM-01, DT-SM-02
```

type：`feat` / `fix` / `test` / `docs` / `refactor`
