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
import {
    CardMoveCancelReason,
    CardMoveKind,
    CardMoveRequest,
    CardMoveRequestHandle,
} from './card-move-animator';
import { OtherPlayerHand } from './other-player-hand';
import { PlayerHand } from './player-hand';
import { UIManager } from './ui-manager';
import { createDrawToHandMoveItems } from '../utils/card-move-animation';
import { CardLayoutTransform } from '../utils/hand-card-layout';

const { ccclass } = _decorator;

@ccclass('HandDrawAnimator')
export class HandDrawAnimator extends Component {
    private activeHandle: CardMoveRequestHandle | null = null;
    private requestSequence: number = 0;

    start() {
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.cancelActiveRequest(CardMoveCancelReason.ComponentDestroyed);
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

        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.cancelActiveRequest(CardMoveCancelReason.Requested);
            },
            this
        );
    }

    private async onCardsDrawn(payload: CardsDrawnPayload): Promise<void> {
        if (payload.cards.length === 0) {
            return;
        }

        const uiManager = UIManager.getInstance()!;
        const targetHand = this.resolveTargetHand(payload.player.id, uiManager);
        if (!targetHand) {
            return;
        }

        this.cancelActiveRequest(CardMoveCancelReason.Requested);

        const { cards } = payload;
        const isLocalPlayer = targetHand === uiManager.playerHand;
        const currentHandCount = targetHand.node.children.length;
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
                this.activeHandle = null;
                targetHand.appendDrawnCards(cardOrder, nodes);
            },
            onCancelled: () => {
                this.releaseNodes(targetHand, nodes);
                if (this.activeHandle?.id === requestId) {
                    this.activeHandle = null;
                }
            },
        };

        this.activeHandle = uiManager.cardMoveAnimator.requestMove(request);
    }

    private resolveTargetHand(
        playerId: string,
        uiManager: UIManager
    ): PlayerHand | OtherPlayerHand | null {
        if (uiManager.playerHand.playerId === playerId) {
            return uiManager.playerHand;
        }
        if (uiManager.otherPlayerHandRight.playerId === playerId) {
            return uiManager.otherPlayerHandRight;
        }
        if (uiManager.otherPlayerHandTop.playerId === playerId) {
            return uiManager.otherPlayerHandTop;
        }
        if (uiManager.otherPlayerHandLeft.playerId === playerId) {
            return uiManager.otherPlayerHandLeft;
        }
        return null;
    }

    private async createCardNodes(
        targetHand: PlayerHand | OtherPlayerHand,
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
        targetHand: PlayerHand | OtherPlayerHand,
        nodes: readonly Node[]
    ): void {
        for (const node of nodes) {
            targetHand.cardManager.releaseCard(node);
        }
    }

    private cancelActiveRequest(reason: CardMoveCancelReason): void {
        const handle = this.activeHandle;
        if (!handle) {
            return;
        }
        this.activeHandle = null;
        handle.cancel(reason);
    }

    private createRequestId(): string {
        this.requestSequence += 1;
        return `hand-draw-${this.requestSequence}`;
    }
}
