/**
 * AI玩家策略逻辑
 */

import { Card, CardColor, Player, PlayerType,UnoCardType } from '../types/game.types';
import { TopCard } from '../types/game.types';

/** AI决策结果 */
export interface AIAction {
    action: 'play' | 'draw';
    cardId?: string;
    chosenColor?: CardColor;
}

/** 选择最佳颜色(玩家手牌中最多颜色) */
function selectBestColor(player: Player): CardColor {
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

/** 获取可出的牌并按优先级排序 */
function getPlayableCardsSorted(player: Player, topCard: TopCard): Card[] {
    const playable: Card[] = [];

    for (const card of player.hand) {
        if (canPlayCard(card, topCard)) {
            playable.push(card);
        }
    }

    // 按优先级排序: 功能牌 > 数字牌
    return playable.sort((a, b) => {
        const priorityA = getCardPriority(a);
        const priorityB = getCardPriority(b);
        return priorityB - priorityA;
    });
}

/** 获取卡牌优先级 */
function getCardPriority(card: Card): number {
    // 高优先级: 功能牌
    if (card.type === UnoCardType.DRAW_2) return 100;
    if (card.type === UnoCardType.REVERSE) return 90;
    if (card.type === UnoCardType.SKIP) return 80;
    if (card.type === UnoCardType.WILD) return 70;
    if (card.type === UnoCardType.WILD_DRAW_4) return 60;
    // 低优先级: 数字牌(大数字优先出)
    if (card.type === UnoCardType.NUMBER && card.value !== null) {
        return card.value;
    }
    return 0;
}

/** 判断卡牌是否可以打出 */
function canPlayCard(card: Card, topCard: TopCard): boolean {
    // 万能牌随时可出
    if (card.type === UnoCardType.WILD || card.type === UnoCardType.WILD_DRAW_4) {
        return true;
    }

    // 颜色必须匹配
    if (card.color !== topCard.activeColor) {
        // 数字牌可以匹配数值
        if (card.type === UnoCardType.NUMBER && topCard.card.type === UnoCardType.NUMBER) {
            return card.value === topCard.card.value;
        }
        return false;
    }
    return true;
}

/** AI决策 - 根据当前局面决定行动 */
export function decideAIAction(
    player: Player,
    topCard: TopCard,
    _pendingDraw2Count: number,
    _pendingDraw4Count: number,
    _canDrawFreely: boolean,
): AIAction {
    // 确保是AI玩家
    if (player.type !== PlayerType.AI) {
        return { action: 'draw' };
    }

    // 检查是否有可出的牌
    const playableCards = getPlayableCardsSorted(player, topCard);

    if (playableCards.length > 0) {
        const bestCard = playableCards[0];
        let chosenColor: CardColor | undefined;

        // 万能牌需要选择颜色
        if (bestCard.type === UnoCardType.WILD || bestCard.type === UnoCardType.WILD_DRAW_4) {
            chosenColor = selectBestColor(player);
        }

        return {
            action: 'play',
            cardId: bestCard.id,
            chosenColor,
        };
    }

    // 没有可出的牌，选择摸牌
    return { action: 'draw' };
}

/** AI是否应该呼叫UNO */
export function shouldAI_CALL_UNO(player: Player): boolean {
    return player.hand.length === 1 && !player.calledUno;
}
