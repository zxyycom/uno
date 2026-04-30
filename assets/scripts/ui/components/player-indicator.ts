/**
 * 玩家指示器组件
 * 显示当前玩家和玩家状态
 */

import { _decorator, Component, Label, Node, Sprite } from 'cc';

import {
    eventBus,
    GameEventType,
    HandUpdatedPayload,
    TurnChangedPayload,
} from '../../foundation/events';

const { ccclass, property } = _decorator;

@ccclass('PlayerIndicator')
export class PlayerIndicator extends Component {
    @property(Label)
    public nameLabel: Label | null = null;

    @property(Sprite)
    public avatarSprite: Sprite | null = null;

    @property(Node)
    public activeIndicator: Node | null = null;

    @property(Node)
    public unoIndicator: Node | null = null;

    @property(Label)
    public cardCountLabel: Label | null = null;

    private playerId: string = '';

    /**
     * 初始化玩家指示器
     */
    public init(playerId: string, playerName: string): void {
        this.playerId = playerId;
        if (this.nameLabel) {
            this.nameLabel.string = playerName;
        }
    }

    start() {
        this.setActive(false);
        this.hideUnoIndicator();
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.hideUnoIndicator();
                this.setActive(false);
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
            GameEventType.HAND_UPDATED,
            (payload) => {
                this.onHandUpdated(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.CALL_UNO,
            (payload) => {
                if (payload.player.id === this.playerId) {
                    this.showUnoIndicator();
                }
            },
            this
        );
    }

    /** 处理回合变化 */
    private onTurnChanged(payload: TurnChangedPayload): void {
        const isActive = payload.currentPlayer.id === this.playerId;
        this.setActive(isActive);
    }

    /** 处理手牌更新 */
    private onHandUpdated(payload: HandUpdatedPayload): void {
        if (payload.playerId !== this.playerId) {
            return;
        }
        this.updateCardCount(payload.cardCount);
        if (payload.cardCount !== 1) {
            this.hideUnoIndicator();
        }
    }

    private lastActiveState: boolean = false;

    /** 设置激活状态 */
    public setActive(active: boolean): void {
        if (active === this.lastActiveState) return;
        this.lastActiveState = active;
        if (this.activeIndicator) {
            this.activeIndicator.active = active;
        }
    }

    /** 更新手牌数量 */
    public updateCardCount(count: number): void {
        if (this.cardCountLabel) {
            this.cardCountLabel.string = count.toString();
        }

        // UNO警告
        if (count === 1) {
            // TODO: 显示剩余1张警告
        }
    }

    /** 显示UNO指示器 */
    public showUnoIndicator(): void {
        if (this.unoIndicator) {
            this.unoIndicator.active = true;
            // TODO: 播放UNO动画
        }
    }

    /** 隐藏UNO指示器 */
    public hideUnoIndicator(): void {
        if (this.unoIndicator) {
            this.unoIndicator.active = false;
        }
    }

    /** 获取玩家ID */
    public getPlayerId(): string {
        return this.playerId;
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
    }
}
