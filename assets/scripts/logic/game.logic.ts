/**
 * 核心游戏逻辑
 * 封装游戏状态的修改操作
 */

import { Card, CardColor, GameConfig,GameDirection, Player, PlayerType, UnoCardType } from '../types/game.types';
import { TopCard } from '../types/game.types';
import { createDeck, shuffle } from './deck.logic';

/** 初始化游戏 */
export function initializeGame(config: GameConfig): {
    players: Player[];
    deck: Card[];
    discardPile: Card[];
} {
    const players: Player[] = [];

    // 创建人类玩家
    players.push({
        id: 'player_0',
        name: '你',
        type: PlayerType.HUMAN,
        hand: [],
        calledUno: false,
    });

    // 创建AI玩家
    for (let i = 1; i <= config.aiCount; i++) {
        players.push({
            id: `ai_${i}`,
            name: `AI玩家${i}`,
            type: PlayerType.AI,
            hand: [],
            calledUno: false,
        });
    }

    // 生成并洗牌
    const deck = shuffle(createDeck());
    const discardPile: Card[] = [];

    return { players, deck, discardPile };
}

/** 发牌给玩家 */
export function dealCardsToPlayer(
    player: Player,
    deck: Card[],
    count: number,
): { player: Player; deck: Card[] } {
    const drawnCards = deck.slice(0, count);
    return {
        player: {
            ...player,
            hand: [...player.hand, ...drawnCards],
        },
        deck: deck.slice(count),
    };
}

/** 初始发牌(每人7张) */
export function dealInitialCards(
    players: Player[],
    deck: Card[],
): { players: Player[]; deck: Card[] } {
    const updatedPlayers = players.map((player) => ({
        ...player,
        hand: deck.slice(0, 7),
    }));
    return {
        players: updatedPlayers,
        deck: deck.slice(7 * players.length),
    };
}

/** 从弃牌堆获取顶牌 */
export function getTopCard(discardPile: Card[]): TopCard {
    const top = discardPile[discardPile.length - 1];
    return {
        card: top,
        activeColor: top.color || CardColor.RED,
        draw2Count: 0,
        draw4Count: 0,
    };
}

/** 玩家出一张牌 */
export function playCard(
    player: Player,
    cardId: string,
    chosenColor: CardColor | undefined,
): { player: Player; card: Card } | null {
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
        return null;
    }

    const card = player.hand[cardIndex];
    const newHand = [...player.hand];
    newHand.splice(cardIndex, 1);

    // 更新万能牌颜色
    if (card.type === UnoCardType.WILD || card.type === UnoCardType.WILD_DRAW_4) {
        card.color = chosenColor || CardColor.RED;
    }

    return {
        player: { ...player, hand: newHand },
        card,
    };
}

/** 计算下一个玩家索引 */
export function getNextPlayerIndex(
    currentIndex: number,
    playerCount: number,
    direction: GameDirection,
): number {
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) {
        nextIndex = playerCount - 1;
    } else if (nextIndex >= playerCount) {
        nextIndex = 0;
    }
    return nextIndex;
}

/** 处理出牌效果 */
export function processCardEffect(
    card: Card,
    currentDirection: GameDirection,
    currentActiveColor: CardColor,
    pendingDraw2Count: number,
    pendingDraw4Count: number,
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
            newDirection = currentDirection === GameDirection.CLOCKWISE
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
            // 颜色由玩家选择
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
