/**
 * 玩家手牌UI组件
 * 自己回合扇形展开，可出牌自动抬升，选中卡牌二次抬升
 */

import {
    _decorator,
    Component,
    instantiate,
    Node,
    Prefab,
    Sprite,
    tween,
    Tween,
    UIOpacity,
    Vec3,
} from 'cc';

import { loadCardSprite } from '../../core/deck/deck-resources';
import { GameManager } from '../../core/machine/game-manager';
import { validateCanPlayCard } from '../../core/utils/input-validator';
import {
    CardPlayedPayload,
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

const { ccclass, property } = _decorator;

type HandCardView = {
    card: Card;
    node: Node;
    playable: boolean;
};

@ccclass('PlayerHand')
export class PlayerHand extends Component {
    @property(Prefab)
    public cardPrefab: Prefab | null = null;

    @property
    public maxVisibleCards: number = 12;

    @property
    public fanRadius: number = 360;

    @property
    public turnSpreadAngle: number = 72;

    @property
    public idleSpreadAngle: number = 16;

    @property
    public playableLift: number = 32;

    @property
    public selectedLift: number = 22;

    @property
    public layoutTweenDuration: number = 0.18;

    @property(Node)
    public wildColorPanel: Node | null = null;

    @property(Node)
    public wildRedButton: Node | null = null;

    @property(Node)
    public wildYellowButton: Node | null = null;

    @property(Node)
    public wildGreenButton: Node | null = null;

    @property(Node)
    public wildBlueButton: Node | null = null;

    private gameManager: GameManager | null = null;
    private cardViews: HandCardView[] = [];
    private playerId: string = '';
    private isMyTurn: boolean = false;
    private selectedCardId: string | null = null;
    private pendingWildCard: Card | null = null;
    private currentTopCard: TopCard | null = null;
    private currentHand: Card[] = [];

    /**
     * 初始化手牌（指定玩家ID）
     */
    public init(playerId: string): void {
        this.playerId = playerId;
        this.clearCards();
    }

    start() {
        this.gameManager = GameManager.getInstance();
        this.bindWildColorButtons();
        this.hideWildColorPanel();
        this.initEventSubscriptions();
    }

    onDestroy() {
        this.dispose();
    }

    /** 初始化事件订阅 */
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
                this.selectedCardId = null;
                this.pendingWildCard = null;
                this.currentTopCard = null;
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
            GameEventType.CARD_PLAYED,
            (payload) => {
                this.onCardPlayed(payload);
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

    /** 手牌更新 */
    private onHandUpdated(payload: HandUpdatedPayload): void {
        this.currentHand = payload.hand.slice(0, this.maxVisibleCards);
        if (
            this.selectedCardId &&
            !this.currentHand.some((card) => card.id === this.selectedCardId)
        ) {
            this.selectedCardId = null;
        }
        this.renderHand();
    }

    /** 回合变化 */
    private onTurnChanged(payload: TurnChangedPayload): void {
        this.isMyTurn = payload.currentPlayer.id === this.playerId;
        this.currentTopCard =
            this.gameManager?.getTopCard() ?? this.currentTopCard;
        if (!this.isMyTurn) {
            this.selectedCardId = null;
            this.pendingWildCard = null;
            this.hideWildColorPanel();
        }
        this.refreshFanLayout(true);
    }

    /** 任何出牌后都刷新可出牌状态 */
    private onCardPlayed(payload: CardPlayedPayload): void {
        this.currentTopCard =
            this.gameManager?.getTopCard() ?? this.currentTopCard;
        if (payload.player.id === this.playerId) {
            return;
        }
        this.refreshFanLayout(true);
    }

    /** 处理UNO呼叫 */
    private onUnoCalled(): void {
        console.log(`[PlayerHand] ${this.playerId} 呼叫 UNO!`);
    }

    /** 重新渲染手牌节点 */
    private renderHand(): void {
        this.clearCards();

        for (let i = 0; i < this.currentHand.length; i++) {
            const card = this.currentHand[i];
            const cardNode = this.createCardNode(card);
            if (!cardNode) {
                continue;
            }
            this.cardViews.push({
                card,
                node: cardNode,
                playable: false,
            });
        }

        this.refreshFanLayout(false);
    }

    /** 创建单张卡牌节点 */
    private createCardNode(card: Card): Node | null {
        if (!this.cardPrefab) {
            return null;
        }

        const cardNode = instantiate(this.cardPrefab);
        cardNode.setParent(this.node);
        cardNode.setPosition(Vec3.ZERO);
        cardNode.on(
            Node.EventType.TOUCH_END,
            () => {
                this.onCardTapped(card.id);
            },
            this
        );

        const sprite = cardNode.getComponent(Sprite);
        if (sprite) {
            void loadCardSprite(card).then((spriteFrame) => {
                if (spriteFrame && sprite && sprite.isValid) {
                    sprite.spriteFrame = spriteFrame;
                }
            });
        }

        return cardNode;
    }

    /** 刷新扇形布局与可出牌抬升 */
    private refreshFanLayout(animated: boolean): void {
        const count = this.cardViews.length;
        if (count === 0) {
            return;
        }

        const spread = this.isMyTurn
            ? this.turnSpreadAngle
            : this.idleSpreadAngle;
        const half = spread / 2;
        const topCard = this.gameManager?.getTopCard() ?? this.currentTopCard;

        for (let i = 0; i < count; i++) {
            const view = this.cardViews[i];
            const t = count === 1 ? 0.5 : i / (count - 1);
            const angle = -half + spread * t;
            const rad = (angle * Math.PI) / 180;

            view.playable = Boolean(
                this.isMyTurn &&
                topCard &&
                validateCanPlayCard(view.card, topCard)
            );

            const x = Math.sin(rad) * this.fanRadius;
            const arcY = (Math.cos(rad) - 1) * this.fanRadius * 0.24;
            const playableY = view.playable ? this.playableLift : 0;
            const selectedY =
                this.selectedCardId === view.card.id ? this.selectedLift : 0;
            const y = arcY + playableY + selectedY;
            const targetPosition = new Vec3(x, y, 0);
            const targetScale = this.isMyTurn
                ? Vec3.ONE
                : new Vec3(0.92, 0.92, 1);
            const targetAngle = angle * 0.42;

            const opacity = this.ensureOpacity(view.node);
            opacity.opacity = this.isMyTurn && !view.playable ? 150 : 255;

            Tween.stopAllByTarget(view.node);
            if (animated) {
                tween(view.node)
                    .to(this.layoutTweenDuration, {
                        position: targetPosition,
                        angle: targetAngle,
                        scale: targetScale,
                    })
                    .start();
            } else {
                view.node.setPosition(targetPosition);
                view.node.angle = targetAngle;
                view.node.setScale(targetScale);
            }
            view.node.setSiblingIndex(i);
        }
    }

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
            this.selectedCardId = cardId;
            this.refreshFanLayout(true);
            return;
        }

        this.tryPlayCard(view.card);
    }

    /** 尝试出牌，万能牌会先弹颜色选择 */
    private tryPlayCard(card: Card, chosenColor?: CardColor): void {
        if (!this.gameManager) {
            this.gameManager = GameManager.getInstance();
        }
        if (!this.gameManager) {
            return;
        }

        if (
            (card.type === UnoCardType.WILD ||
                card.type === UnoCardType.WILD_DRAW_4) &&
            !chosenColor
        ) {
            this.pendingWildCard = card;
            this.showWildColorPanel();
            return;
        }

        this.pendingWildCard = null;
        this.hideWildColorPanel();
        this.gameManager.playCard(this.playerId, card, chosenColor);
    }

    /** 绑定万能牌颜色按钮 */
    private bindWildColorButtons(): void {
        this.bindColorButton(this.wildRedButton, CardColor.RED);
        this.bindColorButton(this.wildYellowButton, CardColor.YELLOW);
        this.bindColorButton(this.wildGreenButton, CardColor.GREEN);
        this.bindColorButton(this.wildBlueButton, CardColor.BLUE);
    }

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

    /** 万能牌选色 */
    private onWildColorSelected(color: CardColor): void {
        if (!this.pendingWildCard) {
            this.hideWildColorPanel();
            return;
        }

        const card = this.pendingWildCard;
        this.selectedCardId = card.id;
        this.tryPlayCard(card, color);
    }

    private showWildColorPanel(): void {
        if (this.wildColorPanel) {
            this.wildColorPanel.active = true;
        }
    }

    private hideWildColorPanel(): void {
        if (this.wildColorPanel) {
            this.wildColorPanel.active = false;
        }
    }

    private ensureOpacity(node: Node): UIOpacity {
        const opacity = node.getComponent(UIOpacity);
        if (opacity) {
            return opacity;
        }
        return node.addComponent(UIOpacity);
    }

    /** 清除所有卡牌 */
    private clearCards(): void {
        for (const view of this.cardViews) {
            view.node.targetOff(this);
            view.node.destroy();
        }
        this.cardViews = [];
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
        this.hideWildColorPanel();
        this.clearCards();
    }
}
