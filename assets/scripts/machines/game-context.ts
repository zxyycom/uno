/**
 * 游戏状态机上下文与类型定义
 */

import { Actor, Card, CardColor,GameConfig, GameDirection, Player } from '../types/game.types';

/** 游戏状态机上下文 */
export interface GameContext {
    /** 玩家列表 */
    players: Player[];
    /** 当前玩家索引 */
    currentPlayerIndex: number;
    /** 牌堆 */
    deck: Card[];
    /** 弃牌堆 */
    discardPile: Card[];
    /** 游戏方向 */
    direction: GameDirection;
    /** 当前生效颜色(万能牌后) */
    activeColor: CardColor;
    /** +2连续计数 */
    pendingDraw2Count: number;
    /** +4连续计数 */
    pendingDraw4Count: number;
    /** 游戏配置 */
    config: GameConfig;
    /** 回合超时计时器ID */
    timeoutTimerId?: number;
    /** 是否可以自由摸牌 */
    canDrawFreely: boolean;
}

/** 游戏状态机事件 */
export type GameMachineEvent =
    | { type: 'START_GAME'; playerCount: number; aiCount: number }
    | { type: 'DEAL_COMPLETE' }
    | { type: 'PLAY_CARD'; playerId: string; cardId: string; chosenColor?: CardColor }
    | { type: 'DRAW_CARD'; playerId: string }
    | { type: 'TURN_TIMEOUT' }
    | { type: 'CALL_UNO'; playerId: string }
    | { type: 'UNO_PENALTY'; playerId: string }
    | { type: 'RESET' };

/** 创建初始上下文 */
export function createInitialContext(config: GameConfig = {
    playerCount: 1,
    aiCount: 1,
    timeoutSeconds: 30,
    dealInterval: 100,
    aiThinkDelay: 1500,
}): GameContext {
    return {
        players: [],
        currentPlayerIndex: 0,
        deck: [],
        discardPile: [],
        direction: GameDirection.CLOCKWISE,
        activeColor: CardColor.RED,
        pendingDraw2Count: 0,
        pendingDraw4Count: 0,
        config,
        canDrawFreely: true,
    };
}
