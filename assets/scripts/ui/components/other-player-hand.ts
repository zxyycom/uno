/**
 * 其他玩家手牌 UI 组件
 * 只展示卡背和数量，不展示真实牌面，不提供交互。
 *
 * 布局算法：
 * - 基于预期单卡宽度与最大总宽度计算平铺中心点
 * - 当卡牌总宽度超过 maxLineWidth 时，自动压缩间距
 * - 使用 lineAngle 控制本地排列方向，场景节点自身负责摆放到左/上/右侧
 */

import {
    _decorator,
    Component,
    Node,
    Sprite,
    SpriteFrame,
} from 'cc';

import { loadCardBackSprite } from '../../core/deck/deck-resources';
import {
    eventBus,
    GameEventType,
    HandUpdatedPayload,
} from '../../foundation/events';
import {
    applyCardLayoutTransform,
    calculateFlatLineCardLayouts,
    CardLayoutTransform,
    FlatLineLayoutConfig,
} from '../utils/hand-card-layout';
import { CardNodePool } from './card-node-pool';

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
export class OtherPlayerHand extends Component {
    @property({
        type: CardNodePool,
        tooltip: '卡牌节点对象池，必须在编辑器中绑定',
        group: OTHER_PLAYER_HAND_BINDINGS_GROUP,
    })
    public cardNodePool!: CardNodePool;

    @property({
        tooltip: '单张卡牌预期宽度（用于布局计算）',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public expectedCardWidth: number = 72;

    @property({
        tooltip: '卡牌期望间距',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public preferredGap: number = 24;

    @property({
        tooltip: '卡牌最小间距',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public minGap: number = 10;

    @property({
        tooltip: '手牌平铺最大宽度，超过时自动压缩间距',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public maxLineWidth: number = 420;

    @property({
        tooltip: '本地排列方向（度），0 为沿 X 轴正向，180 为反向',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public lineAngle: number = 0;

    @property({
        tooltip: '布局动画时长（秒）',
        group: OTHER_PLAYER_HAND_LAYOUT_GROUP,
    })
    public layoutTweenDuration: number = 0.12;

    private playerId: string = '';
    private readonly cardNodes: Node[] = [];
    private cardBackSprite: SpriteFrame = null!;
    private cardBackLoadingPromise: Promise<void> | null = null;
    private layoutSignature: string = '';

    update(_dt: number): void {
        this.refreshFlatLayoutIfChanged(false);
    }

    public init(playerId: string): void {
        this.playerId = playerId;
        this.renderCardBacks(0, false);
    }

    start() {
        this.initEventSubscriptions();
        void this.ensureCardBackLoaded();
    }

    onDestroy() {
        this.dispose();
    }

    private initEventSubscriptions(): void {
        eventBus.on(
            GameEventType.START_GAME,
            () => {
                this.renderCardBacks(0, false);
            },
            this
        );

        eventBus.on(
            GameEventType.HAND_UPDATED,
            (payload) => {
                this.onHandUpdated(payload);
            },
            this
        );
    }

    private onHandUpdated(payload: HandUpdatedPayload): void {
        if (payload.playerId !== this.playerId) {
            return;
        }

        this.renderCardBacks(payload.cardCount, true);
    }

    private renderCardBacks(count: number, animated: boolean): void {
        this.syncCardNodes(count);
        this.refreshFlatLayout(animated);
    }

    private syncCardNodes(targetCount: number): void {
        while (this.cardNodes.length < targetCount) {
            const node = this.createCardBackNode();
            this.cardNodes.push(node);
        }

        while (this.cardNodes.length > targetCount) {
            const node = this.cardNodes.pop()!;
            this.cardNodePool.release(node);
        }
    }

    private createCardBackNode(): Node {
        const node = this.cardNodePool.acquire(this.node);
        node.active = true;
        node.setSiblingIndex(this.cardNodes.length);

        if (this.cardBackSprite) {
            this.applyCardBackSprite(node);
        } else {
            void this.ensureCardBackLoaded();
        }

        return node;
    }

    private async ensureCardBackLoaded(): Promise<void> {
        if (this.cardBackSprite) {
            return;
        }
        if (this.cardBackLoadingPromise) {
            return this.cardBackLoadingPromise;
        }

        this.cardBackLoadingPromise = loadCardBackSprite()
            .then((spriteFrame) => {
                this.cardBackSprite = spriteFrame!;
                this.applyCardBackSpriteToAllNodes();
            })
            .finally(() => {
                this.cardBackLoadingPromise = null;
            });

        return this.cardBackLoadingPromise;
    }

    private applyCardBackSpriteToAllNodes(): void {
        for (const node of this.cardNodes) {
            this.applyCardBackSprite(node);
        }
    }

    private applyCardBackSprite(node: Node): void {
        const sprite = node.getComponent(Sprite)!;
        sprite.spriteFrame = this.cardBackSprite;
    }

    private refreshFlatLayoutIfChanged(animated: boolean): void {
        const nextSignature = this.getLayoutSignature();
        if (nextSignature === this.layoutSignature) {
            return;
        }
        this.refreshFlatLayout(animated);
    }

    private refreshFlatLayout(animated: boolean): void {
        const layouts = calculateFlatLineCardLayouts(
            this.cardNodes.length,
            this.getFlatLayoutConfig()
        );

        for (let i = 0; i < layouts.length; i++) {
            const node = this.cardNodes[i];
            const layout = layouts[i];
            this.applyCardLayout(node, layout, animated);
        }

        this.layoutSignature = this.getLayoutSignature();
    }

    private applyCardLayout(
        node: Node,
        layout: CardLayoutTransform,
        animated: boolean
    ): void {
        applyCardLayoutTransform(
            node,
            layout,
            animated,
            this.layoutTweenDuration
        );
    }

    private getFlatLayoutConfig(): FlatLineLayoutConfig {
        return {
            cardWidth: this.expectedCardWidth,
            preferredGap: this.preferredGap,
            minGap: this.minGap,
            maxLineWidth: this.maxLineWidth,
            lineAngle: this.lineAngle,
        };
    }

    private getLayoutSignature(): string {
        const config = this.getFlatLayoutConfig();
        return `${this.cardNodes.length}|${config.cardWidth}|${config.preferredGap}|${config.minGap}|${config.maxLineWidth}|${config.lineAngle}`;
    }

    private clearCards(): void {
        while (this.cardNodes.length > 0) {
            const node = this.cardNodes.pop()!;
            this.cardNodePool.release(node);
        }
    }

    public dispose(): void {
        eventBus.targetOff(this);
        this.clearCards();
    }
}
