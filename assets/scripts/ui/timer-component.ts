/**
 * 计时器UI组件
 * 显示玩家回合剩余时间
 */

import { _decorator, Color, Component, Label, ProgressBar } from 'cc';

import { eventBus, GameEventType } from '../events';

const { ccclass, property } = _decorator;

@ccclass('TimerComponent')
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
    private timerId: number | null = null;
    private isRunning: boolean = false;
    private currentPlayerId: string = '';

    /** 超时回调 */
    public onTimeout: (() => void) | null = null;

    start() {
        this.initEventSubscriptions();
        this.reset();
    }

    onDestroy() {
        this.stop();
        eventBus.targetOff(this);
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.TURN_STARTED,
            (payload) => {
                this.startTimer(payload.player.id);
            },
            this
        );

        eventBus.on(
            GameEventType.TURN_TIMEOUT,
            () => {
                this.stop();
            },
            this
        );
    }

    /** 开始计时 */
    public startTimer(playerId: string): void {
        this.stop();
        this.currentPlayerId = playerId;
        this.remainingTime = this.timeoutSeconds;
        this.isRunning = true;
        this.updateDisplay();

        this.timerId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    /** 停止计时 */
    public stop(): void {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isRunning = false;
    }

    /** 重置计时器 */
    public reset(): void {
        this.stop();
        this.remainingTime = this.timeoutSeconds;
        this.updateDisplay();
    }

    /** 每秒更新 */
    private tick(): void {
        if (!this.isRunning) return;

        this.remainingTime--;
        this.updateDisplay();

        if (this.remainingTime <= 0) {
            this.stop();
            // 超时事件由状态机处理
        }
    }

    /** 更新显示 */
    private updateDisplay(): void {
        // 更新标签
        if (this.timeLabel) {
            const minutes = Math.floor(this.remainingTime / 60);
            const seconds = this.remainingTime % 60;
            this.timeLabel.string = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // 警告状态变色
            if (this.remainingTime <= this.warningThreshold) {
                this.timeLabel.color = new Color(255, 0, 0, 255);
            } else {
                this.timeLabel.color = new Color(255, 255, 255, 255);
            }
        }

        // 更新进度条
        if (this.progressBar) {
            this.progressBar.progress =
                this.remainingTime / this.timeoutSeconds;
        }
    }

    /** 获取剩余时间 */
    public getRemainingTime(): number {
        return this.remainingTime;
    }
}
