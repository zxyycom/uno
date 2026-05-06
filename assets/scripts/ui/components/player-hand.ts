/**
 * 当前玩家手牌 UI 组件
 * 只负责人类玩家自己的手牌：扇形展开、可出牌高光、点击出牌、万能牌选色。
 * 其他玩家手牌应由独立组件展示卡背，不在这里处理。
 * - 纯计算函数：只根据输入计算手牌展示状态，不读写组件状态。
 * - 业务逻辑函数：响应事件、维护选中/待选色状态、通过 UIManager 发起出牌。
 * - 渲染函数：创建/销毁节点并把计算结果应用到 Cocos 节点。
 */

import { _decorator, Component, Node, RealCurve, Tween, Vec3 } from 'cc';

import { validateCanPlayCard } from '../../core/utils/input-validator';
import {
    CardPlayedPayload,
    eventBus,
    GameEventType,
    TurnChangedPayload,
} from '../../foundation/events';
import {
    Card,
    CardColor,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';
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
import {
    CardMoveCancelReason,
    CardMoveKind,
    CardMoveRequest,
    CardMoveRequestHandle,
} from './card-move-animator';

const { ccclass, property } = _decorator;

export type PlayerHandContext = CardMoveContext & {
    getTopCard(): TopCard;
    playCard(playerId: string, card: Card, chosenColor?: CardColor): void;
};

type HandCardView = {
    card: Card;
    node: Node;
    playable: boolean;
};

type FanLayoutConfig = {
    /** 可出牌卡牌向上抬升距离 */
    playableLift: number;
    /** 已选中卡牌额外向上抬升距离 */
    selectedLift: number;
};

type FanLayoutInput = {
    card: Card;
    baseLayout: CardLayoutTransform;
    isMyTurn: boolean;
    hoveredCardId: string | null;
    selectedCardId: string | null;
    topCard: TopCard;
    config: FanLayoutConfig;
};

type FanLayoutResult = CardLayoutTransform & {
    playable: boolean;
};

const PLAYER_HAND_LAYOUT_GROUP = {
    name: 'Layout',
    id: 'player-hand-layout',
    displayOrder: 10,
};
const PLAYER_HAND_BINDINGS_GROUP = {
    name: 'Bindings',
    id: 'player-hand-bindings',
    displayOrder: 20,
};

/**
 * 计算卡牌是否是需要选择颜色的万能牌。
 * 纯计算函数：只根据卡牌类型判断。
 */
function isWildCard(card: Card): boolean {
    return (
        card.type === UnoCardType.WILD || card.type === UnoCardType.WILD_DRAW_4
    );
}

/**
 * 判断当前卡牌在当前桌面顶牌下是否可出。
 * 纯计算函数：屏蔽"非自己回合/无顶牌"这类 UI 前置条件。
 */
function canPlayInCurrentTurn(
    card: Card,
    isMyTurn: boolean,
    topCard: TopCard
): boolean {
    return isMyTurn && validateCanPlayCard(card, topCard);
}

/**
 * 计算单张手牌的扇形位置、旋转、缩放和可出状态。
 * 纯计算函数：不创建节点、不启动 tween，方便单独测试和复用。
 */
function calculateFanCardLayout(input: FanLayoutInput): FanLayoutResult {
    const {
        baseLayout,
        card,
        config,
        hoveredCardId,
        isMyTurn,
        selectedCardId,
        topCard,
    } = input;
    const playable = canPlayInCurrentTurn(card, isMyTurn, topCard);
    const isSelected = selectedCardId === card.id;
    const isHovered = hoveredCardId === card.id;
    const isPlayableInTurn = isMyTurn && playable;
    const isPrimaryLiftActive = isHovered || isPlayableInTurn;
    const isSecondaryLiftActive = isPlayableInTurn && (isHovered || isSelected);
    const primaryLiftY = isPrimaryLiftActive ? config.playableLift : 0;
    const secondaryLiftY = isSecondaryLiftActive ? config.selectedLift : 0;
    const totalLift = primaryLiftY + secondaryLiftY;

    return {
        playable,
        position: new Vec3(
            baseLayout.position.x,
            baseLayout.position.y + totalLift,
            0
        ),
        scale: isMyTurn ? new Vec3(1, 1, 1) : new Vec3(0.92, 0.92, 1),
        angle: baseLayout.angle,
        siblingIndex: baseLayout.siblingIndex,
    };
}

@ccclass('PlayerHand')
export class PlayerHand extends Component {
    /** 卡牌管理器，必须在编辑器中绑定 */
    @property({
        type: CardManager,
        tooltip: '卡牌管理器，必须在编辑器中绑定',
        group: PLAYER_HAND_BINDINGS_GROUP,
    })
    public cardManager!: CardManager;

    @property({
        tooltip: '单张卡牌中心点预期间距；未超过最大宽度时直接使用该间距',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public expectedCardSpacing: number = 96;

    @property({
        tooltip: '牌堆最大展开宽度；超过时按该宽度压缩中心间距',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public maxStackWidth: number = 720;

    @property({
        type: RealCurve,
        tooltip:
            '卡牌沿 X 轴展开时的 Y 轴偏移曲线；输入范围为 0 到 1，输出为本地坐标像素',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public placementCurve: RealCurve = createDefaultPlacementCurve();

    @property({
        tooltip: '实数曲线输出倍率；曲线为 -1 到 1 时，最终 Y 偏移为该倍率范围',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public placementCurveScale: number = 80;

    @property({
        tooltip: '总扇形夹角（度）；首张和最后一张卡牌的角度差等于该值',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public fanAngle: number = 72;

    /** 可交互卡牌悬停时向上抬升距离，也是选中卡牌的基础抬升距离 */
    @property({
        tooltip: '可交互卡牌悬停时向上抬升距离，也是选中卡牌的基础抬升距离',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public playableLift: number = 32;

    /** 玩家选中卡牌后在基础抬升之上再增加的距离 */
    @property({
        tooltip: '玩家选中卡牌后在基础抬升之上再增加的距离',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public selectedLift: number = 22;

    /** 手牌重新布局动画时长，单位为秒 */
    @property({
        tooltip: '手牌重新布局动画时长，单位为秒',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public layoutTweenDuration: number = 0.18;

    /** 万能牌颜色选择面板节点 */
    @property({
        type: Node,
        tooltip: '万能牌颜色选择面板节点',
        group: PLAYER_HAND_BINDINGS_GROUP,
    })
    public wildColorPanel: Node = null!;

    /** 万能牌选择红色按钮节点 */
    @property({
        type: Node,
        tooltip: '万能牌选择红色按钮节点',
        group: PLAYER_HAND_BINDINGS_GROUP,
    })
    public wildRedButton: Node = null!;

    /** 万能牌选择黄色按钮节点 */
    @property({
        type: Node,
        tooltip: '万能牌选择黄色按钮节点',
        group: PLAYER_HAND_BINDINGS_GROUP,
    })
    public wildYellowButton: Node = null!;

    /** 万能牌选择绿色按钮节点 */
    @property({
        type: Node,
        tooltip: '万能牌选择绿色按钮节点',
        group: PLAYER_HAND_BINDINGS_GROUP,
    })
    public wildGreenButton: Node = null!;

    /** 万能牌选择蓝色按钮节点 */
    @property({
        type: Node,
        tooltip: '万能牌选择蓝色按钮节点',
        group: PLAYER_HAND_BINDINGS_GROUP,
    })
    public wildBlueButton: Node = null!;

    private readonly cardViewsById = new Map<string, HandCardView>();
    private handOrder: string[] = [];
    public playerId: string = '';
    private uiContext: PlayerHandContext = null!;
    private isMyTurn: boolean = false;
    private hoveredCardId: string | null = null;
    private selectedCardId: string | null = null;
    private pendingWildCard: Card | null = null;
    private readonly cardIdsByNode = new WeakMap<Node, string>();
    private activePlayHandle: CardMoveRequestHandle | null = null;
    private lifecycleVersion: number = 0;
    private requestSequence: number = 0;

    /** 初始化手牌归属玩家，并清空旧手牌节点 */
    public init(playerId: string, uiContext: PlayerHandContext): void {
        this.playerId = playerId;
        this.uiContext = uiContext;
        this.clearCards();
    }

    start() {
        this.bindWildColorButtons();
        this.hideWildColorPanel();
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    // ---------------------------------------------------------------------
    // 事件订阅与事件响应
    // ---------------------------------------------------------------------

    /** 初始化游戏事件订阅，所有回调都绑定 this 方便统一释放 */
    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.invalidateLifecycle();
                this.cancelActivePlayRequest(CardMoveCancelReason.Requested);
                this.hoveredCardId = null;
                this.selectCard(null, false);
                this.pendingWildCard = null;
                this.hideWildColorPanel();
                this.clearCards();
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
            GameEventType.TURN_CHANGED,
            (payload) => {
                this.onTurnChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.CALL_UNO,
            (payload) => {
                if (payload.player.id === this.playerId) {
                    this.onUnoCalled();
                }
            },
            this
        );
    }

    /** 响应回合变化事件：维护当前回合状态，并刷新可出牌提示 */
    private onTurnChanged(payload: TurnChangedPayload): void {
        this.isMyTurn = payload.currentPlayer.id === this.playerId;
        if (!this.isMyTurn) {
            this.hoveredCardId = null;
            this.selectCard(null, false);
            this.pendingWildCard = null;
            this.hideWildColorPanel();
        }
        this.refreshFanLayout(true);
    }

    /** 处理 UNO 呼叫，可在这里挂接后续提示动画 */
    private onUnoCalled(): void {
        // TODO: 挂接 UNO 呼叫提示动画
    }

    // ---------------------------------------------------------------------
    // 渲染与节点操作
    // ---------------------------------------------------------------------

    /** 刷新扇形布局与可出牌抬升，渲染层只负责应用纯计算结果 */
    private refreshFanLayout(animated: boolean): void {
        const orderedViews = this.getOrderedViews();
        const count = orderedViews.length;
        if (count === 0) {
            return;
        }

        const topCard = this.uiContext.getTopCard();
        const config = this.getFanLayoutConfig();
        const baseLayouts = calculateCurvedFanCardLayouts(
            count,
            this.getCurvedFanLayoutConfig()
        );

        for (let i = 0; i < count; i++) {
            const view = orderedViews[i];
            const layout = calculateFanCardLayout({
                card: view.card,
                baseLayout: baseLayouts[i],
                isMyTurn: this.isMyTurn,
                hoveredCardId: this.hoveredCardId,
                selectedCardId: this.selectedCardId,
                topCard,
                config,
            });

            view.playable = layout.playable;
            Tween.stopAllByTarget(view.node);
            applyCardLayoutTransform(
                view.node,
                layout,
                animated,
                this.layoutTweenDuration
            );
        }
    }

    /** 清除所有卡牌节点和点击事件绑定 */
    private clearCards(): void {
        this.cancelActivePlayRequest(CardMoveCancelReason.Requested);

        if (this.cardViewsById.size === 0) {
            this.handOrder = [];
            return;
        }

        for (const view of this.cardViewsById.values()) {
            this.releaseView(view);
        }
        this.cardViewsById.clear();
        this.handOrder = [];
    }

    /** 外部共享状态变化后刷新可出牌提示 */
    public refreshPlayableCards(animated: boolean): void {
        this.refreshFanLayout(animated);
    }

    // ---------------------------------------------------------------------
    // 出牌业务逻辑
    // ---------------------------------------------------------------------

    /** 点击卡牌：首次选中，二次点击出牌 */
    private onCardTapped(cardId: string): void {
        if (!this.isMyTurn) {
            return;
        }

        const view = this.cardViewsById.get(cardId);
        if (!view || !view.playable) {
            return;
        }

        if (this.selectedCardId !== cardId) {
            this.hoveredCardId = null;
            this.selectCard(view.card, true);
            return;
        }

        this.tryPlayCard(view.card);
    }

    private onCardPlayed(payload: CardPlayedPayload): void {
        if (payload.player.id !== this.playerId) {
            return;
        }

        this.startPlayToDiscard(payload.card);
    }

    private startPlayToDiscard(card: Card): void {
        const view = this.cardViewsById.get(card.id);
        if (!view) {
            return;
        }

        this.cancelActivePlayRequest(CardMoveCancelReason.Requested);
        this.hoveredCardId = null;
        this.selectCard(null, false);
        this.pendingWildCard = null;
        this.hideWildColorPanel();

        this.cardViewsById.delete(card.id);
        this.handOrder = this.handOrder.filter((cardId) => cardId !== card.id);
        this.unregisterCardNode(view.node);

        const requestId = this.createRequestId('play');
        const lifecycleVersion = this.lifecycleVersion;
        const request: CardMoveRequest = {
            id: requestId,
            kind: CardMoveKind.PlayToDiscard,
            playerId: this.playerId,
            items: [
                {
                    card,
                    node: view.node,
                    fromPosition: new Vec3(
                        view.node.worldPosition.x,
                        view.node.worldPosition.y,
                        view.node.worldPosition.z
                    ),
                    toPosition: new Vec3(
                        this.uiContext.discardPileNode.worldPosition.x,
                        this.uiContext.discardPileNode.worldPosition.y,
                        this.uiContext.discardPileNode.worldPosition.z
                    ),
                    targetParent: this.uiContext.discardStackLayerNode,
                    targetRotation: 0,
                    targetScale: Vec3.ONE,
                    targetLayer: this.uiContext.discardStackLayerNode,
                },
            ],
            onCompleted: () => {
                if (!this.isCurrentPlayRequest(requestId, lifecycleVersion)) {
                    return;
                }
                this.activePlayHandle = null;
                this.uiContext.acceptDiscardNode(card, view.node);
            },
            onCancelled: () => {
                this.releasePreparedNode(view.node);
                if (this.activePlayHandle?.id === requestId) {
                    this.activePlayHandle = null;
                }
            },
        };

        this.activePlayHandle = this.uiContext.animator.requestMove(request);
        this.refreshFanLayout(true);
    }

    /** 鼠标悬停或触摸开始时预抬升卡牌，结束时恢复；已选中的卡牌保持抬升 */
    private onCardHoverChanged(cardId: string, hovering: boolean): void {
        const view = this.cardViewsById.get(cardId);
        if (!view) {
            return;
        }

        if (hovering) {
            if (this.hoveredCardId === cardId) {
                return;
            }
            this.hoveredCardId = cardId;
            this.refreshFanLayout(true);
            return;
        }

        if (this.hoveredCardId !== cardId) {
            return;
        }

        this.hoveredCardId = null;
        this.refreshFanLayout(true);
    }

    /** 尝试出牌：普通牌直接发送，万能牌先进入待选色流程 */
    private tryPlayCard(card: Card, chosenColor?: CardColor): void {
        if (isWildCard(card) && !chosenColor) {
            this.pendingWildCard = card;
            this.showWildColorPanel();
            return;
        }

        this.pendingWildCard = null;
        this.hideWildColorPanel();
        this.uiContext.playCard(this.playerId, card, chosenColor);
    }

    /** 绑定万能牌颜色按钮，点击后会继续完成待处理的万能牌出牌 */
    private bindWildColorButtons(): void {
        this.bindColorButton(this.wildRedButton, CardColor.RED);
        this.bindColorButton(this.wildYellowButton, CardColor.YELLOW);
        this.bindColorButton(this.wildGreenButton, CardColor.GREEN);
        this.bindColorButton(this.wildBlueButton, CardColor.BLUE);
    }

    /** 绑定单个颜色按钮 */
    private bindColorButton(node: Node, color: CardColor): void {
        node.on(
            Node.EventType.TOUCH_END,
            () => {
                this.onWildColorSelected(color);
            },
            this
        );
    }

    /** 万能牌选色：把颜色带回 tryPlayCard，统一由出牌流程发事件 */
    private onWildColorSelected(color: CardColor): void {
        if (!this.pendingWildCard) {
            this.hideWildColorPanel();
            return;
        }

        const card = this.pendingWildCard;
        this.selectCard(card, false);
        this.tryPlayCard(card, color);
    }

    /** 显示万能牌颜色选择面板 */
    private showWildColorPanel(): void {
        this.wildColorPanel.active = true;
    }

    /** 隐藏万能牌颜色选择面板 */
    private hideWildColorPanel(): void {
        this.wildColorPanel.active = false;
    }

    /** 汇总布局配置，便于纯计算函数只接收必要数据 */
    private getFanLayoutConfig(): FanLayoutConfig {
        return {
            playableLift: this.playableLift,
            selectedLift: this.selectedLift,
        };
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

    /** 更新当前选中卡牌并发送专门的卡牌选择事件 */
    private selectCard(card: Card | null, refreshLayout: boolean): void {
        let nextCardId: string | null = null;
        if (card) {
            nextCardId = card.id;
        }
        if (this.selectedCardId === nextCardId) {
            return;
        }

        this.selectedCardId = nextCardId;
        if (this.selectedCardId) {
            this.hoveredCardId = null;
        }
        eventBus.emit(GameEventType.CARD_SELECTED, {
            playerId: this.playerId,
            card,
        });

        if (refreshLayout) {
            this.refreshFanLayout(true);
        }
    }

    /** 取消订阅并清理运行时节点 */
    public dispose(): void {
        this.invalidateLifecycle();
        eventBus.targetOff(this);
        this.hideWildColorPanel();
        this.clearCards();
    }

    private registerCardView(card: Card, node: Node): void {
        const existingView = this.cardViewsById.get(card.id);
        if (existingView) {
            this.releasePreparedNode(node);
            existingView.card = card;
            return;
        }

        this.cardViewsById.set(card.id, {
            card,
            node,
            playable: false,
        });
        this.cardIdsByNode.set(node, card.id);
        node.setParent(this.node);
        node.active = true;
    }

    private releaseViewById(cardId: string): void {
        const view = this.cardViewsById.get(cardId);
        if (!view) {
            return;
        }

        this.cardViewsById.delete(cardId);
        this.releaseView(view);
    }

    private releaseView(view: HandCardView): void {
        this.unregisterCardNode(view.node);
        this.cardManager.releaseCard(view.node);
    }

    private unregisterCardNode(node: Node): void {
        if (node.isValid) {
            node.targetOff(this);
            this.cardIdsByNode.delete(node);
        }
    }

    private releasePreparedNode(node: Node): void {
        this.unregisterCardNode(node);
        this.cardManager.releaseCard(node);
    }

    private getOrderedViews(): HandCardView[] {
        const views: HandCardView[] = [];
        for (const cardId of this.handOrder) {
            const view = this.cardViewsById.get(cardId);
            if (view) {
                views.push(view);
            }
        }
        return views;
    }

    /** 从摸牌动画系统接收已创建并定位好的卡牌节点，注册视图并触发布局动画 */
    public appendDrawnCards(
        cards: readonly Card[],
        nodes: readonly Node[]
    ): void {
        const lifecycleVersion = this.lifecycleVersion;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const node = nodes[i];

            this.registerCardView(card, node);
            this.handOrder.push(card.id);

            node.on(
                Node.EventType.TOUCH_END,
                () => {
                    this.onCardTapped(card.id);
                    this.onCardHoverChanged(card.id, false);
                },
                this
            );
            node.on(
                Node.EventType.MOUSE_ENTER,
                () => {
                    this.onCardHoverChanged(card.id, true);
                },
                this
            );
            node.on(
                Node.EventType.MOUSE_LEAVE,
                () => {
                    this.onCardHoverChanged(card.id, false);
                },
                this
            );
            node.on(
                Node.EventType.TOUCH_START,
                () => {
                    this.onCardHoverChanged(card.id, true);
                },
                this
            );
            node.on(
                Node.EventType.TOUCH_CANCEL,
                () => {
                    this.onCardHoverChanged(card.id, false);
                },
                this
            );
        }

        this.animateCenterMergeExpand(lifecycleVersion);
    }

    /** 获取单张待摸入卡牌在手牌扇形展开中的目标布局 */
    public getDrawTargetLayout(
        card: Card,
        index: number,
        totalCount: number
    ): CardLayoutTransform {
        const drawIndex = this.handOrder.length + index;
        return calculateCurvedFanCardLayout(
            drawIndex,
            totalCount,
            this.getCurvedFanLayoutConfig()
        );
    }

    private animateCenterMergeExpand(lifecycleVersion: number): void {
        animateCenterMergeExpand(
            this.getOrderedViews().map((view) => view.node),
            this,
            (animated) => {
                this.refreshFanLayout(animated);
            },
            () => this.lifecycleVersion === lifecycleVersion,
            this.uiContext.animationConfig
        );
    }

    private cancelActivePlayRequest(reason: CardMoveCancelReason): void {
        const handle = this.activePlayHandle;
        if (!handle) {
            return;
        }
        this.activePlayHandle = null;
        handle.cancel(reason);
    }

    private createRequestId(prefix: string): string {
        this.requestSequence += 1;
        return `${this.playerId}-${prefix}-${this.requestSequence}`;
    }

    private invalidateLifecycle(): void {
        this.lifecycleVersion += 1;
    }

    private isCurrentPlayRequest(
        requestId: string,
        lifecycleVersion: number
    ): boolean {
        return (
            this.lifecycleVersion === lifecycleVersion &&
            this.activePlayHandle?.id === requestId
        );
    }
}
