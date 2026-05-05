# 卡牌移动动画 API 化重构计划

## Status: Ready for Agent Execution

## Summary

将卡牌移动动画从事件驱动改为 UI 内部请求 API。`CardMoveAnimator` 作为 UI 层动画服务，由 `UIManager` 注入给各 UI 组件；业务事件仍由现有 `EventBus` 驱动，但卡牌飞行动画不再新增或依赖 `CARD_MOVE_REQUESTED` / `CARD_MOVE_COMPLETED` 这类全局事件。

目标是一次性重建卡牌移动链路：本地玩家出牌使用真实手牌节点飞向弃牌堆，其他玩家出牌使用卡背节点切换牌面后飞向弃牌堆，摸牌从牌堆飞入对应手牌，初始化和摸牌后支持中央合并再展开。执行时以本计划为准，不沿用旧的事件化动画实现。

## Key Lessons To Preserve

- `CardMoveAnimator` 是 UI 内部工具，不应把动画请求类型放入 Foundation 事件系统。
- 一个动画请求应包含一组 `CardMoveItem`，多卡摸牌必须是单个请求内多个 item，而不是每张卡单独发起一套生命周期。
- 动画服务只负责 tween、临时飞行层挂载、完成/取消回调分发，不决定节点最终归宿。
- 节点所有权必须唯一：摸牌完成后 Hand 继续拥有；出牌完成后 `PlayedCardPile` 接管；出牌取消后由出牌发起方释放。
- 异步创建节点后必须校验组件有效性、当前批次 token 和节点有效性，避免旧回调写回已重置的 UI。
- 场景节点必须通过 `@property` 绑定和 `UIManager` 注入，禁止字符串路径查找、动态创建节点或运行时 `addComponent()` 兜底。
- 动画配置必须通过 `CardMoveAnimator.initialize()` 注入并统一读取，不允许调用方直接绕过注入配置读取默认常量。

## Required Code Changes

### 1. 新增 CardMoveAnimator 请求 API

新增 `assets/scripts/ui/components/card-move-animator.ts`：

- 提供 `requestMove(request: CardMoveRequest): CardMoveRequestHandle`。
- `CardMoveRequest` 包含 `id`、`kind`、`playerId`、`items`、`onCompleted?`、`onCancelled?`。
- `CardMoveItem` 包含 `card`、`node`、`fromPosition`、`toPosition`、`targetParent`、`targetRotation`、`targetScale`、`targetLayer`、`targetSiblingIndex?`、`delay?`。
- `CardMoveRequestHandle` 至少提供 `id`、`cancel(reason)`、`isActive()`。
- 内部用 `remainingCount` 判断请求完成；每个 item 完成后递减，归零时触发 `onCompleted`。
- `cancel(reason)`、节点被替换、节点失效、组件销毁都取消整个请求并触发 `onCancelled`。
- 不新增 `CARD_MOVE_REQUESTED`、`CARD_MOVE_COMPLETED` 或其他动画事件。

### 2. UIManager 注入动画依赖

修改 `assets/scripts/ui/components/ui-manager.ts`：

- 新增并绑定 `CardMoveAnimator`、`deckNode`、`discardPileNode`、`discardStackLayerNode`、`PlayedCardPile` 等 UI 动画依赖。
- 初始化时调用 `cardMoveAnimator.initialize(animationConfig)`。
- 将动画服务、牌堆锚点、弃牌堆目标、弃牌堆接管回调注入 `PlayerHand` 和三个 `OtherPlayerHand`。
- 删除所有场景字符串查找；不得使用 `find()`、`getChildByName()`、自建 BFS 查找或动态 `addComponent()`。

### 3. 重建 PlayerHand 动画流程

修改 `assets/scripts/ui/components/player-hand.ts`：

- `HAND_UPDATED` 改为差量同步，不再每次清空整手重建。
- 用单一稳定状态表示手牌视图顺序，例如 `cardViewsById` + `handOrder`；避免数组和 Map 双源失配。
- 本地玩家出牌时，从手牌状态中移除真实节点，通过 `CardMoveAnimator.requestMove()` 飞向弃牌堆；完成后调用弃牌堆接管回调，取消后释放回 `CardManager`。
- 本地玩家摸牌时创建新增真实节点，构造一个多 item draw-to-hand 请求；完成后执行中央合并再展开，取消后清理 pending 状态并释放不再属于手牌的节点。
- `START_GAME`、`dispose`、`clearCards` 必须取消当前 active draw/play request，并使旧异步回调失效。
- 卡牌运行时保持不透明，删除或停止使用不可出牌透明度逻辑。

### 4. 重建 OtherPlayerHand 动画流程

修改 `assets/scripts/ui/components/other-player-hand.ts`：

