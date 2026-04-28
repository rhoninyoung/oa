# OA 项目管理 MVP

前后端分离的单页应用，支持 **localStorage 模式**（纯前端）和 **API 模式**（连接后端服务）。

## 快速启动

### localStorage 模式（无需后端）
```bash
./start.sh
# 打开 http://localhost:8080
```

### API 模式（需要 Docker）
```bash
./start.sh --api
# 打开 http://localhost:8080
# 在右上角输入 http://localhost:3000 并点击"连接"
```

### 停止服务
```bash
./stop.sh
```

## 启动脚本

| 脚本 | 说明 |
|------|------|
| `./start.sh` | 仅前端（localStorage 模式） |
| `./start.sh --api` | 前端 + 后端 API（Docker） |
| `./stop.sh` | 停止所有服务 |

## 数据

- **localStorage 模式**: 所有数据保存在浏览器 `localStorage`，key 为 `oa.state.v1`
- **API 模式**: 数据持久化到 PostgreSQL（Docker 内）
- 右上角「导出」按钮下载完整 JSON 备份
- 右上角「导入」按钮从 JSON 文件恢复数据

## 功能清单

| 功能 | 状态 |
|------|------|
| 角色切换（GL / PM 下拉） | ✅ |
| 项目 / 迭代侧边树 | ✅ |
| WBS 表格（选区/复制/粘贴/Undo/Alt+Enter/冻结列） | ✅ |
| 30s 自动保存 | ✅ |
| 状态机（submit/withdraw/approve/reject/reschedule） | ✅ |
| 1-to-1 依赖 + DFS 循环检测 | ✅ |
| 工作日历时间联动（跨周末） | ✅ |
| 主从同步（GL 组 ↔ PM 总表） | ✅ |
| PM 总表新增 / 删除 MASTER 行 | ✅ |
| 活动日志 | ✅ |
| API 模式（REST + PostgreSQL） | ✅ |

## 测试

```bash
node --test                    # 单元测试（L1 Domain）
pnpm --filter @oa-mvp/backend test   # 后端 L2 测试
npx playwright test            # E2E 测试
```

## 开发命令

```bash
# 前端
python3 -m http.server 8080

# 后端（Docker 内）
docker compose up -d

# 数据库迁移
pnpm run db:migrate

# 数据库种子
pnpm run db:seed
```

## 技术栈

- **前端**: 原生 JavaScript（ES Modules），无框架
- **后端**: NestJS + Prisma + PostgreSQL（Docker）
- **测试**: Node.js 内置 `node --test` + Playwright E2E

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端（localStorage 模式） | http://localhost:8080 |
| 后端 API | http://localhost:3000 |
