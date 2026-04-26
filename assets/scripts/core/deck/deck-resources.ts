/**
 * UNO卡牌资源管理
 * 负责卡牌Sprite资源的加载与key生成
 */

import { AssetManager, assetManager, SpriteFrame } from 'cc';

import {
    Card,
    CardColor,
    UnoCardType,
} from '../../foundation/types/game.types';

const BUNDLE_NAME = 'res';

let _bundleCache: AssetManager.Bundle | null = null;
let _loadingPromise: Promise<AssetManager.Bundle | null> | null = null;

async function loadResBundle(): Promise<AssetManager.Bundle | null> {
    if (_bundleCache) {
        return _bundleCache;
    }

    if (_loadingPromise) {
        return _loadingPromise;
    }

    _loadingPromise = new Promise((resolve) => {
        assetManager.loadBundle(BUNDLE_NAME, (err, bundle) => {
            if (err) {
                console.warn(
                    `[DeckResources] Failed to load bundle: ${BUNDLE_NAME}`,
                    err
                );
                _loadingPromise = null;
                resolve(null);
                return;
            }
            _bundleCache = bundle;
            _loadingPromise = null;
            resolve(bundle);
        });
    });

    return _loadingPromise;
}

// 资源路径前缀
const SPRITE_PATH_PREFIX = 'image/h200/';
// 图片资源后缀
const SPRITE_PATH_SUFFIX = '/spriteFrame';

/**
 * 根据卡牌参数获取精灵图路径
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
 */
function getCardSpriteKey(card: Card): string {
    return (
        SPRITE_PATH_PREFIX +
        getSpriteName(card.color ?? CardColor.RED, card.type, card.value) +
        SPRITE_PATH_SUFFIX
    );
}

/**
 * 加载卡牌SpriteFrame（异步）
 */
export async function loadCardSprite(card: Card): Promise<SpriteFrame | null> {
    const spriteKey = getCardSpriteKey(card);
    const bundle = await loadResBundle();

    if (!bundle) {
        console.warn(`[DeckResources] Bundle "${BUNDLE_NAME}" not found`);
        return null;
    }

    return new Promise((resolve) => {
        bundle.load(spriteKey, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.warn(
                    `[DeckResources] Failed to load sprite: ${spriteKey}`,
                    err
                );
                resolve(null);
                return;
            }
            resolve(spriteFrame);
        });
    });
}

/**
 * 批量预加载卡牌资源
 */
export async function preloadCardSprites(cards: Card[]): Promise<void> {
    const bundle = await loadResBundle();
    if (!bundle) {
        console.warn(`[DeckResources] Bundle "${BUNDLE_NAME}" not found`);
        return;
    }

    const uniqueKeys = new Set<string>();

    for (const card of cards) {
        uniqueKeys.add(getCardSpriteKey(card));
    }

    for (const key of uniqueKeys) {
        bundle.load(key, SpriteFrame, (err) => {
            if (err) {
                console.warn(`[DeckResources] Preload failed: ${key}`, err);
            }
        });
    }
}
