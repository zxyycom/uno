# UNO UI 卡牌移动动画改造执行指导

## Status: Ready for Agent Execution

## Summary

本计划聚焦卡牌 UI 动画与手牌重整，不手动编辑 `.scene`、`.prefab`、`.meta`。目标是让所有卡牌保持不透明，并把出牌、摸牌、手牌增删后的重排统一到事件驱动动画流程中。

需要处理的问题：

- 卡牌节点当前会出现透明状态，不符合要求。
- 出牌动画现在从牌堆飞到弃牌堆，应该从对应玩家手牌飞到弃牌堆。
- 摸牌需要从牌堆飞到对应玩家手牌。
- 手牌新增卡牌应插入最后，并触发统一重整动画。
- 手牌移除卡牌后，其余卡牌应缓动到最新布局。
- 初始化和摸牌后需要支持“所有手牌合并到中央再展开”的动画。

## Current Findings

- `PlayerHand` 当前在 `HAND_UPDATED` 中清空整手并重建节点，会导致真实节点无法参与出牌/摸牌动画。
- `PlayedCardPile` 当前在 `CARD_PLAYED` 中明确从 `deckNode` 创建卡牌并飞到弃牌堆，这是出牌动画来源错误的直接原因。
- 本地玩家不可出牌透明度来自 `PlayerHand.disabledCardOpacity = 150`，并通过 `UIOpacity` 应用到卡牌节点。
- `OtherPlayerHand` 当前只按数量同步卡背节点，适合改造成随机取一张卡背节点执行其他玩家出牌动画。
- `hand-card-layout.ts` 已经把布局计算和 transform 应用分开，可继续保留纯函数计算布局，再把结果交给 tween 应用。

## Required Code Changes

### 1. 取消卡牌透明状态

修改 `assets/scripts/ui/components/player-hand.ts` 和 `assets/scripts/ui/utils/hand-card-layout.ts`：

- 所有手牌布局结果的透明度统一为 255。
- 不再用透明度弱化不可出牌卡牌；如果需要提示不可出牌，只保留已有抬升/可交互状态，不改变透明度。
- 保留 `disabledCardOpacity` / `enabledCardOpacity` 序列化字段不做场景迁移，但运行时不再让卡牌透明。
- `CardManager.resetNode` 继续把复用节点 `UIOpacity` 重置为 255。

### 2. 增加卡牌移动动画事件

修改 `assets/scripts/foundation/events/game.events.ts`：

- 增加 `CARD_MOVE_REQUESTED` 和 `CARD_MOVE_COMPLETED` 事件。
- payload 至少包含 `animationId`、`kind`、`playerId`、`card`、真实 `node`、目标父节点、起止世界坐标、目标角度、目标缩放、目标层级。
- `kind` 固定使用 `'play-to-discard' | 'draw-to-hand'`，避免调用方自由拼字符串。
- Core 不直接发这些 UI 动画事件；由 UI 组件在收到 `CARD_PLAYED` / `CARDS_DRAWN` 后转发。

### 3. 新增统一卡牌移动动画组件

新增 `assets/scripts/ui/components/card-move-animator.ts`：

- 监听 `CARD_MOVE_REQUESTED`。
- 接收真实卡牌节点，把节点临时挂到桌面飞行层，保留原世界坐标。
- 使用 tween 从起点飞到终点，完成后设置目标父节点、最终局部 transform、层级，并发 `CARD_MOVE_COMPLETED`。
- 支持多张摸牌的逐张错峰：调用方提供 delay 或 animator 根据同批次 index 处理短间隔。
- 组件必须只负责飞行动画，不负责手牌数据同步、不负责弃牌堆业务。

### 4. 改造本地玩家手牌

修改 `assets/scripts/ui/components/player-hand.ts`：

- `HAND_UPDATED` 改为按 `card.id` 差量同步，不再每次清空整手重建。
- 初始化时创建所有手牌节点在中央，再用已有纯布局函数计算目标位置并展开。
- 本地玩家出牌时，在 `CARD_PLAYED` 中找到真实卡牌节点，从 `cardViews` 中移除，发 `play-to-discard` 移动事件，其余手牌立即按最新布局缓动补位。
- 摸牌时在 `CARDS_DRAWN` 中为新增卡牌创建真实节点，插入手牌数组最后，逐张从牌堆飞到最终手牌位置；全部到达后执行中央合并再展开。
- 普通出牌移除只做剩余手牌缓动重排，不触发中央合并再展开。

