# 手牌计数、出牌动画拆分与手牌组件复用计划

## Status: Ready for Agent Execution

## Summary

实现两个 UI 层改造，并同步考虑本地玩家手牌与其他玩家手牌的复用方式：

- 修复 `HandDrawAnimator` 使用 `targetHand.node.children.length` 计算手牌数量的问题，改为读取手牌组件公开的逻辑卡牌数量，避免把 `WildColorPanel` 算进手牌数量。
- 新增独立 `HandPlayAnimator` 组件，集中管理所有玩家的出牌到弃牌堆动画，形态与 `HandDrawAnimator` 对齐。
- 不引入 `PlayerHand` / `OtherPlayerHand` 继承层级；改用组合方式抽共享协议和纯工具，降低 Cocos 组件序列化与职责差异带来的复杂度。

## Key Decisions

- `PlayerHand` 和 `OtherPlayerHand` 继续作为独立 Cocos 组件存在。
- 共享逻辑通过接口契约和工具函数组合复用，不建立 `BaseHand` 抽象组件。
- `HandDrawAnimator` 与 `HandPlayAnimator` 负责消费全局事件并组织动画请求。
- 手牌组件只负责维护自身节点集合、布局、节点准备与释放。
- 不改变 Core 事件结构，继续由 `CARDS_DRAWN` 和 `CARD_PLAYED` 驱动 UI。
- 不手动编辑 `.scene`、`.prefab`、`.meta`；新增组件的场景绑定通过 Cocos Creator / Cocos MCP 完成。

## Required Code Changes

### 1. 建立手牌视图协议与共享工具

新增或调整 UI 层类型/工具，例如：

- `assets/scripts/ui/components/hand-view-contract.ts`
- `assets/scripts/ui/utils/hand-play-animation.ts`

协议至少覆盖以下公共能力：

- `getLogicalCardCount(): number`
- `getDrawTargetLayout(card, index, totalCount): CardLayoutTransform`
- `appendDrawnCards(cards, nodes): void`
- `preparePlayCard(card): Promise<PreparedPlayCard | null>`
- `releasePreparedPlayNode(node): void`
- `refreshHandLayout(animated): void`

`PreparedPlayCard` 至少包含：

- `card: Card`
- `node: Node`
- `fromPosition: Vec3`

共享工具负责：

- 构造出牌到弃牌堆的 `CardMoveItem`。
- 保存统一接口类型，减少 `HandDrawAnimator` / `HandPlayAnimator` 对具体组件实现细节的依赖。

### 2. 修复摸牌动画手牌数量计算

修改 `assets/scripts/ui/components/hand-draw-animator.ts`：

- `currentHandCount` 改为 `targetHand.getLogicalCardCount()`。
- 不再读取 `targetHand.node.children.length`。
- 其他摸牌流程保持不变：创建节点、计算目标布局、提交 `CardMoveRequest`、完成后调用 `appendDrawnCards(cards, nodes)`。

### 3. 改造 PlayerHand

修改 `assets/scripts/ui/components/player-hand.ts`：

- 新增 `getLogicalCardCount()`，返回 `this.handOrder.length`。
- 暴露 `refreshHandLayout(animated)`，内部复用现有扇形布局刷新逻辑。
- 新增 `preparePlayCard(card)`：
    - 找到对应 `HandCardView`。
    - 清理悬停、选中、待选色状态和 `WildColorPanel`。
    - 从 `cardViewsById` 和 `handOrder` 移除卡牌。
    - 解绑卡牌节点事件，但不释放节点。
    - 刷新剩余手牌布局。
    - 返回待动画节点及其世界坐标。
- 新增 `releasePreparedPlayNode(node)`，用于出牌动画取消时释放准备好的节点。
- 移除 `CARD_PLAYED` 订阅、`startPlayToDiscard`、`activePlayHandle` 与相关取消逻辑。
- 保留点击、选中、万能牌选色、可出牌提示等本地玩家专属逻辑。

### 4. 改造 OtherPlayerHand

修改 `assets/scripts/ui/components/other-player-hand.ts`：

- 新增 `getLogicalCardCount()`，返回 `this.cardNodes.length`。
- 暴露 `refreshHandLayout(animated)`，内部复用现有卡背布局刷新逻辑。
- 新增 `preparePlayCard(card)`：
    - 从 `cardNodes` 弹出一张卡背节点。
    - 将节点加入 pending 集合。
    - 刷新剩余卡背布局。
    - 异步调用 `cardManager.setCardFace(node, card)`。
    - 若组件生命周期失效或节点不再 pending，则释放或返回 `null`。
    - 返回待动画节点及其世界坐标。
