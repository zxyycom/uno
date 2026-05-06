# 摸牌布局优化与审查口径调整计划

## Status: Ready for Agent Execution

## Summary

按最新 CR 反馈调整统一摸牌组件重构的后续修正方向：

- `HandDrawAnimator` 只负责创建节点、组织动画参数、请求 `CardMoveAnimator` 执行动画。
- 摸牌动画触发后，`HandDrawAnimator` 不再主动保存 handle、取消请求或管理动画生命周期。
- 透明度相关删除是预期内改动，不恢复不可出牌透明度弱化效果。
- `getDrawTargetLayout` 需要优化为单卡纯函数计算，批量布局基于该单卡函数生成，避免每张新增牌重复计算完整布局数组。

## Key Decisions

- 保留现有统一摸牌组件方向：所有摸牌飞行动画仍由 `HandDrawAnimator` 发起。
- `HandDrawAnimator` 不处理动画取消、不维护 active draw request、不做 request 生命周期仲裁。
- 动画完成后的节点交接仍通过 `CardMoveRequest.onCompleted` 调用目标手牌组件 `appendDrawnCards(cards, nodes)`。
- 不新增异步过期保护；本地玩家创建真实牌面节点时的异步边界不做额外生命周期管理。
- 不恢复 `disabledCardOpacity` / `enabledCardOpacity`、`CardLayoutTransform.opacity`、`UIOpacity` 应用。
- `getDrawTargetLayout` 只计算单张目标布局；完整批量布局由底层工具循环调用单卡纯函数生成。

## Required Code Changes

### 1. 简化 HandDrawAnimator 动画管理职责

修改 `assets/scripts/ui/components/hand-draw-animator.ts`：

- 删除 `activeHandle` 字段。
- 删除 `cancelActiveRequest` 方法。
- 删除 `START_GAME` 订阅中主动取消当前摸牌动画的逻辑。
- 删除 `onDestroy` 中主动取消当前摸牌动画的逻辑，仅保留事件解绑。
- 收到 `CARDS_DRAWN` 后仍按原流程：
    - 解析目标手牌组件。
    - 创建本地玩家真实牌面节点或其他玩家卡背节点。
    - 逐张调用目标组件 `getDrawTargetLayout(card, index, totalCount)`。
    - 组织 `CardMoveRequest` 并调用 `CardMoveAnimator.requestMove(request)`。
    - 在 `onCompleted` 中调用 `targetHand.appendDrawnCards(cardOrder, nodes)`。
- 不在 `HandDrawAnimator` 内实现主动取消、过期判断或节点释放兜底。

### 2. 抽出单卡布局纯函数

修改 `assets/scripts/ui/utils/hand-card-layout.ts`：

- 新增导出的单卡纯函数，例如：
    - `calculateCurvedFanCardLayout(index: number, totalCards: number, config: CurvedFanLayoutConfig): CardLayoutTransform`
- 该函数只根据 `index`、`totalCards`、`config` 返回单张卡牌的：
    - `position`
    - `angle`
    - `scale`
    - `siblingIndex`
- `calculateCurvedFanCardLayouts(totalCards, config)` 改为循环调用 `calculateCurvedFanCardLayout` 生成数组。
- 保持现有布局数学规则不变：
    - 单张牌 ratio 为 `0.5`，角度为 `0`。
    - 多张牌按现有中心点、曲线采样和扇形角度规则计算。

### 3. 优化 PlayerHand.getDrawTargetLayout

修改 `assets/scripts/ui/components/player-hand.ts`：

- `getDrawTargetLayout(card, index, totalCount)` 不再调用 `calculateCurvedFanCardLayouts(totalCount, config)`。
- 改为调用新增单卡纯函数。
- 单卡布局索引使用 `this.handOrder.length + index`。
- `card` 参数继续保留，用于与其他玩家手牌统一接口；本方法当前无需读取牌面信息。

### 4. 优化 OtherPlayerHand.getDrawTargetLayout

修改 `assets/scripts/ui/components/other-player-hand.ts`：

- `getDrawTargetLayout(_card, index, totalCount)` 不再调用 `calculateCurvedFanCardLayouts(totalCount, config)`。
- 改为调用新增单卡纯函数。
- 单卡布局索引使用 `this.cardNodes.length + index`。
- `card` 参数继续保留为统一接口占位。

## Acceptance Criteria

- `HandDrawAnimator` 不再保存或主动取消摸牌动画 request handle。
- `HandDrawAnimator` 不再订阅 `START_GAME` 来取消摸牌动画。
- `HandDrawAnimator.onDestroy` 只做自身事件解绑，不主动 cancel 已触发的摸牌动画。
- `HandDrawAnimator` 仍负责创建节点、组织 request 参数并请求 `CardMoveAnimator`。
- 动画完成后，仍由 `onCompleted` 把同一批节点追加给目标手牌组件。
- `calculateCurvedFanCardLayout` 是可复用的单卡纯函数。
- `calculateCurvedFanCardLayouts` 基于单卡纯函数生成批量布局。
- `PlayerHand.getDrawTargetLayout` 和 `OtherPlayerHand.getDrawTargetLayout` 只计算单张新增牌目标布局，不重复生成完整布局数组。
- 不恢复透明度弱化相关代码。
- 不新增卡牌移动全局事件。
- 不手动编辑 `.scene`、`.prefab`、`.meta`。

## Implementation Order

1. 在 `hand-card-layout.ts` 新增单卡布局纯函数，并改造批量布局函数复用它。
2. 改造 `PlayerHand.getDrawTargetLayout` 使用单卡布局纯函数。
3. 改造 `OtherPlayerHand.getDrawTargetLayout` 使用单卡布局纯函数。
4. 简化 `HandDrawAnimator`，移除 active handle 和主动取消逻辑。
5. 运行 `pnpm run format`。
6. 运行 `pnpm run type-check`。
7. 运行 `pnpm run lint`，若仍有既有 warning，在最终说明中记录。

## Constraints

- 不手动编辑 `.scene`、`.prefab`、`.meta`。
- 不新增卡牌移动全局事件。
- 不新增 `any`，不使用 `as any` 绕过类型系统。
- 保持依赖方向 UI → Foundation → Core。
- `HandDrawAnimator` 是 UI 层动画请求组织组件，不处理游戏规则，不改写 Core 状态。
- 格式化唯一使用 `pnpm run format`。
