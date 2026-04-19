/**
 * AI管理器
 */

import {
    Card,
    CardColor,
    GameConfig,
    Player,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';
import { getPlayableCards } from './input-validator';
import {
    randomInt,
    randomChoice,
    randomFloat,
} from '../../foundation/utils/random-seed';

export type AIActionCallback = (action: {
    action: 'play' | 'draw';
    card?: Card;
    chosenColor?: CardColor;
}) => void;

export class AIManager {
    private config: GameConfig;
    private thinkTimerId: number | null = null;

    constructor(config: GameConfig) {
        this.config = config;
    }

    requestAIDecision(
        player: Player,
        topCard: TopCard,
        callback: AIActionCallback
    ): void {
        const thinkTime = this.config.aiThinkDelay + randomFloat(0, 1) * 500;

        this.thinkTimerId = setTimeout(() => {
            const action = this.decideAIAction(player, topCard);
            callback(action);
        }, thinkTime);
    }

    decideAIAction(
        player: Player,
        topCard: TopCard
    ): { action: 'play' | 'draw'; card?: Card; chosenColor?: CardColor } {
        const playableCards = getPlayableCards(player, topCard);

        if (playableCards.length === 0) {
            return { action: 'draw' };
        }

        // 道具牌（REVERSE、SKIP、DRAW_2、WILD、WILD_DRAW_4）
        const actionCards = playableCards.filter(
            (c) => c.type !== UnoCardType.NUMBER
        );
        // 20% 概率出道具牌
        if (actionCards.length > 0 && randomInt(0, 99) < 20) {
            const card = randomChoice(actionCards);
            return { action: 'play', card };
        }
        // 随机出牌
        const cardToPlay = randomChoice(
            playableCards.filter((c) => c.type === UnoCardType.NUMBER)
        );

        return { action: 'play', card: cardToPlay };
    }

    cancelAIThink(): void {
        if (this.thinkTimerId !== null) {
            clearTimeout(this.thinkTimerId);
            this.thinkTimerId = null;
        }
    }

    updateConfig(config: GameConfig): void {
        this.config = config;
    }

    destroy(): void {
        this.cancelAIThink();
    }
}

