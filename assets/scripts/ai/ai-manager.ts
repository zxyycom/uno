/**
 * AI管理器
 * 负责协调AI玩家的行为决策
 */

import { CardColor, GameConfig, Player } from "../types/game.types";
import { TopCard } from "../types/game.types";
import { decideAIAction, shouldAICallUno } from "./ai-strategy";

/** AI决策回调 */
export type AIActionCallback = (action: {
    action: "play" | "draw";
    cardId?: string;
    chosenColor?: CardColor;
}) => void;

/** AI管理器 */
export class AIManager {
    private config: GameConfig;
    private thinkTimerId: number | null = null;
    private callUnoCallback: ((playerId: string) => void) | null = null;

    constructor(config: GameConfig) {
        this.config = config;
    }

    /** 设置UNO呼叫回调 */
    setUnoCallback(callback: (playerId: string) => void): void {
        this.callUnoCallback = callback;
    }

    /** 请求AI做出决策 */
    requestAIDecision(
        player: Player,
        topCard: TopCard,
        pendingDraw2Count: number,
        pendingDraw4Count: number,
        canDrawFreely: boolean,
        callback: AIActionCallback,
    ): void {
        // 模拟AI思考延迟
        const thinkTime = this.config.aiThinkDelay + Math.random() * 500;

        this.thinkTimerId = setTimeout(() => {
            // 做出决策
            const action = decideAIAction(
                player,
                topCard,
                pendingDraw2Count,
                pendingDraw4Count,
                canDrawFreely,
            );
            callback(action);

            // 如果手牌只剩一张，检查是否需要呼叫UNO
            if (shouldAICallUno(player)) {
                setTimeout(() => {
                    if (this.callUnoCallback) {
                        this.callUnoCallback(player.id);
                    }
                }, 300);
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
        this.callUnoCallback = null;
    }
}
