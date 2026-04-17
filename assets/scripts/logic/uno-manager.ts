/**
 * UNO呼叫管理器
 * 处理最后一张牌时的UNO呼叫逻辑
 */

import {
    CardPlayedPayload,
    eventBus,
    GameEventType,
    TurnStartedPayload,
} from '../events';

/** UNO状态 */
export enum UnoState {
    NORMAL = 'normal',
    MUST_CALL = 'must_call',
    CALLED = 'called',
    PENALIZED = 'penalized',
}

/** UNO惩罚配置 */
export interface UnoPenaltyConfig {
    /** 惩罚抽牌数量 */
    penaltyDrawCount: number;
    /** 呼叫宽限期（毫秒） */
    gracePeriodMs: number;
    /** 是否启用惩罚 */
    enabled: boolean;
}

const DEFAULT_CONFIG: UnoPenaltyConfig = {
    penaltyDrawCount: 2,
    gracePeriodMs: 2000,
    enabled: true,
};

/** UNO事件回调 */
export type UnoCallback = (state: UnoState, playerId: string) => void;

export class UnoManager {
    private static instance: UnoManager | null = null;

    private config: UnoPenaltyConfig;
    private state: UnoState = UnoState.NORMAL;
    private playerStack: Map<
        string,
        { handCount: number; unoCalled: boolean }
    > = new Map();
    private graceTimer: number | null = null;

    /** UNO状态变化回调 */
    private onStateChange: UnoCallback | null = null;
    /** 惩罚回调 */
    private onPenalty: ((playerId: string, drawCount: number) => void) | null =
        null;

    private constructor(config: UnoPenaltyConfig = DEFAULT_CONFIG) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /** 获取单例 */
    static getInstance(config?: UnoPenaltyConfig): UnoManager {
        if (!UnoManager.instance) {
            UnoManager.instance = new UnoManager(config);
        }
        return UnoManager.instance;
    }

    /** 初始化事件订阅 */
    init(): void {
        eventBus.on(
            GameEventType.TURN_STARTED,
            (payload) => {
                this.onTurnStarted(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.CARD_PLAYED,
            (payload) => {
                this.onCardPlayed(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.RESET_GAME,
            () => {
                this.reset();
            },
            this
        );
    }

    /** 处理回合开始 */
    private onTurnStarted(payload: TurnStartedPayload): void {
        // 检查上一位玩家是否需要呼叫UNO
        this.checkLastPlayerUno();
    }

    /** 处理出牌 */
    private onCardPlayed(payload: CardPlayedPayload): void {
        const player = this.playerStack.get(payload.playerId);
        const handCount = this.getHandCount(payload.playerId);

        // 出牌后手牌数量减少
        if (player) {
            player.handCount--;
        }

        // 如果只剩1张牌，需要在宽限期内呼叫UNO
        if (handCount === 1) {
            this.state = UnoState.MUST_CALL;

            // 设置宽限期计时器
            if (this.config.gracePeriodMs > 0) {
                this.graceTimer = setTimeout(() => {
                    this.checkUnoCalled(payload.playerId);
                }, this.config.gracePeriodMs) as unknown as number;
            }
        }
    }

    /** 玩家呼叫UNO */
    callUno(playerId: string): boolean {
        const handCount = this.getHandCount(playerId);

        // 只有手牌剩1张时可以呼叫UNO
        if (handCount !== 1) {
            return false;
        }

        // 清除宽限期计时器
        if (this.graceTimer !== null) {
            clearTimeout(this.graceTimer);
            this.graceTimer = null;
        }

        // 更新状态
        this.state = UnoState.CALLED;

        // 发布UNO呼叫事件
        eventBus.emit(GameEventType.CALL_UNO, { playerId });

        // 触发回调
        if (this.onStateChange) {
            this.onStateChange(UnoState.CALLED, playerId);
        }

        return true;
    }

    /** 检查最后一位玩家的UNO呼叫状态 */
    private checkLastPlayerUno(): void {
        for (const [playerId, data] of this.playerStack.entries()) {
            // 如果上一回合手牌剩1张但未呼叫UNO
            if (
                data.handCount === 1 &&
                !data.unoCalled &&
                this.state === UnoState.MUST_CALL
            ) {
                this.applyPenalty(playerId);
            }
        }
    }

    /** 检查UNO是否已呼叫 */
    private checkUnoCalled(playerId: string): void {
        const player = this.playerStack.get(playerId);
        if (player && player.handCount === 0 && !player.unoCalled) {
            // 没有呼叫UNO，应用惩罚
            if (this.state === UnoState.MUST_CALL) {
                this.applyPenalty(playerId);
            }
        }
    }

    /** 应用UNO惩罚 */
    private applyPenalty(playerId: string): void {
        if (!this.config.enabled) return;

        this.state = UnoState.PENALIZED;

        // 发布惩罚事件
        eventBus.emit(GameEventType.UNO_PENALTY, {
            playerId,
            penaltyCards: this.config.penaltyDrawCount,
        });

        // 触发惩罚回调（通知GameManager抽牌）
        if (this.onPenalty) {
            this.onPenalty(playerId, this.config.penaltyDrawCount);
        }

        // 触发状态变化回调
        if (this.onStateChange) {
            this.onStateChange(UnoState.PENALIZED, playerId);
        }
    }

    /** 更新玩家手牌数量 */
    updateHandCount(playerId: string, count: number): void {
        const existing = this.playerStack.get(playerId);
        this.playerStack.set(playerId, {
            handCount: count,
            unoCalled: existing?.unoCalled || false,
        });
    }

    /** 获取玩家手牌数量 */
    private getHandCount(playerId: string): number {
        return this.playerStack.get(playerId)?.handCount || 0;
    }

    /** 获取当前UNO状态 */
    getState(): UnoState {
        return this.state;
    }

    /** 检查玩家是否需要呼叫UNO */
    isMustCall(playerId: string): boolean {
        return (
            this.state === UnoState.MUST_CALL &&
            this.getHandCount(playerId) === 1
        );
    }

    /** 设置状态变化回调 */
    setOnStateChange(callback: UnoCallback): void {
        this.onStateChange = callback;
    }

    /** 设置惩罚回调 */
    setOnPenalty(
        callback: (playerId: string, drawCount: number) => void
    ): void {
        this.onPenalty = callback;
    }

    /** 更新配置 */
    updateConfig(config: Partial<UnoPenaltyConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /** 重置状态 */
    reset(): void {
        this.state = UnoState.NORMAL;
        this.playerStack.clear();
        this.state = UnoState.NORMAL;

        if (this.graceTimer !== null) {
            clearTimeout(this.graceTimer);
            this.graceTimer = null;
        }
    }

    /** 清理资源 */
    dispose(): void {
        this.reset();
        eventBus.targetOff(this);
        UnoManager.instance = null;
    }
}
