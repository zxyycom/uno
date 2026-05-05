# 统一摸牌组件重构计划

## Status: Ready for Agent Execution

## Summary

把摸牌动画从 `PlayerHand` / `OtherPlayerHand` 中移出，新增专门的摸牌组件集中订阅摸牌事件、创建节点、执行飞行动画。动画结束后，摸牌组件直接调用目标手牌组件的追加接口；手牌组件只负责接收最终节点并执行“收起再展开”动画。

本次重构的核心所有权规则是：摸牌开始时由摸牌组件创建节点，飞行动画期间该节点处于动画阶段；动画完成后，同一个节点追加给目标手牌组件，进入真实手牌阶段。玩家手牌和其他玩家手牌不再各自实现摸牌请求、取消、pending 节点管理。

## Key Decisions

- 新增 `HandDrawAnimator` 作为 UI 层摸牌动画组件。
- `HandDrawAnimator` 订阅 `CARDS_DRAWN`，为本地玩家创建真实牌面节点，为其他玩家创建卡背节点。
- `HandDrawAnimator` 通过 `UIManager.getInstance()` 使用现有 UI 单例属性，不在自身重复绑定 `cardMoveAnimator`、`deckNode`、`discardStackLayerNode`、各手牌组件等对象。
- `PlayerHand` 和 `OtherPlayerHand` 不再订阅 `CARDS_DRAWN`，也不再维护摸牌动画 request handle。
- 动画完成后，`HandDrawAnimator` 直接调用目标手牌组件的追加接口。
- 手牌组件追加卡牌后，自行触发中央收起再展开动画。
- `HAND_UPDATED` 不再作为常规 UI 驱动事件；常规手牌变化拆分为摸牌事件和出牌事件。
- 新增一个全量手牌同步事件，但暂不用于常规 UI 驱动，只作为未来校验 UI 与 Core 数据一致性的保留入口。

## Required Code Changes

### 1. 新增 HandDrawAnimator

新增 `assets/scripts/ui/components/hand-draw-animator.ts`：

- 订阅 `GameEventType.CARDS_DRAWN`。
- 订阅 `START_GAME` 或销毁路径时取消当前 active draw request。
- 通过 `UIManager.getInstance()` 获取：
  - `cardMoveAnimator`
  - `deckNode`
  - `discardStackLayerNode`
  - `playerHand`
  - `otherPlayerHandRight`
  - `otherPlayerHandTop`
  - `otherPlayerHandLeft`
  - `cardManager`
  - 动画配置
- 根据 `payload.player.id` 找到目标手牌组件。
- 为本次摸到的每张牌创建节点：
  - 本地玩家：创建真实牌面节点。
  - 其他玩家：创建卡背节点。
- 调用目标手牌组件的单卡布局接口计算目标位置。
- 使用 `CardMoveAnimator.requestMove()` 发起单个多 item draw-to-hand 请求。
- `onCompleted` 调用目标手牌组件的追加接口。
- `onCancelled` 释放本次创建但尚未追加给手牌组件的节点。
- 不 emit 新的卡牌移动全局事件。

### 2. UIManager 提供单例访问

修改 `assets/scripts/ui/components/ui-manager.ts`：

- 增加静态实例字段。
- 在 `onLoad` 设置实例。
- 在 `onDestroy` 清理实例。
- 新增 `static getInstance(): UIManager | null`。
- 暴露 `HandDrawAnimator` 需要复用的现有 UI 属性和动画配置。
- 不再由 `UIManager` 向 `HandDrawAnimator` 重复注入那些已经在 UIManager 上绑定的节点和组件。

### 3. PlayerHand 改为只接收摸牌完成后的节点

修改 `assets/scripts/ui/components/player-hand.ts`：

- 删除 `CARDS_DRAWN` 订阅。
- 删除 `activeDrawHandle`、摸牌 request 构造、摸牌取消、pending draw request 生命周期。
- 新增 `appendDrawnCards(cards: readonly Card[], nodes: readonly Node[]): void`：
  - 将每张真实牌面节点注册到 `cardViewsById`。
  - 更新 `handOrder`。
  - 绑定点击、悬停、触摸事件。
  - 追加完成后触发中央收起再展开动画。
- 新增 `getDrawTargetLayout(card: Card, index: number, totalCount: number): CardLayoutTransform`：
  - `index` 是该 card 在本次摸牌中的索引。
  - `totalCount` 是追加后的最终手牌数量。
  - 返回该 card 的目标位置、角度、缩放和 siblingIndex。
- `HAND_UPDATED` 不再用于常规摸牌 UI；本地手牌出牌仍通过 `CARD_PLAYED` 移除真实节点并飞向弃牌堆。
- `uiContext` 改为必初始化字段：`private uiContext: PlayerHandContext = null!;`，去掉可选语义和重复 `this.uiContext!`。

### 4. OtherPlayerHand 改为只接收摸牌完成后的节点

修改 `assets/scripts/ui/components/other-player-hand.ts`：

- 删除 `CARDS_DRAWN` 订阅。
- 删除 `activeDrawHandle`、摸牌 request 构造、摸牌取消逻辑。
- 新增 `appendDrawnCards(cards: readonly Card[], nodes: readonly Node[]): void`：
  - 将卡背节点追加到 `cardNodes`。
  - 追加完成后触发中央收起再展开动画。
- 新增 `getDrawTargetLayout(card: Card, index: number, totalCount: number): CardLayoutTransform`：
  - 根据追加后的最终数量计算本次新增卡牌的目标布局。
  - `card` 参数用于与 `PlayerHand` 保持统一接口，其他玩家手牌无需读取牌面业务信息。
