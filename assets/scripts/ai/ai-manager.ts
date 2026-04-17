/**
 * AI管理器
 * 负责协调AI玩家的行为决策
 */

import { CardColor,GameConfig, Player } from '../types/game.types';
import { TopCard } from '../types/game.types';
import { decideAIAction, shouldAI_CALL_UNO } from './ai-strategy';

/** AI管理器 */
export class AIManager {
    private config: GameConfig;
    private thinkTimerId: number | null = null;

    constructor(config: GameConfig) {
        this.config = config;
    }

    /** 请求AI做出决策 */
    requestAIDecision(
        player: Player,
        topCard: TopCard,
        pendingDraw2Count: number,
        pendingDraw4Count: number,
        canDrawFreely: boolean,
        callback: (action: { action: 'play' | 'draw'; cardId?: string; chosenColor?: CardColor }) => void,
    ): void {
        // 模拟AI思考延迟
        const thinkTime = this.config.aiThinkDelay + Math.random() * 500;

        this.thinkTimerId = setTimeout(() => {
            const action = decideAIAction(player, topCard, pendingDraw2Count, pendingDraw4Count, canDrawFreely);
            callback(action);

            // 如果手牌只剩一张，检查是否需要呼叫UNO
            if (shouldAI_CALL_UNO(player)) {
                // AI自动呼叫UNO
                setTimeout(() => {
                    // 这里通过事件触发UNO呼叫
                }, 500);
            }
        }, thinkTime) as unknown as number;
    }

    /** 取消AI思考 */
    cancelAIThink(): void {
        if (this.thinkTimerId !== null) {
            clearTimeout(this.thinkTimerId);
            this.thinkTimerId = null;
        }
    }

    /** 更新配置 */
    updateConfig(config: GameConfig): void {
        this.config = config;
    }

    /** 销毁 */
    destroy(): void {
        this.cancelAIThink();
    }
}
