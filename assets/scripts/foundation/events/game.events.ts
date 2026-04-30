import {
    Card,
    CardColor,
    GamePlayerSetup,
    Player,
    TopCard,
} from '../types/game.types';

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

    // === 卡牌操作事件 ===
    PLAY_CARD = 'PLAY_CARD',
    DRAW_CARD = 'DRAW_CARD',
    CARD_SELECTED = 'CARD_SELECTED',
    CARD_PLAYED = 'CARD_PLAYED',
    CARD_DRAWN = 'CARD_DRAWN',
    CARDS_DRAWN = 'CARDS_DRAWN',

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
    DISCARD_CLEARED = 'DISCARD_CLEARED',
    CURRENT_PLAYER_UPDATED = 'CURRENT_PLAYER_UPDATED',

    // === 倒计时同步 ===
    TURN_TIMER_SYNC = 'TURN_TIMER_SYNC',
}

// ==================== Payload 类型 ====================

/** 游戏开始参数 */
export interface StartGamePayload {
    /** 玩家启动结构列表（已按 seatIndex 排序） */
    players: readonly GamePlayerSetup[];
    /** 本地玩家 ID */
    localPlayerId: string;
}

/** 回合变更参数 */
export interface TurnChangedPayload {
    /** 上一个玩家ID */
    previousPlayerId: string | null;
    /** 当前玩家完整信息 */
    currentPlayer: Player;
    /** 游戏方向：1 正向，-1 反向 */
    direction: 1 | -1;
}

/** 出牌请求参数 */
export interface PlayCardPayload {
    /** 出牌玩家ID */
    playerId: string;
    /** 卡牌ID */
    cardId: string;
    /** 变色卡选择的颜色（仅变色卡需要） */
    chosenColor?: CardColor;
}

/** 卡牌已打出参数 */
export interface CardPlayedPayload {
    /** 出牌玩家 */
    player: Player;
    /** 打出的卡牌 */
    card: Card;
    /** 新的活跃颜色 */
    newActiveColor?: CardColor;
    /** 是否触发跳过效果 */
    isSkipEffect?: boolean;
    /** 是否触发反转效果 */
    isReverseEffect?: boolean;
    /** 是否触发+2效果 */
    isDraw2Effect?: boolean;
    /** 是否触发+4效果 */
    isDraw4Effect?: boolean;
}

/** 卡牌选择参数 */
export interface CardSelectedPayload {
    /** 选择卡牌的玩家ID */
    playerId: string;
    /** 当前选中的卡牌，null 表示取消选择 */
    card: Card | null;
}

/** 摸牌请求参数 */
export interface DrawCardPayload {
    /** 摸牌玩家 */
    player: Player;
    /** 摸牌数量 */
    count: number;
}

/** 单张卡牌摸取参数 */
export interface CardDrawnPayload {
    /** 摸牌玩家 */
    player: Player;
    /** 摸到的卡牌 */
    card: Card;
    /** 摸牌后手牌总数 */
    totalCards?: number;
}

/** 多张卡牌摸取参数 */
export interface CardsDrawnPayload {
    /** 摸牌玩家 */
    player: Player;
    /** 摸到的卡牌列表 */
    cards: Card[];
}

/** 游戏结束参数 */
export interface GameOverPayload {
    /** 获胜玩家完整信息 */
    winner: Player;
    /** 最终手牌信息 */
    finalHands: Array<{ playerId: string; cardCount: number }>;
}

/** 呼叫UNO参数 */
export interface CallUnoPayload {
    /** 呼叫UNO的玩家 */
    player: Player;
}

/** UNO惩罚参数 */
export interface UnoPenaltyPayload {
    /** 受惩罚玩家 */
    player: Player;
    /** 惩罚卡牌列表或数量 */
    penaltyCards: Card[] | number;
}

