/**
 * 已出牌牌堆UI组件
 * 负责桌面弃牌堆展示、出牌飞入动画、洗牌清空。
 */

import {
    _decorator,
    Component,
    isValid,
    Node,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';

import {
    CardPlayedPayload,
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
    public discardPileNode: Node | null = null;

    @property(Node)
    public tableCardLayerNode: Node | null = null;

    @property(Node)
    public deckNode: Node | null = null;

    @property({
        type: CardManager,
        tooltip: '卡牌管理器，必须在编辑器中绑定',
    })
    public cardManager: CardManager | null = null;

    @property
    public discardFlyDuration: number = 0.28;

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
    private discardAnimating: boolean = false;
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
            GameEventType.CARD_PLAYED,
            (payload) => {
                this.onCardPlayed(payload);
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

    /** 出牌：从牌堆飞到弃牌堆 */
    private onCardPlayed(payload: CardPlayedPayload): void {
        void this.animateCardToDiscard(payload.card);
    }

    /** 初始或同步弃牌堆：没有动画时直接放置顶牌 */
    private onDiscardUpdated(payload: DiscardUpdatedPayload): void {
        if (payload.discardCount <= 0) {
            this.clearDiscardCards();
            return;
        }
        if (this.discardAnimating) {
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

    /** 从牌堆飞到弃牌堆并保留牌面朝上 */
    private async animateCardToDiscard(card: Card): Promise<void> {
        if (!this.cardManager || !this.deckNode || !this.discardPileNode) {
            return;
        }

        const discardParent = this.tableCardLayerNode || this.node;
        const parentTransform = discardParent.getComponent(UITransform);
        if (!parentTransform) {
            return;
        }

        this.discardAnimating = true;
        const visualVersion = this.discardVisualVersion;

        const cardNode = await this.cardManager.acquireCard(
            card,
            discardParent
        );
        cardNode.active = true;

        const deckLocal = parentTransform.convertToNodeSpaceAR(
            this.deckNode.worldPosition
        );
        const discardLocal = parentTransform.convertToNodeSpaceAR(
            this.discardPileNode.worldPosition
        );
        cardNode.setPosition(deckLocal);
        cardNode.setScale(0.9, 0.9, 1);
        cardNode.angle = 0;

        if (visualVersion !== this.discardVisualVersion || !cardNode.isValid) {
            this.destroyDiscardCardNode(cardNode);
            return;
        }

        await new Promise<void>((resolve) => {
            tween(cardNode)
                .to(this.discardFlyDuration, {
                    position: discardLocal,
                    scale: Vec3.ONE,
                })
                .call(() => {
                    resolve();
                })
                .start();
        });

        if (visualVersion !== this.discardVisualVersion || !cardNode.isValid) {
            this.destroyDiscardCardNode(cardNode);
            return;
        }

        this.setAsDiscardTop(cardNode);
        this.discardAnimating = false;
    }

    /** 初始顶牌直接放置到弃牌堆 */
    private async placeDiscardTopInstant(card: Card): Promise<void> {
        if (!this.cardManager || !this.discardPileNode) {
            return;
        }

        const discardParent = this.tableCardLayerNode || this.node;
        const parentTransform = discardParent.getComponent(UITransform);
        if (!parentTransform) {
            return;
        }

        const visualVersion = this.discardVisualVersion;
        const cardNode = await this.cardManager.acquireCard(
            card,
            discardParent
        );
        cardNode.active = true;

        const discardLocal = parentTransform.convertToNodeSpaceAR(
            this.discardPileNode.worldPosition
        );
        cardNode.setPosition(discardLocal);
        cardNode.setScale(Vec3.ONE);
        cardNode.angle = 0;

        if (visualVersion !== this.discardVisualVersion || !cardNode.isValid) {
            this.destroyDiscardCardNode(cardNode);
            return;
        }

        this.setAsDiscardTop(cardNode);
    }

    private setAsDiscardTop(cardNode: Node): void {
        this.discardCardNodes.push(cardNode);
        while (this.discardCardNodes.length > this.maxStackedDiscardCards) {
            const staleCardNode = this.discardCardNodes.shift()!;
            Tween.stopAllByTarget(staleCardNode);
            this.destroyDiscardCardNode(staleCardNode);
        }
        this.discardTopCardNode = cardNode;
        this.layoutDiscardStack();
    }

    private layoutDiscardStack(): void {
        if (!this.discardPileNode || this.discardCardNodes.length === 0) {
            return;
        }

        const discardParent = this.tableCardLayerNode || this.node;
        const parentTransform = discardParent.getComponent(UITransform);
        if (!parentTransform) {
            return;
        }

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
            cardNode.setSiblingIndex(i);
        }
    }

    private clearDiscardCards(): void {
        this.discardVisualVersion += 1;
        for (const cardNode of this.discardCardNodes) {
            Tween.stopAllByTarget(cardNode);
            this.destroyDiscardCardNode(cardNode);
        }
        if (
            this.discardTopCardNode &&
            !this.discardCardNodes.includes(this.discardTopCardNode)
        ) {
            Tween.stopAllByTarget(this.discardTopCardNode);
            this.destroyDiscardCardNode(this.discardTopCardNode);
        }
        this.releaseDiscardCardRefs();
    }

    private destroyDiscardCardNode(cardNode: Node): void {
        if (isValid(cardNode, true)) {
            cardNode.destroy();
        }
    }

    private releaseDiscardCardRefs(): void {
        this.discardCardNodes = [];
        this.discardTopCardNode = null;
        this.discardAnimating = false;
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
        this.discardVisualVersion += 1;
        for (const cardNode of this.discardCardNodes) {
            Tween.stopAllByTarget(cardNode);
        }
        if (this.discardTopCardNode) {
            Tween.stopAllByTarget(this.discardTopCardNode);
        }
        this.releaseDiscardCardRefs();
    }
}
