/**
 * AI玩家策略 - 纯函数
 */

import {
    Card,
    CardColor,
    Player,
    PlayerType,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';

/** AI决策结果 */
export interface AIAction {
    action: 'play' | 'draw';
    card?: Card;
    chosenColor?: CardColor;
}

/** 选择最佳颜色(玩家手牌中最多颜色) */
export function selectBestColor(player: Player): CardColor {
    const colorCounts: Record<CardColor, number> = {
        [CardColor.RED]: 0,
        [CardColor.YELLOW]: 0,
        [CardColor.GREEN]: 0,
        [CardColor.BLUE]: 0,
    };

    for (const card of player.hand) {
        if (card.color) {
            colorCounts[card.color]++;
        }
    }

    let bestColor = CardColor.RED;
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
            maxCount = count;
            bestColor = color as CardColor;
        }
    }
    return bestColor;
}

/** 判断卡牌是否可以打出(考虑pending计数) */
export function canPlayCard(
    card: Card,
    topCard: TopCard,
    pendingDraw2Count: number,
    pendingDraw4Count: number
): boolean {
    if (card.type === UnoCardType.WILD) {
        return true;
    }

    if (card.type === UnoCardType.WILD_DRAW_4) {
        return pendingDraw4Count > 0;
    }

    if (pendingDraw2Count > 0) {
        return card.type === UnoCardType.DRAW_2;
    }

    if (card.color !== topCard.activeColor) {
        if (
            card.type === UnoCardType.NUMBER &&
            topCard.card.type === UnoCardType.NUMBER
        ) {
            return card.value === topCard.card.value;
        }
        return false;
    }
    return true;
}

/** 获取卡牌优先级 */
function getCardPriority(card: Card): number {
    switch (card.type) {
        case UnoCardType.DRAW_2:
            return 100;
        case UnoCardType.REVERSE:
            return 90;
        case UnoCardType.SKIP:
            return 80;
        case UnoCardType.WILD:
            return 70;
        case UnoCardType.WILD_DRAW_4:
            return 60;
        case UnoCardType.NUMBER:
            return card.value !== null ? card.value : 0;
        default:
            return 0;
    }
}

/** 检查是否有非+4的可出牌 */
function hasNonWildDraw4Playable(
    player: Player,
    topCard: TopCard
): boolean {
    for (const card of player.hand) {
        if (card.type === UnoCardType.WILD_DRAW_4) continue;
        if (canPlayCard(card, topCard, 0, 0)) return true;
    }
    return false;
}

/** AI决策 - 根据当前局面决定行动 */
export function decideAIAction(
    player: Player,
    topCard: TopCard,
    pendingDraw2Count: number,
    pendingDraw4Count: number,
    _canDrawFreely: boolean
): AIAction {
    if (player.type !== PlayerType.AI) {
        return { action: 'draw' };
    }

    const playable: Card[] = [];
    for (const card of player.hand) {
        if (canPlayCard(card, topCard, pendingDraw2Count, pendingDraw4Count)) {
            playable.push(card);
        }
    }

    playable.sort((a, b) => getCardPriority(b) - getCardPriority(a));

    if (playable.length > 0) {
        let bestCard = playable[0];

        if (bestCard.type === UnoCardType.WILD_DRAW_4) {
            if (hasNonWildDraw4Playable(player, topCard)) {
                bestCard = playable[1] || bestCard;
            }
        }

        let chosenColor: CardColor | undefined;
        if (
            bestCard.type === UnoCardType.WILD ||
            bestCard.type === UnoCardType.WILD_DRAW_4
        ) {
            chosenColor = selectBestColor(player);
        }

        return {
            action: 'play',
            card: bestCard,
            chosenColor,
        };
    }

    return { action: 'draw' };
}
