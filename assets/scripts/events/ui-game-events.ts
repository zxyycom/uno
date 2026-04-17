/**
 * UI事件集成层
 * 演示UI组件如何订阅游戏事件
 */

import {
    GameEventType,
    GameEvent,
    eventBus,
    subscribeEvent,
    CardPlayedEvent,
    TurnChangedEvent,
    GameOverEvent,
    HandUpdatedEvent,
    CallUnoEvent,
} from "../events/game.events";

/** UI事件处理器 */
export class UIGameEvents {
    private subscriptions: Array<() => void> = [];

    constructor() {
        this.initSubscriptions();
    }

    /** 初始化事件订阅 */
    private initSubscriptions(): void {
        // 监听回合变化
        this.subscriptions.push(
            subscribeEvent(GameEventType.TURN_CHANGED, (event: GameEvent) => {
                const payload = (event as TurnChangedEvent).payload;
                console.log(`轮到玩家: ${payload.currentPlayerId}`);
                this.onTurnChanged(payload);
            })
        );

        // 监听出牌
        this.subscriptions.push(
            subscribeEvent(GameEventType.CARD_PLAYED, (event: GameEvent) => {
                const payload = (event as CardPlayedEvent).payload;
                console.log(`玩家 ${payload.playerId} 出牌`);
                this.onCardPlayed(payload);
            })
        );

        // 监听游戏结束
        this.subscriptions.push(
            subscribeEvent(GameEventType.GAME_OVER, (event: GameEvent) => {
                const payload = (event as GameOverEvent).payload;
                console.log(`游戏结束! 获胜者: ${payload.winnerName}`);
                this.onGameOver(payload);
            })
        );

        // 监听手牌更新
        this.subscriptions.push(
            subscribeEvent(GameEventType.HAND_UPDATED, (event: GameEvent) => {
                const payload = (event as HandUpdatedEvent).payload;
                this.onHandUpdated(payload);
            })
        );

        // 监听UNO呼叫
        this.subscriptions.push(
            subscribeEvent(GameEventType.CALL_UNO, (event: GameEvent) => {
                const payload = (event as CallUnoEvent).payload;
                console.log(`玩家 ${payload.playerName} 呼叫 UNO!`);
                this.onUnoCalled(payload);
            })
        );

        // 通配符订阅（监听所有事件）
        this.subscriptions.push(
            subscribeEvent("*" as any, (event: GameEvent) => {
                // 调试日志
                // console.log(`[Event] ${event.type}`);
            })
        );
    }

    /** 回合变化回调 */
    private onTurnChanged(payload: TurnChangedEvent["payload"]): void {
        // TODO: 更新UI显示当前玩家
    }

    /** 出牌回调 */
    private onCardPlayed(payload: CardPlayedEvent["payload"]): void {
        // TODO: 播放出牌动画
        // TODO: 更新弃牌堆显示
        if (payload.isSkipEffect) {
            // TODO: 显示跳过提示
        }
        if (payload.isReverseEffect) {
            // TODO: 显示方向改变动画
        }
    }

    /** 游戏结束回调 */
    private onGameOver(payload: GameOverEvent["payload"]): void {
        // TODO: 显示游戏结束界面
        // TODO: 显示最终手牌统计
    }

    /** 手牌更新回调 */
    private onHandUpdated(payload: HandUpdatedEvent["payload"]): void {
        // TODO: 更新手牌UI显示
    }

    /** UNO呼叫回调 */
    private onUnoCalled(payload: CallUnoEvent["payload"]): void {
        // TODO: 显示UNO提示动画
    }

    /** 取消所有订阅 */
    public dispose(): void {
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions = [];
    }
}
