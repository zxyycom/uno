/**
 * UNO游戏事件定义
 * 所有游戏内的关键事件都在此定义
 */

import { Card, CardColor, Player } from '../types/game.types';

/** 游戏核心事件枚举 */
export enum GameEventType {
    // === 游戏流程事件 ===
    START_GAME = 'START_GAME',
    GAME_OVER = 'GAME_OVER',
    RESET_GAME = 'RESET_GAME',

    // === 发牌事件 ===
    DEAL_START = 'DEAL_START',
    DEAL_COMPLETE = 'DEAL_COMPLETE',

    // === 回合事件 ===
    TURN_STARTED = 'TURN_STARTED',
    TURN_CHANGED = 'TURN_CHANGED',
    TURN_TIMEOUT = 'TURN_TIMEOUT',
    TIMEOUT_WARNING = 'TIMEOUT_WARNING',
    TIMEOUT_EXPIRED = 'TIMEOUT_EXPIRED',

    // === 卡牌操作事件 ===
    PLAY_CARD = 'PLAY_CARD',
    DRAW_CARD = 'DRAW_CARD',
    CARD_PLAYED = 'CARD_PLAYED',
    CARD_DRAWN = 'CARD_DRAWN',

    // === UNO相关事件 ===
    CALL_UNO = 'CALL_UNO',
    UNO_PENALTY = 'UNO_PENALTY',

    // === 特殊卡牌效果事件 ===
    DIRECTION_CHANGED = 'DIRECTION_CHANGED',
    PLAYER_SKIPPED = 'PLAYER_SKIPPED',
    DRAW_REQUIRED = 'DRAW_REQUIRED',

    // === 状态更新事件 ===
    HAND_UPDATED = 'HAND_UPDATED',
    DECK_UPDATED = 'DECK_UPDATED',
    DISCARD_UPDATED = 'DISCARD_UPDATED',
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

/** 回合变化事件 */
export interface TurnChangedEvent extends GameEvent {
    type: GameEventType.TURN_CHANGED;
    payload: {
        previousPlayerId: string | null;
        currentPlayerId: string;
        currentPlayer: Player;
        direction: 1 | -1;
    };
}

/** 玩家出牌事件 */
export interface PlayCardEvent extends GameEvent {
    type: GameEventType.PLAY_CARD;
    payload: {
        playerId: string;
        cardId: string;
        chosenColor?: CardColor;
    };
}

/** 卡牌已打出事件 */
export interface CardPlayedEvent extends GameEvent {
    type: GameEventType.CARD_PLAYED;
    payload: {
        playerId: string;
        card: Card;
        newActiveColor: CardColor;
        isSkipEffect: boolean;
        isReverseEffect: boolean;
        isDraw2Effect: boolean;
        isDraw4Effect: boolean;
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

/** 卡牌已摸取事件 */
export interface CardDrawnEvent extends GameEvent {
    type: GameEventType.CARD_DRAWN;
    payload: {
        playerId: string;
        card: Card;
        totalCards: number;
    };
}

/** 游戏结束事件 */
export interface GameOverEvent extends GameEvent {
    type: GameEventType.GAME_OVER;
    payload: {
        winnerId: string;
        winnerName: string;
        finalHands: Array<{ playerId: string; cardCount: number }>;
    };
}

/** 呼叫UNO事件 */
export interface CallUnoEvent extends GameEvent {
    type: GameEventType.CALL_UNO;
    payload: {
        playerId: string;
        playerName: string;
    };
}

/** UNO惩罚事件 */
export interface UnoPenaltyEvent extends GameEvent {
    type: GameEventType.UNO_PENALTY;
    payload: {
        playerId: string;
        penaltyCards: Card[];
    };
}

/** 方向改变事件 */
export interface DirectionChangedEvent extends GameEvent {
    type: GameEventType.DIRECTION_CHANGED;
    payload: {
        previousDirection: 1 | -1;
        newDirection: 1 | -1;
    };
}

/** 玩家被跳过事件 */
export interface PlayerSkippedEvent extends GameEvent {
    type: GameEventType.PLAYER_SKIPPED;
    payload: {
        skippedPlayerId: string;
        skippedPlayerName: string;
    };
}

/** 抽牌要求事件 */
export interface DrawRequiredEvent extends GameEvent {
    type: GameEventType.DRAW_REQUIRED;
    payload: {
        targetPlayerId: string;
        cardCount: number;
        reason: 'draw_2' | 'draw_4' | 'penalty' | 'timeout';
    };
}

/** 手牌更新事件 */
export interface HandUpdatedEvent extends GameEvent {
    type: GameEventType.HAND_UPDATED;
    payload: {
        playerId: string;
        hand: Card[];
        cardCount: number;
    };
}

/** 牌堆更新事件 */
export interface DeckUpdatedEvent extends GameEvent {
    type: GameEventType.DECK_UPDATED;
    payload: {
        remainingCards: number;
    };
}

/** 弃牌堆更新事件 */
export interface DiscardUpdatedEvent extends GameEvent {
    type: GameEventType.DISCARD_UPDATED;
    payload: {
        topCard: Card;
        discardCount: number;
    };
}

/** 当前玩家更新事件 */
export interface CurrentPlayerUpdatedEvent extends GameEvent {
    type: GameEventType.CURRENT_PLAYER_UPDATED;
    payload: {
        playerId: string;
        playerName: string;
        isHuman: boolean;
    };
}

/** 事件总线类型 */
export type EventListener<T = GameEvent> = (event: T) => void;

/** 事件订阅者记录 */
export interface EventSubscription {
    unsubscribe: () => void;
}

/** 所有事件Payload类型联合 */
export type GameEventPayload =
    | StartGameEvent['payload']
    | TurnChangedEvent['payload']
    | PlayCardEvent['payload']
    | CardPlayedEvent['payload']
    | DrawCardEvent['payload']
    | CardDrawnEvent['payload']
    | GameOverEvent['payload']
    | CallUnoEvent['payload']
    | UnoPenaltyEvent['payload']
    | DirectionChangedEvent['payload']
    | PlayerSkippedEvent['payload']
    | DrawRequiredEvent['payload']
    | HandUpdatedEvent['payload']
    | DeckUpdatedEvent['payload']
    | DiscardUpdatedEvent['payload']
    | CurrentPlayerUpdatedEvent['payload']
    | TimeoutWarningEvent['payload']
    | TimeoutExpiredEvent['payload'];

/** 超时警告事件 */
export interface TimeoutWarningEvent extends GameEvent {
    type: GameEventType.TIMEOUT_WARNING;
    payload: {
        playerId: string;
        remainingSeconds: number;
    };
}

/** 超时过期事件 */
export interface TimeoutExpiredEvent extends GameEvent {
    type: GameEventType.TIMEOUT_EXPIRED;
    payload: {
        playerId: string;
    };
}
