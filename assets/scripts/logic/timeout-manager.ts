/**
 * 超时管理器
 * 处理玩家操作超时，自动触发摸牌
 */

import { eventBus, GameEventType, TurnStartedPayload } from '../events';

export interface TimeoutConfig {
    /** 超时时间（秒） */
    timeoutSeconds: number;
    /** 警告阈值（秒） */
    warningThreshold: number;
    /** 是否启用 */
    enabled: boolean;
}

const DEFAULT_CONFIG: TimeoutConfig = {
    timeoutSeconds: 30,
    warningThreshold: 10,
    enabled: true,
};

/** 超时状态 */
export enum TimeoutState {
    IDLE = 'idle',
    RUNNING = 'running',
    WARNING = 'warning',
    EXPIRED = 'expired',
}

/** 超时事件回调 */
export type TimeoutCallback = (state: TimeoutState) => void;

export class TimeoutManager {
    private static instance: TimeoutManager | null = null;

    private config: TimeoutConfig;
    private state: TimeoutState = TimeoutState.IDLE;
    private remainingTime: number = 0;
    private intervalId: number | null = null;
    private currentPlayerId: string = '';
    private isHumanTurn: boolean = false;
    /** 超时回调 */
    private onTimeoutCallback: TimeoutCallback | null = null;
    /** 警告回调 */
    private onWarningCallback: TimeoutCallback | null = null;
    /** 时间更新回调 */
    private onTickCallback: ((remaining: number) => void) | null = null;

    private constructor(config: TimeoutConfig = DEFAULT_CONFIG) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /** 获取单例 */
    static getInstance(config?: TimeoutConfig): TimeoutManager {
        if (!TimeoutManager.instance) {
            TimeoutManager.instance = new TimeoutManager(config);
        }
        return TimeoutManager.instance;
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
            GameEventType.GAME_OVER,
            () => {
                this.stop();
            },
            this
        );

        eventBus.on(
            GameEventType.RESET_GAME,
            () => {
                this.stop();
            },
            this
        );
    }

    /** 处理回合开始 */
    private onTurnStarted(payload: TurnStartedPayload): void {
        this.currentPlayerId = payload.playerId;
        this.isHumanTurn = payload.isHuman;

        if (this.isHumanTurn && this.config.enabled) {
            this.start(payload.playerId);
        } else {
            this.stop();
        }
    }

    /** 启动计时器 */
    start(playerId: string): void {
        if (!this.config.enabled) return;

        this.stop();
        this.currentPlayerId = playerId;
        this.remainingTime = this.config.timeoutSeconds;
        this.state = TimeoutState.RUNNING;

        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000) as unknown as number;
    }

    /** 停止计时器 */
    stop(): void {
        this.state = TimeoutState.IDLE;

        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /** 计时器 tick */
    private tick(): void {
        this.remainingTime--;

        // 触发时间更新回调
        if (this.onTickCallback) {
            this.onTickCallback(this.remainingTime);
        }

        // 检查是否进入警告状态
        if (
            this.remainingTime <= this.config.warningThreshold &&
            this.state !== TimeoutState.WARNING
        ) {
            this.state = TimeoutState.WARNING;
            if (this.onWarningCallback) {
                this.onWarningCallback(TimeoutState.WARNING);
            }
            eventBus.emit(GameEventType.TIMEOUT_WARNING, {
                playerId: this.currentPlayerId,
                remainingSeconds: this.remainingTime,
            });
        }

        // 检查是否超时
        if (this.remainingTime <= 0) {
            this.state = TimeoutState.EXPIRED;
            this.onTimeout();
        }
    }

    /** 超时处理 */
    private onTimeout(): void {
        this.stop();

        // 发布超时事件
        eventBus.emit(GameEventType.TIMEOUT_EXPIRED, {
            playerId: this.currentPlayerId,
        });

        // 触发超时回调
        if (this.onTimeoutCallback) {
            this.onTimeoutCallback(TimeoutState.EXPIRED);
        }
    }

    /** 设置超时回调 */
    setOnTimeout(callback: TimeoutCallback): void {
        this.onTimeoutCallback = callback;
    }

    /** 设置警告回调 */
    setOnWarning(callback: TimeoutCallback): void {
        this.onWarningCallback = callback;
    }

    /** 设置时间更新回调 */
    setOnTick(callback: (remaining: number) => void): void {
        this.onTickCallback = callback;
    }

    /** 获取剩余时间 */
    getRemainingTime(): number {
        return this.remainingTime;
    }

    /** 获取状态 */
    getState(): TimeoutState {
        return this.state;
    }

    /** 暂停计时 */
    pause(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /** 恢复计时 */
    resume(): void {
        if (
            this.state === TimeoutState.RUNNING ||
            this.state === TimeoutState.WARNING
        ) {
            this.intervalId = setInterval(() => {
                this.tick();
            }, 1000) as unknown as number;
        }
    }

    /** 更新配置 */
    updateConfig(config: Partial<TimeoutConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /** 清理资源 */
    dispose(): void {
        this.stop();
        eventBus.targetOff(this);
        TimeoutManager.instance = null;
    }
}
