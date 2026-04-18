/**
 * UNO卡牌资源管理
 * 负责卡牌Sprite资源的加载与key生成
 */

import { resources, SpriteFrame } from 'cc';

import { Card, CardColor, UnoCardType } from '../types/game.types';

// 资源路径前缀
const SPRITE_PATH_PREFIX = 'image/';

/**
 * 根据卡牌参数获取精灵图路径
 * @param color 卡牌颜色
 * @param type 卡牌类型
 * @param value 数值（数字牌使用）
 * @returns 精灵图路径
 */
export function getSpriteName(
    color: CardColor,
    type: UnoCardType,
    value: number | null
): string {
    if (type === UnoCardType.WILD || type === UnoCardType.WILD_DRAW_4) {
        return type === UnoCardType.WILD_DRAW_4 ? 'Wild_Draw' : 'Wild';
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

/**
 * 根据卡牌获取Sprite资源路径key
 * @param card 卡牌
 * @returns 资源路径key (不含扩展名)，用于resources.load
 */
export function getCardSpriteKey(card: Card): string {
    return `${SPRITE_PATH_PREFIX}${getSpriteName(
        card.color ?? CardColor.RED,
        card.type,
        card.value
    )}`;
}

/**
 * 加载卡牌SpriteFrame（异步）
 * @param card 卡牌
 * @returns Promise<SpriteFrame | null>
 */
export function loadCardSprite(card: Card): Promise<SpriteFrame | null> {
    return new Promise((resolve) => {
        const spriteKey = getCardSpriteKey(card);

        resources.load(spriteKey, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.warn(
                    `[DeckResources] Failed to load sprite: ${spriteKey}`,
                    err
                );
                resolve(null);
                return;
            }
            resolve(spriteFrame as SpriteFrame);
        });
    });
}

/**
 * 批量预加载卡牌资源
 * @param cards 卡牌数组
 */
export function preloadCardSprites(cards: Card[]): void {
    const uniqueKeys = new Set<string>();

    for (const card of cards) {
        uniqueKeys.add(getCardSpriteKey(card));
    }

    for (const key of uniqueKeys) {
        resources.load(key, SpriteFrame, (err) => {
            if (err) {
                console.warn(`[DeckResources] Preload failed: ${key}`, err);
            }
        });
    }
}
