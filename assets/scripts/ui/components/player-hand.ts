/**
 * 当前玩家手牌 UI 组件
 * 只负责人类玩家自己的手牌：扇形展开、可出牌高光、点击出牌、万能牌选色。
 * 其他玩家手牌应由独立组件展示卡背，不在这里处理。
 * - 纯计算函数：只根据输入计算手牌展示状态，不读写组件状态。
 * - 业务逻辑函数：响应事件、维护选中/待选色状态、通过 UIManager 发起出牌。
 * - 渲染函数：创建/销毁节点并把计算结果应用到 Cocos 节点。
 */

import {
    _decorator,
    Component,
    Node,
    Sprite,
    tween,
    Tween,
    UIOpacity,
    Vec3,
} from 'cc';

import { loadCardSprite } from '../../core/deck/deck-resources';
import { validateCanPlayCard } from '../../core/utils/input-validator';
import {
    eventBus,
    GameEventType,
    HandUpdatedPayload,
    TurnChangedPayload,
} from '../../foundation/events';
import {
    Card,
    CardColor,
    TopCard,
    UnoCardType,
} from '../../foundation/types/game.types';
import { CardNodePool } from './card-node-pool';

const { ccclass, property } = _decorator;

export type PlayerHandContext = {
    getTopCard(): TopCard | null;
    playCard(playerId: string, card: Card, chosenColor?: CardColor): void;
};

type HandCardView = {
    card: Card;
    node: Node;
    playable: boolean;
};

type FanLayoutConfig = {
    /** 手牌扇形半径上限，数值越大卡牌横向跨度上限越大 */
    fanRadius: number;
    /** 每张手牌带来的扇形半径增量 */
    fanRadiusPerCard: number;
    /** 当前玩家回合时的总展开角度 */
    turnSpreadAngle: number;
    /** 非当前玩家回合时的总展开角度 */
    idleSpreadAngle: number;
    /** 可出牌卡牌向上抬升距离 */
    playableLift: number;
    /** 已选中卡牌额外向上抬升距离 */
    selectedLift: number;
    /** 扇形弧度系数 */
    arcYFactor: number;
    /** 卡牌旋转系数 */
    rotationFactor: number;
    /** 不可出牌透明度 */
    disabledCardOpacity: number;
    /** 可出牌透明度 */
    enabledCardOpacity: number;
};

type FanLayoutInput = {
    card: Card;
    index: number;
    total: number;
    isMyTurn: boolean;
    hoveredCardId: string | null;
    selectedCardId: string | null;
    topCard: TopCard | null;
    config: FanLayoutConfig;
};

