/**
 * 其他玩家手牌 UI 组件
 * 只展示卡背和数量，不展示真实牌面，不提供交互。
 *
 * 布局算法：
 * - 基于单卡中心预期间距与最大牌堆宽度计算 X 轴展开
 * - 当预期总宽度超过最大牌堆宽度时，自动压缩中心间距
 * - 使用实数曲线控制 Y 轴偏移，并按总扇形夹角均匀旋转
 */

import { _decorator, Component, Node, RealCurve, Tween, Vec3 } from 'cc';

import { eventBus, GameEventType } from '../../foundation/events';
import { Card } from '../../foundation/types/game.types';
import {
    animateCenterMergeExpand,
    CardMoveContext,
} from '../utils/card-move-animation';
import {
    applyCardLayoutTransform,
    calculateCurvedFanCardLayout,
    calculateCurvedFanCardLayouts,
    CardLayoutTransform,
    createDefaultPlacementCurve,
    CurvedFanLayoutConfig,
} from '../utils/hand-card-layout';
import { CardManager } from './card-manager';
import { HandView, PreparedPlayCard } from './hand-view-contract';

const { ccclass, property } = _decorator;

const OTHER_PLAYER_HAND_LAYOUT_GROUP = {
    name: 'Layout',
    id: 'other-player-hand-layout',
    displayOrder: 10,
};

const OTHER_PLAYER_HAND_BINDINGS_GROUP = {
    name: 'Bindings',
    id: 'other-player-hand-bindings',
    displayOrder: 20,
};

@ccclass('OtherPlayerHand')
export class OtherPlayerHand extends Component implements HandView {
    @property({
        type: CardManager,
        tooltip: '卡牌管理器，必须在编辑器中绑定',
        group: OTHER_PLAYER_HAND_BINDINGS_GROUP,
    })
    public cardManager!: CardManager;

