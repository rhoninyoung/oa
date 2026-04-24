# Backend 单元测试：常见故障与约定

本文档总结 Jest 解析、workspace 依赖与单测断言方面的根因与修复，与 `.cursor/rules/backend-jest-testing.mdc` 一致。

## 1. Jest 无法解析 `@oa-mvp/shared`

| 现象 | 根因 | 修复 |
|------|------|------|
| 映射路径中出现 `.../packages/packages/shared/...` | `jest.config.ts` 中 `rootDir` 为 `packages/backend/src` 时，误用 `../../packages/shared`，多了一层 `packages` | `moduleNameMapper` 使用 `'<rootDir>/../../shared/dist/index.js'` |
| 找不到模块或类型 | `packages/backend/package.json` 未声明 `workspace:*` 依赖 | `dependencies` 中增加 `"@oa-mvp/shared": "workspace:*"` |
| 映射目标不存在 | 未先构建 shared | 测试前执行 `pnpm --filter @oa-mvp/shared build`（与 CI FT job 顺序一致） |

## 2. Jest 无法解析 `import ... from './foo.js'`

| 现象 | 根因 | 修复 |
|------|------|------|
| `Cannot find module './app.module.js'` | 源码使用 `.js` 后缀；Jest 按字面解析，磁盘上为 `.ts` | `moduleNameMapper` 增加 `'^(\\.{1,2}/.*)\\.js$': '$1'` |

## 3. `ts-jest` 配置

建议保留显式 `transform` + `ts-jest`（含 `experimentalDecorators`、`module: CommonJS` 等），与 `packages/backend/tsconfig.json` 一致；不要仅依赖 `preset: 'ts-jest'` 作为唯一手段。

## 4. 单测中对 mock 调用形的误解

| 场景 | 根因 | 修复 |
|------|------|------|
| `upsert` 断言解构 `[where, create, update]` | Prisma API 为单对象参数 `upsert({ where, create, update })`，`mock.calls[0]` 为 `[单对象]` | `const [args] = calls[0]`，断言 `args.where` / `args.create` / `args.update` |
| `findMany` 取 `calls[0][1]` | 仅一个参数对象 | `const [callArgs] = calls[0]` |
| `deleteRow` 期望消息 `"Task not found"` | 实现为 `throw new NotFoundException()` 无 message | 匹配 `"Not Found"` 或 `instanceof NotFoundException` |
| `setDependency` 期望 `CYCLE_DETECTED` + `cyclePath` | 实现仅在 `code === 'CYCLE'` 时设置 `cyclePath` | mock 使用 `code: 'CYCLE'` 与联合类型一致 |
| `propagateFinishChange` 期望 affected 非空 | `buildGraph` mock 边方向与实现不一致 | mock 的 `Map` 表示任务 → 依赖（前驱），与服务中反向建 downstream 一致 |

## 5. 本地验证命令

```bash
pnpm --filter @oa-mvp/shared build
pnpm --filter @oa-mvp/backend test
```

相关文件：`packages/backend/jest.config.ts`、`.github/workflows/ci.yml`（FT job）。
