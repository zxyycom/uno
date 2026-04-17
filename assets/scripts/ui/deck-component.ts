/**
 * 牌堆UI组件
 * 显示剩余牌数量
 */

import { _decorator, Component, Label } from "cc";
import {
    GameEventType,
    DeckUpdatedEvent,
    subscribeEvent,
} from "../events/game.events";

const { ccclass, property } = _decorator;

@ccclass("DeckComponent")
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
        // 监听牌堆更新
        subscribeEvent(GameEventType.DECK_UPDATED, (event: DeckUpdatedEvent) => {
            this.updateDeckCount(event.payload.count);
        });

        // 监听游戏开始，重置牌堆
        subscribeEvent(GameEventType.START_GAME, () => {
            this.updateDeckCount(0);
        });
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
        // 清理订阅
    }
}