- 新增 `releasePreparedPlayNode(node)`，用于取消时从 pending 集合移除并释放节点。
- 移除 `CARD_PLAYED` 订阅、`startPlayToDiscard`、`activePlayHandle` 与相关取消逻辑。
- 保留其他玩家只展示卡背、不交互、不暴露真实手牌的职责。

### 5. 新增 HandPlayAnimator

新增 `assets/scripts/ui/components/hand-play-animator.ts`：

- 作为独立 Cocos 组件，类似 `HandDrawAnimator`。
- 订阅 `GameEventType.CARD_PLAYED`。
- 通过 `UIManager` 根据 `payload.player.id` 解析目标手牌组件。
- 调用 `targetHand.preparePlayCard(payload.card)` 获取待飞行动画节点。
- 使用 `CardMoveKind.PlayToDiscard` 组织 `CardMoveRequest`。
- 动画目标为 `uiManager.discardPileNode.worldPosition`。
- `targetParent` 和 `targetLayer` 使用 `uiManager.discardStackLayerNode`。
- `onCompleted` 调用 `uiManager.playedCardPile.acceptDiscardNode(card, node)`。
- `onCancelled` 调用 `targetHand.releasePreparedPlayNode(node)`。

### 6. UIManager 提供手牌解析能力

修改 `assets/scripts/ui/components/ui-manager.ts`：

- 新增公共方法，例如 `resolveHandView(playerId: string): HandView | null`。
- 该方法复用现有本地手牌与三个其他玩家手牌引用。
- `HandDrawAnimator` 和 `HandPlayAnimator` 都通过该方法解析目标手牌，避免重复维护解析逻辑。

### 7. 场景集成

- 通过 Cocos Creator / Cocos MCP 将 `HandPlayAnimator` 挂到现有 UI 根节点。
- 不直接手动修改 `.scene` / `.prefab`。
- 不手动创建或修改 `.meta` 文件。

## Acceptance Criteria

- `HandDrawAnimator` 不再通过 `node.children.length` 计算手牌数量。
- 本地玩家打开 `WildColorPanel` 后摸牌，新增牌目标布局不再多算 1 张。
- 本地玩家与其他玩家都通过 `getLogicalCardCount()` 暴露逻辑手牌数量。
- `PlayerHand` 和 `OtherPlayerHand` 不再直接订阅 `CARD_PLAYED` 做出牌动画。
- 所有出牌飞行动画由 `HandPlayAnimator` 统一发起。
- 本地玩家出牌后，手牌节点飞入弃牌堆，其余手牌立即重新布局。
- 其他玩家出牌时，卡背翻成真实牌面后飞入弃牌堆，剩余卡背数量正确。
- 新开局、重置或组件销毁时，进行中的出牌动画不会残留节点或重复进入弃牌堆。
- 不新增卡牌移动全局事件。
- 不手动编辑 `.scene`、`.prefab`、`.meta`。

## Implementation Order

1. 新增手牌视图协议与出牌动画 item 构造工具。
2. 在 `UIManager` 增加 `resolveHandView(playerId)`。
3. 给 `PlayerHand` 增加逻辑数量、布局刷新、出牌准备和释放接口，并移除本地出牌动画订阅。
4. 给 `OtherPlayerHand` 增加同样接口，并移除其他玩家出牌动画订阅。
5. 修改 `HandDrawAnimator` 使用 `getLogicalCardCount()` 和 `UIManager.resolveHandView()`。
6. 新增 `HandPlayAnimator` 并集中消费 `CARD_PLAYED`。
7. 通过 Cocos Creator / Cocos MCP 绑定 `HandPlayAnimator` 到场景。
8. 运行 `pnpm run format`。
9. 运行 `pnpm run type-check`。
10. 运行 `pnpm run lint`，若仍有既有 warning，在最终说明中记录。

## Constraints

- 保持依赖方向 UI -> Foundation -> Core。
- 不新增 `any`，不使用 `as any` 绕过类型系统。
- 不新增卡牌移动全局事件。
- 不恢复或引入无关 UI 行为。
- `.meta` 文件由 Cocos Creator 管理；不手动创建或修改。
- `.scene`、`.prefab` 必须通过 Cocos Creator / Cocos MCP 修改。
- 格式化唯一使用 `pnpm run format`。
