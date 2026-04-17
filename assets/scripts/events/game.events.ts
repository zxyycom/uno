/**
 * UNO游戏事件定义
 * 所有游戏内的关键事件都在此定义
 */

/** 游戏核心事件枚举 */
export enum GameEventType {
    // === 游戏流程事件 ===
    /** 开始新游戏 */
    START_GAME = 'START_GAME',
    /** 游戏结束 */
    GAME_OVER = 'GAME_OVER',
    /** 游戏重置 */
    RESET_GAME = 'RESET_GAME',

    // === 发牌事件 ===
    /** 开始发牌 */
    DEAL_START = 'DEAL_START',
    /** 发牌动画完成 */
    DEAL_COMPLETE = 'DEAL_COMPLETE',

    // === 回合事件 ===
    /** 玩家回合开始 */
    TURN_STARTED = 'TURN_STARTED',
    /** 回合超时 */
    TURN_TIMEOUT = 'TURN_TIMEOUT',

    // === 卡牌操作事件 ===
    /** 玩家出牌 */
    PLAY_CARD = 'PLAY_CARD',
    /** 玩家摸牌 */
    DRAW_CARD = 'DRAW_CARD',
    /** 卡牌已打出(处理完成) */
    CARD_PLAYED = 'CARD_PLAYED',
    /** 卡牌已摸取 */
    CARD_DRAWN = 'CARD_DRAWN',

    // === UNO相关事件 ===
    /** 玩家呼叫UNO */
    CALL_UNO = 'CALL_UNO',
    /** 玩家被发现在只剩一张时未呼叫UNO */
    UNO_PENALTY = 'UNO_PENALTY',

    // === 特殊卡牌效果事件 ===
    /** 方向改变 */
    DIRECTION_CHANGED = 'DIRECTION_CHANGED',
    /** 玩家被跳过 */
    PLAYER_SKIPPED = 'PLAYER_SKIPPED',
    /** 需要抽牌 */
    DRAW_REQUIRED = 'DRAW_REQUIRED',

    // === 状态更新事件 ===
    /** 手牌更新 */
    HAND_UPDATED = 'HAND_UPDATED',
    /** 牌堆更新 */
    DECK_UPDATED = 'DECK_UPDATED',
    /** 弃牌堆更新 */
    DISCARD_UPDATED = 'DISCARD_UPDATED',
    /** 当前玩家更新 */
    CURRENT_PLAYER_UPDATED = 'CURRENT_PLAYER_UPDATED',
}

/** 游戏事件基类 */
export interface GameEvent {
    type: GameEventType;
    timestamp: number;
    payload?: unknown;
}

/** 开始游戏事件 */
export interface StartGameEvent extends GameEvent {
    type: GameEventType.START_GAME;
    payload: {
        playerCount: number;
        aiCount: number;
    };
}

/** 玩家出牌事件 */
export interface PlayCardEvent extends GameEvent {
    type: GameEventType.PLAY_CARD;
    payload: {
        playerId: string;
        cardId: string;
        chosenColor?: import('../types/game.types').CardColor;
    };
}

/** 玩家摸牌事件 */
export interface DrawCardEvent extends GameEvent {
    type: GameEventType.DRAW_CARD;
    payload: {
        playerId: string;
        count: number;
    };
}

/** 游戏结束事件 */
export interface GameOverEvent extends GameEvent {
    type: GameEventType.GAME_OVER;
    payload: {
        winnerId: string;
        winnerName: string;
    };
}

/** 玩家被跳过事件 */
export interface PlayerSkippedEvent extends GameEvent {
    type: GameEventType.PLAYER_SKIPPED;
    payload: {
        skippedPlayerId: string;
    };
}

/** 方向改变事件 */
export interface DirectionChangedEvent extends GameEvent {
    type: GameEventType.DIRECTION_CHANGED;
    payload: {
        direction: 1 | -1;
    };
}

/** 抽牌要求事件 */
export interface DrawRequiredEvent extends GameEvent {
    type: GameEventType.DRAW_REQUIRED;
    payload: {
        targetPlayerId: string;
        cardCount: number;
        reason: 'draw_2' | 'draw_4' | 'penalty';
    };
}

/** 玩家输入动作事件 - 来自UI层 */
export interface PlayerActionEvent {
    type: 'PLAYER_ACTION';
    playerId: string;
    action: 'play' | 'draw' | 'uno';
    cardId?: string;
    chosenColor?: import('../types/game.types').CardColor;
}

/** 事件总线类型 */
export type EventListener<T = GameEvent> = (event: T) => void;

/** 事件订阅者记录 */
export interface EventSubscription {
    unsubscribe: () => void;
}
