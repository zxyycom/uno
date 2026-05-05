/**
 * 卡牌移动动画服务
 * UI 层内部使用的请求式卡牌飞行动画组件，不通过全局事件系统通信。
 */

import {
    _decorator,
    Component,
    Node,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';

import { Card } from '../../foundation/types/game.types';

const { ccclass, property } = _decorator;

export enum CardMoveKind {
    PlayToDiscard = 'play-to-discard',
    DrawToHand = 'draw-to-hand',
}

export enum CardMoveCancelReason {
    Requested = 'requested',
    NodeReplaced = 'node-replaced',
    NodeInvalid = 'node-invalid',
    ComponentDestroyed = 'component-destroyed',
}

export type CardMoveAnimatorConfig = {
    moveDuration: number;
};

export type CardMoveItem = {
    card: Card;
    node: Node;
    fromPosition: Vec3;
    toPosition: Vec3;
    targetParent: Node;
    targetRotation: number;
    targetScale: Vec3;
    targetLayer: Node;
    targetSiblingIndex?: number;
    delay?: number;
};

export type CardMoveRequest = {
    id: string;
    kind: CardMoveKind;
    playerId: string;
    items: readonly CardMoveItem[];
    onCompleted?: (request: CardMoveRequest) => void;
    onCancelled?: (
        request: CardMoveRequest,
        reason: CardMoveCancelReason
    ) => void;
};

export type CardMoveRequestHandle = {
    readonly id: string;
    cancel(reason: CardMoveCancelReason): void;
    isActive(): boolean;
};

type ActiveCardMoveRequest = {
    request: CardMoveRequest;
    remainingCount: number;
};

@ccclass('CardMoveAnimator')
export class CardMoveAnimator extends Component {
    @property({
        tooltip: '单张卡牌飞行动画时长，单位为秒',
    })
    public moveDuration: number = 0.28;

    private readonly activeRequestsById = new Map<
        string,
        ActiveCardMoveRequest
    >();
    private readonly activeAnimationIdsByNode = new Map<Node, string>();

    public initialize(config: CardMoveAnimatorConfig): void {
        this.moveDuration = config.moveDuration;
    }

    public requestMove(request: CardMoveRequest): CardMoveRequestHandle {
        if (this.activeRequestsById.has(request.id)) {
            this.cancelRequest(request.id, CardMoveCancelReason.Requested);
        }

        this.cancelExistingRequestsForNodes(request.items);

        const activeRequest: ActiveCardMoveRequest = {
            request,
            remainingCount: request.items.length,
        };
        this.activeRequestsById.set(request.id, activeRequest);

        for (const item of request.items) {
            this.activeAnimationIdsByNode.set(item.node, request.id);
            this.startMoveItem(request.id, item);
            if (!this.activeRequestsById.has(request.id)) {
                break;
            }
        }

        if (activeRequest.remainingCount === 0) {
            this.completeRequest(activeRequest);
        }

        return {
            id: request.id,
            cancel: (reason: CardMoveCancelReason) => {
                this.cancelRequest(request.id, reason);
            },
            isActive: () => this.activeRequestsById.has(request.id),
        };
    }

    onDestroy() {
        this.cancelAllRequests(CardMoveCancelReason.ComponentDestroyed);
    }

    private cancelExistingRequestsForNodes(
        items: readonly CardMoveItem[]
    ): void {
        for (const item of items) {
            const activeRequestId = this.activeAnimationIdsByNode.get(
                item.node
            );
            if (typeof activeRequestId === 'string') {
                this.cancelRequest(
                    activeRequestId,
                    CardMoveCancelReason.NodeReplaced
                );
            }
        }
    }

    private startMoveItem(requestId: string, item: CardMoveItem): void {
        if (!item.node.isValid) {
            this.cancelRequest(requestId, CardMoveCancelReason.NodeInvalid);
            return;
        }

        Tween.stopAllByTarget(item.node);

        const layerTransform = item.targetLayer.getComponent(UITransform)!;
        item.node.setParent(item.targetLayer);
        item.node.setPosition(
            layerTransform.convertToNodeSpaceAR(item.fromPosition)
        );
        item.node.active = true;

        tween(item.node)
            .delay(this.getItemDelay(item))
            .to(this.moveDuration, {
                position: layerTransform.convertToNodeSpaceAR(item.toPosition),
                angle: item.targetRotation,
                scale: item.targetScale,
            })
            .call(() => {
                this.completeItem(requestId, item);
            })
            .start();
    }

    private completeItem(requestId: string, item: CardMoveItem): void {
        const activeRequest = this.activeRequestsById.get(requestId);
        if (!activeRequest) {
            return;
        }

        if (!item.node.isValid) {
            this.cancelRequest(requestId, CardMoveCancelReason.NodeInvalid);
            return;
        }

        this.activeAnimationIdsByNode.delete(item.node);
        this.applyTargetTransform(item);
        activeRequest.remainingCount -= 1;

        if (activeRequest.remainingCount === 0) {
            this.completeRequest(activeRequest);
        }
    }

    private applyTargetTransform(item: CardMoveItem): void {
        const parentTransform = item.targetParent.getComponent(UITransform)!;
        item.node.setParent(item.targetParent);
        item.node.setPosition(
            parentTransform.convertToNodeSpaceAR(item.toPosition)
        );
        item.node.angle = item.targetRotation;
        item.node.setScale(item.targetScale);

        if (typeof item.targetSiblingIndex === 'number') {
            item.node.setSiblingIndex(item.targetSiblingIndex);
        }
    }

    private completeRequest(activeRequest: ActiveCardMoveRequest): void {
        this.activeRequestsById.delete(activeRequest.request.id);
        activeRequest.request.onCompleted?.(activeRequest.request);
    }

    private cancelRequest(
        requestId: string,
        reason: CardMoveCancelReason
    ): void {
        const activeRequest = this.activeRequestsById.get(requestId);
        if (!activeRequest) {
            return;
        }

        this.activeRequestsById.delete(requestId);
        this.clearRequestNodeIndexes(activeRequest.request);
        activeRequest.request.onCancelled?.(activeRequest.request, reason);
    }

    private cancelAllRequests(reason: CardMoveCancelReason): void {
        const requestIds = Array.from(this.activeRequestsById.keys());
        for (const requestId of requestIds) {
            this.cancelRequest(requestId, reason);
        }
    }

    private clearRequestNodeIndexes(request: CardMoveRequest): void {
        for (const item of request.items) {
            Tween.stopAllByTarget(item.node);
            const activeRequestId = this.activeAnimationIdsByNode.get(
                item.node
            );
            if (activeRequestId === request.id) {
                this.activeAnimationIdsByNode.delete(item.node);
            }
        }
    }

    private getItemDelay(item: CardMoveItem): number {
        if (typeof item.delay === 'number') {
            return item.delay;
        }
        return 0;
    }
}