type FanLayoutResult = {
    playable: boolean;
    position: Vec3;
    scale: Vec3;
    angle: number;
    opacity: number;
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
 * 根据回合状态选择扇形展开角度。
 * 纯计算函数：只返回数值，不依赖组件内部状态。
 */
function getSpreadAngle(
    isMyTurn: boolean,
    turnSpreadAngle: number,
    idleSpreadAngle: number
): number {
    return isMyTurn ? turnSpreadAngle : idleSpreadAngle;
}

/**
 * 根据手牌数量计算扇形半径，避免固定半径导致展开过于直接。
 * 纯计算函数：按 n * perCard 线性增长，并受 maxRadius 上限约束。
 */
function getFanRadius(
    totalCards: number,
    fanRadiusPerCard: number,
    maxRadius: number
): number {
    const calculatedRadius = totalCards * fanRadiusPerCard;
    return Math.min(calculatedRadius, maxRadius);
}

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
 * 纯计算函数：屏蔽“非自己回合/无顶牌”这类 UI 前置条件。
 */
function canPlayInCurrentTurn(
    card: Card,
    isMyTurn: boolean,
    topCard: TopCard | null
): boolean {
    return Boolean(isMyTurn && topCard && validateCanPlayCard(card, topCard));
}

/**
 * 计算单张手牌的扇形位置、旋转、缩放、透明度和可出状态。
 * 纯计算函数：不创建节点、不启动 tween，方便单独测试和复用。
 */
function calculateFanCardLayout(input: FanLayoutInput): FanLayoutResult {
    const {
        card,
        config,
        hoveredCardId,
        index,
        isMyTurn,
        selectedCardId,
        topCard,
        total,
    } = input;
    const spread = getSpreadAngle(
        isMyTurn,
        config.turnSpreadAngle,
        config.idleSpreadAngle,
    );
    const fanRadius = getFanRadius(total, config.fanRadiusPerCard, config.fanRadius);
    const halfSpread = spread / 2;
    const t = total === 1 ? 0.5 : index / (total - 1);
    const angle = -halfSpread + spread * t;
    const radian = (angle * Math.PI) / 180;
    const playable = canPlayInCurrentTurn(card, isMyTurn, topCard);
    const x = Math.sin(radian) * fanRadius;
    const arcY = (Math.cos(radian) - 1) * fanRadius * config.arcYFactor;
    const isSelected = selectedCardId === card.id;
    const isHovered = hoveredCardId === card.id;
    const isPlayableInTurn = isMyTurn && playable;
    const isPrimaryLiftActive = isHovered || isPlayableInTurn;
    const isSecondaryLiftActive =
        isPlayableInTurn && (isHovered || isSelected);
    const primaryLiftY = isPrimaryLiftActive ? config.playableLift : 0;
    const secondaryLiftY = isSecondaryLiftActive ? config.selectedLift : 0;
    const totalLift = primaryLiftY + secondaryLiftY;
    const liftX = Math.sin(radian) * totalLift;
    const liftY = Math.cos(radian) * totalLift;

    return {
        playable,
        position: new Vec3(x + liftX, arcY + liftY, 0),
        scale: isMyTurn ? new Vec3(1, 1, 1) : new Vec3(0.92, 0.92, 1),
        angle: -angle * config.rotationFactor,
        opacity:
            isMyTurn && !playable
                ? config.disabledCardOpacity
                : config.enabledCardOpacity,
    };
}

@ccclass('PlayerHand')
export class PlayerHand extends Component {
    /** 卡牌节点对象池，必须在编辑器中绑定；不提供默认对象池 */
    @property({
        type: CardNodePool,
        tooltip: '卡牌节点对象池，必须在编辑器中绑定；不提供默认对象池',
        group: PLAYER_HAND_BINDINGS_GROUP,
    })
    public cardNodePool!: CardNodePool;

    /** 手牌扇形半径上限，数值越大卡牌横向跨度上限越大 */
    @property({
        tooltip: '手牌扇形半径上限，数值越大卡牌横向跨度上限越大',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public fanRadius: number = 360;

    /** 每张手牌带来的扇形半径增量，最终会受扇形半径上限限制 */
    @property({
        tooltip: '每张手牌带来的扇形半径增量，最终会受扇形半径上限限制',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public fanRadiusPerCard: number = 48;

    /** 当前玩家回合时的总展开角度，角度越大手牌越分散 */
    @property({
        tooltip: '当前玩家回合时的总展开角度，角度越大手牌越分散',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public turnSpreadAngle: number = 72;

    /** 非当前玩家回合时的总展开角度，用于收拢手牌 */
    @property({
        tooltip: '非当前玩家回合时的总展开角度，用于收拢手牌',
        group: PLAYER_HAND_LAYOUT_GROUP,
    })
    public idleSpreadAngle: number = 16;

    /** 可交互卡牌悬停时向上抬升距离，也是选中卡牌的基础抬升距离 */
    @property({ tooltip: '可交互卡牌悬停时向上抬升距离，也是选中卡牌的基础抬升距离', group: PLAYER_HAND_LAYOUT_GROUP })
    public playableLift: number = 32;

    /** 玩家选中卡牌后在基础抬升之上再增加的距离 */
    @property({ tooltip: '玩家选中卡牌后在基础抬升之上再增加的距离', group: PLAYER_HAND_LAYOUT_GROUP })
    public selectedLift: number = 22;

    /** 扇形弧度系数，数值越大两侧下沉越明显 */
    @property({ tooltip: '扇形弧度系数，数值越大两侧下沉越明显', group: PLAYER_HAND_LAYOUT_GROUP })
    public arcYFactor: number = 0.8;

    /** 卡牌旋转系数，1 表示中轴直接朝向圆心方向 */
    @property({ tooltip: '卡牌旋转系数，1 表示中轴直接朝向圆心方向', group: PLAYER_HAND_LAYOUT_GROUP })
    public rotationFactor: number = 1;

    /** 非可出牌透明度，用于弱化不可出牌项 */
    @property({ tooltip: '非可出牌透明度，用于弱化不可出牌项', group: PLAYER_HAND_LAYOUT_GROUP })
    public disabledCardOpacity: number = 150;

    /** 可出牌透明度 */
    @property({ tooltip: '可出牌透明度', group: PLAYER_HAND_LAYOUT_GROUP })
    public enabledCardOpacity: number = 255;

    /** 手牌重新布局动画时长，单位为秒 */
    @property({ tooltip: '手牌重新布局动画时长，单位为秒', group: PLAYER_HAND_LAYOUT_GROUP })
    public layoutTweenDuration: number = 0.18;

    /** 万能牌颜色选择面板节点 */
    @property({ type: Node, tooltip: '万能牌颜色选择面板节点', group: PLAYER_HAND_BINDINGS_GROUP })
    public wildColorPanel: Node | null = null;

    /** 万能牌选择红色按钮节点 */
    @property({ type: Node, tooltip: '万能牌选择红色按钮节点', group: PLAYER_HAND_BINDINGS_GROUP })
    public wildRedButton: Node | null = null;

    /** 万能牌选择黄色按钮节点 */
    @property({ type: Node, tooltip: '万能牌选择黄色按钮节点', group: PLAYER_HAND_BINDINGS_GROUP })
    public wildYellowButton: Node | null = null;

    /** 万能牌选择绿色按钮节点 */
    @property({ type: Node, tooltip: '万能牌选择绿色按钮节点', group: PLAYER_HAND_BINDINGS_GROUP })
    public wildGreenButton: Node | null = null;

    /** 万能牌选择蓝色按钮节点 */
    @property({ type: Node, tooltip: '万能牌选择蓝色按钮节点', group: PLAYER_HAND_BINDINGS_GROUP })
    public wildBlueButton: Node | null = null;

    private cardViews: HandCardView[] = [];
    private playerId: string = '';
    private uiContext?: PlayerHandContext;
    private isMyTurn: boolean = false;
    private hoveredCardId: string | null = null;
    private selectedCardId: string | null = null;
    private pendingWildCard: Card | null = null;
    private readonly cardIdsByNode = new WeakMap<Node, string>();

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
            GameEventType.HAND_UPDATED,
            (payload) => {
                if (payload.playerId === this.playerId) {
                    this.onHandUpdated(payload);
                }
            },
            this
        );

        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.hoveredCardId = null;
                this.selectCard(null, false);
                this.pendingWildCard = null;
                this.hideWildColorPanel();
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

    /** 响应手牌更新事件：同步手牌数据并触发重渲染 */
    private onHandUpdated(payload: HandUpdatedPayload): void {
        this.hoveredCardId = null;
        this.selectCard(null, false);
        this.renderHand(payload.hand);
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
        console.log(`[PlayerHand] ${this.playerId} 呼叫 UNO!`);
    }

    // ---------------------------------------------------------------------
    // 渲染与节点操作
    // ---------------------------------------------------------------------

    /** 重新渲染手牌节点：清空旧节点，再按当前手牌数据创建新节点 */
    private renderHand(hand: readonly Card[]): void {
        this.clearCards();

        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            const cardNode = this.createCardNode(card);
            this.cardViews.push({
                card,
                node: cardNode,
                playable: false,
            });
        }

        this.refreshFanLayout(false);
    }

    /** 创建单张卡牌节点，并绑定点击事件和异步牌面资源 */
    private createCardNode(card: Card): Node {
        const cardNode = this.cardNodePool.acquire(this.node);
        this.cardIdsByNode.set(cardNode, card.id);
        cardNode.on(
            Node.EventType.TOUCH_END,
            () => {
                this.onCardTapped(card.id);
                this.onCardHoverChanged(card.id, false);
            },
            this
        );
        cardNode.on(
            Node.EventType.MOUSE_ENTER,
            () => {
                this.onCardHoverChanged(card.id, true);
            },
            this
        );
        cardNode.on(
            Node.EventType.MOUSE_LEAVE,
            () => {
                this.onCardHoverChanged(card.id, false);
            },
            this
        );
        cardNode.on(
            Node.EventType.TOUCH_START,
            () => {
                this.onCardHoverChanged(card.id, true);
            },
            this
        );
        cardNode.on(
            Node.EventType.TOUCH_CANCEL,
            () => {
                this.onCardHoverChanged(card.id, false);
            },
            this
        );

        const sprite = cardNode.getComponent(Sprite);
        if (sprite) {
            void loadCardSprite(card).then((spriteFrame) => {
                if (
                    spriteFrame &&
                    sprite &&
                    sprite.isValid &&
                    this.cardIdsByNode.get(cardNode) === card.id
                ) {
                    sprite.spriteFrame = spriteFrame;
                }
            });
        }

        return cardNode;
    }

    /** 刷新扇形布局与可出牌抬升，渲染层只负责应用纯计算结果 */
    private refreshFanLayout(animated: boolean): void {
        const count = this.cardViews.length;
        if (count === 0) {
            return;
        }

        const topCard = this.uiContext!.getTopCard();
        const config = this.getFanLayoutConfig();

        for (let i = 0; i < count; i++) {
            const view = this.cardViews[i];
            const layout = calculateFanCardLayout({
                card: view.card,
                index: i,
                total: count,
                isMyTurn: this.isMyTurn,
                hoveredCardId: this.hoveredCardId,
                selectedCardId: this.selectedCardId,
                topCard,
                config,
            });

            view.playable = layout.playable;
            this.applyCardLayout(view.node, layout, i, animated);
        }
    }

    /** 把布局结果应用到节点，集中处理 tween 与层级顺序 */
    private applyCardLayout(
        node: Node,
        layout: FanLayoutResult,
        siblingIndex: number,
        animated: boolean
    ): void {
        const opacity = this.ensureOpacity(node);
        opacity.opacity = layout.opacity;

        Tween.stopAllByTarget(node);
        if (animated) {
            tween(node)
                .to(this.layoutTweenDuration, {
                    position: layout.position,
                    angle: layout.angle,
                    scale: layout.scale,
                })
                .start();
        } else {
            node.setPosition(layout.position);
            node.angle = layout.angle;
            node.setScale(layout.scale);
        }
        node.setSiblingIndex(siblingIndex);
    }

    /** 确保卡牌节点拥有透明度组件，用于不可出牌时置灰 */
    private ensureOpacity(node: Node): UIOpacity {
        const opacity = node.getComponent(UIOpacity);
        if (opacity) {
            return opacity;
        }
        return node.addComponent(UIOpacity);
    }

    /** 清除所有卡牌节点和点击事件绑定 */
    private clearCards(): void {
        if (this.cardViews.length === 0) {
            return;
        }

        for (const view of this.cardViews) {
            if (view.node && view.node.isValid) {
                view.node.targetOff(this);
                this.cardIdsByNode.delete(view.node);
            }
            this.cardNodePool.release(view.node);
        }
        this.cardViews = [];
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

        const view = this.cardViews.find((item) => item.card.id === cardId);
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

    /** 鼠标悬停或触摸开始时预抬升卡牌，结束时恢复；已选中的卡牌保持抬升 */
    private onCardHoverChanged(cardId: string, hovering: boolean): void {
        const view = this.cardViews.find((item) => item.card.id === cardId);
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
        this.uiContext!.playCard(this.playerId, card, chosenColor);
    }

    /** 绑定万能牌颜色按钮，点击后会继续完成待处理的万能牌出牌 */
    private bindWildColorButtons(): void {
        this.bindColorButton(this.wildRedButton, CardColor.RED);
        this.bindColorButton(this.wildYellowButton, CardColor.YELLOW);
        this.bindColorButton(this.wildGreenButton, CardColor.GREEN);
        this.bindColorButton(this.wildBlueButton, CardColor.BLUE);
    }

    /** 绑定单个颜色按钮 */
    private bindColorButton(node: Node | null, color: CardColor): void {
        if (!node) {
            return;
        }
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
        if (this.wildColorPanel) {
            this.wildColorPanel.active = true;
        }
    }

    /** 隐藏万能牌颜色选择面板 */
    private hideWildColorPanel(): void {
        if (this.wildColorPanel) {
            this.wildColorPanel.active = false;
        }
    }

    /** 汇总布局配置，便于纯计算函数只接收必要数据 */
    private getFanLayoutConfig(): FanLayoutConfig {
        return {
            fanRadius: this.fanRadius,
            fanRadiusPerCard: this.fanRadiusPerCard,
            turnSpreadAngle: this.turnSpreadAngle,
            idleSpreadAngle: this.idleSpreadAngle,
            playableLift: this.playableLift,
            selectedLift: this.selectedLift,
            arcYFactor: this.arcYFactor,
            rotationFactor: this.rotationFactor,
            disabledCardOpacity: this.disabledCardOpacity,
            enabledCardOpacity: this.enabledCardOpacity,
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
        eventBus.targetOff(this);
        this.hideWildColorPanel();
        this.clearCards();
    }
}
