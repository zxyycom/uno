# 编码风格

本文档定义项目强制执行的编码规范，所有代码必须严格遵守。

---

## 1. 核心原则：严格模式 & 零容忍歧义

### 1.1 Fail Fast with Type Safety (无防御性代码)

- **Assume Existence**: 假设所有必需的输入、属性、依赖都存在。不写 null 检查 (`if (x)`)、可选链 (`?.`)、默认值 (`??`)
- **Leverage the Compiler**: 依赖 TypeScript strict mode，让类型在编译期报错而非运行时
- **No Manual Errors**: 不手动 throw `new Error()` 或用 try/catch 包装代码来管理缺失数据

### 1.2 逻辑分离：纯计算 vs 业务流

- **Business Layer (编排层)**: 处理 I/O、状态变更、副作用。调用计算函数但不包含数学公式
- **Computation Layer (计算层)**: 作为独立工具函数存在于类外部，必须是纯函数（无副作用、无 this）
- **类内方法分离**: 如果逻辑必须在类中，必须严格分为：
    - `#region Computation` (纯数学/数据转换)
    - `#region Business` (流程控制)

---

## 2. 硬性规则

- **No Fallbacks**: 不提供 else 语句或默认值（除非明确要求）
- **Explicit Typing**: 避免 `any`，使用显式接口
- **No "Safety" Wrappers**: 不用 try/catch 隐藏错误，不用包装对象判断成功/失败
- **Non-null Assertion (慎用!)**: 如果接口类型可能为 null，但业务逻辑上在该场景下不可能为空，可以使用 `!` 断言。仅在**逻辑确实保证不可能为空**时使用
- **No `as` Assertions**: 尽量减少 `as` 类型断言，最好不用。优先通过类型设计让类型自然推导
- **No Bracket Notation for Property Access**: 禁止通过 `obj["prop"]` 或 `obj['prop']` 访问属性，优先使用点号 `obj.prop`。Bracket notation 属于隐式类型操作，绕过了类型检查且降低代码可读性

---

## 3. 正确示例

### 3.1 函数设计

```typescript
// 错误：防御性代码 + 混合逻辑
function processUser(user?: User) {
    if (!user || !user.address) {
        return { error: 'Missing data' };
    }
    const tax = user.salary ? user.salary * 0.2 : 0;
    return { name: user.name, tax };
}

// 正确：严格类型 + 分离逻辑
interface User {
    name: string;
    address: Address;
    salary: number; // 非可选
}

// 1. COMPUTATION (纯函数)
export function calculateTax(salary: number): number {
    return salary * 0.2;
}

// 2. BUSINESS (编排)
export function processUser(user: User) {
    const tax = calculateTax(user.salary);
    return { name: user.name, tax };
}
```

### 3.2 属性访问

```typescript
// 错误：可选链隐藏问题
const zip = user?.address?.zip;

// 正确：信任类型定义
const zip = user.address.zip;
```

---

## 4. 文件命名规范

- 组件文件: `kebab-case.ts` (如 `game-board.ts`, `player-hand.ts`)
- 类型文件: `kebab-case.types.ts` (如 `game.types.ts`)
