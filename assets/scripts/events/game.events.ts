import { Card, CardColor, Player } from '../types/game.types';

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

// ==================== Payload 类型 ====================

export interface StartGamePayload {
    playerCount: number;
    aiCount: number;
}

export interface TurnChangedPayload {
    previousPlayerId: string | null;
    currentPlayerId: string;
    currentPlayer: Player;
    direction: 1 | -1;
}

export interface PlayCardPayload {
    playerId: string;
    cardId: string;
    chosenColor?: CardColor;
}

export interface CardPlayedPayload {
    playerId: string;
    cardId: string;
    card: Card;
    newActiveColor?: CardColor;
    isSkipEffect?: boolean;
    isReverseEffect?: boolean;
    isDraw2Effect?: boolean;
    isDraw4Effect?: boolean;
}

export interface DrawCardPayload {
    playerId: string;
    count: number;
}

export interface CardDrawnPayload {
    playerId: string;
    card: Card;
    totalCards?: number;
}

export interface GameOverPayload {
    winnerId: string;
    winnerName: string;
    finalHands: Array<{ playerId: string; cardCount: number }>;
}

export interface CallUnoPayload {
    playerId: string;
    playerName?: string;
}

export interface UnoPenaltyPayload {
    playerId: string;
    penaltyCards: Card[] | number;
}

export interface DirectionChangedPayload {
    previousDirection: 1 | -1;
    newDirection: 1 | -1;
}

export interface PlayerSkippedPayload {
    skippedPlayerId: string;
    skippedPlayerName: string;
}

export interface DrawRequiredPayload {
    targetPlayerId: string;
    cardCount: number;
    reason: 'draw_2' | 'draw_4' | 'penalty' | 'timeout';
}

export interface HandUpdatedPayload {
    playerId: string;
    hand: Card[];
    cardCount: number;
}

export interface DeckUpdatedPayload {
    remainingCards: number;
}

export interface DiscardUpdatedPayload {
    topCard: Card;
    discardCount: number;
}

export interface CurrentPlayerUpdatedPayload {
    playerId: string;
    playerName: string;
    isHuman: boolean;
}

export interface TurnStartedPayload {
    playerId: string;
    playerName: string;
    isHuman: boolean;
}

export interface TimeoutWarningPayload {
    playerId: string;
    remainingSeconds: number;
}

export interface TimeoutExpiredPayload {
    playerId: string;
}

// ==================== 事件映射 ====================

export interface GameEvents {
    [GameEventType.START_GAME]: [payload: StartGamePayload];
    [GameEventType.GAME_OVER]: [payload: GameOverPayload];
    [GameEventType.RESET_GAME]: [];
    [GameEventType.DEAL_START]: [];
    [GameEventType.DEAL_COMPLETE]: [];
    [GameEventType.TURN_STARTED]: [payload: TurnStartedPayload];
    [GameEventType.TURN_CHANGED]: [payload: TurnChangedPayload];
    [GameEventType.TURN_TIMEOUT]: [];
    [GameEventType.TIMEOUT_WARNING]: [payload: TimeoutWarningPayload];
    [GameEventType.TIMEOUT_EXPIRED]: [payload: TimeoutExpiredPayload];
    [GameEventType.PLAY_CARD]: [payload: PlayCardPayload];
    [GameEventType.DRAW_CARD]: [payload: DrawCardPayload];
    [GameEventType.CARD_PLAYED]: [payload: CardPlayedPayload];
    [GameEventType.CARD_DRAWN]: [payload: CardDrawnPayload];
    [GameEventType.CALL_UNO]: [payload: CallUnoPayload];
    [GameEventType.UNO_PENALTY]: [payload: UnoPenaltyPayload];
    [GameEventType.DIRECTION_CHANGED]: [payload: DirectionChangedPayload];
    [GameEventType.PLAYER_SKIPPED]: [payload: PlayerSkippedPayload];
    [GameEventType.DRAW_REQUIRED]: [payload: DrawRequiredPayload];
    [GameEventType.HAND_UPDATED]: [payload: HandUpdatedPayload];
    [GameEventType.DECK_UPDATED]: [payload: DeckUpdatedPayload];
    [GameEventType.DISCARD_UPDATED]: [payload: DiscardUpdatedPayload];
    [GameEventType.CURRENT_PLAYER_UPDATED]: [
        payload: CurrentPlayerUpdatedPayload,
    ];
}
