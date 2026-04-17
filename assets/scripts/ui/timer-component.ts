/**
 * 回合计时器UI组件
 * 监听回合事件启动/停止计时
 */

import { _decorator, Component, Node, Label, ProgressBar, Color } from "cc";
import {
    GameEventType,
    TurnStartedEvent,
    GameEvent,
    subscribeEvent,
} from "../events/game.events";

const { ccclass, property } = _decorator;

interface TurnStartedPayload {
    playerId: string;
    playerName: string;
    isHuman: boolean;
}

@ccclass("TimerComponent")
export class TimerComponent extends Component {
    @property(Label)
    public timeLabel: Label | null = null;

    @property(ProgressBar)
    public progressBar: ProgressBar | null = null;

    @property
    public timeoutSeconds: number = 30;

    @property
    public warningThreshold: number = 10;

    private remainingTime: number = 0;
    private timerInterval: number | null = null;
    private isRunning: boolean = false;
    private subscriptions: Array<() => void> = [];

    /** 回合超时回调 */
    public onTimeout: (() => void) | null = null;

    start() {
        this.initEventSubscriptions();
        this.stopTimer();
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        // 监听回合开始
        this.subscriptions.push(
            subscribeEvent(GameEventType.TURN_STARTED, (event: GameEvent) => {
                const payload = (event as any).payload as TurnStartedPayload;
                this.onTurnStarted(payload);
            })
        );

        // 监听游戏结束
        this.subscriptions.push(
            subscribeEvent(GameEventType.GAME_OVER, () => {
                this.stopTimer();
            })
        );

        // 监听游戏重置
        this.subscriptions.push(
            subscribeEvent(GameEventType.RESET_GAME, () => {
                this.stopTimer();
            })
        );
    }

    /** 处理回合开始 */
    private onTurnStarted(payload: TurnStartedPayload): void {
        // 只有人类玩家需要显示计时器
        if (payload.isHuman) {
            this.startTimer();
        } else {
            this.stopTimer();
        }
    }

    /** 启动计时器 */
    public startTimer(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.remainingTime = this.timeoutSeconds;
        this.updateDisplay();

        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000) as unknown as number;
    }

    /** 停止计时器 */
    public stopTimer(): void {
        this.isRunning = false;

        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.updateDisplay();
    }

    /** 计时器 tick */
    private tick(): void {
        this.remainingTime--;
        this.updateDisplay();

        if (this.remainingTime <= 0) {
            this.stopTimer();
            if (this.onTimeout) {
                this.onTimeout();
            }
        }
    }

    /** 更新显示 */
    private updateDisplay(): void {
        // 更新时间标签
        if (this.timeLabel) {
            this.timeLabel.string = this.isRunning
                ? Math.max(0, this.remainingTime).toString()
                : "--";

            // 警告颜色
            if (this.isRunning && this.remainingTime <= this.warningThreshold) {
                this.timeLabel.color = new Color(255, 0, 0);
            } else {
                this.timeLabel.color = new Color(255, 255, 255);
            }
        }

        // 更新进度条
        if (this.progressBar) {
            this.progressBar.progress = this.isRunning
                ? this.remainingTime / this.timeoutSeconds
                : 0;
        }
    }

    /** 取消订阅 */
    public dispose(): void {
        this.stopTimer();
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions = [];
    }
}
