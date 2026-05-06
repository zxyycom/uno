/**
 * 出牌动画共享工具
 * 负责构造 CardMoveKind.PlayToDiscard 的 CardMoveItem，
 * 避免出牌动画 item 构造逻辑散落在 PlayerHand 和 OtherPlayerHand 中。
 */

import { Node, Vec3 } from 'cc';

import { CardMoveItem } from '../components/card-move-animator';
import { PreparedPlayCard } from '../components/hand-view-contract';

/**
 * 构造单张卡牌从手牌飞到弃牌堆的 CardMoveItem。
 * fromPosition 由 PreparedPlayCard 携带（取自 preparePlayCard 时的世界坐标），
 * toPosition 取目标弃牌堆节点的当前世界坐标。
 */
export function createPlayToDiscardMoveItem(
    prepared: PreparedPlayCard,
    discardPileNode: Node,
    discardStackLayerNode: Node
): CardMoveItem {
    return {
        card: prepared.card,
        node: prepared.node,
        fromPosition: prepared.fromPosition,
        toPosition: new Vec3(
            discardPileNode.worldPosition.x,
            discardPileNode.worldPosition.y,
            discardPileNode.worldPosition.z
        ),
        targetParent: discardStackLayerNode,
        targetRotation: 0,
        targetScale: Vec3.ONE,
        targetLayer: discardStackLayerNode,
    };
}
