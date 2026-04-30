/**
 * 牌堆UI组件
 * 显示剩余牌数量
 */

import { _decorator, Component, Label, Node } from 'cc';

import { LocalPlayerProfile } from '../../client/local-player-profile';
import { GameManager } from '../../core/machine/game-manager';
import { eventBus, GameEventType } from '../../foundation/events';

const { ccclass, property } = _decorator;

@ccclass('DeckComponent')
export class DeckComponent extends Component {
    @property(Label)
    public countLabel: Label | null = null;

    @property
    public initialCount: number = -1;

    private currentCount: number = 0;

    start() {
        this.node.on(Node.EventType.TOUCH_END, this.onDeckTapped, this);
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.DECK_UPDATED,
            (payload) => {
                this.updateDeckCount(payload.remainingCards);
            },
            this
        );

        eventBus.on(
            GameEventType.START_GAME,
            () => {
                if (this.initialCount >= 0) {
                    this.updateDeckCount(this.initialCount);
                    return;
                }
                this.updateDeckCount(0);
            },
            this
        );

        eventBus.on(
            GameEventType.CARDS_DRAWN,
            (payload) => {
                if (this.currentCount > 0) {
                    this.updateDeckCount(
                        Math.max(this.currentCount - payload.cards.length, 0)
                    );
                }
            },
            this
        );
    }

    /** 更新牌堆数量显示 */
    public updateDeckCount(count: number): void {
        this.currentCount = count;
        if (this.countLabel) {
            this.countLabel.string = count.toString();
        }
    }

    /** 获取当前牌堆数量 */
    public getCount(): number {
        return this.currentCount;
    }

    private onDeckTapped(): void {
        const localPlayerId =
            LocalPlayerProfile.getInstance().getLocalPlayerId();
        GameManager.getInstance()?.drawCard(localPlayerId);
    }

    dispose(): void {
        this.node.off(Node.EventType.TOUCH_END, this.onDeckTapped, this);
        eventBus.targetOff(this);
    }
}
