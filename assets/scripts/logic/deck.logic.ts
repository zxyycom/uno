/**
 * UNO卡组生成与洗牌逻辑
 */

import { Card, CardColor, UnoCardType } from '../types/game.types';

/** 生成唯一ID */
function generateCardId(
    type: string,
    color: string,
    value: number | string
): string {
    return `${type}_${color}_${value}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 根据颜色和类型获取精灵图名称 */
function getSpriteName(
    color: CardColor,
    type: UnoCardType,
    value: number | null
): string {
    if (type === UnoCardType.WILD || type === UnoCardType.WILD_DRAW_4) {
        return 'Wild';
    }

    const colorMap: Record<CardColor, string> = {
        [CardColor.RED]: 'Red',
        [CardColor.YELLOW]: 'Yellow',
        [CardColor.GREEN]: 'Green',
        [CardColor.BLUE]: 'Blue',
    };

    const prefix = colorMap[color];

    if (type === UnoCardType.NUMBER && value !== null) {
        return `${prefix}_${value}`;
    }

    switch (type) {
        case UnoCardType.REVERSE:
            return `${prefix}_Reverse`;
        case UnoCardType.SKIP:
            return `${prefix}_Skip`;
        case UnoCardType.DRAW_2:
            return `${prefix}_Draw`;
        default:
            return `${prefix}_${type}`;
    }
}

/** 创建数字卡牌 */
function createNumberCards(color: CardColor): Card[] {
    const cards: Card[] = [];
    for (let value = 0; value <= 9; value++) {
        // 0只有一张，1-9各两张
        const count = value === 0 ? 1 : 2;
        for (let i = 0; i < count; i++) {
            cards.push({
                id: generateCardId('num', color, value),
                type: UnoCardType.NUMBER,
                color,
                value,
                spriteName: getSpriteName(color, UnoCardType.NUMBER, value),
            });
        }
    }
    return cards;
}

/** 创建颜色功能卡牌 */
function createColorSpecialCards(color: CardColor): Card[] {
    const cards: Card[] = [];
    const specialTypes: UnoCardType[] = [
        UnoCardType.REVERSE,
        UnoCardType.SKIP,
        UnoCardType.DRAW_2,
    ];

    for (const type of specialTypes) {
        // 每种功能牌每种颜色各两张
        for (let i = 0; i < 2; i++) {
            cards.push({
                id: generateCardId('spec', color, type),
                type,
                color,
                value: null,
                spriteName: getSpriteName(color, type, null),
            });
        }
    }
    return cards;
}

/** 创建万能卡牌 */
function createWildCards(): Card[] {
    const cards: Card[] = [];
    // 4张万能牌和4张+4牌
    for (let i = 0; i < 4; i++) {
        cards.push({
            id: generateCardId('wild', 'null', 'wild'),
            type: UnoCardType.WILD,
            color: null,
            value: null,
            spriteName: getSpriteName(CardColor.RED, UnoCardType.WILD, null),
        });
        cards.push({
            id: generateCardId('wild', 'null', 'draw4'),
            type: UnoCardType.WILD_DRAW_4,
            color: null,
            value: null,
            spriteName: getSpriteName(
                CardColor.RED,
                UnoCardType.WILD_DRAW_4,
                null
            ),
        });
    }
    return cards;
}

/** 生成完整UNO牌组(108张) */
export function createDeck(): Card[] {
    const deck: Card[] = [];

    // 每种颜色的数字牌
    const colors = [
        CardColor.RED,
        CardColor.YELLOW,
        CardColor.GREEN,
        CardColor.BLUE,
    ];
    for (const color of colors) {
        deck.push(...createNumberCards(color));
        deck.push(...createColorSpecialCards(color));
    }

    // 万能牌
    deck.push(...createWildCards());

    return deck;
}

/** Fisher-Yates 洗牌算法 */
export function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** 从牌堆抽牌 */
export function drawFromDeck(
    deck: Card[],
    count: number
): { drawn: Card[]; remaining: Card[] } {
    if (deck.length === 0) {
        throw new Error('Deck is empty');
    }
    const drawn = deck.slice(0, count);
    const remaining = deck.slice(count);
    return { drawn, remaining };
}
