/**
 * 游戏桌面UI组件
 * 回合区域高亮、弃牌动画、方向/颜色箭头、禁用提示
 */

import {
    _decorator,
    Color,
    Component,
    instantiate,
    Node,
    Prefab,
    Sprite,
    tween,
    Tween,
    UIOpacity,
    UITransform,
    Vec3,
} from 'cc';

import { loadCardSprite } from '../../core/deck/deck-resources';
import {
    CardPlayedPayload,
    DirectionChangedPayload,
    DiscardUpdatedPayload,
    eventBus,
    GameEventType,
    PlayerSkippedPayload,
    TurnChangedPayload,
} from '../../foundation/events';
import { Card, CardColor } from '../../foundation/types/game.types';

const { ccclass, property } = _decorator;

@ccclass('GameBoard')
export class GameBoard extends Component {
    @property(Node)
    public discardPileNode: Node | null = null;

    @property(Node)
    public deckNode: Node | null = null;

    @property(Node)
    public directionArrowNode: Node | null = null;

    @property(Node)
    public colorArrowNode: Node | null = null;

    @property(Prefab)
    public discardCardPrefab: Prefab | null = null;

    @property([Node])
    public playerZones: Node[] = [];

    @property([Node])
    public playerSkipMarks: Node[] = [];

    @property
    public zoneNormalOpacity: number = 120;

    @property
    public zoneHighlightOpacity: number = 255;

    @property
    public zoneTweenDuration: number = 0.2;

    @property
    public skipMarkVisibleDuration: number = 1.2;

    @property
    public directionArrowSpinSpeed: number = 120;

    @property
    public colorArrowSpinSpeed: number = 90;

    @property
    public discardFlyDuration: number = 0.28;

    private discardTopCardNode: Node | null = null;
    private currentDirection: 1 | -1 = 1;
    private discardAnimating: boolean = false;

    start() {
        this.initEventSubscriptions();
        this.startColorArrowSpin();
        this.restartDirectionArrowSpin();
        this.resetSkipMarks();
        this.highlightCurrentZone(-1);
    }