- 其他玩家出牌时，从现有卡背节点中选出一个节点，先从 hand 列表移除，切换为真实牌面后调用 `CardMoveAnimator.requestMove()` 飞向弃牌堆。
- 出牌完成后由弃牌堆接管节点；出牌取消后由 `OtherPlayerHand` 释放节点。
- 摸牌时新增卡背节点并构造一个多 item draw-to-hand 请求；完成后中央合并再展开，取消后按节点是否仍属于 hand 列表决定刷新或释放。
- 删除每帧布局签名检查；布局刷新由 `HAND_UPDATED`、摸牌完成/取消、出牌节点变化、初始化和清理路径显式触发。
- 不订阅任何卡牌移动完成事件。

### 5. 重建 PlayedCardPile 接管模型

修改 `assets/scripts/ui/components/played-card-pile.ts`：

- 删除“收到 `CARD_PLAYED` 后从牌堆创建一张卡飞到弃牌堆”的旧逻辑。
- 新增 `acceptDiscardNode(card: Card, node: Node): void`，只接管已经飞到弃牌堆的真实节点。
- 接管后将节点加入弃牌堆堆叠数组，应用偏移、角度、层级。
- `DISCARD_UPDATED` 只处理初始顶牌或同步兜底；动画进行或已有顶牌时不得重复生成顶牌。
- 清空弃牌堆时释放已接管节点，优先通过 `CardManager.releaseCard()` 归还对象池。

### 6. 扩展 CardManager 与动画工具

修改 `assets/scripts/ui/components/card-manager.ts` 和 `assets/scripts/ui/utils/card-move-animation.ts`：

- `CardManager` 新增 `setCardFace(node, card)` 和 `setCardBack(node)`，`acquireCard` / `acquireCardBack` 复用这两个方法。
- 所有 acquire/release/reset 路径都重置 active、parent、position、scale、angle、opacity、sprite。
- 新增纯函数构造 draw-to-hand `CardMoveItem[]`，显式接收 cards、nodes、layouts、起点世界坐标、目标父节点、目标层级、错峰 delay。
- `animateCenterMergeExpand` 接收显式动画配置，不直接读取默认常量。
- 布局纯计算与 tween 副作用保持分离，调用方负责停止既有 tween。

## Implementation Order

1. 增加 UI 内部动画类型、配置和 `CardMoveAnimator.requestMove()` API。
2. 扩展 `CardManager` 的牌面/卡背切换与节点 reset 能力。
3. 让 `UIManager` 通过 `@property` 注入动画依赖和弃牌堆接管回调。
4. 改造 `PlayedCardPile` 为只接管飞完节点，不再自行发起出牌飞行动画。
5. 改造 `PlayerHand` 的差量同步、出牌飞行、摸牌飞入和 active request 生命周期。
6. 改造 `OtherPlayerHand` 的卡背出牌、摸牌飞入和事件驱动布局刷新。
7. 抽取 draw-to-hand item 构造纯函数，并统一使用注入后的动画配置。
8. 删除透明度弱化、每帧布局检查、字符串节点查找、动画事件残留和死代码。
9. 运行 `pnpm run format`。
10. 运行 `pnpm run type-check`。
11. 运行 `pnpm run lint`。

## Acceptance Criteria

- 不新增、不使用卡牌移动全局事件；动画请求只通过 `CardMoveAnimator.requestMove()` 发起。
- 本地玩家出牌时，被出的真实手牌节点飞到弃牌堆，其余手牌缓动补位。
- 其他玩家出牌时，一张卡背节点切换成真实牌面并飞到弃牌堆，其余卡背缓动补位。
- 摸 1 张或多张时，目标玩家只发起一个 draw-to-hand 请求，卡牌按 delay 错峰飞入手牌。
- 初始化和摸牌后，目标玩家手牌会中央合并再展开；普通出牌只触发剩余手牌补位。
- 出牌完成后节点只由 `PlayedCardPile` 接管；出牌取消后节点只由发起方释放。
- 重置、销毁、开始新游戏时 active request 被取消，旧异步回调不会写回已清空 UI。
- `UIManager` 和 hand 组件中没有 `find()`、`getChildByName()` 或动态 `addComponent()` 兜底。
- 所有卡牌节点运行时保持不透明。
- `pnpm run format` 已运行。
- `pnpm run type-check` 通过。
- `pnpm run lint` 无新增 error；若存在既有 warning，最终说明中明确记录。

## Constraints

- 不手动编辑 `.scene`、`.prefab`、`.meta` 文件；场景绑定变更必须使用 Cocos Creator MCP。
- 不新增 `any`，不使用 `as` 类型断言绕过类型系统。
- 保持依赖方向：UI → Foundation → Core；Core 不依赖 UI。
- `CardMoveAnimator` 不处理业务规则，不读写 Core 状态，不订阅业务事件。
- 节点生命周期必须有唯一 owner，禁止同一节点在同一路径中既 release 又 destroy。
- 格式化唯一使用 `pnpm run format`。
