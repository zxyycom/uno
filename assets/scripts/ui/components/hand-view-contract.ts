/**
 * 手牌视图协议与共享类型
 * 定义 PlayerHand 与 OtherPlayerHand 的共同接口，供 HandDrawAnimator 与
 * HandPlayAnimator 共同依赖。共享层只位于 UI 层，不引入 Core 依赖反向引用。
 */

import { Node, Vec3 } from 'cc';

import { Card } from '../../foundation/types/game.types';
import { CardLayoutTransform } from '../utils/hand-card-layout';
import { CardManager } from './card-manager';

/**
 * 出牌准备结果：包含待打出的卡牌数据、对应节点及其当前世界坐标。
 * 由 HandView.preparePlayCard 返回，供出牌动画 item 构造使用。
 */
export type PreparedPlayCard = {
    card: Card;
    node: Node;
    fromPosition: Vec3;
};

/**
 * 手牌视图协议
 * PlayerHand 与 OtherPlayerHand 共同实现该接口，使得摸牌动画与出牌动画组件
 * 可以面向协议编程，无需区分本地/远程玩家。
 */
export interface HandView {
    readonly cardManager: CardManager;

    /** 返回手牌逻辑数量（非节点子元素数量） */
    getLogicalCardCount(): number;

    /** 获取单张待摸入卡牌在手牌扇形展开中的目标布局 */
    getDrawTargetLayout(
        card: Card,
        index: number,
        totalCount: number
    ): CardLayoutTransform;

    /** 从摸牌动画系统接收已创建并定位好的卡牌节点，注册视图并触发布局动画 */
    appendDrawnCards(cards: readonly Card[], nodes: readonly Node[]): void;

    /** 准备出牌：从手牌中取出对应卡牌/卡背节点，捕获当前世界坐标 */
    preparePlayCard(card: Card): Promise<PreparedPlayCard | null>;

    /** 释放已准备但未成功完成出牌动画的节点 */
    releasePreparedPlayNode(node: Node): void;

    /** 刷新手牌布局，animated 为 true 时使用动画过渡 */
    refreshHandLayout(animated: boolean): void;
}
