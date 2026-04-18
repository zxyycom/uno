/**
 * AI玩家策略逻辑
 */

import {
    Card,
    CardColor,
    Player,
    PlayerType,
    TopCard,
    UnoCardType,
} from '../types/game.types';

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
    // 万能牌随时可出
    if (card.type === UnoCardType.WILD) {
        return true;
    }

    // +4万能牌如果有pending必须出
    if (card.type === UnoCardType.WILD_DRAW_4) {
        return pendingDraw4Count > 0;
    }

    // 如果有待抽牌，必须出对应功能的牌
    if (pendingDraw2Count > 0) {
        return card.type === UnoCardType.DRAW_2;
    }

    // 颜色必须匹配
    if (card.color !== topCard.activeColor) {
        // 数字牌可以匹配数值
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

/** 获取可出的牌并按优先级排序 */
function getPlayableCardsSorted(
    player: Player,
    topCard: TopCard,
    pendingDraw2Count: number,
    pendingDraw4Count: number
): Card[] {
    const playable: Card[] = [];

    for (const card of player.hand) {
        if (canPlayCard(card, topCard, pendingDraw2Count, pendingDraw4Count)) {
            playable.push(card);
        }
    }

    // 按优先级排序: +2 > Reverse > Skip > 万能 > +4 > 数字牌
    return playable.sort((a, b) => {
        return getCardPriority(b) - getCardPriority(a);
    });
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
function hasNonWildDraw4Playable(player: Player, topCard: TopCard): boolean {
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
    // 确保是AI玩家
    if (player.type !== PlayerType.AI) {
        return { action: 'draw' };
    }

    // 获取可出的牌
    const playableCards = getPlayableCardsSorted(
        player,
        topCard,
        pendingDraw2Count,
        pendingDraw4Count
    );

    if (playableCards.length > 0) {
        // 过滤掉+4(如果有其他可出的牌)
        let bestCard = playableCards[0];

        if (bestCard.type === UnoCardType.WILD_DRAW_4) {
            if (hasNonWildDraw4Playable(player, topCard)) {
                // 有其他可出的牌，不出+4，选择第二优的牌
                bestCard = playableCards[1] || bestCard;
            }
        }

        let chosenColor: CardColor | undefined;

        // 万能牌需要选择颜色
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

    // 没有可出的牌，选择摸牌
    return { action: 'draw' };
}
