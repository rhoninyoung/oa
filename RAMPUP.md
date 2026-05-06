# OA 项目管理平台 — 接手上手指南

> 本文档面向**零编程经验**的接手者。你不需要会写代码，只需要理解项目的运作方式，知道如何推进开发需求。

---

## 一、项目是什么

这是一套**在线项目排期管理系统**，用于替代 Excel 排期。

核心使用场景：

1. **组长（GL）**：为自己的小组创建任务排期，填写工期、进度、负责人，提交给项目经理审批
2. **项目经理（PM）**：审批或拒绝组长提交的排期，查看总表，协调跨组进度

系统有 4 种状态：草稿 → 待审 → 已批 / 已拒

---

## 二、技术架构（只需要了解概念）

| 层次 | 用途 | 你需要知道的 |
|------|------|------------|
| **前端** | 用户看到的界面 | 所有页面在 `src/` 目录下，是 HTML + JavaScript |
| **后端** | 数据存储、API 接口 | 在 `packages/backend/` 目录下，是 NestJS（TypeScript） |
| **数据库** | 永久存储数据 | PostgreSQL，代码中不需要直接操作 |
| **nginx** | 将前端和后端连接在一起 | 你不需要改它 |

**关键概念**：前后端通过 "API 接口" 传递数据。前端发请求 → 后端处理 → 返回结果。这种模式叫做 **前后端分离**。

---

## 三、如何启动项目

### 方式一：一键启动（推荐日常使用）

```bash
./start.sh
```

然后打开浏览器访问：**http://localhost**

这会启动所有服务（前端 + 后端 + 数据库）。

### 方式二：只看法务不需要本地

如果你只需要查看代码、提交修改，不需要实际运行：

1. 代码全部在 `src/`（前端）和 `packages/backend/`（后端）
2. 用任意文本编辑器（VS Code / Cursor）打开 `/home/rhonin/oa` 目录即可阅读

---

## 四、项目目录结构

```
/home/rhonin/oa/
├── index.html              # 页面入口（双击用浏览器打开也可用，但不推荐）
├── src/                    # 前端代码（你大部分时间在这里改东西）
│   ├── main.js            # 前端初始化和主渲染逻辑
│   ├── store.js           # 数据状态管理（类似"内存数据库"）
│   ├── api/
│   │   └── client.js      # 前端调用后端 API 的地方
│   ├── components/        # 各种界面组件
│   │   ├── wbsTable.js    # WBS 排期表（最核心的界面）
│   │   ├── projectTree.js # 左侧项目导航树
│   │   ├── dashboardView.js
│   │   └── ...
│   ├── domain/            # 业务逻辑纯函数
│   │   ├── stateMachine.js  # 排期状态流转逻辑
│   │   ├── permissions.js   # 权限判断
│   │   └── dependency.js     # 任务依赖关系计算
│   └── hooks/
│       └── autoSave.js    # 自动保存逻辑
├── packages/backend/      # 后端代码
│   └── src/modules/
│       ├── init/          # 初始化数据接口
│       ├── tasks/         # 任务 CRUD
│       ├── schedules/     # 排期管理
│       └── ...
├── tests/                 # 自动化测试
│   └── e2e/               # 端到端测试（模拟用户操作）
└── start.sh              # 一键启动脚本
```

---

## 五、日常开发流程

### 如果 PM 提出一个新需求

例如："在任务名称后面加一个优先级字段"

**步骤 1：理解需求**
- 在 `src/components/wbsTable.js` 中找到任务名称列的渲染代码
- 思考这个字段需要在哪里显示、在哪里编辑

**步骤 2：修改代码**
- 在 `src/components/wbsTable.js` 中修改列定义和渲染逻辑
- 如果需要存储到数据库，同步修改后端 `packages/backend/src/modules/tasks/`

**步骤 3：验证改动**
- 启动 `./start.sh`
- 打开 http://localhost 手动操作验证
- 运行 `npx playwright test` 确保现有测试不挂

### 如果你需要运行测试

```bash
# 运行所有测试
npx playwright test

# 运行某个特定测试文件
npx playwright test tests/e2e/progress.spec.js
```

测试会自动打开浏览器模拟用户操作，验证功能是否正常。

---

## 六、关键文件索引

| 需求 | 文件 | 说明 |
|------|------|------|
| 改排期表列 | `src/components/wbsTable.js` | 改列定义 + renderCell 函数 |
| 改任务状态流转规则 | `src/domain/stateMachine.js` | `canTransition` 函数 |
| 改权限判断 | `src/domain/permissions.js` | `permit` 和 `getFieldPermissions` |
| 新增 API 接口 | `packages/backend/src/modules/` | 在对应 module 下新增 controller + service |
| 改前端如何调用后端 | `src/api/client.js` | 改这里定义的 API 调用函数 |
| 改初始化数据 | `packages/backend/prisma/seed.ts` | 数据库种子数据 |

---

## 七、如果遇到不懂的代码

1. **先看注释**：代码中已有中文注释解释关键逻辑
2. **问 AI**：可以把代码片段复制给 Claude / ChatGPT，让他解释
3. **问开发者**：联系 yangtianhang

---

## 八、"我不确定能不能改" 的判断标准

- ✅ 可以改：`src/` 下的前端代码（表格样式、字段逻辑、界面文案）
- ✅ 可以改：`packages/backend/` 下的后端逻辑（API 行为、数据校验）
- ⚠️ 小心改：`src/domain/` 下的纯函数（逻辑性强，改动可能影响多处）
- ❌ 不要改：`src/store.js` 的核心机制、`start.sh` 的启动逻辑
- ❌ 不要改：测试文件（除非你确定测试本身有问题）

---

## 九、常用命令速查

```bash
# 启动项目（开发时）
./start.sh

# 运行测试
npx playwright test

# 查看代码（不需要运行）
code /home/rhonin/oa   # 用 VS Code 打开
```

---

## 十、有问题时的处理顺序

1. 查本文档和代码注释
2. 用 AI 工具解释代码
3. 联系 yangtianhang
