/**
 * 玩家指示器组件
 * 显示当前玩家和玩家状态
 */

import { _decorator, Component, Label, Node, Sprite } from 'cc';

import {
    CurrentPlayerUpdatedPayload,
    eventBus,
    GameEventType,
} from '../events';

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
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.CURRENT_PLAYER_UPDATED,
            (payload) => {
                this.onCurrentPlayerUpdated(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.HAND_UPDATED,
            (payload) => {
                if (payload.playerId === this.playerId) {
                    this.updateCardCount(payload.cardCount);
                }
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

    /** 处理当前玩家更新 */
    private onCurrentPlayerUpdated(payload: CurrentPlayerUpdatedPayload): void {
        const isActive = payload.player.id === this.playerId;
        this.setActive(isActive);
    }

    /** 设置激活状态 */
    public setActive(active: boolean): void {
        if (this.activeIndicator) {
            this.activeIndicator.active = active;
        }

        // TODO: 添加动画效果
        if (active) {
            console.log(`[PlayerIndicator] ${this.playerId} 回合开始`);
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
