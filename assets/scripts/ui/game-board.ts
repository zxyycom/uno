/**
 * 游戏桌面UI组件
 * 监听游戏事件更新桌面显示
 */

import { _decorator, Component, Node } from 'cc';

import {
    CardPlayedEvent,
    DirectionChangedEvent,
    DiscardUpdatedEvent,
    GameEventType,
    PlayerSkippedEvent,
    subscribeEvent,
    TurnChangedEvent,
} from '../events/game.events';

const { ccclass, property } = _decorator;

@ccclass('GameBoard')
export class GameBoard extends Component {
    @property(Node)
    public discardPileNode: Node | null = null;

    @property(Node)
    public deckNode: Node | null = null;

    @property(Node)
    public directionIndicator: Node | null = null;

    @property(Node)
    public currentPlayerIndicator: Node | null = null;

    private subscriptions: Array<() => void> = [];

    start() {
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        // 监听出牌
        this.subscriptions.push(
            subscribeEvent(GameEventType.CARD_PLAYED, (event) => {
                const payload = (event as CardPlayedEvent).payload;
                this.onCardPlayed(payload);
            })
        );

        // 监听回合变化
        this.subscriptions.push(
            subscribeEvent(GameEventType.TURN_CHANGED, (event) => {
                const payload = (event as TurnChangedEvent).payload;
                this.onTurnChanged(payload);
            })
        );

        // 监听方向改变
        this.subscriptions.push(
            subscribeEvent(GameEventType.DIRECTION_CHANGED, (event) => {
                const payload = (event as DirectionChangedEvent).payload;
                this.onDirectionChanged(payload);
            })
        );

        // 监听玩家被跳过
        this.subscriptions.push(
            subscribeEvent(GameEventType.PLAYER_SKIPPED, (event) => {
                const payload = (event as PlayerSkippedEvent).payload;
                this.onPlayerSkipped(payload);
            })
        );

        // 监听弃牌堆更新
        this.subscriptions.push(
            subscribeEvent(GameEventType.DISCARD_UPDATED, (event) => {
                const payload = (event as DiscardUpdatedEvent).payload;
                this.onDiscardUpdated(payload);
            })
        );
    }

    /** 处理出牌事件 */
    private onCardPlayed(payload: CardPlayedEvent['payload']): void {
        // TODO: 播放出牌动画
        // TODO: 更新弃牌堆显示
        console.log(`[GameBoard] 玩家 ${payload.playerId} 出牌`);
    }

    /** 处理回合变化 */
    private onTurnChanged(payload: TurnChangedEvent['payload']): void {
        // TODO: 更新当前玩家指示器
        console.log(`[GameBoard] 轮到: ${payload.currentPlayerId}`);
    }

    /** 处理方向改变 */
    private onDirectionChanged(
        payload: DirectionChangedEvent['payload']
    ): void {
        // TODO: 旋转方向指示器
        console.log(`[GameBoard] 方向改变: ${payload.newDirection}`);
    }

    /** 处理玩家被跳过 */
    private onPlayerSkipped(payload: PlayerSkippedEvent['payload']): void {
        // TODO: 显示跳过提示动画
        console.log(`[GameBoard] 玩家 ${payload.skippedPlayerName} 被跳过`);
    }

    /** 处理弃牌堆更新 */
    private onDiscardUpdated(payload: DiscardUpdatedEvent['payload']): void {
        // TODO: 更新弃牌堆显示
        // TODO: 显示顶牌
        console.log(`[GameBoard] 弃牌堆: ${payload.discardCount} 张`);
    }

    /** 取消订阅 */
    public dispose(): void {
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions = [];
    }
}
