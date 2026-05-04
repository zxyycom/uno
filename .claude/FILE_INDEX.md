# 文件索引

> 更新时间: 2026-05-04
> 如果文件索引与实际代码库不符，请启动子代理更新此文件索引到最新状态

---

## Core Layer (游戏引擎层)

### deck/

| 文件                                                        | 说明                         |
| ----------------------------------------------------------- | ---------------------------- |
| [deck-manager.ts](assets/scripts/core/deck/deck-manager.ts) | 牌堆管理器 - 抽卡/弃牌堆管理 |

### game/

| 文件                                                                | 说明                             |
| ------------------------------------------------------------------- | -------------------------------- |
| [card-collection.ts](assets/scripts/core/game/card-collection.ts)   | 卡牌集合 - 数组+Map双重索引      |
| [game-initializer.ts](assets/scripts/core/game/game-initializer.ts) | 游戏初始化器                     |
| [play-manager.ts](assets/scripts/core/game/play-manager.ts)         | 玩家管理器 + SinglePlayerManager |

### machine/

| 文件                                                           | 说明                 |
| -------------------------------------------------------------- | -------------------- |
| [game-machine.ts](assets/scripts/core/machine/game-machine.ts) | xstate v5 游戏状态机 |
| [game-manager.ts](assets/scripts/core/machine/game-manager.ts) | 游戏管理器单例       |

### utils/

| 文件                                                               | 说明                         |
| ------------------------------------------------------------------ | ---------------------------- |
| [ai-manager.ts](assets/scripts/core/utils/ai-manager.ts)           | AI 决策逻辑                  |
| [deck-helper.ts](assets/scripts/core/utils/deck-helper.ts)         | 牌堆辅助函数 (洗牌/创建牌堆) |
| [input-validator.ts](assets/scripts/core/utils/input-validator.ts) | 输入验证                     |

---

## Foundation Layer (基础设施层)

### events/

| 文件                                                              | 说明                              |
| ----------------------------------------------------------------- | --------------------------------- |
| [event-bus.ts](assets/scripts/foundation/events/event-bus.ts)     | 事件总线 - 封装 Cocos EventTarget |
| [game.events.ts](assets/scripts/foundation/events/game.events.ts) | 游戏事件类型定义                  |
| [index.ts](assets/scripts/foundation/events/index.ts)             | 事件模块导出                      |

### types/

| 文件                                                           | 说明                                    |
| -------------------------------------------------------------- | --------------------------------------- |
| [game.types.ts](assets/scripts/foundation/types/game.types.ts) | 核心类型定义 (Card, Player, TopCard 等) |
| [index.ts](assets/scripts/foundation/types/index.ts)           | 类型模块导出                            |

### utils/

| 文件                                                             | 说明         |
| ---------------------------------------------------------------- | ------------ |
| [logger.ts](assets/scripts/foundation/utils/logger.ts)           | 日志工具     |
| [random-seed.ts](assets/scripts/foundation/utils/random-seed.ts) | 随机种子工具 |

---

## UI Layer (UI 层)

### components/

| 文件                                                                                | 说明           |
| ----------------------------------------------------------------------------------- | -------------- |
| [ai-auto-responder.ts](assets/scripts/ui/components/ai-auto-responder.ts)           | AI 自动响应器  |
| [card-manager.ts](assets/scripts/ui/components/card-manager.ts)                     | 卡牌管理器     |
| [deck-component.ts](assets/scripts/ui/components/deck-component.ts)                 | 牌堆组件       |
| [game-message.ts](assets/scripts/ui/components/game-message.ts)                     | 游戏消息组件   |
| [other-player-hand.ts](assets/scripts/ui/components/other-player-hand.ts)           | 其他玩家手牌   |
| [played-card-pile.ts](assets/scripts/ui/components/played-card-pile.ts)             | 弃牌堆组件     |
| [player-hand.ts](assets/scripts/ui/components/player-hand.ts)                       | 玩家手牌组件   |
| [player-hand-count-view.ts](assets/scripts/ui/components/player-hand-count-view.ts) | 手牌数量视图   |
| [player-seat-view.ts](assets/scripts/ui/components/player-seat-view.ts)             | 玩家座位视图   |
| [player-slot-controller.ts](assets/scripts/ui/components/player-slot-controller.ts) | 玩家槽位控制器 |
| [player-turn-countdown.ts](assets/scripts/ui/components/player-turn-countdown.ts)   | 回合倒计时     |
| [player-turn-indicator.ts](assets/scripts/ui/components/player-turn-indicator.ts)   | 回合指示器     |
| [ui-manager.ts](assets/scripts/ui/components/ui-manager.ts)                         | UI 管理器      |

### resources/

| 文件                                                                           | 说明           |
| ------------------------------------------------------------------------------ | -------------- |
| [card-sprite-loader.ts](assets/scripts/ui/resources/card-sprite-loader.ts)     | 卡牌精灵加载器 |
| [card-sprite-resolver.ts](assets/scripts/ui/resources/card-sprite-resolver.ts) | 卡牌精灵解析器 |

### utils/

| 文件                                                               | 说明         |
| ------------------------------------------------------------------ | ------------ |
| [hand-card-layout.ts](assets/scripts/ui/utils/hand-card-layout.ts) | 手牌布局工具 |
| [seat-direction.ts](assets/scripts/ui/utils/seat-direction.ts)     | 座位方向工具 |

---

## Client Layer (客户端层)

| 文件                                                                     | 说明         |
| ------------------------------------------------------------------------ | ------------ |
| [local-player-profile.ts](assets/scripts/client/local-player-profile.ts) | 本地玩家档案 |

---
