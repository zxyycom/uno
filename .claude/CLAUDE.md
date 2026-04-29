# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. 项目概述

这是一个基于 **Cocos Creator 3.8.8** 构建的 **UNO 卡牌游戏**，包含完整的游戏引擎、AI 玩家、状态机驱动的游戏流程和基于事件的 UI 更新。

### 技术栈

- **游戏引擎**: Cocos Creator 3.8.8
- **状态机**: xstate v5
- **响应式状态**: nanostores
- **类型检查**: TypeScript (strict mode)
- **包管理**: pnpm

---

## 2. 开发命令

```bash
pnpm install          # 安装依赖
pnpm run lint         # 运行 ESLint
pnpm run type-check   # 运行 TypeScript 类型检查 (tsc --noEmit)
pnpm run bundle:libraries  # 通过 Rollup 打包第三方库
pmpm run format       # 格式化代码，格式化唯一方式
```

---

## 3. 架构

### 3.1 分层架构

**依赖方向**: UI → Foundation → Core（单向依赖，禁止逆向）

| 层级                 | 职责                               | 依赖约束                               |
| -------------------- | ---------------------------------- | -------------------------------------- |
| **UI Layer**         | 渲染画面、响应输入、订阅事件更新UI | 只允许依赖 Foundation                  |
| **Foundation Layer** | 事件总线、类型定义、纯工具函数     | 无业务依赖，可被所有层依赖             |
| **Core Layer**       | 游戏规则、状态机、抽牌逻辑、AI决策 | 不依赖 UI 和 Foundation 以外的任何东西 |

### 文件索引

详细文件索引见 [.claude/FILE_INDEX.md](.claude/FILE_INDEX.md)。

### 3.2 状态机 (game-machine.ts)

游戏流程由 xstate v5 状态机管理：

| 状态           | 说明                                               | 流转方向              |
| -------------- | -------------------------------------------------- | --------------------- |
| **等待开始**   | 初始状态，等待 `开始游戏`                          | → 初始化游戏          |
| **初始化游戏** | 执行 `初始化游戏` action，收到 `初始化结束` 后跳转 | → 回合开始            |
| **回合开始**   | 执行 `应用卡牌效果` (skip/reverse)、`增加回合`     | → 等待出牌            |
| **等待出牌**   | 接收 `出牌`、`放弃出牌`、`超时` 事件               | → 回合结束 / 摸牌     |
| **摸牌**       | 处理抽牌逻辑 (+2/+4 叠加)                          | → 等待出牌            |
| **回合结束**   | 检查胜利者、自动呼叫 UNO，循环或结束               | → 回合开始 / 游戏结束 |

### 3.3 事件系统

所有游戏事件通过 `EventBus` (foundation/events/event-bus.ts) 流转，它封装 Cocos Creator 的 `EventTarget`。

- **Core → UI**: 游戏逻辑通过事件驱动 UI 更新（回合切换、出牌、摸牌等）
- **UI → Core**: UI 组件通过事件通知玩家操作（出牌、叫UNO等）
- **事件驱动**: UI 订阅事件实现响应式更新，无需直接引用游戏逻辑

---

## 5. 编码规范

核心原则（详见 [ENCODING_STYLE.md](.claude/ENCODING_STYLE.md)）：

1. **Assume Existence**: 假设输入/属性存在，不写 `?.`、`??`、if null 检查
2. **显式类型**: 避免 `any`，用接口替代
3. **逻辑分离**: 纯计算（独立工具函数）与业务流（状态变更）分离
4. **No Safety Wrappers**: 不用 try/catch 隐藏错误，不用 `as` 断言

## 6. Cocos Creator 资源文件

⚠️ **禁止手动创建或修改 `.meta` 文件**。`.meta` 文件由 Cocos Creator 自动生成和管理，手动编辑会导致"资源导入失败"错误。如遇此问题，请通过 Cocos Creator MCP 工具修复。

涉及以下文件类型时，**必须使用 Cocos Creator MCP 工具**进行操作，严禁直接编辑：

- `.scene`、`.prefab`

---