### 5. 改造其他玩家手牌

修改 `assets/scripts/ui/components/other-player-hand.ts`：

- 出牌时从现有卡背节点中随机选择一张真实节点飞向弃牌堆。
- 被选中的卡背节点在飞行动画中切换为实际打出的牌面，落入弃牌堆后由弃牌堆组件接管。
- 未飞出的卡背节点按最新数量和最新布局缓动补位。
- 摸牌时新增卡背节点插入末尾，逐张从牌堆飞入，完成后中央合并再展开。

### 6. 改造弃牌堆展示

修改 `assets/scripts/ui/components/played-card-pile.ts`：

- 移除当前 `CARD_PLAYED` 中“从牌堆创建卡牌并飞到弃牌堆”的逻辑。
- 监听 `CARD_MOVE_COMPLETED`，只在 `kind === 'play-to-discard'` 时接管飞来的真实节点。
- 接管后把节点加入弃牌堆堆叠数组，应用弃牌堆偏移、角度、层级。
- `DISCARD_UPDATED` 仅用于初始顶牌或同步兜底，不能在动画过程中重复生成顶牌。

### 7. 扩展 CardManager 能力

修改 `assets/scripts/ui/components/card-manager.ts`：

- 增加 `setCardFace(node, card)`，用于把卡背节点切换成真实牌面。
- 增加 `setCardBack(node)`，用于把复用节点切回卡背。
- `acquireCard` / `acquireCardBack` 复用这两个方法，避免牌面设置逻辑分散。
- 所有 acquire/release/reset 路径都确保节点 active、scale、angle、position、opacity 被重置到稳定状态。

## Implementation Order

1. 调整透明度逻辑，保证所有卡牌运行时 `UIOpacity` 为 255。
2. 增加 `CARD_MOVE_REQUESTED` / `CARD_MOVE_COMPLETED` 类型定义。
3. 新增 `CardMoveAnimator` 并接入现有飞行层节点。
4. 改造 `PlayedCardPile`，去掉错误的牌堆到弃牌堆出牌动画。
5. 改造 `PlayerHand` 的差量同步、真实节点出牌、摸牌飞入、中央合并再展开。
6. 改造 `OtherPlayerHand` 的随机卡背出牌、摸牌飞入和缓动重排。
7. 扩展 `CardManager` 的牌面/卡背切换方法并复用。
8. 运行 `pnpm run format`。
9. 运行 `pnpm run type-check`。
10. 运行 `pnpm run lint`，记录或修复新增问题。

## Acceptance Criteria

- 任意手牌、飞行动画牌、弃牌堆牌都不出现半透明状态。
- 本地玩家出牌时，被点击的真实卡牌从手牌飞到弃牌堆，其余手牌缓动补位。
- 其他玩家出牌时，随机一张卡背从对应玩家手牌飞到弃牌堆，并在飞行或落点显示真实牌面。
- 摸 1 张或多张时，卡牌从牌堆逐张错峰飞到对应玩家手牌末尾。
- 初始化和摸牌后，目标玩家手牌会先合并到中央再展开。
- 普通出牌移除后，只剩余手牌缓动重排，不触发中央合并展开。
- `pnpm run format` 已运行。
- `pnpm run type-check` 通过。
- `pnpm run lint` 无新增 error；若仍有既有 warning，最终说明中明确记录。

## Constraints

- 不手动编辑 `.scene`、`.prefab`、`.meta`。
- 不做 Cocos 预览验证要求；本任务验收以代码格式化、类型检查和 lint 为准。
- 不引入新的 `any`、不使用 `as` 断言绕过类型系统。
- 保持依赖方向：Core 不依赖 UI；UI 动画事件由 UI 层根据 Core 事件转发。
- 修改范围限于纯代码和计划/任务文件。
