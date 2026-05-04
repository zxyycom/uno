/**
 * 卡堆管理工具
 * 提供抽卡、弃牌堆洗牌、卡牌转移等基础功能
 */

import { Card } from '../../foundation/types/game.types';
import { shuffle } from '../utils/deck-helper';

/** 抽卡成功 */
export interface DrawSuccess {
    cards: Card[];
    /** 是否触发了洗牌 */
    reshuffled: boolean;
    type: 'success';
}

/** 抽卡失败 */
export interface DrawFailure {
    reason: 'insufficient' | 'zero';
    reshuffled: boolean;
    type: 'fail';
}

/** 抽卡结果 */
export type DrawResult = DrawSuccess | DrawFailure;

/** 卡堆管理器 */
export class DeckManager {
    private _deck: Card[];
    private _discardPile: Card[];

    constructor(deck: Card[] = [], discardPile: Card[] = []) {
        this._deck = deck;
        this._discardPile = discardPile;
    }

    /** 获取当前牌堆 */
    get deck(): Card[] {
        return this._deck;
    }

    /** 获取弃牌堆 */
    get discardPile(): Card[] {
        return this._discardPile;
    }

    /**
     * 纯抽卡（单张）
     * @returns 抽到的卡，失败返回null
     */
    draw(): Card | null {
        return this._deck.pop() ?? null;
    }

    /**
     * 多抽（自动处理洗牌）
     * @param count 抽牌数量
     * @param options 抽卡选项
     * @returns 抽卡结果
     */
    drawMultiple(
        count: number,
        options: {
            /** 卡不足时是否失败（牌堆+弃牌堆总量不够） */
            failOnInsufficient?: boolean;
            /** 抽卡结果为0是否失败 */
            failOnZeroResult?: boolean;
            /** 牌堆不够时是否自动洗牌（默认true） */
            autoReshuffleOnInsufficient?: boolean;
        } = {}
    ): DrawResult {
        const {
            failOnInsufficient = false,
            failOnZeroResult = false,
            autoReshuffleOnInsufficient = true,
        } = options;

        // 检查总量是否足够
        if (failOnInsufficient) {
            if (
                autoReshuffleOnInsufficient &&
                this._deck.length + Math.max(0, this._discardPile.length - 1) <
                    count
            ) {
                return {
                    reason: 'insufficient',
                    reshuffled: false,
                    type: 'fail',
                };
            } else if (
                !autoReshuffleOnInsufficient &&
                this._deck.length < count
            ) {
                return {
                    reason: 'insufficient',
                    reshuffled: false,
                    type: 'fail',
                };
            }
        }

        // 是否需要触发洗牌
        const reshuffled =
            autoReshuffleOnInsufficient && this._deck.length < count;

        if (reshuffled) {
            this.reshuffleDiscardPile();
        }

        // 抽卡
        const cards: Card[] = [];
        for (let i = 0; i < count; i++) {
            const card = this.draw();
            if (card) {
                cards.push(card);
            }
        }

        // 检查是否抽到0张
        if (failOnZeroResult && cards.length === 0) {
            return { reason: 'zero', reshuffled, type: 'fail' };
        }

        return { cards, reshuffled, type: 'success' };
    }

    /**
     * 弃牌堆洗牌（保留当前顶牌，其余洗入牌堆）
     */
    reshuffleDiscardPile(): void {
        if (this._discardPile.length < 2) return;

        this._deck = shuffle([
            ...this._deck,
            ...this._discardPile.slice(0, -1),
        ]);
        this._discardPile = [this._discardPile[this._discardPile.length - 1]];
    }

    /**
     * 卡牌进入弃牌堆
     * @param cards 要丢弃的卡牌
     */
    discard(cards: Card[]): void {
        this._discardPile.push(...cards);
    }

    /**
     * 单张卡牌进入弃牌堆
     * @param card 要丢弃的卡牌
     */
    discardOne(card: Card): void {
        this._discardPile.push(card);
    }

    /** 牌堆是否为空 */
    get isDeckEmpty(): boolean {
        return this._deck.length === 0;
    }

    /** 弃牌堆是否可洗牌 */
    get canReshuffle(): boolean {
        return this._discardPile.length > 0;
    }

    /** 牌堆数量 */
    get deckCount(): number {
        return this._deck.length;
    }

    /** 弃牌堆数量 */
    get discardCount(): number {
        return this._discardPile.length;
    }
}
