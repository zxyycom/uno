/**
 * 核心游戏逻辑
 * 仅包含纯函数，不持有状态
 */

import {
    Card,
    CardColor,
    GameDirection,
    Player,
    UnoCardType,
} from '../../foundation/types/game.types';

/** 处理出牌效果 */
export function processCardEffect(
    card: Card,
    currentDirection: GameDirection,
    currentActiveColor: CardColor,
    pendingDraw2Count: number,
    pendingDraw4Count: number
): {
    newDirection: GameDirection;
    newActiveColor: CardColor;
    newPendingDraw2Count: number;
    newPendingDraw4Count: number;
    skipNextPlayer: boolean;
    mustDraw: boolean;
    drawCount: number;
} {
    let newDirection = currentDirection;
    let newActiveColor = currentActiveColor;
    let newPendingDraw2Count = pendingDraw2Count;
    let newPendingDraw4Count = pendingDraw4Count;
    let skipNextPlayer = false;
    let mustDraw = false;
    let drawCount = 0;

    switch (card.type) {
        case UnoCardType.REVERSE:
            newDirection =
                currentDirection === GameDirection.CLOCKWISE
                    ? GameDirection.COUNTERCLOCKWISE
                    : GameDirection.CLOCKWISE;
            break;

        case UnoCardType.SKIP:
            skipNextPlayer = true;
            break;

        case UnoCardType.DRAW_2:
            if (card.color === currentActiveColor) {
                newPendingDraw2Count += 2;
                mustDraw = true;
                drawCount = 2;
            }
            break;

        case UnoCardType.WILD:
            break;

        case UnoCardType.WILD_DRAW_4:
            newPendingDraw4Count += 4;
            mustDraw = true;
            drawCount = 4;
            break;

        case UnoCardType.NUMBER:
            if (card.color) {
                newActiveColor = card.color;
            }
            break;
    }

    return {
        newDirection,
        newActiveColor,
        newPendingDraw2Count,
        newPendingDraw4Count,
        skipNextPlayer,
        mustDraw,
        drawCount,
    };
}

/** 检查游戏是否结束(有玩家手牌为空) */
export function checkGameOver(players: Player[]): Player | null {
    for (const player of players) {
        if (player.hand.length === 0) {
            return player;
        }
    }
    return null;
}

/** 判断是否需要呼叫UNO */
export function needsUnoCall(player: Player): boolean {
    return player.hand.length === 1 && !player.calledUno;
}
