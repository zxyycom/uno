# 编码风格

本文档定义项目强制执行的编码规范，所有代码必须严格遵守。

---

## 1. 类型安全

### 1.1 Assume Existence

假设所有必需的输入、属性、依赖都存在。不写 null 检查 (`if (x)`)、可选链 (`?.`)、默认值 (`??`)

### 1.2 Leverage the Compiler

依赖 TypeScript strict mode，让类型在编译期报错而非运行时

### 1.3 No Manual Errors

不手动 throw `new Error()` 或用 try/catch 包装代码来管理缺失数据

### 1.4 No Fallbacks

不提供 else 语句或默认值（除非明确要求）

### 1.5 Explicit Typing

避免 `any`，使用显式接口

### 1.6 Non-null Assertion (慎用!)

使用场景如下：

- **逻辑非空**: 如果接口类型可能为空，但业务逻辑上在该场景下不可能为空，可以使用 `!` 断言
- **编辑器必绑字段**: `@property` 必需引用，使用 `Type = null!` 初始化，不写空判断
- **运行时真实可空**: 异步缓存、临时状态、节点查询等运行时边界保留 `A | null`

核心原则：如果业务逻辑保证不可能为空，用类型规则保证而非默认值

### 1.7 No `as` Assertions

尽量减少 `as` 类型断言，最好不用。优先通过类型设计让类型自然推导

---

## 2. 逻辑分离

### 2.1 Business Layer (编排层)

处理 I/O、状态变更、副作用。调用计算函数但不包含数学公式

### 2.2 Computation Layer (计算层)

作为独立工具函数存在于类外部，必须是纯函数（无副作用、无 this）

### 2.3 类内方法分离

如果逻辑必须在类中，必须严格分为：

- `#region Computation` — 纯数学/数据转换
- `#region Business` — 流程控制

---

## 3. 空值边界

**内部流程数据不返回 null**: 游戏开始后的顶牌、玩家方位绑定、本地玩家 id 对应玩家等业务逻辑保证不可能为空的数据，使用非空类型。

**外部边界可以返回 null**: 资源加载失败、查询可选节点、异步缓存未完成等运行时边界保留 `A | null`。

---

## 4. 代码组织

### 4.1 No Bracket Notation

禁止通过 `obj["prop"]` 或 `obj['prop']` 访问属性，优先使用点号 `obj.prop`。Bracket notation 属于隐式类型操作，绕过了类型检查且降低代码可读性

### 4.2 文件命名规范

- 组件文件: `kebab-case.ts` (如 `game-board.ts`, `player-hand.ts`)
- 类型文件: `kebab-case.types.ts` (如 `game.types.ts`)