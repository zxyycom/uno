/**
 * 卡牌精灵图资源名与资源 key 解析
 * 纯函数：根据 Card 推导卡牌图片资源标识，不涉及 Cocos 资源加载。
 */

import {
    Card,
    CardColor,
    UnoCardType,
} from '../../foundation/types/game.types';

const COLOR_NAME_MAP: Record<CardColor, string> = {
    [CardColor.RED]: 'Red',
    [CardColor.YELLOW]: 'Yellow',
    [CardColor.GREEN]: 'Green',
    [CardColor.BLUE]: 'Blue',
};

const SPECIAL_TYPE_SUFFIX: Record<string, string> = {
    [UnoCardType.REVERSE]: 'Reverse',
    [UnoCardType.SKIP]: 'Skip',
    [UnoCardType.DRAW_2]: 'Draw',
};

const SPRITE_PATH_PREFIX = 'image/h200/';
const SPRITE_PATH_SUFFIX = '/spriteFrame';

/**
 * 根据 Card 获取卡牌精灵图资源名。
 * 万能牌不读取 color，彩色牌使用 card.color!（规则保证必不为 null）。
 */
export function getCardSpriteName(card: Card): string {
    if (card.type === UnoCardType.WILD) {
        return 'Wild';
    }
    if (card.type === UnoCardType.WILD_DRAW_4) {
        return 'Wild_Draw';
    }

    const colorPrefix = COLOR_NAME_MAP[card.color!];

    if (card.type === UnoCardType.NUMBER) {
        return `${colorPrefix}_${card.value!}`;
    }

    return `${colorPrefix}_${SPECIAL_TYPE_SUFFIX[card.type]}`;
}

/**
 * 根据 Card 获取卡牌精灵图资源 key（bundle 内加载路径）。
 */
export function getCardSpriteKey(card: Card): string {
    return SPRITE_PATH_PREFIX + getCardSpriteName(card) + SPRITE_PATH_SUFFIX;
}
