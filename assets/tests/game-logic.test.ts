/**
 * UNO游戏逻辑单元测试
 * 纯逻辑测试，不依赖Cocos运行时
 */

import { describe, expect, it } from 'vitest';

import { createDeck, shuffle } from '../logic/deck.logic';
import {
    Card,
    CardColor,
    Player,
    PlayerType,
    UnoCardType,
} from '../types/game.types';
import {
    getPlayableCards,
    validateCanPlayCard,
    validateCardInHand,
} from '../validators/input-validator';

/** 创建测试用卡牌 */
function createCard(
    type: UnoCardType,
    color: CardColor | null = CardColor.RED,
    value: number | null = null
): Card {
    return {
        id: `test_${type}_${color}_${value}_${Date.now()}`,
        type,
        color,
        value,
        spriteName: 'test',
    };
}

/** 创建测试用玩家 */
function createPlayer(id: string, hand: Card[]): Player {
    return {
        id,
        name: id,
        type: PlayerType.HUMAN,
        hand,
        calledUno: false,
    };
}

/** 创建测试用顶牌 */
function createTopCard(
    card: Card,
    activeColor: CardColor = card.color || CardColor.RED
) {
    return {
        card,
        activeColor,
        draw2Count: 0,
        draw4Count: 0,
    };
}

describe('UNO卡组生成', () => {
    it('应该生成108张卡牌', () => {
        const deck = createDeck();
        expect(deck.length).toBe(108);
    });

    it('应该包含4种颜色', () => {
        const deck = createDeck();
        const colors = new Set(
            deck.map((c) => c.color).filter((c) => c !== null)
        );
        expect(colors.size).toBe(4);
    });

    it('数字牌0每种颜色只有一张', () => {
        const deck = createDeck();
        const zeroCards = deck.filter(
            (c) => c.type === UnoCardType.NUMBER && c.value === 0
        );
        expect(zeroCards.length).toBe(4);
    });

    it('数字牌1-9每种颜色有两张', () => {
        const deck = createDeck();
        for (let v = 1; v <= 9; v++) {
            const cards = deck.filter(
                (c) => c.type === UnoCardType.NUMBER && c.value === v
            );
            expect(cards.length).toBe(8);
        }
    });

    it('洗牌后数量不变', () => {
        const deck = createDeck();
        const shuffled = shuffle([...deck]);
        expect(shuffled.length).toBe(deck.length);
    });
});

describe('卡牌校验', () => {
    describe('validateCardInHand', () => {
        it('在手牌中找到卡牌', () => {
            const card = createCard(UnoCardType.NUMBER, CardColor.RED, 5);
            const player = createPlayer('p1', [card]);
            const result = validateCardInHand(card.id, player);
            expect(result.valid).toBe(true);
        });

        it('找不到不在手牌的卡牌', () => {
            const player = createPlayer('p1', []);
            const result = validateCardInHand('non_existent', player);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('CARD_NOT_IN_HAND');
        });
    });

    describe('validateCanPlayCard - 颜色匹配', () => {
        it('同色卡牌可以打出', () => {
            const topCard = createTopCard(
                createCard(UnoCardType.NUMBER, CardColor.RED, 5)
            );
            const playCard = createCard(UnoCardType.NUMBER, CardColor.RED, 3);
            const result = validateCanPlayCard(playCard, topCard, 0, 0);
            expect(result.valid).toBe(true);
        });

        it('异色卡牌不能打出', () => {
            const topCard = createTopCard(
                createCard(UnoCardType.NUMBER, CardColor.RED, 5)
            );
            const playCard = createCard(UnoCardType.NUMBER, CardColor.BLUE, 3);
            const result = validateCanPlayCard(playCard, topCard, 0, 0);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('COLOR_MISMATCH');
        });
    });

    describe('validateCanPlayCard - 万能牌', () => {
        it('万能牌任何时候都可以打出', () => {
            const topCard = createTopCard(
                createCard(UnoCardType.NUMBER, CardColor.RED, 5)
            );
            const playCard = createCard(UnoCardType.WILD);
            const result = validateCanPlayCard(playCard, topCard, 0, 0);
            expect(result.valid).toBe(true);
        });

        it('+4万能牌任何时候都可以打出', () => {
            const topCard = createTopCard(
                createCard(UnoCardType.NUMBER, CardColor.RED, 5)
            );
            const playCard = createCard(UnoCardType.WILD_DRAW_4);
            const result = validateCanPlayCard(playCard, topCard, 0, 0);
            expect(result.valid).toBe(true);
        });
    });
});

describe('getPlayableCards', () => {
    it('返回可出的卡牌列表', () => {
        const topCard = createTopCard(
            createCard(UnoCardType.NUMBER, CardColor.RED, 5)
        );
        const cards = [
            createCard(UnoCardType.NUMBER, CardColor.RED, 3),
            createCard(UnoCardType.NUMBER, CardColor.BLUE, 3),
            createCard(UnoCardType.WILD),
        ];
        const result = getPlayableCards(cards, topCard, 0, 0);
        expect(result.length).toBe(2);
    });
});
