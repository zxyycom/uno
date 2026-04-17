/**
 * 玩家手牌UI组件
 * 监听手牌更新事件
 */

import { _decorator, Component, instantiate, Node, Prefab } from 'cc';

import { eventBus, GameEventType, HandUpdatedPayload } from '../events';
import { Card } from '../types/game.types';

const { ccclass, property } = _decorator;

@ccclass('PlayerHand')
export class PlayerHand extends Component {
    @property(Prefab)
    public cardPrefab: Prefab | null = null;

    @property
    public maxVisibleCards: number = 10;

    private cardNodes: Node[] = [];
    private playerId: string = '';

    /**
     * 初始化手牌（指定玩家ID）
     */
    public init(playerId: string): void {
        this.playerId = playerId;
        this.clearCards();
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
            GameEventType.HAND_UPDATED,
            (payload) => {
                if (payload.playerId === this.playerId) {
                    this.onHandUpdated(payload);
                }
            },
            this
        );

        eventBus.on(
            GameEventType.CALL_UNO,
            (payload) => {
                if (payload.playerId === this.playerId) {
                    this.onUnoCalled();
                }
            },
            this
        );
    }

    /** 处理手牌更新 */
    private onHandUpdated(payload: HandUpdatedPayload): void {
        this.updateCardDisplay(payload.hand, payload.cardCount);
    }

    /** 处理UNO呼叫 */
    private onUnoCalled(): void {
        // TODO: 显示UNO提示动画
        console.log(`[PlayerHand] ${this.playerId} 呼叫 UNO!`);
    }

    /** 更新卡牌显示 */
    private updateCardDisplay(hand: Card[], cardCount: number): void {
        // 清除现有卡牌
        this.clearCards();

        // 实例化新卡牌
        const displayCount = Math.min(cardCount, this.maxVisibleCards);
        for (let i = 0; i < displayCount; i++) {
            this.spawnCard(hand[i], i, displayCount);
        }
    }

    /** 生成单张卡牌 */
    private spawnCard(card: Card, index: number, total: number): void {
        if (!this.cardPrefab || !card) return;

        const cardNode = instantiate(this.cardPrefab);
        cardNode.setParent(this.node);

        // TODO: 设置卡牌位置（扇形排列）
        // TODO: 设置卡牌数据
        // TODO: 绑定点击事件

        this.cardNodes.push(cardNode);
    }

    /** 清除所有卡牌 */
    private clearCards(): void {
        for (const node of this.cardNodes) {
            node.destroy();
        }
        this.cardNodes = [];
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
    }
}
