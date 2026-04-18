/**
 * AI管理器
 */

import {
    Card,
    CardColor,
    GameConfig,
    Player,
    TopCard,
} from '../../foundation/types/game.types';
import { decideAIAction } from './ai-helper';

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
        pendingDraw2Count: number,
        pendingDraw4Count: number,
        canDrawFreely: boolean,
        callback: AIActionCallback
    ): void {
        const thinkTime = this.config.aiThinkDelay + Math.random() * 500;

        this.thinkTimerId = setTimeout(() => {
            const action = decideAIAction(
                player,
                topCard,
                pendingDraw2Count,
                pendingDraw4Count,
                canDrawFreely
            );
            callback(action);
        }, thinkTime) as unknown as number;
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
