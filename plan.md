# UNO 核心规则修复与废弃 UI 组件清理执行指导

## Status: Ready for Agent Execution

## Summary

本计划聚焦纯代码修复，不涉及 `.scene`、`.prefab`、`.meta` 或场景设计。目标是修复当前 UNO 核心规则中的四个高风险问题，并清理三份已经不再接入运行链路的旧 UI 组件。

需要处理的问题：

- 初始发牌逻辑错误：每个玩家拿到同一组 `deck.slice(0, 7)` 手牌。
- 万能牌合法性缺失：`WILD` / `WILD_DRAW_4` 没有按 UNO 规则作为可出牌处理。
- `SKIP` / `REVERSE` 效果重复结算：当前每次进入“回合开始”都会重新读取顶牌效果。
- 弃牌堆重洗错误：当前会把桌面当前顶牌一起洗回牌堆。
- 废弃 UI 组件未清理：`ui-game-events.ts`、`player-indicator.ts`、`card-node-pool.ts` 已无 import 且无场景/预制体挂载。

## Current Findings

- `pnpm run type-check` 当前通过。
- `pnpm run lint` 当前只有 `event-bus.ts` 中 `any` 的既有 warning。
- `ui-game-events.ts` 完全无引用，职责已被 `PlayerSlotController`、`GameMessage`、`PlayedCardPile`、`PlayerHand` 等组件替代。
- `player-indicator.ts` 已被新的玩家槽位组件体系替代，且不再挂载。
- `card-node-pool.ts` 的职责已被 `CardManager` 内部 `NodePool` 覆盖，且不再挂载。

## Required Code Changes

### 1. 修复初始发牌

修改 `assets/scripts/core/game/game-initializer.ts`：

- 发牌时每个玩家用 `deck.splice(0, 7)` 依次从牌堆顶部取 7 张牌，splice 会从原数组中移除取出的牌。
- 初始顶牌从发完手牌之后的剩余牌堆中 `pop()` 抽取。
- 如抽到 WILD_DRAW_4 则塞回剩余牌堆头部继续 pop 下一张。
- splice 方式天然保证返回的 `DeckManager.deck` 仅含剩余牌堆（不含已发手牌和顶牌）。

### 2. 修复万能牌合法性

修改 `assets/scripts/core/utils/input-validator.ts`：

- 普通无惩罚状态下，`WILD` 和 `WILD_DRAW_4` 应作为可出牌。
- 加牌惩罚未结算时，保持当前叠加规则：只能继续出 `DRAW_2` 或 `WILD_DRAW_4`。
- 保持颜色匹配、功能牌类型匹配、数字值匹配的现有逻辑。

### 3. 防止 SKIP / REVERSE 重复结算

修改 `assets/scripts/core/machine/game-machine.ts`：

- 将 `isDrawPenaltyResolved` 字段重命名为 `isEffectResolved`，其语义也同步扩展：它不仅表示 +2/+4 摸牌惩罚是否已处理，还表示当前顶牌的功能牌效果（SKIP/REVERSE）是否已触发。
- 一旦任何功能牌效果被应用过（无论 SKIP/REVERSE 还是 DRAW_2/DRAW_4），该标记即为 true。
- 出牌生成新的 topCard 时，必须将该标记重置为 false（效果待触发）。
- 应用卡牌效果执行后（无论哪种效果），必须将该标记设置为 true（效果已触发/已应用）。
- 应用卡牌效果开始时若该标记已为 true，则只推进当前玩家，不重复触发效果。
- 由于 `isEffectResolved` 语义已统一，原有的 +2/+4 叠加逻辑仍通过该标记判断是否允许继续出加牌牌，无需新增额外字段。

### 4. 修复弃牌堆重洗

修改 `assets/scripts/core/deck/deck-manager.ts`：

- 重洗弃牌堆时必须保留当前桌面顶牌，不把它洗回抽牌堆。
- 只有顶牌以外的弃牌可以洗入抽牌堆。
- 重洗后弃牌堆仍应保留当前顶牌，`discardCount` 能正确反映剩余弃牌堆状态。
- 如果弃牌堆只有当前顶牌，则不能产生新的抽牌堆。

### 5. 清理废弃 UI 组件

删除或停用以下纯代码文件：

- `assets/scripts/ui/listeners/ui-game-events.ts`
- `assets/scripts/ui/components/player-indicator.ts`
- `assets/scripts/ui/components/card-node-pool.ts`

清理要求：

- 确认没有 import、没有场景/预制体挂载后再删除。
- 不手动删除或修改 `.meta` 文件。
- 如果 Cocos 需要自动清理 `.meta`，交给编辑器或后续专门资源清理流程处理。
- 删除后确保没有残留 import、类型引用或 lint 错误。

## Implementation Order

1. 修复 `dealInitialHands` 的发牌与初始顶牌抽取。
2. 修复 `validateCanPlayCard` 的万能牌可出规则。
3. 给功能牌效果增加一次性结算机制，并调整状态机流转。
4. 修改弃牌堆重洗逻辑，保留当前顶牌。
5. 删除三份废弃 UI 组件代码，并清理残留引用。
6. 运行 `pnpm run format`（全项目格式化，不限于本次修改文件）。
7. 运行 `pnpm run type-check`。
8. 运行 `pnpm run lint`，记录或修复新增问题。

## Acceptance Criteria

- 四名玩家开局各有 7 张互不重复的手牌。
- 初始抽牌堆不包含任何玩家手牌，也不包含当前顶牌。
- `WILD` / `WILD_DRAW_4` 在普通状态下可被玩家和 AI 识别为可出牌。
- `SKIP` / `REVERSE` 只对刚打出的那张牌结算一次，不会因顶牌未变化反复触发。
- 抽牌堆不足触发重洗时，当前顶牌仍留在弃牌堆顶部，不会进入抽牌堆。
- `ui-game-events.ts`、`player-indicator.ts`、`card-node-pool.ts` 不再参与编译引用和运行链路。
- `pnpm run type-check` 通过。
- `pnpm run lint` 无新增 error；若仍有既有 warning，最终说明中明确记录。

## Constraints

- 不手动编辑 `.scene`、`.prefab`、`.meta`。
- 不引入新的 `any`、`as` 断言、try/catch 包装或静默兜底。
- 保持依赖方向：UI → Foundation/Core，Core 不依赖 UI。
- 修改范围限于纯代码和计划文件。
