/**
 * 全局随机数管理器
 * 提供统一的随机数生成和种子控制，确保游戏可复现性
 */

import { Random } from 'random';

// 全局随机实例
let globalRandom: Random | null = null;
let currentSeed: number | null = null;

/**
 * 初始化全局随机数生成器
 * @param seed 随机种子，如果未提供则使用当前时间戳
 */
export function initRandom(seed?: number): void {
    currentSeed = seed ?? Date.now();
    globalRandom = new Random(currentSeed);
    console.log(`[Random] Seed initialized: ${currentSeed}`);
}

/**
 * 获取全局随机实例
 */
export function getRandom(): Random {
    if (!globalRandom) {
        initRandom();
    }
    return globalRandom!;
}

/**
 * 获取当前种子值
 */
export function getSeed(): number | null {
    return currentSeed;
}

/**
 * 重置随机数生成器（使用相同种子重新初始化）
 */
export function resetRandom(seed?: number): void {
    initRandom(seed ?? currentSeed ?? Date.now());
}

/**
 * 生成随机整数 [min, max)
 */
export function randomInt(min: number, max: number): number {
    return getRandom().int(min, max);
}

/**
 * 生成随机浮点数 [min, max)
 */
export function randomFloat(min: number, max: number): number {
    return getRandom().float(min, max);
}

/**
 * 从数组中随机选择一个元素
 */
export function randomChoice<T>(array: T[]): T {
    const result = getRandom().choice(array);
    if (result === undefined) {
        throw new Error('Cannot choose from empty array');
    }
    return result;
}

/**
 * Fisher-Yates 洗牌算法（原地洗牌）
 */
export function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    const rand = getRandom();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand.float(0, 1) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