    onDestroy() {
        this.dispose();
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.TURN_CHANGED,
            (payload) => {
                this.onTurnChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.resetBoardVisualState();
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
            GameEventType.PLAYER_SKIPPED,
            (payload) => {
                this.onPlayerSkipped(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.DIRECTION_CHANGED,
            (payload) => {
                this.onDirectionChanged(payload);
            },
            this
        );

        eventBus.on(
            GameEventType.DISCARD_UPDATED,
            (payload) => {
                this.onDiscardUpdated(payload);
            },
            this
        );
    }

    /** 回合变化：高亮对应桌面区域 */
    private onTurnChanged(payload: TurnChangedPayload): void {
        this.currentDirection = payload.direction;
        this.restartDirectionArrowSpin();
        this.highlightCurrentZone(
            this.resolvePlayerIndex(payload.currentPlayer.id)
        );
    }

    /** 出牌：从牌堆飞到弃牌堆，并更新颜色箭头 */
    private onCardPlayed(payload: CardPlayedPayload): void {
        if (payload.newActiveColor) {
            this.applyActiveColor(payload.newActiveColor);
        }
        void this.animateCardToDiscard(payload.card);
    }

    /** 方向改变：更新方向箭头旋转方向 */
    private onDirectionChanged(payload: DirectionChangedPayload): void {
        this.currentDirection = payload.newDirection;
        this.restartDirectionArrowSpin();
    }

    /** 初始或同步弃牌堆：没有动画时直接放置顶牌 */
    private onDiscardUpdated(payload: DiscardUpdatedPayload): void {
        if (this.discardAnimating) {
            return;
        }
        if (this.discardTopCardNode) {
            return;
        }
        void this.placeDiscardTopInstant(payload.topCard);
    }

    /** 玩家被禁用（Skip）标识 */
    private onPlayerSkipped(payload: PlayerSkippedPayload): void {
        const playerIndex = this.resolvePlayerIndex(payload.skippedPlayer.id);
        if (playerIndex < 0 || playerIndex >= this.playerSkipMarks.length) {
            return;
        }

        const mark = this.playerSkipMarks[playerIndex];
        mark.active = true;
        mark.setScale(0.8, 0.8, 1);
        Tween.stopAllByTarget(mark);
        tween(mark)
            .to(0.15, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.15, { scale: Vec3.ONE })
            .delay(this.skipMarkVisibleDuration)
            .call(() => {
                mark.active = false;
            })
            .start();
    }

    /** 玩家ID到桌面索引映射，player_0 => 0, ai_1 => 1 */
    private resolvePlayerIndex(playerId: string): number {
        if (playerId === 'player_0') {
            return 0;
        }
        if (playerId.startsWith('ai_')) {
            const aiIndex = Number(playerId.slice(3));
            return Number.isFinite(aiIndex) ? aiIndex : -1;
        }
        const match = playerId.match(/(\d+)$/);
        if (!match) {
            return -1;
        }
        const index = Number(match[1]);
        return Number.isFinite(index) ? index : -1;
    }

    /** 回合区域高亮 */
    private highlightCurrentZone(activeIndex: number): void {
        for (let i = 0; i < this.playerZones.length; i++) {
            const zone = this.playerZones[i];
            const opacity = this.ensureOpacity(zone);
            const targetOpacity =
                i === activeIndex
                    ? this.zoneHighlightOpacity
                    : this.zoneNormalOpacity;

            Tween.stopAllByTarget(opacity);
            tween(opacity)
                .to(this.zoneTweenDuration, {
                    opacity: targetOpacity,
                })
                .start();
        }
    }

    /** 从牌堆飞到弃牌堆并保留牌面朝上 */
    private async animateCardToDiscard(card: Card): Promise<void> {
        if (
            !this.discardCardPrefab ||
            !this.deckNode ||
            !this.discardPileNode
        ) {
            return;
        }

        const rootTransform = this.node.getComponent(UITransform);
        if (!rootTransform) {
            return;
        }

        this.discardAnimating = true;

        const cardNode = instantiate(this.discardCardPrefab);
        cardNode.setParent(this.node);

        const deckLocal = rootTransform.convertToNodeSpaceAR(
            this.deckNode.worldPosition
        );
        const discardLocal = rootTransform.convertToNodeSpaceAR(
            this.discardPileNode.worldPosition
        );
        cardNode.setPosition(deckLocal);
        cardNode.setScale(0.9, 0.9, 1);
        cardNode.angle = 0;

        const sprite = cardNode.getComponent(Sprite);
        if (sprite) {
            const spriteFrame = await loadCardSprite(card);
            if (sprite && sprite.isValid && spriteFrame) {
                sprite.spriteFrame = spriteFrame;
            }
        }

        await new Promise<void>((resolve) => {
            tween(cardNode)
                .to(this.discardFlyDuration, {
                    position: discardLocal,
                    scale: Vec3.ONE,
                })
                .call(() => {
                    resolve();
                })
                .start();
        });

        this.setAsDiscardTop(cardNode);
        this.discardAnimating = false;
    }

    /** 初始顶牌直接放置到弃牌堆 */
    private async placeDiscardTopInstant(card: Card): Promise<void> {
        if (!this.discardCardPrefab || !this.discardPileNode) {
            return;
        }

        const rootTransform = this.node.getComponent(UITransform);
        if (!rootTransform) {
            return;
        }

        const cardNode = instantiate(this.discardCardPrefab);
        cardNode.setParent(this.node);

        const discardLocal = rootTransform.convertToNodeSpaceAR(
            this.discardPileNode.worldPosition
        );
        cardNode.setPosition(discardLocal);
        cardNode.setScale(Vec3.ONE);
        cardNode.angle = 0;

        const sprite = cardNode.getComponent(Sprite);
        if (sprite) {
            const spriteFrame = await loadCardSprite(card);
            if (sprite && sprite.isValid && spriteFrame) {
                sprite.spriteFrame = spriteFrame;
            }
        }

        this.setAsDiscardTop(cardNode);
    }

    private setAsDiscardTop(cardNode: Node): void {
        if (this.discardTopCardNode) {
            this.discardTopCardNode.destroy();
        }
        this.discardTopCardNode = cardNode;
    }

    /** 方向箭头根据顺/逆时针旋转 */
    private restartDirectionArrowSpin(): void {
        if (!this.directionArrowNode) {
            return;
        }
        Tween.stopAllByTarget(this.directionArrowNode);
        const delta = this.currentDirection * this.directionArrowSpinSpeed;
        tween(this.directionArrowNode)
            .by(1, { angle: delta })
            .repeatForever()
            .start();
    }

    /** 颜色箭头持续旋转，颜色由当前生效色驱动 */
    private startColorArrowSpin(): void {
        if (!this.colorArrowNode) {
            return;
        }
        Tween.stopAllByTarget(this.colorArrowNode);
        tween(this.colorArrowNode)
            .by(1, { angle: this.colorArrowSpinSpeed })
            .repeatForever()
            .start();
    }

    private applyActiveColor(color: CardColor): void {
        if (!this.colorArrowNode) {
            return;
        }
        const sprite = this.colorArrowNode.getComponent(Sprite);
        if (!sprite) {
            return;
        }
        sprite.color = this.resolveColor(color);
    }

    private resolveColor(color: CardColor): Color {
        switch (color) {
            case CardColor.RED:
                return new Color(244, 67, 54, 255);
            case CardColor.YELLOW:
                return new Color(255, 193, 7, 255);
            case CardColor.GREEN:
                return new Color(76, 175, 80, 255);
            case CardColor.BLUE:
                return new Color(33, 150, 243, 255);
            default:
                return Color.WHITE;
        }
    }

    private ensureOpacity(node: Node): UIOpacity {
        const opacity = node.getComponent(UIOpacity);
        if (opacity) {
            return opacity;
        }
        return node.addComponent(UIOpacity);
    }

    private resetSkipMarks(): void {
        for (const mark of this.playerSkipMarks) {
            mark.active = false;
        }
    }

    private resetBoardVisualState(): void {
        if (this.discardTopCardNode) {
            this.discardTopCardNode.destroy();
            this.discardTopCardNode = null;
        }
        this.discardAnimating = false;
        this.currentDirection = 1;
        this.restartDirectionArrowSpin();
        this.highlightCurrentZone(-1);
        this.resetSkipMarks();
    }

    /** 取消订阅 */
    public dispose(): void {
        eventBus.targetOff(this);
        if (this.directionArrowNode) {
            Tween.stopAllByTarget(this.directionArrowNode);
        }
        if (this.colorArrowNode) {
            Tween.stopAllByTarget(this.colorArrowNode);
        }
    }
}