- 其他玩家出牌逻辑继续保留在 `OtherPlayerHand`，因为它需要从已有卡背节点中选一张切换成真实牌面并飞向弃牌堆。

### 5. 调整手牌事件模型

修改 `assets/scripts/foundation/events/game.events.ts` 和 `assets/scripts/core/machine/game-machine.ts`：

- 常规手牌增加继续使用 `CARDS_DRAWN`。
- 常规手牌减少继续使用 `CARD_PLAYED`。
- 移除常规流程中对 `HAND_UPDATED` 的 UI 驱动依赖。
- 新增全量手牌同步事件，例如 `HAND_SNAPSHOT_SYNCED`：
  - payload 包含 `playerId`、`hand`、`cardCount`。
  - 注释说明：该事件用于未来校验 UI 与 Core 手牌数据是否一致，或处理重连/强制同步，不用于常规摸牌/出牌 UI。
- 初始化发牌改为发出 `CARDS_DRAWN`，由统一摸牌组件播放初始手牌进入动画。

### 6. 更新玩家槽位数量

修改 `assets/scripts/ui/components/player-slot-controller.ts`：

- 不再订阅 `HAND_UPDATED`。
- 订阅 `CARDS_DRAWN`，按 `payload.cards.length` 增加手牌数量。
- 订阅 `CARD_PLAYED`，玩家出牌后手牌数量减 1。
- `START_GAME` 时重置显示数量和 UNO 状态。
- `CALL_UNO` / `GAME_OVER` 行为保持不变。

### 7. CardMoveAnimator 注释补强

修改 `assets/scripts/ui/components/card-move-animator.ts`：

- 保留开始和完成时的 `node.isValid` 校验。
- 在启动 tween 的逻辑附近补充注释：
  - 摸牌 tween 期间节点控制权归动画组件。
  - 其他组件不应 release/destroy 正在动画中的节点。
  - 因此节点中途失效理论上不应发生，现有校验是防御性保护。
- 不增加复杂的节点销毁监听机制。

## Acceptance Criteria

- `PlayerHand` 和 `OtherPlayerHand` 中不再订阅 `CARDS_DRAWN`。
- 两个手牌组件中不再存在摸牌 request handle、摸牌 request 构造和摸牌取消逻辑。
- 所有摸牌飞行动画只由 `HandDrawAnimator` 发起。
- 摸牌飞行动画仍使用单个 `CardMoveAnimator.requestMove()` 请求承载多张牌。
- 动画完成后，目标手牌组件通过追加接口接收节点。
- 本地玩家摸牌完成后，新增节点可点击、可悬停、可选中。
- 其他玩家摸牌完成后，新增卡背节点进入对应玩家手牌布局。
- 初始发牌也走统一摸牌组件。
- `HAND_UPDATED` 不再驱动常规 UI；全量同步事件仅保留并带未来用途注释。
- `PlayerSlotController` 的手牌数量通过 `CARDS_DRAWN` / `CARD_PLAYED` 更新。
- 不新增卡牌移动全局事件。
- `game.scene` / `.meta` 变更保持现状，不作为问题处理。
- `GameMessage` 删除保持现状。

## Implementation Order

1. 在事件定义中新增全量手牌同步事件注释，并停止把 `HAND_UPDATED` 作为常规 UI 事件。
2. 调整 game-machine：初始化发牌和摸牌统一发出 `CARDS_DRAWN`，出牌继续发出 `CARD_PLAYED`。
3. 为 `UIManager` 增加单例访问能力，并暴露摸牌组件需要的现有属性。
4. 新增 `HandDrawAnimator`，集中处理 `CARDS_DRAWN` 到动画完成后的追加。
5. 改造 `PlayerHand`，删除摸牌动画逻辑，提供追加接口和单卡目标布局接口。
6. 改造 `OtherPlayerHand`，删除摸牌动画逻辑，提供追加接口和单卡目标布局接口。
7. 改造 `PlayerSlotController`，用 `CARDS_DRAWN` / `CARD_PLAYED` 更新数量。
8. 为 `CardMoveAnimator` 增加节点中途失效相关注释。
9. 使用 MCP 工具修改场景，挂载和绑定新组件：

   代码变更完成后，使用 Cocos Creator MCP 工具更新场景，使脚本与场景绑定一致：

   - 在 `GameController` 节点（UIManager 所在节点）挂载 `HandDrawAnimator` 组件脚本。
     - `HandDrawAnimator` 通过 `UIManager.getInstance()` 获取所有依赖，无需单独绑定节点属性。
     - 与 `UIManager` 同节点确保其 `onLoad`/`onDestroy` 生命周期正常触发。
   - 若 `UIManager` 新增 `@property(CardManager) cardManager`，通过 MCP 将场景中的 `CardManager` 节点绑定到该属性。
   - 验证 `UIManager` 上所有已有 `@property` 引用（`playerHand`、`deckComponent`、`cardMoveAnimator`、`deckNode`、`discardStackLayerNode`、`playedCardPile`、各 `PlayerSlotController`、各 `OtherPlayerHand`）在场景中仍然有效。
   - 不手动编辑 `.scene`/`.prefab`/`.meta` 文件——全部通过 Cocos Creator MCP 工具操作。

10. 运行 `pnpm run format`。
11. 运行 `pnpm run type-check`。
12. 运行 `pnpm run lint`。

## Constraints

- 不手动编辑 `.scene`、`.prefab`、`.meta`。
- 不新增卡牌移动全局事件。
- 不新增 `any`，不使用 `as any` 绕过类型系统。
- 保持依赖方向 UI → Foundation → Core。
- 摸牌组件是 UI 层动画组件，不处理游戏规则，不改写 Core 状态。
- 格式化唯一使用 `pnpm run format`。
