/**
 * 卡牌合法性校验
 * 负责校验卡牌是否符合 UNO 规则（颜色/类型匹配）
 */

import {
    Card,
    Player,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';

/** 校验卡牌是否在玩家手牌中 */
export function validateCardInHand(cardId: string, player: Player): boolean {
    return player.hand.some((c) => c.id === cardId);
}

/** 获取玩家可出的牌 */
export function getPlayableCards(player: Player, topCard: TopCard): Card[] {
    return player.hand.filter((card) => validateCanPlayCard(card, topCard));
}

/** 校验卡牌是否可以打出（与桌面 topCard 匹配） */
export function validateCanPlayCard(card: Card, topCard: TopCard): boolean {
    const topType = topCard.card.type;
    const cardType = card.type;

    // 加牌只能接加牌
    if (topType === UnoCardType.WILD_DRAW_4 || topType === UnoCardType.DRAW_2) {
        return (
            cardType === UnoCardType.WILD_DRAW_4 ||
            cardType === UnoCardType.DRAW_2
        );
    }

    // 颜色匹配
    if (card.color === topCard.activeColor) {
        return true;
    }

    // 类型匹配（非数字牌，如 REVERSE、SKIP）
    if (card.type === topType && topType !== UnoCardType.NUMBER) {
        return true;
    }

    // 数字牌：数值匹配
    if (
        card.type === UnoCardType.NUMBER &&
        topType === UnoCardType.NUMBER &&
        card.value === topCard.card.value
    ) {
        return true;
    }

    return false;
}
