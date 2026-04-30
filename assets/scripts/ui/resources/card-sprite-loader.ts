/**
 * 卡牌精灵图异步加载
 * 封装 Cocos AssetManager 的 bundle 与 SpriteFrame 加载。
 * 资源加载失败属于外部运行时边界，返回 null 并 warn。
 */

import { AssetManager, assetManager, SpriteFrame } from 'cc';

import { Card } from '../../foundation/types/game.types';
import { getCardSpriteKey } from './card-sprite-resolver';

const BUNDLE_NAME = 'res';
const CARD_BACK_SPRITE_NAME = 'Deck';
const SPRITE_PATH_PREFIX = 'image/h200/';
const SPRITE_PATH_SUFFIX = '/spriteFrame';

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
                    `[CardSpriteLoader] Failed to load bundle: ${BUNDLE_NAME}`,
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

function getSpriteKeyByName(spriteName: string): string {
    return SPRITE_PATH_PREFIX + spriteName + SPRITE_PATH_SUFFIX;
}

async function loadSpriteFrameByKey(
    spriteKey: string
): Promise<SpriteFrame | null> {
    const bundle = await loadResBundle();

    if (!bundle) {
        console.warn(`[CardSpriteLoader] Bundle "${BUNDLE_NAME}" not found`);
        return null;
    }

    return new Promise((resolve) => {
        bundle.load(spriteKey, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.warn(
                    `[CardSpriteLoader] Failed to load sprite: ${spriteKey}`,
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
 * 加载卡牌 SpriteFrame（异步）。
 * 加载失败返回 null，调用方据此降级处理。
 */
export async function loadCardSprite(card: Card): Promise<SpriteFrame | null> {
    const spriteKey = getCardSpriteKey(card);
    return loadSpriteFrameByKey(spriteKey);
}

/**
 * 加载卡背 SpriteFrame（异步）。
 * 加载失败返回 null。
 */
export async function loadCardBackSprite(): Promise<SpriteFrame | null> {
    const spriteKey = getSpriteKeyByName(CARD_BACK_SPRITE_NAME);
    return loadSpriteFrameByKey(spriteKey);
}

/**
 * 批量预加载卡牌资源。
 */
export async function preloadCardSprites(cards: Card[]): Promise<void> {
    const bundle = await loadResBundle();
    if (!bundle) {
        console.warn(`[CardSpriteLoader] Bundle "${BUNDLE_NAME}" not found`);
        return;
    }

    const uniqueKeys = new Set<string>();

    for (const card of cards) {
        uniqueKeys.add(getCardSpriteKey(card));
    }

    for (const key of uniqueKeys) {
        bundle.load(key, SpriteFrame, (err) => {
            if (err) {
                console.warn(`[CardSpriteLoader] Preload failed: ${key}`, err);
            }
        });
    }
}
