# 文件索引

> 创建时间: 2026-04-28
> 如果文件索引与实际代码库不符，请启动子代理更新此文件索引到最新状态

---

## Core Layer (游戏引擎层)

### deck/
| 文件 | 说明 |
|------|------|
| [deck-manager.ts](assets/scripts/core/deck/deck-manager.ts) | 牌堆管理器 - 抽卡/弃牌堆管理 |
| [deck-resources.ts](assets/scripts/core/deck/deck-resources.ts) | 卡牌资源加载 |

### game/
| 文件 | 说明 |
|------|------|
| [card-collection.ts](assets/scripts/core/game/card-collection.ts) | 卡牌集合 - 数组+Map双重索引 |
| [game-initializer.ts](assets/scripts/core/game/game-initializer.ts) | 游戏初始化器 |
| [play-manager.ts](assets/scripts/core/game/play-manager.ts) | 玩家管理器 + SinglePlayerManager |

### machine/
| 文件 | 说明 |
|------|------|
| [game-machine.ts](assets/scripts/core/machine/game-machine.ts) | xstate v5 游戏状态机 |
| [game-manager.ts](assets/scripts/core/machine/game-manager.ts) | 游戏管理器单例 |

### utils/
| 文件 | 说明 |
|------|------|
| [ai-manager.ts](assets/scripts/core/utils/ai-manager.ts) | AI 决策逻辑 |
| [deck-helper.ts](assets/scripts/core/utils/deck-helper.ts) | 牌堆辅助函数 (洗牌/创建牌堆) |
| [input-validator.ts](assets/scripts/core/utils/input-validator.ts) | 输入验证 |

---

## Foundation Layer (基础设施层)

### events/
| 文件 | 说明 |
|------|------|
| [event-bus.ts](assets/scripts/foundation/events/event-bus.ts) | 事件总线 - 封装 Cocos EventTarget |
| [game.events.ts](assets/scripts/foundation/events/game.events.ts) | 游戏事件类型定义 |
| [index.ts](assets/scripts/foundation/events/index.ts) | 事件模块导出 |

### types/
| 文件 | 说明 |
|------|------|
| [game.types.ts](assets/scripts/foundation/types/game.types.ts) | 核心类型定义 (Card, Player, TopCard 等) |
| [index.ts](assets/scripts/foundation/types/index.ts) | 类型模块导出 |

### utils/
| 文件 | 说明 |
|------|------|
| [logger.ts](assets/scripts/foundation/utils/logger.ts) | 日志工具 |
| [random-seed.ts](assets/scripts/foundation/utils/random-seed.ts) | 随机种子工具 |

---

## UI Layer (UI 层)

### components/
| 文件 | 说明 |
|------|------|
| [card-node-pool.ts](assets/scripts/ui/components/card-node-pool.ts) | 卡牌节点池 |
| [deck-component.ts](assets/scripts/ui/components/deck-component.ts) | 牌堆组件 |
| [game-board.ts](assets/scripts/ui/components/game-board.ts) | 游戏面板 |
| [game-message.ts](assets/scripts/ui/components/game-message.ts) | 游戏消息组件 |
| [player-hand.ts](assets/scripts/ui/components/player-hand.ts) | 玩家手牌组件 |
| [player-indicator.ts](assets/scripts/ui/components/player-indicator.ts) | 玩家指示器 |
| [ui-manager.ts](assets/scripts/ui/components/ui-manager.ts) | UI 管理器 |

### listeners/
| 文件 | 说明 |
|------|------|
| [ui-game-events.ts](assets/scripts/ui/listeners/ui-game-events.ts) | UI 游戏事件监听器 |

---

## 统计

| 层级 | 文件数 |
|------|--------|
| Core Layer | 10 |
| Foundation Layer | 7 |
| UI Layer | 8 |
| **总计** | **25** |
