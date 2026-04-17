/**
 * 消息提示组件
 * 显示游戏中的各种提示信息
 */

import { _decorator, Component, Label, tween, Vec3 } from 'cc';

import { eventBus, GameEventType } from '../events';

const { ccclass, property } = _decorator;

@ccclass('GameMessage')
export class GameMessage extends Component {
    @property(Label)
    public messageLabel: Label | null = null;

    @property
    public fadeInDuration: number = 0.3;

    @property
    public displayDuration: number = 2.0;

    @property
    public fadeOutDuration: number = 0.3;

    start() {
        this.initEventSubscriptions();
        this.node.active = false;
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.PLAYER_SKIPPED,
            (payload) => {
                this.showMessage(`${payload.skippedPlayerName} 被跳过!`);
            },
            this
        );

        eventBus.on(
            GameEventType.UNO_PENALTY,
            () => {
                this.showMessage(`UNO 犯规! 抽2张牌惩罚`);
            },
            this
        );

        eventBus.on(
            GameEventType.GAME_OVER,
            (payload) => {
                this.showMessage(`${payload.winnerName} 获胜!`, 5.0);
            },
            this
        );

        eventBus.on(
            GameEventType.DIRECTION_CHANGED,
            () => {
                this.showMessage(`方向改变!`);
            },
            this
        );
    }

    /**
     * 显示消息
     */
    public showMessage(
        text: string,
        duration: number = this.displayDuration
    ): void {
        if (!this.messageLabel) return;

        this.messageLabel.string = text;
        this.node.active = true;

        // 淡入动画
        this.node.setScale(0, 0, 0);
        tween(this.node)
            .to(this.fadeInDuration, { scale: new Vec3(1, 1, 1) })
            .delay(duration)
            .to(this.fadeOutDuration, { scale: new Vec3(0, 0, 0) })
            .call(() => {
                this.node.active = false;
            })
            .start();
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
    }
}
