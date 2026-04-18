/**
 * 牌堆UI组件
 * 显示剩余牌数量
 */

import { _decorator, Component, Label } from 'cc';

import { eventBus, GameEventType } from '../../foundation/events';

const { ccclass, property } = _decorator;

@ccclass('DeckComponent')
export class DeckComponent extends Component {
    @property(Label)
    public countLabel: Label | null = null;

    private currentCount: number = 0;

    start() {
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
                this.updateDeckCount(0);
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

    dispose(): void {
        eventBus.targetOff(this);
    }
}
