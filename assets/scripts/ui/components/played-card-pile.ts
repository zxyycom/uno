/**
 * 已出牌牌堆UI组件
 * 负责桌面弃牌堆展示、接管飞入后的弃牌节点、洗牌清空。
 */

import { _decorator, Component, Node, Tween, UITransform, Vec3 } from 'cc';

import {
    DiscardUpdatedPayload,
    eventBus,
    GameEventType,
} from '../../foundation/events';
import { Card } from '../../foundation/types/game.types';
import { CardManager } from './card-manager';

const { ccclass, property } = _decorator;

@ccclass('PlayedCardPile')
export class PlayedCardPile extends Component {
    @property(Node)
    public discardPileNode: Node = null!;

    @property(Node)
    public tableCardLayerNode: Node = null!;

    @property({
        type: CardManager,
        tooltip: '卡牌管理器，必须在编辑器中绑定',
    })
    public cardManager: CardManager = null!;

    @property
    public maxStackedDiscardCards: number = 18;

    @property
    public discardStackOffsetX: number = 4;

    @property
    public discardStackOffsetY: number = -2;

    @property
    public discardStackAngleStep: number = 2;

    private discardTopCardNode: Node | null = null;
    private discardCardNodes: Node[] = [];
    private discardVisualVersion: number = 0;

    start() {
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.clearDiscardCards();
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

        eventBus.on(
            GameEventType.DISCARD_CLEARED,
            () => {
                this.clearDiscardCards();
            },
            this
        );
    }

    /** 初始或同步弃牌堆：空视觉状态下直接放置顶牌 */
    private onDiscardUpdated(payload: DiscardUpdatedPayload): void {
        if (payload.discardCount <= 0) {
            this.clearDiscardCards();
            return;
        }
        if (this.discardTopCardNode) {
            return;
        }
        void this.placeDiscardTopInstant(payload.topCard);
    }

    public acceptDiscardNode(_card: Card, node: Node): void {
        this.setAsDiscardTop(node);
    }

    /** 初始顶牌直接放置到弃牌堆 */
    private async placeDiscardTopInstant(card: Card): Promise<void> {
        const visualVersion = this.discardVisualVersion;
        const cardNode = await this.cardManager.acquireCard(
            card,
            this.tableCardLayerNode
        );
        cardNode.active = true;

        if (visualVersion !== this.discardVisualVersion || !cardNode.isValid) {
            this.releaseDiscardCardNode(cardNode);
            return;
        }

        const parentTransform =
            this.tableCardLayerNode.getComponent(UITransform)!;
        const discardLocal = parentTransform.convertToNodeSpaceAR(
            this.discardPileNode.worldPosition
        );
        cardNode.setPosition(discardLocal);
        cardNode.setScale(Vec3.ONE);
        cardNode.angle = 0;

        this.setAsDiscardTop(cardNode);
    }

    private setAsDiscardTop(cardNode: Node): void {
        Tween.stopAllByTarget(cardNode);
        cardNode.setParent(this.tableCardLayerNode);
        cardNode.active = true;
        this.discardCardNodes.push(cardNode);
        while (this.discardCardNodes.length > this.maxStackedDiscardCards) {
            const staleCardNode = this.discardCardNodes.shift()!;
            Tween.stopAllByTarget(staleCardNode);
            this.releaseDiscardCardNode(staleCardNode);
        }
        this.discardTopCardNode = cardNode;
        this.layoutDiscardStack();
    }

    private layoutDiscardStack(): void {
        if (this.discardCardNodes.length === 0) {
            return;
        }

        const parentTransform =
            this.tableCardLayerNode.getComponent(UITransform)!;
        const basePosition = parentTransform.convertToNodeSpaceAR(
            this.discardPileNode.worldPosition
        );
        for (let i = 0; i < this.discardCardNodes.length; i++) {
            const cardNode = this.discardCardNodes[i];
            const spreadIndex = i % 9;
            cardNode.setPosition(
                basePosition.x + spreadIndex * this.discardStackOffsetX,
                basePosition.y + spreadIndex * this.discardStackOffsetY,
                0
            );
            cardNode.angle = (spreadIndex - 4) * this.discardStackAngleStep;
            cardNode.setScale(Vec3.ONE);
            cardNode.setSiblingIndex(i);
        }
    }

    private clearDiscardCards(): void {
        this.discardVisualVersion += 1;
        for (const cardNode of this.discardCardNodes) {
            Tween.stopAllByTarget(cardNode);
            this.releaseDiscardCardNode(cardNode);
        }
        if (
            this.discardTopCardNode &&
            !this.discardCardNodes.includes(this.discardTopCardNode)
        ) {
            Tween.stopAllByTarget(this.discardTopCardNode);
            this.releaseDiscardCardNode(this.discardTopCardNode);
        }
        this.releaseDiscardCardRefs();
    }

    private releaseDiscardCardNode(cardNode: Node): void {
        if (cardNode.isValid) {
            this.cardManager.releaseCard(cardNode);
        }
    }

    private releaseDiscardCardRefs(): void {
        this.discardCardNodes = [];
        this.discardTopCardNode = null;
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
        this.clearDiscardCards();
    }
}