    @property({
        tooltip: '单张卡牌中心点预期间距；未超过最大宽度时直接使用该间距',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public expectedCardSpacing: number = 96;

    @property({
        tooltip: '牌堆最大展开宽度；超过时按该宽度压缩中心间距',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public maxStackWidth: number = 420;

    @property({
        type: RealCurve,
        tooltip:
            '卡牌沿 X 轴展开时的 Y 轴偏移曲线；输入范围为 0 到 1，输出为本地坐标像素',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public placementCurve: RealCurve = createDefaultPlacementCurve();

    @property({
        tooltip: '实数曲线输出倍率；曲线为 -1 到 1 时，最终 Y 偏移为该倍率范围',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public placementCurveScale: number = 80;

    @property({
        tooltip: '总扇形夹角（度）；首张和最后一张卡牌的角度差等于该值',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public fanAngle: number = 0;

    @property({
        tooltip: '布局动画时长（秒）',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public layoutTweenDuration: number = 0.12;

    public playerId: string = '';
    private cardMoveContext: CardMoveContext = null!;
    private readonly cardNodes: Node[] = [];
    private readonly pendingPlayNodes = new Set<Node>();
    private lifecycleVersion: number = 0;

    public init(playerId: string, cardMoveContext: CardMoveContext): void {
        this.playerId = playerId;
        this.cardMoveContext = cardMoveContext;
        this.renderCardBacks(0, false);
    }

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
                this.invalidateLifecycle();
                this.renderCardBacks(0, false);
            },
            this
        );
    }

    private renderCardBacks(count: number, animated: boolean): void {
        this.syncCardNodes(count);
        this.refreshCurvedFanLayout(animated);
    }

    private syncCardNodes(targetCount: number): void {
        while (this.cardNodes.length < targetCount) {
            const node = this.cardManager.acquireCardBack(this.node);
            node.active = true;
            node.setSiblingIndex(this.cardNodes.length);
            this.cardNodes.push(node);
        }

        while (this.cardNodes.length > targetCount) {
            const node = this.cardNodes.pop()!;
            this.cardManager.releaseCard(node);
        }
    }

    private refreshCurvedFanLayout(animated: boolean): void {
        const layouts = calculateCurvedFanCardLayouts(
            this.cardNodes.length,
            this.getCurvedFanLayoutConfig()
        );

        for (let i = 0; i < layouts.length; i++) {
            const node = this.cardNodes[i];
            const layout = layouts[i];
            this.applyCardLayout(node, layout, animated);
        }
    }

    private applyCardLayout(
        node: Node,
        layout: CardLayoutTransform,
        animated: boolean
    ): void {
        Tween.stopAllByTarget(node);
        applyCardLayoutTransform(
            node,
            layout,
            animated,
            this.layoutTweenDuration
        );
    }

    private getCurvedFanLayoutConfig(): CurvedFanLayoutConfig {
        return {
            expectedCardSpacing: this.expectedCardSpacing,
            maxStackWidth: this.maxStackWidth,
            placementCurve: this.placementCurve,
            placementCurveScale: this.placementCurveScale,
            fanAngle: this.fanAngle,
        };
    }

    private animateCenterMergeExpand(lifecycleVersion: number): void {
        animateCenterMergeExpand(
            this.cardNodes,
            this,
            (animated) => {
                this.refreshCurvedFanLayout(animated);
            },
            () => this.lifecycleVersion === lifecycleVersion,
            this.cardMoveContext.animationConfig
        );
    }

    private clearCards(): void {
        this.releasePendingPlayNodes();
        while (this.cardNodes.length > 0) {
            const node = this.cardNodes.pop()!;
            this.cardManager.releaseCard(node);
        }
    }

    // ---------------------------------------------------------------------
    // HandView 协议实现
    // ---------------------------------------------------------------------

    /** 返回手牌逻辑数量（卡背节点数量） */
    public getLogicalCardCount(): number {
        return this.cardNodes.length;
    }

    /** 刷新手牌卡背布局，animated 为 true 时使用动画过渡 */
    public refreshHandLayout(animated: boolean): void {
        this.refreshCurvedFanLayout(animated);
    }

    /**
     * 准备出牌：从卡背手牌中弹出一张节点，异步翻为真实牌面后返回
     * PreparedPlayCard 供 HandPlayAnimator 构造 CardMoveItem。
     */
    public async preparePlayCard(card: Card): Promise<PreparedPlayCard | null> {
        const playNode = this.cardNodes.pop();
        if (!playNode) {
            return null;
        }

        this.pendingPlayNodes.add(playNode);
        this.refreshCurvedFanLayout(true);

        const lifecycleVersion = this.lifecycleVersion;
        await this.cardManager.setCardFace(playNode, card);

        if (!this.canApplyAsyncResult(lifecycleVersion)) {
            this.releasePendingPlayNode(playNode);
            return null;
        }

        if (!playNode.isValid || !this.pendingPlayNodes.has(playNode)) {
            return null;
        }

        const fromPosition = new Vec3(
            playNode.worldPosition.x,
            playNode.worldPosition.y,
            playNode.worldPosition.z
        );

        return {
            card,
            node: playNode,
            fromPosition,
        };
    }

    /** 释放已准备但未成功完成出牌动画的节点 */
    public releasePreparedPlayNode(node: Node): void {
        this.releasePendingPlayNode(node);
    }

    public dispose(): void {
        this.invalidateLifecycle();
        eventBus.targetOff(this);
        this.clearCards();
    }

    private releasePendingPlayNode(node: Node): void {
        if (!this.pendingPlayNodes.has(node)) {
            return;
        }
        this.pendingPlayNodes.delete(node);
        this.cardManager.releaseCard(node);
    }

    private releasePendingPlayNodes(): void {
        const nodes = Array.from(this.pendingPlayNodes);
        this.pendingPlayNodes.clear();
        for (const node of nodes) {
            this.cardManager.releaseCard(node);
        }
    }

    private invalidateLifecycle(): void {
        this.lifecycleVersion += 1;
    }

    private canApplyAsyncResult(lifecycleVersion: number): boolean {
        return this.isValid && this.lifecycleVersion === lifecycleVersion;
    }

    public appendDrawnCards(
        cards: readonly Card[],
        nodes: readonly Node[]
    ): void {
        for (const node of nodes) {
            this.cardNodes.push(node);
        }
        this.animateCenterMergeExpand(this.lifecycleVersion);
    }

    public getDrawTargetLayout(
        _card: Card,
        index: number,
        totalCount: number
    ): CardLayoutTransform {
        const drawIndex = this.cardNodes.length + index;
        return calculateCurvedFanCardLayout(
            drawIndex,
            totalCount,
            this.getCurvedFanLayoutConfig()
        );
    }
}
