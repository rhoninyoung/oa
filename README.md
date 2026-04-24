# OA 项目管理 MVP（HTML 单机版）

> 零构建、零依赖、零后端。一个人本地双击即可跑完"GL 编辑 → 提交 → PM 审批 → 总表"的完整业务闭环。

## 快速启动

```bash
# 推荐：用 Python 内置服务器（ES Modules 需要 http 协议）
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080

# 或用 npx（无需安装任何全局依赖）
npx serve .
```

> 注意：不能直接双击 `index.html`（`file://` 协议下 ES Modules 有跨域限制）。必须走 http 服务器。

## 数据

- 所有数据保存在浏览器 `localStorage`，key 为 `oa.state.v1`
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

## 测试

```bash
node --test
```

## 技术栈

- 纯原生 HTML + CSS + ES Module JS（零框架、零依赖、零构建）
- 状态管理：极简发布订阅 store（~60 行）
- 持久化：localStorage + JSON 文件导入导出
- 纯函数测试：Node.js 内置 `node --test`
