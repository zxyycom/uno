/**
 * 牌堆UI组件
 * 显示剩余卡牌数量
 */

import { _decorator, Component, Node, Label } from "cc";
import {
    GameEventType,
    DeckUpdatedEvent,
    DrawRequiredEvent,
    subscribeEvent,
} from "../events/game.events";

const { ccclass, property } = _decorator;

@ccclass("DeckComponent")
export class DeckComponent extends Component {
    @property(Label)
    public countLabel: Label | null = null;

    @property(Node)
    public deckVisual: Node | null = null;

    private currentCount: number = 0;
    private subscriptions: Array<() => void> = [];

    start() {
        this.initEventSubscriptions();
        this.updateDisplay(108); // 初始108张
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
    private initEventSubscriptions(): void {
        // 监听牌堆更新
        this.subscriptions.push(
            subscribeEvent(GameEventType.DECK_UPDATED, (event) => {
                const payload = (event as DeckUpdatedEvent).payload;
                this.updateDisplay(payload.remainingCards);
            })
        );

        // 监听需要抽牌
        this.subscriptions.push(
            subscribeEvent(GameEventType.DRAW_REQUIRED, (event) => {
                const payload = (event as DrawRequiredEvent).payload;
                this.onDrawRequired(payload);
            })
        );
    }

    /** 更新牌堆显示 */
    private updateDisplay(remainingCards: number): void {
        this.currentCount = remainingCards;

        if (this.countLabel) {
            this.countLabel.string = remainingCards.toString();
        }

        // TODO: 根据剩余数量调整视觉大小
        // 牌堆越少视觉越小
        if (this.deckVisual) {
            const scale = 0.5 + (remainingCards / 108) * 0.5;
            this.deckVisual.setScale(scale, scale, 1);
        }
    }

    /** 处理需要抽牌 */
    private onDrawRequired(payload: DrawRequiredEvent["payload"]): void {
        // TODO: 播放抽牌动画
        // TODO: 闪烁提示
        console.log(`[Deck] 需要抽 ${payload.cardCount} 张牌`);
    }

    /** 取消订阅 */
    public dispose(): void {
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions = [];
    }
}
