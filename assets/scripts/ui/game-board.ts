/**
 * 游戏桌面UI组件
 * 监听游戏事件更新桌面显示
 */

import { _decorator, Component, Node } from 'cc';

import {
    CardPlayedPayload,
    DirectionChangedPayload,
    DiscardUpdatedPayload,
    eventBus,
    GameEventType,
    PlayerSkippedPayload,
    TurnChangedPayload,
} from '../events';

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

    start() {
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.CARD_PLAYED,
            (payload) => {
                this.onCardPlayed(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.TURN_CHANGED,
            (payload) => {
                this.onTurnChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.DIRECTION_CHANGED,
            (payload) => {
                this.onDirectionChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.PLAYER_SKIPPED,
            (payload) => {
                this.onPlayerSkipped(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.DISCARD_UPDATED,
            (payload) => {
                this.onDiscardUpdated(payload);
            },
            this
        );
    }

    /** 处理出牌事件 */
    private onCardPlayed(payload: CardPlayedPayload): void {
        // TODO: 播放出牌动画
        // TODO: 更新弃牌堆显示
        console.log(`[GameBoard] 玩家 ${payload.player.id} 出牌`);
    }

    /** 处理回合变化 */
    private onTurnChanged(payload: TurnChangedPayload): void {
        // TODO: 更新当前玩家指示器
        console.log(`[GameBoard] 轮到: ${payload.currentPlayer.id}`);
    }

    /** 处理方向改变 */
    private onDirectionChanged(payload: DirectionChangedPayload): void {
        // TODO: 旋转方向指示器
        console.log(`[GameBoard] 方向改变: ${payload.newDirection}`);
    }

    /** 处理玩家被跳过 */
    private onPlayerSkipped(payload: PlayerSkippedPayload): void {
        // TODO: 显示跳过提示动画
        console.log(`[GameBoard] 玩家 ${payload.skippedPlayer.name} 被跳过`);
    }

    /** 处理弃牌堆更新 */
    private onDiscardUpdated(payload: DiscardUpdatedPayload): void {
        // TODO: 更新弃牌堆显示
        // TODO: 显示顶牌
        console.log(`[GameBoard] 弃牌堆: ${payload.discardCount} 张`);
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
    }
}
