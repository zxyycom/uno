/**
 * 手牌出牌动画组件
 * 集中处理所有玩家的出牌到弃牌堆动画，统一准备卡牌、构造动画项、提交动画请求。
 * 仅消费事件并驱动动画，不发送全局事件。
 */

import { _decorator, Component } from 'cc';

import {
    CardPlayedPayload,
    eventBus,
    GameEventType,
} from '../../foundation/events';
import { createPlayToDiscardMoveItem } from '../utils/hand-play-animation';
import { CardMoveKind, CardMoveRequest } from './card-move-animator';
import { UIManager } from './ui-manager';

const { ccclass } = _decorator;

@ccclass('HandPlayAnimator')
export class HandPlayAnimator extends Component {
    private requestSequence: number = 0;

    start() {
        this.initEventSubscriptions();
    }

    onDestroy() {
        eventBus.targetOff(this);
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.CARD_PLAYED,
            (payload) => {
                void this.onCardPlayed(payload);
            },
            this
        );
    }

    private async onCardPlayed(payload: CardPlayedPayload): Promise<void> {
        const uiManager = UIManager.getInstance()!;
        const targetHand = uiManager.resolveHandView(payload.player.id);
        if (!targetHand) {
            return;
        }

        const prepared = await targetHand.preparePlayCard(payload.card);
        if (!prepared) {
            return;
        }

        const requestId = this.createRequestId();
        const request: CardMoveRequest = {
            id: requestId,
            kind: CardMoveKind.PlayToDiscard,
            playerId: payload.player.id,
            items: [
                createPlayToDiscardMoveItem(
                    prepared,
                    uiManager.discardPileNode,
                    uiManager.discardStackLayerNode
                ),
            ],
            onCompleted: () => {
                uiManager.playedCardPile.acceptDiscardNode(
                    prepared.card,
                    prepared.node
                );
            },
            onCancelled: () => {
                targetHand.releasePreparedPlayNode(prepared.node);
            },
        };

        uiManager.cardMoveAnimator.requestMove(request);
    }

    private createRequestId(): string {
        this.requestSequence += 1;
        return `hand-play-${this.requestSequence}`;
    }
}
