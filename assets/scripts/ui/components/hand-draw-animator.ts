/**
 * 手牌摸牌动画组件
 * 集中处理所有玩家的摸牌到手牌动画，统一创建节点、计算布局、提交动画请求。
 * 仅消费事件并驱动动画，不发送全局事件。
 */

import { _decorator, Component, Node } from 'cc';

import {
    CardsDrawnPayload,
    eventBus,
    GameEventType,
} from '../../foundation/events';
import { Card } from '../../foundation/types/game.types';
import { createDrawToHandMoveItems } from '../utils/card-move-animation';
import { CardLayoutTransform } from '../utils/hand-card-layout';
import { CardMoveKind, CardMoveRequest } from './card-move-animator';
import { HandView } from './hand-view-contract';
import { UIManager } from './ui-manager';

const { ccclass } = _decorator;

@ccclass('HandDrawAnimator')
export class HandDrawAnimator extends Component {
    private requestSequence: number = 0;

    start() {
        this.initEventSubscriptions();
    }

    onDestroy() {
        eventBus.targetOff(this);
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.CARDS_DRAWN,
            (payload) => {
                void this.onCardsDrawn(payload);
            },
            this
        );
    }

    private async onCardsDrawn(payload: CardsDrawnPayload): Promise<void> {
        if (payload.cards.length === 0) {
            return;
        }

        const uiManager = UIManager.getInstance()!;
        const targetHand = uiManager.resolveHandView(payload.player.id);
        if (!targetHand) {
            return;
        }

        const { cards } = payload;
        const isLocalPlayer = targetHand === uiManager.playerHand;
        const currentHandCount = targetHand.getLogicalCardCount();
        const totalCount = currentHandCount + cards.length;

        const { nodes, cardOrder } = await this.createCardNodes(
            targetHand,
            cards,
            isLocalPlayer
        );

        const layouts: CardLayoutTransform[] = [];
        for (let i = 0; i < cards.length; i++) {
            layouts.push(
                targetHand.getDrawTargetLayout(cards[i], i, totalCount)
            );
        }

        const requestId = this.createRequestId();
        const request: CardMoveRequest = {
            id: requestId,
            kind: CardMoveKind.DrawToHand,
            playerId: payload.player.id,
            items: createDrawToHandMoveItems(
                cardOrder,
                nodes,
                layouts,
                uiManager.deckNode.worldPosition,
                targetHand.node,
                uiManager.discardStackLayerNode,
                uiManager.animationConfig.drawStaggerDelay
            ),
            onCompleted: () => {
                targetHand.appendDrawnCards(cardOrder, nodes);
            },
            onCancelled: () => {
                this.releaseNodes(targetHand, nodes);
            },
        };

        uiManager.cardMoveAnimator.requestMove(request);
    }

    private async createCardNodes(
        targetHand: HandView,
        cards: readonly Card[],
        isLocalPlayer: boolean
    ): Promise<{ nodes: Node[]; cardOrder: Card[] }> {
        const nodes: Node[] = [];

        if (isLocalPlayer) {
            for (const card of cards) {
                const node = await targetHand.cardManager.acquireCard(
                    card,
                    targetHand.node
                );
                nodes.push(node);
            }
        } else {
            for (let i = 0; i < cards.length; i++) {
                nodes.push(
                    targetHand.cardManager.acquireCardBack(targetHand.node)
                );
            }
        }

        return { nodes, cardOrder: [...cards] };
    }

    private releaseNodes(
        targetHand: HandView,
        nodes: readonly Node[]
    ): void {
        for (const node of nodes) {
            targetHand.cardManager.releaseCard(node);
        }
    }

    private createRequestId(): string {
        this.requestSequence += 1;
        return `hand-draw-${this.requestSequence}`;
    }
}