/** 方向变更参数 */
export interface DirectionChangedPayload {
    /** 变更前的方向 */
    previousDirection: 1 | -1;
    /** 变更后的方向 */
    newDirection: 1 | -1;
}

/** 玩家被跳过参数 */
export interface PlayerSkippedPayload {
    /** 被跳过的玩家 */
    skippedPlayer: Player;
}

/** 需要摸牌参数 */
export interface DrawRequiredPayload {
    /** 目标玩家ID */
    targetPlayerId: string;
    /** 需要摸牌数量 */
    cardCount: number;
    /** 原因 */
    reason: 'draw_2' | 'draw_4' | 'penalty' | 'timeout';
}

/** 手牌更新参数 */
export interface HandUpdatedPayload {
    /** 玩家ID */
    playerId: string;
    /** 完整手牌列表 */
    hand: Card[];
    /** 手牌数量 */
    cardCount: number;
}

/** 牌堆更新参数 */
export interface DeckUpdatedPayload {
    /** 剩余牌数量 */
    remainingCards: number;
}

/** 弃牌堆更新参数 */
export interface DiscardUpdatedPayload {
    /** 顶牌 */
    topCard: Card;
    /** 完整顶牌信息，包含当前生效颜色与叠加摸牌计数 */
    topCardInfo: TopCard;
    /** 弃牌堆数量 */
    discardCount: number;
}

/** 当前玩家更新参数 */
export interface CurrentPlayerUpdatedPayload {
    /** 当前玩家完整信息 */
    player: Player;
}

/** 回合倒计时同步参数 */
export interface TurnTimerSyncPayload {
    playerId: string;
    turn: number;
    remainingSeconds: number;
    totalSeconds: number;
}

/** 回合开始参数 */
export interface TurnStartedPayload {
    /** 当前玩家完整信息 */
    player: Player;
}

// ==================== 事件映射 ====================

export interface GameEvents {
    [key: string]: unknown[];
    [GameEventType.START_GAME]: [payload: StartGamePayload];
    [GameEventType.GAME_OVER]: [payload: GameOverPayload];
    [GameEventType.RESET_GAME]: [];
    [GameEventType.DEAL_START]: [];
    [GameEventType.DEAL_COMPLETE]: [];
    [GameEventType.TURN_STARTED]: [payload: TurnStartedPayload];
    [GameEventType.TURN_CHANGED]: [payload: TurnChangedPayload];
    [GameEventType.PLAY_CARD]: [payload: PlayCardPayload];
    [GameEventType.DRAW_CARD]: [payload: DrawCardPayload];
    [GameEventType.CARD_SELECTED]: [payload: CardSelectedPayload];
    [GameEventType.CARD_PLAYED]: [payload: CardPlayedPayload];
    [GameEventType.CARD_DRAWN]: [payload: CardDrawnPayload];
    [GameEventType.CARDS_DRAWN]: [payload: CardsDrawnPayload];
    [GameEventType.CALL_UNO]: [payload: CallUnoPayload];
    [GameEventType.UNO_PENALTY]: [payload: UnoPenaltyPayload];
    [GameEventType.DIRECTION_CHANGED]: [payload: DirectionChangedPayload];
    [GameEventType.PLAYER_SKIPPED]: [payload: PlayerSkippedPayload];
    [GameEventType.DRAW_REQUIRED]: [payload: DrawRequiredPayload];
    [GameEventType.HAND_UPDATED]: [payload: HandUpdatedPayload];
    [GameEventType.DECK_UPDATED]: [payload: DeckUpdatedPayload];
    [GameEventType.DISCARD_UPDATED]: [payload: DiscardUpdatedPayload];
    [GameEventType.DISCARD_CLEARED]: [];
    [GameEventType.CURRENT_PLAYER_UPDATED]: [
        payload: CurrentPlayerUpdatedPayload,
    ];
    [GameEventType.TURN_TIMER_SYNC]: [payload: TurnTimerSyncPayload];
}
