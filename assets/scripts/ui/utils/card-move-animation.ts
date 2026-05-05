/**
 * 卡牌移动动画工具
 * 只提供动画配置、请求 item 构造和手牌合并展开效果，不访问业务事件。
 */

import { Component, Node, tween, Tween, UITransform, Vec3 } from 'cc';

import { Card } from '../../foundation/types/game.types';
import {
    CardMoveAnimator,
    CardMoveAnimatorConfig,
    CardMoveItem,
} from '../components/card-move-animator';
import { CardLayoutTransform } from './hand-card-layout';

export type CardMoveAnimationConfig = CardMoveAnimatorConfig & {
    /** 摸多张牌时每张卡牌的错峰飞入延迟，单位为秒 */
    drawStaggerDelay: number;
    /** 手牌先向中心合并的动画时长，单位为秒 */
    centerMergeDuration: number;
    /** 合并到中心后等待展开的时间，单位为秒 */
    centerExpandDelay: number;
};

export const DEFAULT_CARD_MOVE_ANIMATION_CONFIG: CardMoveAnimationConfig = {
    moveDuration: 0.28,
    drawStaggerDelay: 0.06,
    centerMergeDuration: 0.14,
    centerExpandDelay: 0.04,
};

export type CardMoveContext = {
    animator: CardMoveAnimator;
    deckNode: Node;
    discardPileNode: Node;
    discardStackLayerNode: Node;
    acceptDiscardNode(card: Card, node: Node): void;
    animationConfig: CardMoveAnimationConfig;
};

export function createDrawToHandMoveItems(
    cards: readonly Card[],
    nodes: readonly Node[],
    layouts: readonly CardLayoutTransform[],
    fromWorldPosition: Vec3,
    targetParent: Node,
    targetLayer: Node,
    drawStaggerDelay: number
): CardMoveItem[] {
    const parentTransform = targetParent.getComponent(UITransform)!;
    const items: CardMoveItem[] = [];

    for (let i = 0; i < cards.length; i++) {
        const layout = layouts[i];
        items.push({
            card: cards[i],
            node: nodes[i],
            fromPosition: new Vec3(
                fromWorldPosition.x,
                fromWorldPosition.y,
                fromWorldPosition.z
            ),
            toPosition: parentTransform.convertToWorldSpaceAR(layout.position),
            targetParent,
            targetRotation: layout.angle,
            targetScale: layout.scale,
            targetLayer,
            targetSiblingIndex: layout.siblingIndex,
            delay: drawStaggerDelay * i,
        });
    }

    return items;
}

export function animateCenterMergeExpand(
    nodes: readonly Node[],
    component: Component,
    refreshLayout: (animated: boolean) => void,
    canRun: () => boolean,
    config: CardMoveAnimationConfig
): void {
    if (nodes.length === 0) {
        return;
    }

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const isLastNode = i === nodes.length - 1;
        Tween.stopAllByTarget(node);

        const sequence = tween(node)
            .to(config.centerMergeDuration, {
                position: Vec3.ZERO,
                angle: 0,
            })
            .delay(config.centerExpandDelay);

        if (isLastNode) {
            sequence.call(() => {
                if (!component.isValid || !canRun()) {
                    return;
                }
                refreshLayout(true);
            });
        }

        sequence.start();
    }
}
