# TDD 开发指南（HTML 单机版）

## 核心理念

> 写一行实现代码之前，必须先有一行失败的测试。
> 永远先写"这个函数会做什么"的描述（测试），再写"怎么做到"的实现。

**红 → 绿 → 重构** 是唯一节奏。

---

## L1 — Domain Unit（`src/domain/*.js`）

```bash
# 工具：node --test（Node.js 内置）
# 文件：tests/*.test.js
# 原则：无 I/O、无 DOM、单条 < 50ms
```

**红 = 断言失败或异常抛出**

```javascript
// tests/calendar.test.js
import { addWorkDays } from '../src/domain/calendar.js';

it('addWorkDays: Fri + 1 = next Mon', () => {
  assert.strictEqual(addWorkDays('2026-05-01', 1, []), '2026-05-04');
});
```

运行：`node --test`

---

## 每张任务卡的标准节奏

```
1. [RED]  写失败的测试（至少 1 条）
2. [GREEN] 写最小实现让测试通过
3. [REFACTOR] 消除重复，优化命名
4. 验收  所有测试通过
```

---

## 常见反模式（禁止）

| 反模式 | 正确做法 |
|--------|----------|
| 先写实现后补测试 | 先写测试再实现 |
| 测试依赖时间 | 用固定日期或注入 clock |
| 测试依赖 DOM | 纯函数只测返回值，不测 DOM |
| 断言过多样本 | 每个 test 只测一个行为 |

---

## 覆盖率目标

| 包 | 目标 |
|----|------|
| `src/domain/*.js` | 行覆盖率 ≥ 90% |
