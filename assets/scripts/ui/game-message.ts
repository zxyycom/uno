/**
 * 消息提示组件
 * 显示游戏中的各种提示信息
 */

import { _decorator, Component, Node, Label, tween, Vec3 } from "cc";
import {
    GameEventType,
    GameEvent,
    subscribeEvent,
    UnoPenaltyEvent,
    PlayerSkippedEvent,
    GameOverEvent,
    DirectionChangedEvent,
} from "../events/game.events";

const { ccclass, property } = _decorator;

@ccclass("GameMessage")
export class GameMessage extends Component {
    @property(Label)
    public messageLabel: Label | null = null;

    @property
    public fadeInDuration: number = 0.3;

    @property
    public displayDuration: number = 2.0;

    @property
    public fadeOutDuration: number = 0.3;

    private subscriptions: Array<() => void> = [];

    start() {
        this.initEventSubscriptions();
        this.node.active = false;
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        // 监听玩家被跳过
        this.subscriptions.push(
            subscribeEvent(GameEventType.PLAYER_SKIPPED, (event: GameEvent) => {
                const payload = (event as PlayerSkippedEvent).payload;
                this.showMessage(`${payload.skippedPlayerName} 被跳过!`);
            })
        );

        // 监听UNO惩罚
        this.subscriptions.push(
            subscribeEvent(GameEventType.UNO_PENALTY, (event: GameEvent) => {
                this.showMessage(`UNO 犯规! 抽2张牌惩罚`);
            })
        );

        // 监听游戏结束
        this.subscriptions.push(
            subscribeEvent(GameEventType.GAME_OVER, (event: GameEvent) => {
                const payload = (event as GameOverEvent).payload;
                this.showMessage(`${payload.winnerName} 获胜!`, 5.0);
            })
        );

        // 监听方向改变
        this.subscriptions.push(
            subscribeEvent(GameEventType.DIRECTION_CHANGED, () => {
                this.showMessage(`方向改变!`);
            })
        );
    }

    /**
     * 显示消息
     */
    public showMessage(text: string, duration: number = this.displayDuration): void {
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
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions = [];
    }
}
